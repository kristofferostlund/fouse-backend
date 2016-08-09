'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var utils = require('../utils/utils');
var config = require('../config');

var sendgrid = require('sendgrid')(config.send_grid_api_key);

/**
 * Returns a filtered array
 * of the various short properties of *homeItem*.
 *
 * @param {Object} homeItem
 * @return {Array}
 */
function homeItemSummaryArr(homeItem) {
  return _.filter([
      homeItem.rooms,
      homeItem.size,
      (homeItem.price ? homeItem.price + ' kr/mån' : homeItem.rent),
      homeItem.location,
      (homeItem.adress ? '(' + homeItem.adress + ')' : undefined)
    ]);
}

/**
 * @param {Array} homeItems (HomeItem)
 * @return {String}
 */
function createEmailBody(homeItems) {
  return [
    'Hej, här kommer de senaste bostäderna.'
  ].concat(_.chain(homeItems).filter().map(function (homeItem) {
    if (!homeItem) {
      utils.log('homeItem ...is not?', 'info', { homeItem: homeItem });
      return '';
    } else {
      return homeItem.title + '\n' +
        homeItemSummaryArr(homeItem)
        .join(', ') + '\n' + [
        homeItem.url,
        homeItem.body
    ].join('\n\n');
    }
  }).value()).concat([
    ['Vänligen', 'Home Please'].join('\n')
  ])
  .join('\n\n');
}

/**
 * @param {Array} homeItems (HomeItem)
 * @return {String}
 */
function createSummaryEmail(homeItems) {
  return [
    'Hej, här kommer gårdagens bostäder.'
  ].concat(_.chain(homeItems).filter().map(function (homeItem) {
    if (!homeItem) {
      utils.log('homeItem ...is not?', 'info', { homeItem: homeItem });
      return '';
    } else {
      return homeItem.title + '\n' +
        homeItemSummaryArr(homeItem)
        .join(', ') + '\n' + homeItem.url;
    }
  }).value()).concat([
    ['Vänligen', 'Home Please'].join('\n')
  ])
  .join('\n\n');
}


/**
 * @param {String} subject
 * @param {String} text
 * @param {Object} options - optional
 * @return {Promise} -> {Object}
 */
function abstractEmail(subject, text, options) {
  return new Promise(function (resolve, reject) {
    sendgrid.send(_.assign({}, {
      to: config.email || 'example@email.com',
      toname: config.name || 'John Doe',
      from: config.email_from || 'example@email.com',
      fromname: 'Home Please',
      subject: subject,
      text: text,
    }, options), function (err, result) {
      // Something went wrong with sending the email
      if (err) { return reject(err); }

      // Resolve the result
      resolve(result);
    });
  });
}

/**
 * Sends a detailed email of *homeItem*.
 *
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object}
 */
function sendEmail(homeItems) {
  return new Promise(function (resolve, reject) {

    if (_.isEqual({}, config)) {
      utils.log('Can\'t send email as there\'s no config file.');
      return resolve(); // early
    }

    // Return early if emails shouldn't be sent.
    if (!config.sendEmail) { return resolve(); }

    utils.log('Sending email to config receiver.', 'info', { homeItems: _.map(homeItems, 'title') });

    abstractEmail(
      'Senaste bostäderna, ' + moment().format('YYYY-MM-DD, HH:mm'),
      createEmailBody(homeItems)
    )
    .then(resolve)
    .catch(reject);
  });
}

/**
 * Sends a summary email of *homeItems*.
 *
 * @param {Array} homeItems (HomeItem)
 * @return {Promise} -> {Object}
 */
function sendSummaryEmail(homeItems) {
  return new Promise(function (resolve, reject) {

    if (_.isEqual({}, config)) {
      utils.log('Can\'t send email as there\'s no config file.');
      return resolve(); // early
    }

    abstractEmail(
      'Summering av intressanta bostäder',
      createSummaryEmail(homeItems)
    )
    .then(resolve)
    .catch(reject);
  });
}

/**
 * Sends an email to *receivers* with the subject of *subject*
 * and the text body of *text*.
 *
 * @param {Array|String} receivers Array or string of reciever email addresses
 * @param {String} subject The subject of the email
 * @param {String} text The content of the email
 * @return {Promise}
 */
function _send(receivers, subject, text) {
  return new Promise(function (resolve, reject) {
    // Ensure array
    var _receivers = _.isArray(receivers)
      ? receivers
      : [receivers];

    // Log the email
    utils.log('Sending email.', 'info', { subject: subject, receivers: _receivers.join(', ') });

    sendgrid.send({
      to: _receivers,
      from: config.email_from || 'example@email.com',
      fromname: 'Home Please',
      subject: subject,
      text: text,
    }, function (err, result) {
      // Handle errors
      if (err) {
        return utils.logReject(err, 'Failed to send email.', 'info', { error: err.toString(), subject: subject, receivers: _receivers.join(', ') }, reject);
      }

      utils.log('Sucessfully sent email.', 'info', { subject: subject, receivers: _receivers.join(', ') });

      // Resolve the result
      resolve(result);
    });
  });
}

/**
 * Sends an email to a single user and returns a promise of it.
 *
 * @param {Object} user The user to notify
 * @param {Array} homeItems Array of HomeItems the user may find interesting
 * @return {Promise}
 */
function send(user, homeItems) {
  // Don't send emails to users not asking for it
  if (!user || !_.get(user, 'notify.email') || !user.email) {
    return Promise.resolve();
  }

  // Get the email address
  var _email = user.email;

  // Create the title
  var _subject = '{num} {new} av intresse: {date}'
    .replace('{num}', homeItems.length)
    .replace('{new}', homeItems.length === 1 ? 'ny bostad' : 'nya bostäder')
    .replace('{date}', moment().format('YYYY-MM-DD, HH:mm'));

  // Create the message
  var _text = [
    'Hej{possible_name}, vi på Home Please tror att följande {bo} kan vara {int}'
      .replace('{bo}', homeItems.length === 1 ? 'bostad' : homeItems.length + ' bostäder')
      .replace('{int}', homeItems.length === 1 ? 'intressant' : 'intressanta')
      .replace('{possible_name}', !!user.name ? ' ' + user.name : ''),
    _.chain(homeItems)
      // Filter out any undefined items
      // which somehow got here
      .filter()
      .map(function (homeItem) {
        return [
          // Make the title uppercase only
          (homeItem.title || '').toUpperCase(),
          // Prefer the shortUrl but fall back to the regular url if the short doesn't exist.
          homeItem.shortUrl || homeItem.url,
          _.chain(homeItem)
            // Use only these values
            .pick(['location', 'rent', 'rooms', 'size', 'adress'])
            // Filter out undefined properties and create an array of the items
            .filter(function (e) { return /[^\s]/.test(e) })
            .value()
            .join(', '),
          homeItem.body,
        ].join('\n\n');
      })
      .value()
      .join('\n\n--------\n\n'),
  ].join('\n\n');

  return _send(_email, _subject, _text);
}

module.exports = {
  sendEmail: sendEmail,
  send: send,
  plainSend: _send,
}
