'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var utils = require('../utils/general.utils');
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
      console.log('homeItem ...is not?');
      console.log(homeItem);
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
      console.log('homeItem ...is not?');
      console.log(homeItem);
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
      console.log('Can\'t send email as there\'s no config file.');
      return resolve(); // early
    }

    // Return early if emails shouldn't be sent.
    if (!config.sendEmail) { return resolve(); }

    console.log(chalk.green([
      'Sendingn email for',
      _.map(homeItems, function (item) { return item.title }).join(', '),
      'at',
      moment().format('YYYY-MM-DD, HH:mm') + '.'
      ].join(' ')));

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
      console.log('Can\'t send email as there\'s no config file.');
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
  // Ensure array
  var _receivers = _.isArray(receivers)
    ? receivers
    : [receivers];

  // Log the email
  console.log(
    'Sending an email to {recievers} with the following subject:\n{subject}\nAnd the following body:\n{body}\n'
      .replace('{recievers}', _receivers.join(', '))
      .replace('{subject}', subject)
      .replace('{body}', text)
  );

  sendgrid.send({
    to: _receivers,
    from: config.email_from || 'example@email.com',
    fromname: 'Home Please',
    subject: subject,
    text: text,
  }, function (err, result) {
    // Handle errors
    if (err) { return reject(err); }

    // Resolve the result
    resolve(result);
  })
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
  var _subject = homeItems.length + ' nya bostäder av intresse: ' + moment().format('YYYY-MM-DD, HH:mm');

  // Create the message
  var _text = [
    'Följande bostäder tror vi kan vara intressanta:',
    _.map(homeItems, function (homeItem) {
      return [
        _.chain(homeItem)
          .pick()
          .filter(['rooms', 'size', 'rent', 'location', 'adress'])
          .value()
          .join(', '),
        homeItem.body
      ].join('\n');
    }).join('\n---\n'),
    ['Vänligen', 'Home Please'].join('\n'),
  ].join('\n\n');

  // TODO: Implement SendGrid, actually send the email
  return _send(_email, _subject, _text);
}

module.exports = {
  sendEmail: sendEmail,
  send: send,
  plainSend: _send,
}
