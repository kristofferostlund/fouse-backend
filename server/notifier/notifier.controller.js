'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var mandrill  = require('mandrill-api');
var moment = require('moment');

var utils = require('../utils/general.utils');
var config = require('../config');

var emailClient = new mandrill.Mandrill(config.mandrill_api_key);

/**
 * Returns the url for which to make a
 * GET request to send the text message.
 * 
 * @param {String} smsBody
 * @return {String}
 */
function cellsyntUrl(smsBody) {
  return [
    'https://se-1.cellsynt.net/sms.php',
    '?username=' + config.cellsynt_username,
    '&password=' + config.cellsynt_pass,
    '&destination=' + config.tel,
    '&originatortype=alpha',
    '&originator=' + encodeURIComponent('HomePlease'),
    '&charset=UTF-8',
    '&text=' + smsBody
  ].join('');
}

/**
 * Gets the url for getting the bitly link.
 * 
 * @param {String} url
 * @return  {String}
 */
function getBitly(url) {
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
 * Sends a text message to to tel in config
 * with the title of *homeItem*
 * and a shortened link using the Bitly API.
 * 
 * @param {Object} homeItem (HomeItem)
 */
function sendSms(homeItem) {
  
  if (_.isEqual({}, config)) {
    console.log('Can\'t send sms as there\'s no config file.');
    return; // early
  }
  
  getShortUrl(getBitly(homeItem.url))
  .then(function (shortUrl) {
    if (!shortUrl) {
      console.log('No url received.');
    } else {
      var smsBody = createSmsBody(homeItem.title, shortUrl);
      
      console.log(chalk.green([
        'Sending to ',
        config.tel,
        ' with the body:\n',
        createSmsBody(homeItem.title, shortUrl, false)
        ].join('')));
      
      // Only send if somewhere set to true
      if (config.sendSms) {
        utils.getPage(cellsyntUrl(smsBody));
      }
    }
  })
  .catch(function (err) {
    // Couldn't get the 
    console.log(err);
  })
}

/**
 * @param {String} subject
 * @param {String} text
 * @param {Object} options - optional
 * return {Promise}
 */
function abstractEmail(subject, text, options) {
  return new Promise(function (resolve, reject) {
    emailClient.messages.send({ message: _.assign({}, {
      subject: subject,
      text: text,
      from_email: config.email_from || 'example@email.com',
      from_name: 'Home Please',
      to: [{
        email: config.email || 'example@email.com',
        name: config.name || 'John Doe',
        type: 'to'
      }]
      }, options)
    }, function (result) {
      resolve(result);
    }, function (err) {
      reject(err);
    })
  });
}

/**
 * Sends a detailed email of *homeItem*.
 * 
 * @param {Object} homeItem (HomeItem)
 */
function sendEmail(homeItems) {
  
  if (_.isEqual({}, config)) {
    console.log('Can\'t send email as there\'s no config file.');
    return; // early
  }
  
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
  .then(function (res) {
    console.log(res);
  })
  .catch(function (err) {
    console.log(err);
  })
}

/**
 * Sends a summary email of *homeItems*.
 * 
 * @param {Array} homeItems (HomeItem)
 */
function sendSummaryEmail(homeItems) {
  
  if (_.isEqual({}, config)) {
    console.log('Can\'t send email as there\'s no config file.');
    return; // early
  }
  
  abstractEmail(
    'Summering av intressanta bostäder',
    createSummaryEmail(homeItems)
  )
  .then(function (res) {
    console.log(res);
  })
  .catch(function (err) {
    console.log(err);
  });
}

module.exports = {
  sendSms: sendSms,
  sendEmail: sendEmail,
  sendSummaryEmail: sendSummaryEmail
}
