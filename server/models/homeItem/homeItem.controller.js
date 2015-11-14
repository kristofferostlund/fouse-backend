'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var HomeItem = require('./homeItem.model');

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
        reject(err);
      } else {
        resolve(home);
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
      disabled: _options && _options.disabled
        ? _options.disabled
        : { $ne: true }
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
      disabled: _options && _options.disabled
        ? _options.disabled
        : { $ne: true } 
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
 * Deletes *_homeItem* from the db.
 * *_homeItem* can be either the Object or its _id.
 * 
 * @param {Object|String} _homeItem - either the actual HomeItem or its _id
 * @return {Promise} -> {Object} (HomeItem)
 */
function remove(_homeItem) {
  return new Promise(function (resolve, reject) {
    var id;
    // Takes either the _homeItem as an Object or its _id
    if (typeof _homeItem === 'object' && '_id' in _homeItem) {
      id = _homeItem._id;
    } else {
      id = _homeItem;
    }
    
    HomeItem.findByIdAndRemove(id, function (err, homeItem) {
      if (err) {
        reject(err);
      } else {
        resolve(homeItem);
      }
    });
  });
}

module.exports = {
  create: create,
  find: find,
  remove: remove
}