'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');
var chalk = require('chalk');

var utils = require('../../utils/utils');
var config = require('../../config');
var HomeItem = require('./homeItem.model');
var homeMatch = require('./homeItem.match');

/**
 * Inserts one or many homes into the db.
 *
 * @param {Object|Array} _home (HomeItem)
 * @return {Promise} -> {Object} (HomeItem)
 */
function create(_home) {
  return new Promise(function (resolve, reject) {
    HomeItem.create(_home, function (err, home) {
      if (err) {
        utils.log('Something wen wrong when creating HomeItem(s).', 'error', { error: err.toString(), homeItemsLength: _.isArray(_home) ? _home.length : 1 });
        reject(err);
      } else {
        resolve(home);
      }
    });
  });
}

/**
 * Inserts one or many *_homeItem* to the db
 * and deactivates any documents which matches the url of the inserted documents
 * and is different to the matching *_homeItem* (or item in *_homeItem* if it's an array).
 *
 * @param {Object|Array} _homeItem (HomeItem)
 * @return {Promise} -> {Object|Array} (HomeItem)
 */
function createHistorical(_homeItem) {
  return new Promise(function (resolve, reject) {
    var _homeItems; // Ensure array
    var options;

    if (_.isArray(_homeItem)) {
      _homeItems = _homeItem;
      options = {
        url: { $in: _.map(_homeItem, function (home) { return home.url; }) },
        disabled: { $ne: true }
      };
    } else {
      _homeItems = [ _homeItem ];
      options = {
        url: { $in: [ _homeItem.url ] },
        disabled: { $ne: true }
      };
    }

    HomeItem.find(options, function (err, homeItems) {
      if (err) {
        reject(err);
      } else {
        // Every item not found in the db should be added
        var toInsert = _.filter(_homeItems, function (home) { return !_.find(homeItems, { url: home.url }); });
        var toDisable = [];

        // Find elements to insert and disable which are present in the db.
        homeItems.forEach(function (home) {
          var _home = _.find(_homeItems, { url: home.url });

          if (_home && !utils.lazyCompare(home, _home, [ '_id', 'id' ])) {
            toInsert.push(_home);
            toDisable.push(home); // db object
          }
        });

        // Disable documents.
        Promise.settle(_.map(toDisable, disable))
        .then(function (vals) {

          vals = _.map(vals, function (val) { return val.value(); });

          utils.log(vals.length + ' homeItems disabled.');
        })
        .catch(function (err) {
          utils.log('Something went wrong when disabling historical HomeItem(s)', 'error', { error: err.toString() });
        });

        // Insert new and updated
        create(toInsert)
        .then(function (homeItems) {
          utils.log((homeItems ? homeItems.length : '0') + ' homeItems created.');
          resolve(homeItems);
        }).catch(function (err) {
          utils.log('Something went wrong when creating historical HomeItem(s)', 'error', { error: err.toString() });
          reject(err);
        });
      }
    });
  });
}

/**
 * Gets all HomeItems matching *_options*.
 *
 * @param {Object} _options - optional
 * @return {Promise} -> {Array} (HomeItem)
 */
function find(_options) {
  return new Promise(function (resolve, reject) {
    var options = _.assign({}, _options, {
      disabled: (_options && _options.disabled
        ? _options.disabled
        : { $ne: true }),
      active: (_options && _options.active
        ? _options.active
        : true)
    });
    HomeItem.find(options, function (err, homeItems) {
      if (err) {
        reject(err);
      } else {
        resolve(homeItems);
      }
    });
  });
}

/**
 * Gets the first item matching *_options*.
 *
 * @param {Object} _options - optional
 * @return {Promise} -> {Object} (HomeItem)
 */
function findOne(_options) {
  return new Promise(function (resolve, reject) {
    var options = _.assign({}, _options, {
      disabled: (_options && _options.disabled
        ? _options.disabled
        : { $ne: true }),
      active: (_options && _options.active
        ? _options.active
        : true)
    });
    HomeItem.findOne(options, function (err, homeItems) {
      if (err) {
        reject(err);
      } else {
        resolve(homeItems);
      }
    });
  });
}

/**
 * Disables, inactivates and sets dateRemoved to now for *_homeItem*.
 * This effectively removes the HomeItem from regular queries.
 * *_homeItem* can be either the Object or its _id.
 *
 * @param {Object|String} _homeItem - either the actual HomeItem or its _id
 * @return {Promise} -> {Object} (HomeItem)
 */
function disable(_homeItem) {
  return new Promise(function (resolve, reject) {
    var id;
    // Takes either the _homeItem as an Object or its _id
    if (typeof _homeItem === 'object' && '_id' in _homeItem) {
      id = _homeItem._id;
    } else {
      id = _homeItem;
    }

    HomeItem.findById(id, function (err, homeItem) {
      if (err) {
        reject(err);
      } else {

        // Disable, inactivate and set dateRemoved
        homeItem = _.assign(homeItem, {
          disabled: true,
          active: false,
          dateRemoved: new Date()
        });

        // Save the document.
        homeItem.save(function (err, homeItem) {
          if (err) {
            reject(err);
          } else {
            resolve(homeItem);
          }
        });
      }
    });
  });
}

