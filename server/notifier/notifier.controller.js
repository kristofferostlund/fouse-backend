'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var mandrill  = require('mandrill-api');

var utils = require('../utils/general.utils');

var config; // Set it to the requried file if it exists
try { config = require('../../userConfig'); }
catch (error) { config = {}; console.log('argh:', error); }

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
 * @param {Object} homeItem (HomeItem)
 * @return {String}
 */
function createEmailBody(homeItem) {
  return [
    homeItem.title,
    '--------',
    ['Pris: ' + (homeItem.price ? homeItem.price + ' kr/mån' : homeItem.rent),
    'Rum: ' + homeItem.rooms,
    'Storlek: ' + homeItem.size,
    'Uthyrare: ' + homeItem.owner,
    'Länk: ' + homeItem.url].join('\n'),
    '--------',
    homeItem.body,
    ['Vänligen', config.name].join('\n')
  ].join('\n\n');
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
      
      console.log([
        'Sending to ',
        config.tel,
        ' with the body:\n',
        createSmsBody(homeItem.title, shortUrl, false)
        ].join(''));
        
      utils.getPage(cellsyntUrl(smsBody));
    }
  })
  .catch(function (err) {
    // Couldn't get the 
    console.log(err);
  })
}

function sendEmail(homeItem) {
  
  if (_.isEqual({}, config)) {
    console.log('Can\'t send email as there\'s no config file.');
    return; // early
  }
  
  emailClient.messages.send({ message: {
      subject: 'Intressant bostad: ' + homeItem.title,
      text: createEmailBody(homeItem),
      from_email: config.email_from || 'example@email.com',
      from_name: 'Home Please',
      to: [{
        email: config.email || 'example@email.com',
        name: config.name || 'John Doe',
        type: 'to'
      }]
    }
  }, function (result) {
    console.log(result);
  }, function (err) {
    console.log(err);
  });
}

var HomeItem = require('../models/homeItem/homeItem.model');

module.exports = {
  sendSms: sendSms,
  sendEmail: sendEmail
}
