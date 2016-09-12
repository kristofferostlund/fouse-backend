'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');
var request = require('request');

var utils = require('../utils/utils');
var config = require('../config');

/**
 * Returns the url for which to make a
 * GET request to send the text message.
 *
 * @param {String} receiver Defaults to config.tel
 * @param {String} message
 * @param {String} sender Defaults to 'Fouse'
 * @return {String}
 */
function getCellsyntUrl(receiver, message, sender) {
  // Ensure there's a sender
  var _sender = !!sender
    ? sender
    : 'Fouse';

  return [
    'https://se-1.cellsynt.net/sms.php',
    '?username=' + config.cellsynt_username,
    '&password=' + config.cellsynt_pass,
    '&type=' + 'text',
    '&destination=' + receiver,
    '&originatortype=alpha',
    '&originator=' + encodeURIComponent(_sender),
    '&charset=UTF8',
    '&text=' + encodeURIComponent(message),
    '&allowconcat=6'
  ].join('');
}

/**
 * Sends an sms to *reciever*.
 *
 * @param {String} reciever The receiver of the message
 * @param {String} message The message body
 * @param {String} [sender='Fouse'] The sender of the message, default will be 'Fouse'
 */
function _send(receiver, message, sender) {
  // Don't go further if no SMS should be sent out
  if (!config.sendSms) {
    utils.log('Not sending sms to ' +  receiver + ' as SMS is turned off.');

    // Return early
    return Promise.resolve();
  }

  // Set default value
  sender = !!sender ? sender : 'Fouse';

  var _receivers = _.chain(receiver)
    .thru(function (rec) { return _.isArray(rec) ? rec : [ rec ] })
    .map(function (rec) { return /^00/.test(rec) ? rec : '00' + rec.replace(/^(\+467|07)/, '467') })
    .thru(function (recs) { return recs.join(','); })
    .value();

  // Get the url to send sms request to
  var _url = getCellsyntUrl(_receivers, message, sender);

  utils.log('Sending SMS.', 'info', { receivers: _receivers, message: message, sender: sender });

  if (!(_receivers && _receivers.length)) {
    return utils.logResolve('No recipients for SMS.', 'info', { receivers: _receivers, message: message, sender: sender });
  }

  return utils.get(_url)
  .then(function (data) {
    return utils.logResolve('Successfully sent SMS.', 'info', { receivers: _receivers, message: message, sender: sender, response: data });
  })
  .catch(function (err) {
    return utils.logReject('Failed to send SMS.', 'info', { error: err.toString(), receivers: _receivers, message: message, sender: sender })
  });
}

/**
 * Sends an SMS to *user* with a body about *homeItem*.
 *
 * Returns a Promise.
 *
 * @param {Object} user
 * @param {Object} homeItem
 * @return {Promise}
 */
function send(user, homeItem) {
  // Don't send SMS to users not asking for it
  if (!user || !_.get(user, 'notify.sms') || !user.tel) {
    return Promise.resolve();
  }

  // Get the receiver
  var _receiver = user.tel;

  // Create the body
  var _message = [
    [ homeItem.title, homeItem.size, (homeItem.price || 0) + ' kr' ].join(', '),
    homeItem.shortUrl,
  ].join('\n');

  // Send the message
  return _send(_receiver, _message);
}

module.exports =  {
  send: send,
}
