'use strict'

var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var moment = require('moment');

var config = require('../config');

var logger = require('./logger.utils');

var phone = require('./phone.utils');

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
 * @param {String} message
 * @param {String} [level='info']
 * @param {Object} [meta]
 * @param {Function} [resolve=Promise.resolve]
 */
function logResolve(data, message, level, meta, resolve) {
  // Set default value of resolve
  resolve = _.isFunction(resolve) ? resolve : Promise.resolve;

  // Log it
  log(message, level, meta);

  return resolve(data);
}

/**
 * @param {String} message
 * @param {String} [level='info']
 * @param {Object} [meta]
 * @param {Function} [reject=Promise.reject]
 */
function logReject(data, message, level, meta, reject) {
  // Set default value of reject
  reject = _.isFunction(reject) ? reject : Promise.reject;

  // Log it
  log(message, level, meta);

  return reject(data);
}
/**
 * Returns true or false for all properties of *target* matches those of *source*.
 * Any property names matching an elemtn in *exclude* won't be checked.
 *
 * NOTE: not all properties must be present in target for a truthy return,
 * source may contain more properties and still be considered similar.
 *
 * @param {Object} source - Object to compare against
 * @param {Object} target - Object to compare
 * @param {Array} exclude - optional, key names to not check
 * @return {Boolean}
 */
function lazyCompare(source, target, exclude) {
  // Check instance equality and return true if truthy
  // This also checks whether both are undefined or null
  if (source == target) { return true; }

  // If either is falesy, they aren't equal
  if (!source || !target) { return false; }

  // Ensure exclude is an array
  if (!_.isArray(exclude)) { exclude = []; }

  // Get keys for comparison
  var keys = _.chain(target)
    .map(function (value, key) { return key; })
    .filter(function (key) { return !~exclude.indexOf(key); })
    .value();

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    if (_.isArray(source[key])) {
      // For arrays
      if (_.difference(source[key, target[key]]).length) { return false; }
    } else if (_.isDate(source[key])) {
      // For dates
      if (source[key].getTime() != target[key].getTime()) { return false; }
    } else if (_.isObject(source[key])) {
      // For plain objects
      return lazyCompare(source[key], target[key]);
    } else {
      // For values
      if (source[key] != target[key]) { return false; }
    }
  }

  return true;
}

/**
 * Makes a GET request to *url*
 * and returns a promise of the body as a string.
 *
 * If *doParse* is true, return the body as parsed
 *
 * @param {String} url - URI to request
 * @param {Object} options - optional, options object
 * @parma {Boolean} doParse
 * @return {Promie<String|Object>}
 */
function getPage(url, options, doParse) {
  return new Promise(function (resolve, reject) {
    // *options* must be an object
    if (!_.isObject(options)) { options = {}; }

    request.get({
      uri: url,
      encoding: options.encoding || null,
      headers: _.assign({}, {
        'Connection': 'keep-alive'
      }, options.headers)
    }, function (err, res, body) {
      if (err) { reject(err); }
      else {
        var _body = body.toString('utf8')

        // Only parse if doParse is truthy
        if (!doParse)  { return resolve(_body); }

        var parsed = _.attempt(function () { return JSON.parse(_body); })

        resolve(
          _.isError(parsed)
            ? _body
            : parsed
        );

      }
    })
  });
}

/**
 * Gets all pages in *items* and returns them as a promise.
 * Pages are gotten 50 at a time.
 *
 * @params {Array} items - items to fetch
 * @params {Object} options - request opions
 * @param {Array} urls - DO NOT SET, set recursively!
 * @param {Array} pages - DO NOT SET, set recursively!
 * @return {Promise} -> {Array} Item pages
 */
function getManyPages(items, options, urls, pages) {
  // Initial setup
  if (!urls) {
    urls = _.map(items, function (item) { return _.isObject(item) ? item.url : item; });
    pages = [];
    log('Fetching home items.', 'info', { homeItemsLength: urls.length });
  }

  if (items.length === pages.length) {
    return new Promise(function (resolve, reject) {
      log('Completed fetching home items. All pages gotten', 'info', { homeItemsLength: urls.length });
      resolve(pages);
    });
  }

  var toGet = _.map(urls.slice(pages.length, pages.length + 50), function (url) { return getPage(url, options); });

  return Promise.all(_.map(toGet, function (prom) { return _.isFunction(prom.reflect) ? prom.reflect() : Promise.resolve(prom).reflect() }))
  .then(function (_pages) {
    var res = _.map(_pages, function (val) { return val.isRejected() ? val.reason() : val.value(); });

    var _pages = pages.concat(res);

    log(
      '{part}/{all} pages gotten'
        .replace('{part}', _pages.length)
        .replace('{all}', urls.length),
      'info',
      { fetchedLength: _pages.length, homeItemsLength: urls.length }
    );

    return getManyPages(items, options, urls, _pages);
  });
}


