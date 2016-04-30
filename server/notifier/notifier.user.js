'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var request = require('request');

var homeController = require('../models/homeItem/homeItem.controller');

var sms = require('./notifier.sms');
var email = require('./notifier.email');
var utils = require('../utils/general.utils');
var config = require('../config');

/**
 * @param {Array|Object} users Array or object of user(s) to notify
 * @param {Array|Object} homeItems Array or object of homeItems to notify about.
 */
function notify(users, homeItems) {
  return new Promise(function (resolve, reject) {
    // If there are no homeItems, return early
    if (!homeItems) {
      return resolve(undefined);
    }

    // Ensure Array
    var _users = _.isArray(users)
      ? users
      : [ users ];

    // Ensure Array
    var _homeItems = _.isArray(homeItems)
      ? homeItems
      : [ homeItems ]

    // Filter out users which doesn't match any homeItems.
    var _notifiableUsers = _.chain(_users)
      .thru(function (users) { return homeController.matchUsersInterests(users, _homeItems); })
      .filter(function (notifyObj) { return !!notifyObj.homeItems && !!notifyObj.homeItems.length })
      .value();

    // Get promises of SMSs
    var _sms = _.chain(_notifiableUsers)
      // Filter out non smsables
      .filter(function (notifyObj) { return _.get(notifyObj, 'user.notify.sms') && !!_.get(notifyObj, 'user.tel'); })
      // Multiply each user by the number of interesting homes there may be
      .map(function (notifyObj) { return _.map(notifyObj.homeItems, function (homeItem) { return { user: notifyObj.user, homeItem: homeItem }; }); })
      // Flatten the arrays to only a single
      .flatten()
      // Send the SMSs
      .map(function (notifyObj) { return sms.send(notifyObj.user, notifyObj.homeItem) })
      // Reflect the promise
      .map(function (promise) { return promise.reflect(); })
      .value();

    // Get promises of emails
    var _email = _.chain(_notifiableUsers)
      // Filter out non emailable
      .filter(function (notifyObj) { return _.get(notifyObj, 'user.notify.email') && !!_.get(notifyObj, 'user.email'); })
      // Send the emails
      .map(function (notifyObj) { return email.send(notifyObj.user, notifyObj.homeItems) })
      // Reflect the promise
      .map(function (promise) { return promise.reflect(); })
      .value();

    // Make a single array of them
    var _promises = _sms.concat(_email);

    // Run all promises
    Promise.all(_promises)
    .then(resolve)
    .catch(reject);
  });

}

module.exports = {
  notify: notify,
}