/**
 *
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object} (HomeItem)
 */
function setNotified(homeItem) {
  return new Promise(function (resolve, reject) {
    homeItem.notified = true;
    homeItem.save(function (item) {
      resolve(item);
    })
  });
}

/**
 * Finds all items matching the options.
 * Options default to items created the last 15 minutes,
 * with a price of up to 8000 kr,
 * is for not share,
 * is not only for girls,
 * has a kitchen
 * and isn't for students only.
 *
 * @param {Object} _options - optional
 * @return {Promise} -> {Array} (HomeItem)
 */
function getItemsOfInterest(_options) {
  return new Promise(function (resolve, reject) {
    var options;
    var __options;

    // Ensure nothing weird happens with options
    if (_.some([
      _.isArray(_options),
      _.isDate(_options),
      !_.isObject(_options)
    ])) {
      __options = {};
    } else {
      __options = options;
    }

    options = _.assign({}, {
      dateCreated: { $gte: moment().subtract(15, 'minutes').toDate() },
      price: { $lte: 8000 },
      'classification.noKitchen': { $ne: true },
      'classification.swap': { $ne: true },
      'classification.shared': { $ne: true },
      'classification.commuters': { $ne: true },
      'classification.girls': { $ne: true },
      $or: [
        { 'time.period':  { $gte: 6 } },
        { 'time.isLongTerm': true },
        { 'time.end': null }
      ],
      disabled: { $ne: true },
      notified: { $ne: true },
      active: true
    }, __options);

    // Lazy temp solution for allowing notifications on all items
    if (config.notifyAll) {
      options = {
        dateCreated: options.dateCreated,
        disabled: { $ne: true },
        notified: { $ne: true },
        active: true
      }
    }

    HomeItem.find(options, function (err, items) {
      if (err) {
        reject(err);
      } else {
        if (items && items.length) {
          utils.log('Found items of intereset.', 'info', { homeItemsLength: items.length });
        }

        Promise.settle(_.map(items, function (item) { return setNotified(item); }))
        .then(function (_items) {
          resolve(items);
        })
        .catch(function (err) {
          utils.log('Something went wrong when finding items of intereset.', 'error', { erro: err.toString() });
          resolve(items);
        });
      }
    });
  });
}

/**
 * Finds sall items matching options.
 * Options default to items created after since yestarday 06.00,
 * with a price of up to 8000 kr,
 * is for not share,
 * is not only for girls,
 * has a kitchen
 * and isn't for students only.
 *
 * @param {Object} options - optional
 * @return {Promise} -> {Array} (HomeItem)
 */
function getDaySummary(_options) {
  return new Promise(function (resolve, reject) {
    var options;
    var __options;

    // Ensure nothing weird happens with options
    if (_.some([
      _.isArray(_options),
      _.isDate(_options),
      !_.isObject(_options)
    ])) {
      __options = {};
    } else {
      __options = _options;
    }

    options = _.assign({}, {
      dateCreated: { $gte: moment().subtract(1, 'days').startOf('day').add(6, 'hours').toDate() },
      price: { $lte: 8000 },
      'classification.noKitchen': { $ne: true },
      'classification.swap': { $ne: true },
      'classification.shared': { $ne: true },
      'classification.commuters': { $ne: true },
      'classification.girls': { $ne: true },
      $or: [
        { 'time.period':  { $gte: 6 } },
        { 'time.isLongTerm': true },
        { 'time.end': null }
      ],
      disabled: { $ne: true },
      active: true
    }, __options);

    HomeItem.find(options)
    .exec(function (err, items) {
      if (err) {
        reject(err);
      } else {
        resolve(items);
      }
    });
  });
}

/**
 * Returns an array of object like: { user: User {Object}, homeItems: [HomeItem] {Array} }
 *
 * @param {Array} users Array of Users to match against *homeItems*
 * @param {Array} homeItems Array of HomeItems to match against *users*
 * @return {Array}
 */
function matchUsersInterests(users, homeItems) {
  // Map all users
  return _.map(users, function (_user) {
      // User options
      var _options = _user.options;

      // Get all matchinHomeItems
      var _homeItems = _.filter(homeItems, function (homeItem) { return homeMatch.userMatchHomeItem(_user, homeItem); })

      // Return the object
      return { user: _user, homeItems: _homeItems }
    });
}

module.exports = {
  create: create,
  createHistorical: createHistorical,
  find: find,
  findOne: findOne,
  remove: disable,
  getItemsOfInterest: getItemsOfInterest,
  getDaySummary: getDaySummary,
  matchUsersInterests: matchUsersInterests,
}