/**
 * Escapes characters which need escaping in a RegExp.
 * This allows for passing in any string into a RegExp constructor
 * and have it seen as literal
 *
 * @param {String} text
 * @return {String}
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s\/]/g, "\\$&");
};

/**
 * Returns an escaped RegExp object as the literal string *text*.
 * Flags are optional, but can be provided.
 *
 * @param {String} text
 * @param {String} flags - optional
 * @return {Object} - RegExp object
 */
function literalRegExp(text, flags) {
  return new RegExp(escapeRegex(text), flags);
}

/**
 * Returns the start of the upcoming *month*
 * as a moment object.
 *
 * @param {Date} now
 * @param {Number|String} month
 * @return {Moment}
 */
function nextMonth(now, month) {
  var input = moment(now);
  var output = moment(input).startOf('month').month([month].join(' '));

  return (output > input || input.month() === output.month())
    ? output
    : output.add(1, 'years');
}

/**
 * Returns the closes date provided by month and day
 *
 * @param {String|Number} month
 * @param {String|Number} day
 * @param {Date} baseDate - Defaults to now
 * @return {Date}
 */
function getClosestDate(month, day, baseDate) {
  baseDate = baseDate || new Date();

  // Return *baseDate* if no month is provided
  if (!month) return baseDate;

  var currentYear = moment(baseDate).startOf('month').month(month).date(day || 1);

  // Return the date closes to *baseDate*
  return [
    currentYear.subtract(1, 'years').toDate(),
    currentYear.toDate(),
    currentYear.add(1, 'years').toDate(),
  ]
  .sort(function (a, b) { return Math.abs(a - baseDate) > Math.abs(b - baseDate) })
  .shift();

}

/**
 * Returns a shortened BitLy URL for *homeItem* (either string or URL).
 *
 * @param {Object|String} homeItem HomeItem or URL to shorten URL for
 * @return {Promise} -> {String}
 */
function getShortUrl(homeItem) {
  return new Promise(function (resolve, reject) {
    // Assume homeItem is an URL if it's a string, otherwise get the url
    var _url = _.isString(homeItem)
      ? homeItem
      : homeItem.url;

    var bitlyUrl = [
      'https://api-ssl.bitly.com',
      '/v3/shorten?access_token=ACCESS_TOKEN&longUrl='.replace('ACCESS_TOKEN', config.bitlyToken),
      encodeURI(_url.replace('?', '/?'))
    ].join('');

    log('Getting shortened URL.', 'info', { url: _url });

    getPage(bitlyUrl)
    .then(function (bitly) {
      // Try to parse and/or get the data
      var data = _.attempt(function () { return JSON.parse(bitly).data || bitly.data; });

      var _err;

      if (!data) {
        _err = new Error('No Bitly data received');
      } else if (_.isError(data)) {
        _err = data;
      }

      if (_err) {
        log('Failed to shorten url.', 'info', { url: _url, error: _err.toString() });
        return reject(_err);
      }

      var shortUrl = data.url;

      log('Successfully got shortened url', 'info', { url: _url, shortUrl: shortUrl });

      // Resolve the shortened url
      resolve(shortUrl);
    })
    .catch(function (err) {
      log('Failed to shorten url.', 'info', { url: _url, error: err.toString() });
      reject(err);
    });
  });
}

/**
 * Calls all promises in chunks.
 *
 * @param {Array} promiseFunctions Array of functions returning
 * @param {Number} chunkSize The number of items to chunk together promises
 * @param {Array} finished DO NOT SET, array of finished promises
 * @return {Promise} -> {Array}
 */
