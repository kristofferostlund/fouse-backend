'use strict'

var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var moment = require('moment');
var Browser = require('zombie');

var config = require('../config');

var logger = require('./logger.utils');

/**
 * TODO:
 * - Authenticate against the website to get all phone numbers
 */

/**
 * @param {String} message
 * @param {String} [level='info']
 * @param {Object} [meta]
 */
function log(message, level, meta) {
  // Set default value of level
  level = _.isString(level) ? level : 'info';

  return !_.isUndefined(meta)
    ? logger.log(level, message, meta)
    : logger.log(level, message);
}

/**
 * Checks whether *content* contains either phonenumber-btn or show-phonenumber,
 * which indicates there's a phone number in the ad.
 *
 * @param {String} content
 * @return {Boolean}
 */
function hasTel(content) {
  return /phonenumber\-btn|show\-phonenumber/i.test(content);
}

/**
 * Returns the phone number from an item page
 * by visiting its mobile page using Zombie, a headless browser.
 *
 * @param {String} url
 * @return {Promise} -> {String}
 */
function getTel(url) {
  // Create a local browser instance
  var browser = new Browser();

  // replace 'www' with 'm' to get the mobile page
  var _url = url.replace(/www(?=\.blocket\.se)/, 'm');

  // Navigate to the page
  return browser.visit(_url)
  .then(function () {
    var phoneLink = _.attempt(function () { return browser.document.querySelector('#show-phonenumber'); });

    // If no phonelink can be found, return an empty string
    if (!phoneLink || _.isError(phoneLink)) { return Promise.resolve(); /* No tel found. */ }

    log('Found phone number, clicking button to get it.', 'info', { url: url });

    // Click the link
    return browser.clickLink('#show-phonenumber')
    .then(function () {

      var phoneNumber = _.attempt(function () { return browser.document.querySelector('#show-phonenumber .button-label').textContent; });

      if (_.isError(phoneNumber)) {
        log('Failed to get the phone number.', 'info', { error: phoneNumber.toString() });
        return Promise.resolve();
      }

      log('Successfully got the phone number', 'info', { url: url, phoneNumber: phoneNumber });

      return Promise.resolve(phoneNumber);
    })
    .then(function (data) {
      // Null the browser reference
      browser = null;

      // Resolve the value
      return Promise.resolve(data);
    })
  })
  .catch(function (err) {
    // Null the browser reference
    browser = null;

    if (/phone\-number\.json./i.test(err)) {
      // Can't bother with the error.
      log('Something went wrong with getting the the \'phone-number.json\'.', 'info', { error: err.toString() });
      Promise.resolve();
    } else {
      log('Something went wrong when getting the phone number.', 'info', { error: err.toString() });
      Promise.resolve();
    }
  });
}

/**
 * Makes a request to the
 *
 * @param {String} content
 * @return {String}
 */
function getTelReq(content) {
  return new Promise(function (resolve, reject) {
    /**
     * TODO: something
     */

    resolve();
  });
}

module.exports = {
  hasTel: hasTel,
  getTel: getTel,
}
