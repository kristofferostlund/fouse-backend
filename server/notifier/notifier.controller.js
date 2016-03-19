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

var asanaNotifier = require('./notifier.asana');
var emailNotifier = require('./notifier.email');
var smsNotifier = require('./notifier.sms');

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
    }

  });
}

module.exports = {
  sendSummaryEmail: emailNotifier.sendSummaryEmail,
  notify: notify
}
