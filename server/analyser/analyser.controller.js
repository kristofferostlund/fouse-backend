'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var timeAnalyser = require('./analyser.time');
var locationAnalyser = require('./analyser.location');
var HomeItem = require('../models/homeItem/homeItem.model');
var utils = require('../utils/general.utils');

/**
 * @param {String} body
 * @return {Boolean}
 */
function isSwap(body) {
  return /byte|byte(s|s )krav/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function isShared(body) {
  return /dela|del (i|med)|delas med|dela en|uthyrningsdel|inneboende|rum.{1,15}(i|till)|rum.{1,20}(?=hyr)|hyr.{1,15}(?=möblerat.{1,10}(?=rum))|hyr.{1,20}(?=rum)|room|mate|share (an|a)|a room|room.{1,40}for rent|rent.{1,15}room| room is|furnished room/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forGirls(body) {
  return /tjej|kvinn|flick|girl|wom(a|e)n/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forCommuters(body) {
  return /pendlare|veckopendlare/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function lacksKitchen(body) {
  return /kök saknas|inget kök| (ej|ingen).{1,15}tillgång.{1,15}kök|ej kök|no( | access.{1,5})kitchen/gi.test(body);
}

/**
 * Returns a Promise of
 *
 * @param {Object} homeItem
 * @returm {Object}
 */
function getClassification(homeItem) {
  return new Promise(function (resolve, reject) {

    var _homeItem = _.assign(homeItem, {
        classification: {
          girls: forGirls(homeItem.body) || forGirls(homeItem.title),
          commuters: forCommuters(homeItem.body) || forCommuters(homeItem.title),
          shared: isShared(homeItem.body) || isShared(homeItem.title),
          swap: isSwap(homeItem.body) || isSwap(homeItem.title),
          noKitchen: lacksKitchen(homeItem.body) || lacksKitchen(homeItem.title)
        }, time: timeAnalyser.getTimeInfo(homeItem)
      });

    // Get location data
    locationAnalyser.getLocationInfo(_homeItem)
    .then(resolve)
    .catch(function (err) {

      console.log(
        chalk.red(
          'Something went wrong with fetchin location data for {url}.\nResolving object without location data.'
            .replace('{url}', homeItem.url)
        )
      );

      // Something went wrong with the location, but keep going.
      resolve(_homeItem);
    });

  });
}

/**
 * Completely classifies the *homeItems*,
 * including chronological info, locational info and general info, such as gender specific rules and the like.
 *
 * @param {Array|Object} homeItems
 * @return {Promise} -> {Array|Object}
 */
function classify(homeItems) {

  // If there's only one, return the promise of its classification
  if (!_.isArray(homeItems)) { return getClassification(homeItems); }

  // Otherwise we first need to get them all first
  return new Promise(function (resolve, reject) {
    var promises = _.map(homeItems, function (homeItem) { return getClassification(homeItem); });

    Promise.all(_.map(promises, function (promise) { return promise.reflect(); }))
    .then(function (data) {
      resolve(_.map(data, function (val, i) { return val.isRejected() ? homeItems[i] : val.value() }))
    })
    .catch(function (err) {
      console.log(err);
      resolve(homeItems);
    });
  });
}

/**
 * Attaches shortened urls to *homeItems*
 *
 * @param {Array|Object} homeItems HomeItems to get short urls for
 * @return {Promise} -> {Array|Object}
 */
function shortenUrls(homeItems) {
  return new Promise(function (resolve, reject) {
    // Is it just a single object?
    var isObj = !_.isArray(homeItems);

    // Always assume array
    var _homeItems = isObj
      ? [ homeItems ]
      : homeItems;

    var promises = _.map(_homeItems, function (homeItem) {
      return new Promise(function (resolve, reject) {
        utils.getShortUrl(homeItem)
        .then(function (shortUrl) {
          resolve(_.assign({}, homeItem, { shortUrl: shortUrl }));
        })
        .catch(function (err) {
          // Log the error
          console.log('Could not get short url for {url}:'.replace('{url}', homeItem.url));
          console.log(err);

          // Still resolve though
          resolve(homeItem);
        });
      });
    });

    Promise.all(_.map(promises, function (promise) { return promise.reflect(); }))
    .then(function (data) {
      resolve(_.map(data, function (val, i) { return val.isRejected() ? homeItems[i] : val.value(); }));
    })
    .catch(function (err) {
      console.log(err);
      resolve(homeItems);
    });
  });
}

module.exports = {
  getClassification: getClassification,
  classify: classify,
  shortenUrls: shortenUrls,
};
