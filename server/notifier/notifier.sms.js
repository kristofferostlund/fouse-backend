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
 * @param {String} sender Defaults to 'HomePlease'
 * @return {String}
 */
function cellsyntUrl(receiver, message, sender) {
  // Ensure there's a receiver
  var _receiver = !!receiver
    ? receiver
    : config.tel;

  // Ensure there's a sender
  var _sender = !!sender
    ? sender
    : 'HomePlease';

  return [
    'https://se-1.cellsynt.net/sms.php',
    '?username=' + config.cellsynt_username,
    '&password=' + config.cellsynt_pass,
    '&type=' + 'text',
    '&destination=' + _receiver,
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
 * @param {String} sender The sender of the message, default will be 'HomePlease'
 */
function _send(receiver, message, sender) {
  // Don't go further if no SMS should be sent out
  if (!config.sendSms) {
    utils.log('Not sending sms to ' +  receiver + ' as SMS is turned off.');

    // Return early
    return Promise.resolve();
  }

  // Set default value
  sender = !!sender ? sender : 'HomePlease';

  // Get the url to send sms request to
  var _url = cellsyntUrl(receiver, message, sender);

  utils.log('Sending SMS.', 'info', { receiver: receiver, message: message, sender: sender });

  return utils.getPage(_url)
  .then(function (data) {
    return utils.logResolve('Successfully sent SMS.', 'info', { receiver: receiver, message: message, sender: sender, response: data });
  })
  .catch(function (err) {
    return utils.logReject('Failed to send SMS.', 'info', { error: err.toString(), receiver: receiver, message: message, sender: sender })
  });
}

/**
 * Gets the url for getting the bitly link.
 *
 * @param {String} url
 * @return  {String}
 */
function getBitlyUrl(url) {
  return [
    'https://api-ssl.bitly.com',
    '/v3/shorten?access_token=ACCESS_TOKEN&longUrl='.replace('ACCESS_TOKEN', config.bitlyToken),
    encodeURI(url.replace('?', '/?'))
  ].join('');
}

/**
 * Gets the bitly link for the homeItem.
 *
 * @param {String} bitlyUrl
 * @return {Promise} -> {String}
 */
function getShortUrl(bitlyUrl) {
  return new Promise(function (resolve, reject) {
    utils.getPage(bitlyUrl)
    .then(function (bitly) {
      try {
        resolve(JSON.parse(bitly).data.url);
      } catch (error) {
        reject(new Error('Couldn\'t get the shortened url'));
      }
    })
    .catch(reject);
  });
}

/**
 * Returns an encoded URI of the content
 * to send in the sms.
 *
 * @param {String} content
 * @param {String} shortUrl
 * @return {String}
 */
function createSmsBody(content, shortUrl) {
  var padding = shortUrl.length + 4;

  return [
    content.slice(0, 160 - padding),
    '\n\n',
    shortUrl
  ].join('');
}

/**
 * Sends a text message to to tel in config
 * with the title of *homeItem*
 * and a shortened link using the Bitly API.
 *
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object}
 */
function sendSms(homeItem) {
  return new Promise(function (resolve, reject) {

    if (_.isEqual({}, config)) {
      utils.log('Can\'t send sms as there\'s no config file.');
      return resolve(); // early
    }

    getShortUrl(getBitlyUrl(homeItem.url))
    .then(function (shortUrl) {
      if (!shortUrl) {
        utils.log('No url received.');
        return resolve();
      } else {
        var smsBody = createSmsBody(homeItem.title, shortUrl, false);

        // Only send if somewhere set to true
        if (!config.sendSms) { return resolve(); }

        utils.log('Sending SMS to config receiver.', 'info', { receiver: config.tel, body: createSmsBody(homeItem.title, shortUrl, false) });

        // Send the SMS
        utils.getPage(cellsyntUrl(undefined, smsBody))
        .then(function (data) {
          if (_.isError(data)) {
            return Promise.reject(data);
          } else if (/^error\: /i.test(data)) {
            return Promise.reject(new Error(('' + data).replace(/^error\:\ /i, '')));
          }

          utils.log('Successfully sent SMS to config receiver.', 'info', { receiver: config.tel, data: data, body: createSmsBody(homeItem.title, shortUrl, false) });
          resolve(data);
        })
        .catch(function (err) {
          utils.log('Failed to send SMS to config receiver.', 'error', { error: err.toString(), receiver: config.tel });
          reject(err);
        });
      }
    })
    .catch(function (err) {
      // Couldn't get the url
      utils.log(err);
      reject(err);
    })
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
  sendSms: sendSms,
  send: send,
}
