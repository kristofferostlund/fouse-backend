'use strict'

var _ = require('lodash');
var mongoose = require('mongoose');
var request = require('request');
var Promise = require('bluebird');
var $ = require('cheerio');

var utils = require('../utils/general.utils');

// The URL for every rentable blocket ad. ish.
var __baseURL = 'http://www.blocket.se/bostad/uthyres/stockholm?o={pageNum}&f=p&f=c&f=b';

/**
 * Returns the __baseUrl to the page for *num*.
 * For example, if num is 1 it returns:
 * 'http://www.blocket.se/bostad/uthyres/stockholm?o=1&f=p&f=c&f=b'
 * 
 * @param {String|Number} num
 * @return {String} - the base url + the page number
 */
function urlByNum(num) {
  return __baseURL.replace(/{pageNum}/gi, '' + num);
}


/**
 * Processes the ads list page and returns an array of items.
 * If the last page is hit, it returns an object with only one property of info.
 * 
 * @param {String} content - HTML content as string
 * @return {Promise} -> {Array} of list items
 */ 
function processIndexPage(content) {
  return new Promise(function (resolve, reject) {
    
    // Resolve this if no content no ads was found.
    if (~content.indexOf('ads-not-found-container')) {
      return resolve({ info: 'Non content page.' })
    }

    content = content.replace(/\r?\n|\r|\t/g, '');
    var html = $.load(content);

    var items = _.chain(html('div[itemtype="http://schema.org/Offer"]'))
      .map(function (e) { return e; })
      .map(processListItem)
      .value();

    resolve(items);
  });
}

/**
 * Returns an object like the following:
 * {
 *   title: String,
 *   rooms: String,
 *   size: String,
 *   rent: String,
 *   location: String,
 *   date: Date,
 *   url: String,
 *   thumbnail: String
 * }
 * @param {Object} e - Cheerio object
 * @return {Object}
*/
function processListItem(e) {
  var anchor = $(e).find('a')[0];
  var rent = $(e).find('.monthly_rent').text();
  
  // Get image and check if it exists.
  var thumbnail = _.attempt(function () { return anchor.attribs.style.match(/\(.*?\)/g).toString().replace(/[()]/g, ''); });
  if (_.isError(thumbnail)) { thumbnail = undefined; }

  return {
    title: $(e).find('.media-heading').text(),
    rooms: $(e).find('.rooms').text(),
    size: $(e).find('.li_detail_params.size').text(),
    rent: rent,
    price: parseInt(rent.replace(/[^0-9]/gi, '')) || undefined,
    location: $(e).find('.address').text(),
    date: new Date($(e).find('.jlist_date_image')[0].attribs['datetime']),
    url: anchor.attribs.href.replace(/('n)$/, ''), // The replace removes the very annoying 'n on the end which screws linking up.
    thumbnail: thumbnail
  };

};

/**
 * Returns a promise of the index page at *pageNum*.
 * 
 * Serves as a shorthand for utils.getPage(urlByNum(*pageNum*)).then(processIndexPage)
 * 
 * @param {Number|String} pageNum
 * @return {Promise} -> {Object} - single index page
 */
function getIndexPage(pageNum) {
  return utils.getPage(urlByNum(pageNum))
    .then(processIndexPage);
}

/**
 * Recursively gets all index pages.
 * 
 * @param {Array} _items - set recursively
 * @param {Number} pageNum - set recursively
 * @param {Boolean} isDone - set recursively
 * @return {Promise} -> {Array}
 */
function getAllIndexPages(_items, pageNum, isDone) {
  if (!_items) {
    _items = [];
    pageNum = 1;
  }

  if (isDone) {
    return new Promise(function (resolve, reject) {
      resolve(_items);
    });
  }
  
  return getIndexPage(pageNum)
    .then(function (items) {
      pageNum++;
    
      // After cleaning the page, this is returned: { info: 'Non content page.' }
      if (items && items.info) {
        return getAllIndexPages(_items, pageNum, true);
      } else {
        // Recursion!
        return getAllIndexPages(_items.concat(items), pageNum);
      }
    });
}

module.exports = {
  getAllIndexPages: getAllIndexPages,
  getIndexPage: getIndexPage
};