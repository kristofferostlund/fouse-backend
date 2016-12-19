'use strict'

var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var moment = require('moment');
var cheerio = require('cheerio');
var later = require('later');

var config = require('../config');

var logger = require('./logger.utils');


/**************************************************************
 * TODO:
 * - Authenticate against the website to get all phone numbers
 *   maybe using Zombie or even PhantomJS.
 **************************************************************/

/**
 * Information about
 *
 * @type {{ body: String, _version: String, _baseUrl: String, _topUrl: String }}
 */
var __thirdPartyScriptInfo = { body: '', _version: '2.1.1', _baseUrl: 'http://m.blocket.se', _topUrl: '/static/main/mobilesite/js/third-party.js' };

// Get new third party script info every monday (day 1) at 5 AM (UTC)
var fetchThirdPartySchedule = later.parse.recur()
  .every(5).hour()
  .on(1).dayOfWeek();

/**
 * @param {String} message
 * @param {String} [level='info']
 * @param {Object} [meta]
 */
function log(message, level, meta) {
  // Set default value of level
  level = _.isString(level) ? level : 'info';

  return !_.isUndefined(meta)
    ? logger.log(level, message, meta)
    : logger.log(level, message);
}

/**
 * @param {Object} options
 * @return {Promise<{ res: Object, body: any }>}
 */
function _request(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (err, res, body) {
      if (err) {
        return reject(err);
      }

      resolve({ res: res, body: body });
    });
  });
}


/**
 * Tries to update __thirdPartyScriptInfo with new data.
 */
function updateThirdPartyScript() {
  log('Scheduled __thirdPartyScriptInfo update.')

  _request({
    method: 'get',
    uri: __thirdPartyScriptInfo._baseUrl + __thirdPartyScriptInfo._topUrl,
    headers: { 'Connection': 'keep-alive' },
  })
  .then(function (data) {
    var body = data.body;
    if (!body || __thirdPartyScriptInfo.body === body) {
      log('Third party script gotten but either doesn\'t exist or is the same as earlier.');

      return;
    }

    // Set the body property
    __thirdPartyScriptInfo.body = body;

    log('__thirdPartyScriptInfo body is updated. Attempting to parse _version.');

    var _version = (body.match(/[a-zA-Z]{1}\="([0-9]\.[0-9]\.[0-9]){1}/) || [])[1];

    if (_version) {
      var _oldVersion = __thirdPartyScriptInfo._version;
      __thirdPartyScriptInfo._version = _version;
      log('Successfully parsed _version from third party script.', 'info', { _version: _version, _oldVersion: _oldVersion });
    } else {
      log('Failed to parse _version from third party script.', 'info', { _version: _version });
    }
  })
  .catch(function (err) {
    log('Failed to fetch third party script data.', 'error', { error: _.isFunction(err.toString) ? err.toString() : err });
  });
}

/**
 * Start the schedule and also run it at the start.
 */
later.setInterval(updateThirdPartyScript, fetchThirdPartySchedule);
updateThirdPartyScript();

/**
 * Returns the mobile version of *url*.
 *
 * @param {String} url
 * @return {String}
 */
function getMobileUrl(url) {
  return (url || '').replace(/www(?=\.blocket\.se)/, 'm');
}

/**
 * Gets the id of the item and returns the URL for getting phone numbers of them.
 *
 * @param {String} url
 * @return {String}
 */
function getPhoneUrl(url) {
  var _id = (url.match(/_([0-9]{8,}).htm/) || [])[1];

  if (_.isUndefined(_id)) {
    return null;
  }

  return 'https://m.blocket.se/ads/:id/phone-number.jsonp'.replace(':id', _id);
}

/*********************
 * Exports below here
 *********************/

/**
 * Checks whether *content* contains either phonenumber-btn or show-phonenumber,
 * which indicates there's a phone number in the ad.
 *
 * @param {String} content
 * @return {Boolean}
 */
function hasTel(content) {
  return /phonenumber\-btn|show\-phonenumber/i.test(content);
}

/**
 * Tries to get the phone number by making a request
 * to the same endpoint as he user would've requested while clicking the link
 * on the mobile website.
 *
 * @param {String} content
 * @return {String}
 */
function getTel(url) {
  // The the mobile version of the page.
  var _mobileUrl = getMobileUrl(url);

  log('Getting phone number.', 'info', { url: url });

  return _request({
    method: 'get',
    uri: _mobileUrl,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, sdch',
      'Accept-Language': 'en,sv;q=0.8,en-GB;q=0.6',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Host': 'm.blocket.se',
      'Upgrade-Insecure-Requests': 1,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
    },
  })
  .then(function (data) {
    var body = data.body;

    if (!body) {
      log('Received an empty body, cannot find phone url.', 'info', { url: url });
      return Promise.resolve('');
    }

    var $ = cheerio.load(body);

    var _linkData = _.chain($('#show-phonenumber'))
      .thru(function (el) {
        return {
          csrfToken: el.attr('data-csrf-token'),
          url: el.attr('href'),
          method: el.attr('data-method'),
          dataType: 'jsonp'
        };
      })
      .value();

    // Get the weird callback name
    var _callbackName = 'jQuery' + (__thirdPartyScriptInfo._version + Math.random()).replace(/\D/g, '') + '_' + Date.now();

    var _params = _.chain([
      ['callback', _callbackName ],
      ['csrfmiddlewaretoken', _linkData.csrfToken ],
      ['_', Date.now() ],
    ])
    .map(function (param) { return param.join('=') })
    .thru(function (params) { return params.join('&'); })
    .value()

    var _telUrl = (!!_linkData.url ? _linkData : getPhoneUrl(url)) + '?' + _params;

    return _request({
      method: _linkData.method,
      uri: _telUrl,
      headers: {
       'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, sdch, br',
        'Accept-Language': 'en,sv;q=0.8,en-GB;q=0.6',
        'Connection': 'keep-alive',
        'Host': 'm.blocket.se',
        'Referer': _mobileUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
      },
    });
  })
  .then(function (data) {
    // If data is falsy, return early
    if (!data) {
      return Promise.resolve();
    }

    // Get the body of the response.
    var body = data.body || '';

    // Try to parse the response body's object which would be put as an argument to the callback function
    var _resp = _.attempt(function () { return JSON.parse(body.match(/\{.+\}/)[0]) });

    // If something went wrong when parsing the response, we're done here.
    if (_.isError(_resp)) {
      log('Failed to parse phone number.', 'error', { error: err.toString(), url: url });
      return Promise.resolve();
    }

    /**
     * Most of the time, the phone number won't be accessible without authentication,
     * and if there is no phone property, there should be a message
     */
    var _tel = !_.isUndefined(_resp.phone) ? _resp.phone : _resp.message;

    log('Successfully parsed phone from number.', 'info', { tel: _tel, url: url });

    return Promise.resolve(_tel);
  });
}

module.exports = {
  hasTel: hasTel,
  getTel: getTel,
}
