'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');
var moment = require('moment');
var request = require('request');

var utils = require('../utils/utils');
var config = require('../config');

/**
 * Makes the notification request.
 *
 * @param {Object} homeItem HomeItem to notify
 * @return {Promise}
 */
function _notify(homeItem) {
  return new Promise(function (resolve, reject) {
    // Create the notify object
    var _notifyObject = {
      url: homeItem.url,
      phoneNumber: homeItem.tel,
      name: homeItem.owner,
      rent: homeItem.price,
      roomCount: parseInt(homeItem.rooms) || undefined,
      squareMeters: parseInt(homeItem.size) || undefined,
      address: _.filter([homeItem.address, homeItem.location]).join(', '),
      location: homeItem.location,
      description: (homeItem.body || '').replace(/\n\n/g, '\n'),
      shared: _.get(homeItem, 'classification.shared'),
      homeType: homeItem.homeType,
      imageUrls: homeItem.images || [],
    };

    request({
      method: 'post',
      uri: 'https://api.qasa.se/v1/blocket_leads',
      encoding: null,
      body: _notifyObject,
      json: true,
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': config.qasa_sms_api_token,
      }
    }, function (err, res, body) {
      // Handle errors
      if (err) { return reject(err); }

      // Resolve the response body
      resolve(body);
    });
  });
}

/******************
 * Exports below
 ******************/

/**
 * Returns either true or false for whether the item should be notified about.
 *
 * @param {Object} homeItem HomeItem to possibly notify
 * @return {Boolean}
 */
function shouldNotify(homeItem) {
  return _.every([
    // Don't notify items which are of type Fritidsboende
    !homeItem.homeType || !/fritidsboende/i.test(homeItem.homeType),
    // Don't notify about items where the owner is either Renthia or Samtrygg
    !/samtrygg|renthia/i.test(homeItem.owner),
    // Filter out non-mobile numbers, or homeItems where there is no tel
    /^(\+46|0|46)7/.test(homeItem.tel) || !homeItem.tel,
  ]);
}

/**
 * Filters out any not-of-interest items and makes the notification requests.
 * Returns a promise of either the results or the homeItems.
 *
 * @param {Array} homeItems Array of homeItems to potentially notify
 * @param {Boolean} resolveResults
 * @param {Promise} -> {Array}
 */
function notify(homeItems, resolveResults) {
  return new Promise(function (resolve, reject) {
    // Don't do anything if there is no qasa_sms_api_token
    if (!config.qasa_sms_api_token) {
      // Return early and resolve
      return resolve(resolveResults === true ? [] : homeItems);
    }

    // Get the items to notify about
    var _toNotify = _.filter(homeItems, shouldNotify);

    // If there are no items to notify about, return early
    if (!_toNotify.length) {
      // Return early and resolve
      return resolve(resolveResults === true ? [] : homeItems);
    }

    // Don't notify if it's not specifically true
    if (!(config.qasa_notify === true)) {
      utils.log('No notifications to Qasa are sent out.', 'info', { homeItemLength: _toNotify.length });
      // Return early and resolve
      return resolve(resolveResults === true ? [] : homeItems);
    }

    utils.log('Notifying Qasa.', 'info', { homeItemLength: _toNotify.length, homeItems: _.map(_toNotify, '_id').map(_.toString) });

    // Get all the notify promises
    var _promises = _.chain(_toNotify)
      .map(_notify)
      .map(function (promise) { return promise.reflect(); })
      .value();

    Promise.all(_promises)
    .then(function (vals) {

    utils.log('Successfully notified Qasa.', 'info', { homeItemLength: _toNotify.length, homeItems: _.map(_toNotify, '_id').map(_.toString) });

      resolve(
        resolveResults === true
          ? _.map(vals, function (val) { return val.isRejected() ? val.reason() : val.value(); })
          : homeItems
      );
    })
    .catch(function (err) {
      utils.log('Failed to notify Qasa', 'error', { error: err.toString() });
      reject(err);
    });
  });
}

module.exports = {
  shouldNotify: shouldNotify,
  notify: notify,
}
