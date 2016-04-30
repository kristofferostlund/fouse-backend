'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var request = require('request');

var utils = require('../utils/general.utils');
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
    '&destination=' + _receiver,
    '&originatortype=alpha',
    '&originator=' + encodeURIComponent(_sender),
    '&charset=UTF-8',
    '&text=' + encodeURIComponent(message)
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
    console.log('Not sending sms to ' +  receiver + ' as SMS is turned off.');

    // Return early
    return Promise.resolve();
  }

  // Set default value
  sender = !!sender ? sender : 'HomePlease';

  // Get the url to send sms request to
  var _url = cellsyntUrl(receiver, message, sender);

  return utils.getPage(_url)
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
function createSmsBody(content, shortUrl, encode) {
  encode = _.isUndefined(encode) ? true : encode;
  var padding = shortUrl.length + 4;

  var body = [
    content.slice(0, 160 - padding),
    '\n\n',
    shortUrl
  ].join('');

  return encode ? encodeURIComponent(body) : body;
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
      console.log('Can\'t send sms as there\'s no config file.');
      return resolve(); // early
    }

    getShortUrl(getBitlyUrl(homeItem.url))
    .then(function (shortUrl) {
      if (!shortUrl) {
        console.log('No url received.');
        return resolve();
      } else {
        var smsBody = createSmsBody(homeItem.title, shortUrl);

        // Only send if somewhere set to true
        if (!config.sendSms) { return resolve(); }

        console.log(chalk.green([
          'Sending SMS to ',
          config.tel,
          ' with the body:\n',
          createSmsBody(homeItem.title, shortUrl, false)
          ].join('')));

        // Send the SMS
        utils.getPage(cellsyntUrl(smsBody))
        .then(resolve)
        .catch(reject);
      }
    })
    .catch(function (err) {
      // Couldn't get the url
      console.log(err);
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
