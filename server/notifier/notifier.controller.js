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
 * @return {Promise} -> {Object}
 */
function sendSms(homeItem) {
  return new Promise(function (resolve, reject) {
    
    if (_.isEqual({}, config)) {
      console.log('Can\'t send sms as there\'s no config file.');
      return resolve(); // early
    }
    
    getShortUrl(getBitly(homeItem.url))
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
 * @param {String} subject
 * @param {String} text
 * @param {Object} options - optional
 * @return {Promise} -> {Object}
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
 * @param {homeItem} homeItem
 * @return {String|Number}
 */
function getProject(homeItem) {
  return config.asana_projects[(homeItem.region || '').toLowerCase()];
}

/**
 * Creates the asan task and returns a promise of it.
 * 
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object}
 */
function createOneAsanaTask(homeItem) {
  return new Promise(function (resolve, reject) {
    
    var task = {
      workspace: config.asana_workspace,
      projects: getProject(homeItem),
      name: _.filter([
        homeItem.region,
        homeItem.title,
        (homeItem.price || 0) + ' kr',
        homeItem.tel
      ]).join(', '),
      notes: [
        homeItem.url,
        '',
        'Owner: ' + homeItem.owner,
        'Phone number: ' + (homeItem.tel || 'data missing'),
        'Price: ' + homeItem.price + ' kr',
        'Rooms: ' + homeItem.rooms,
        'Size: ' + homeItem.size,
        'Region: ' + homeItem.region,
        'Location: ' + homeItem.location,
        'Address: ' + homeItem.adress,
        '',
        '----',
        '',
        homeItem.body
      ].join('\n')
    };
    
    var logMessage = chalk.green('\nCreating task: ' + task.workspace + ', ' + task.name + ' at' + moment().format('YYYY-MM-DD, HH:mm') + '\n');
    
    // Check to see if the Asana stuff has any other alphanumeric characters than only 'x',
    // to ensure calls can be made to a working endpoint.
    if (!/[a-vy-ä0-9]+/.test(config.asana_token) || !/[a-vy-ä0-9]+/.test(config.asana_workspace)) {
      console.log('No valid Asana token, or workspace found.\nWould have sent the following task:');
      console.log(logMessage);
      return resolve();
    }
    
    // Log what's going on
    console.log(logMessage);
    
    request.post({
      uri: 'https://app.asana.com/api/1.0/tasks',
      headers: {
        'Authorization': 'Bearer ' + config.asana_token
      },
      json: true,
      body: {
        data: task
      }
    }, function (err, response, body) {
      
      // Whoops, something went wrong here
      if (err) {
        console.log(chalk.red('The following error occurred when trying to create a task to Asana:'));
        console.log(err);
        reject(err);
      } else {
        console.log('\n' + chalk.green('Task created: ' + task.name) + '\n');
        resolve(homeItem);
      }

    });
    
  });
}

/**
 * Creates tasks Asana tasks for all *homeItems*
 * and returns a Promise of the *homeItems*.
 * 
 * @param {Object|Array} homeItems
 * @return {Promise} -> {Object|Array}
 */
function createAsanaTasks(homeItems) {
  new Promise(function (resolve, reject) {
    
    // Ensure array
    var _homeItems = _.isArray(homeItems)
      ? homeItems
      : [ homeItems ];
    
    var promises = _.map(_homeItems, createOneAsanaTask);
    
    Promise.all(_.map(promises, function (promise) { return promise.reflect(); }))
    .then(function (data) {
      resolve(_.map(data, function (val, i) { return val.isRejected() ? _homeItems[i] : val.value() }))
    })
    .catch(function (err) {
      console.log(err);
      resolve(homeItems);
    });
  });
}

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
        sendEmail(homeItems),
        createAsanaTasks(homeItems),
        _.map(homeItems, sendSms)
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
  sendSms: sendSms,
  sendEmail: sendEmail,
  sendSummaryEmail: sendSummaryEmail,
  createAsanaTasks: createAsanaTasks,
  notify: notify
}