function chunkSequence(promiseFunctions, chunkSize, finished) {
  // Initial setup
  if (_.isUndefined(finished)) {
    finished = [];
  }

  // Finish iterations
  if (promiseFunctions.length === finished.length) {
    return Promise.resolve(finished);
  }

  var _length = finished.length;

  // Get the promise functions to call this round
  var _promiseFunctions = isFinite(chunkSize)
    ? promiseFunctions.slice(_length, _length + chunkSize)
    : _promiseFunctions;

  return Promise.all(_.map(_promiseFunctions, function (promiseFunction) {
    // Return the promise
    if (_.isFunction(promiseFunction)) {
      // Call the function and reflect it
      return promiseFunction().reflect();
    } else {
      // Only reflect it
      return promiseFunction.reflect();
    }
  }))
  .then(function (results) {
    var _values = _.map(results, function (res) { return res.isRejected() ? res.reason() : res.value(); });

    return chunkSequence(promiseFunctions, chunkSize, finished.concat(_values));
  })
  .catch(Promise.reject);
}

/**
 * Recursively calls all *promises* in sequence
 * and resolve when all promises are finished.
 *
 * Takes both pure promises and functions returning promises.
 *
 * NOTE: If the array contains functions, these mustn't require parameters,
 * as *sequence* won't pass in any at the moment.
 *
 * @param {Array} promises Array of promises to perform
 * @param {Array} output The output array, do not set!
 * @return {Promise<[]>}
 */
function sequence(promises, output) {
    // Make sure output is defined
    if (_.isUndefined(output)) { output = []; }

    // Make sure promises is difined
    if (_.isUndefined(promises)) { promises = []; }

    // When finished
    if (promises.length === output.length) {
      return Promise.resolve(output);
    }

    // Allow both promises and functions returning promises be used.
    var _promise = _.isFunction(promises[output.length])
        ? promises[output.length]()
        : promises[output.length];

    // Call the promise and then return recursively
    return _promise.then(function (result) {
        // Recursion
        return sequence(promises, output.concat([result]));
    })
    ['catch'](function (err) {
        // Recursion
        return sequence(promises, output.concat([err]));
    });
}

/**
 * @param {Object} res Express response object
 * @param {Error} err
 */
function handleError(res, err) {
  res.status(500).send('Internal error');
  log('The following error occured: ' + err.toString());
}

/**
 * @param {Promise[]|Promise} items
 * @return {Promise[]|Promise}
 */
function reflect(items) {
  return _.isArray(items)
    ? _.map(items, function (item) { return _.isFunction(item.reflect) ? item.reflect() : Promise.resolve(item).reflect() })
    : _.isFunction(items.reflect) ? items.reflect() : Promise.resolve(items).reflect();
}

/**
 * @param {Promise[]} promises
 * @return {Promise<[]>}
 */
function settle(promises) {
  return Promise.all(_.map(promises, reflect))
  .then(function (vals) {
    return Promise.resolve(_.map(vals, function (val) { return val.isRejected() ? val.reason() : val.value(); }))
  });
}

/**
 * @param {Any} message The message to print
 * @param {Number} verticalPadding Vertical padding as number of '\n', if 0 then none.
 * @param {Boolean} asIs Should *message* be printed as is? Defaults to false
 */
function print (message, verticalPadding, asIs) {
  // Use default values if undefined
  verticalPadding = !_.isUndefined(verticalPadding) ? verticalPadding : 0;
  asIs = !_.isUndefined(asIs) ? asIs : false;

  if (!!verticalPadding) { console.log(_.times(verticalPadding, function () { return '\n' }).join('')); }
  if (_.some([
    _.isError(message),
    _.isString(message),
    _.isNumber(message),
    _.isUndefined(message),
  ])) { asIs = true; }
  log(
    !!asIs ? message : JSON.stringify(message, null, 4)
  );
  if (!!verticalPadding) { console.log(_.times(verticalPadding, function () { return '\n' }).join('')); }
}

/**
 * Wraps the Mongoose save function in a promise.
 *
 * @param {Object} model Mongoose model to be saved
 * @return {Promise<Object>}
 */
function savePromise(model) {
  return new Promise(function (resolve, reject) {
    model.save(function (err, _model) {
      if (err) { return reject(err); }
      resolve(_model);
    });
  });
}

module.exports = {
  log: log,
  logResolve: logResolve,
  logReject: logReject,
  getPage: getPage,
  getManyPages: getManyPages,
  lazyCompare: lazyCompare,
  escapeRegex: escapeRegex,
  literalRegExp: literalRegExp,
  nextMonth: nextMonth,
  getClosestDate: getClosestDate,
  phone: phone,
  getShortUrl: getShortUrl,
  chunkSequence: chunkSequence,
  sequence: sequence,
  handleError: handleError,
  reflect: reflect,
  settle: settle,
  print: print,
  savePromise: savePromise,
};
