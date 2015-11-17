'use strict'

var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');

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
  
  // TODO: add object comparison, recursion maybe?
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (_.isArray(source[key])) {
      // For arrays
      if (_.difference(source[key, target[key]]).length) { return false; }
    } else if (_.isDate(source[key])) {
      // For dates
      if (source[key].getTime() != target[key].getTime()) { return false; }
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
 * @param {String} url - URI to request
 * @param {Object} options - optional, options object
 */
function getPage(url, options) {
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
      else { resolve(body.toString('utf8')); }
    })
  });
}

function getManyPages(items, options, urls, pages) {
  // Initial setup
  if (!urls) {
    urls = _.map(items, function (item) { return _.isObject(item) ? item.url : item; });
    pages = [];
    console.time('Fetching ' + urls.length + ' items')
  }
  
  if (items.length === pages.length) {
    return new Promise(function (resolve, reject) {
      console.timeEnd('Fetching ' + urls.length + ' items')
      console.log('All pages gotten!');
      resolve(pages);
    });
  }
  
  var toGet = _.map(urls.slice(pages.length, pages.length + 50), function (url) { return getPage(url, options); });
  
  return Promise.settle(toGet)
  .then(function (_pages) {
    var res = _.map(_pages, function (val) { return val.value(); });
    console.log(res.length + ' pages fetched.', new Date().toISOString());
    return getManyPages(items, options, urls, pages.concat(res));
  });
  // request like ten items and then do some recursion
}

module.exports = {
  getPage: getPage,
  getManyPages: getManyPages,
  lazyCompare: lazyCompare
};
