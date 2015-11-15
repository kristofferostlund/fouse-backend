'use strict'

var _ = require('lodash');
var mongoose = require('mongoose');
var request = require('request');
var Promise = require('bluebird');
var $ = require('cheerio');

/**
 * Returns a promise of the page at *url*.
 * 
 * @param {String} url - the url to get the page for
 * @return {Promise} -> {String}
 */
function getPage(url) {
  return new Promise(function (resolve, reject) {
    request.get({
      uri: url, 
      encoding: null
    }, function (err, res, body) {
      if (err) { reject(err); }
      else { resolve(body.toString('utf8')); }
    });
  });
}

/**
 * @param {String} content - html page as string
 * @return {Promise} -> {Object}
 */
function processItemPage(content) {
  return new Promise(function (resolve, reject) {
    // Remove extra whitespace
    content = content
        .replace(/\r?\n|\r|\t/g, '')
        .replace(/<br\s*\/>/gi, '\n');
    
    // Load the cheerio instance
    var html = $.load(content);
    
    // Images are linked in meta tags
    var images = _.map(html('meta[property="og:image"]'), function (element) {
      // Image url is set as content
      return element.attribs.content;
    });
    
    // Owner is in an h2 tag with the class h4
    var owner = html('h2.h4').text()
      .replace(/uthyres av: /ig, '')
      .replace(/^\s|\s$/, ''); // Remove leading and trailing whitespace
    
    var body = html('.object-text').text()
      .replace(/\s+/g, ' ')// clean whitespace to spaces
      .replace(/((?![a-ö])[^\w|^\s](?=[A-Z]))/g, "$1\n\n"); // Add new lines after non letters?
      
    resolve({
      owner: owner,
      body: body,
      images: images,
      disabled: (/Hittade inte annonsen/.test(content)) ? true : undefined
    });
  });
}

/**
 * Returns a promise of a combined object of *indexItem* and its corresponding item page.
 * 
 * @param {Obejct} indexItem - item from the index list
 * @return {Promise} -> {Objet} - *indexItem* and the item page content together
 */
function getItemPage(indexItem) {
  return new Promise(function (resolve, reject) {
    getPage(indexItem.url)
    .then(processItemPage)
    .then(function (itemPage) {
      resolve(_.assign({}, itemPage, indexItem));
    });
  });
}

/**
 * Returns a promise of a an array of complete items
 * 
 * @param {Array} indexItems - array of items from the index list
 * @return {Promise} -> {Array} of complete items.
 */
function getManyItemPages(indexItems) {
  return new Promise(function (resolve, reject) {
    Promise.settle(_.map(indexItems, getItemPage))
    .then(function (vals) { 
      resolve(_.map(vals, function (val) { return val.value(); }))
    })
    .catch(reject);
  });
}

module.exports = {
  getItemPage: getItemPage,
  getManyItemPages: getManyItemPages
};