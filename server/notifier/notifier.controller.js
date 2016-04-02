'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var mandrill  = require('mandrill-api');
var moment = require('moment');
var request = require('request');

var utils = require('../utils/general.utils');
var config = require('../config');

var userController = require('../models/user/user.controller');

var asanaNotifier = require('./notifier.asana');
var emailNotifier = require('./notifier.email');
var smsNotifier = require('./notifier.sms');
var userNotifier = require('./notifier.user');

/**
 * Sends out all notifications.
 *
 * @param {Array} homeItems
 * @return {Promise} -> {Array}
 */
function notify(homeItems) {
  return new Promise(function (resolve, reject) {

    if (homeItems && homeItems.length) {

      var promises = _.chain([
        emailNotifier.sendEmail(homeItems),
        asanaNotifier.createAsanaTasks(homeItems),
        _.map(homeItems, smsNotifier.sendSms)
      ])
      .flatten()
      .filter()
      .value();

      Promise.all(_.map(promises, function (promise) { return promise.reflect(); }))
      .then(function (data) {
        resolve(_.map(data, function (val, i) { return val.isRejected() ? val.reason() : val.value() }))
      })
      .catch(function (err) {
        console.log(err);
        resolve(homeItems);
      });
    } else {
      // Still resolve
      resolve();
    }
  });
}

/**
 * Matches *homeItems* to Users, notifies them,
 * and returns a Promise of *homeItems* or the results.
 *
 * @param {Array} homeItems Array of HomeItems to try to match users against
 * @param {Boolean} resolveResults
 * @return {Promise} -> {Array} All homeItems
 */
function notifyUsers(homeItems, resolveResults) {
  return new Promise(function (resolve, reject) {
    // Find all notifiable users
    userController.find()
    .then(function (users) {

      // This handles all matching _and_ actual notifications
      return userNotifier.notify(users, homeItems)
    })
    .then(function (results) {
      // Resolve all homeItems
      resolve((resolveResults === true) ? results : homeItems);
    })
    .catch(reject);
  });
}

module.exports = {
  sendSummaryEmail: emailNotifier.sendSummaryEmail,
  notify: notify,
  notifyUsers: notifyUsers,
}
