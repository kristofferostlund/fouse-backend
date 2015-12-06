'use strict'

var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var $ = require('cheerio');

var utils = require('../utils/general.utils');

/**
 * Processes the html to get the images, body and owner.
 * 
 * @param {String} content - html page as string
 * @return {Promise} -> {Object}
 */
function processItemPage(content) {
  return new Promise(function (resolve, reject) {
    // Remove extra whitespace
    content = content
      .replace(/\r?\n|\r|\t/g, ' ')
      .replace(/<br\s*\/>/gi, '\n\n');
    
    // Load the cheerio instance
    var html = $.load(content);
    
    // Images are linked in meta tags
    var images = _.map(html('meta[property="og:image"]'), function (element) {
      // Image url is accessed by content
      return element.attribs.content;
    });
    
    // Owner is in an h2 tag with the class h4
    var owner = html('h2.h4').text()
      .replace(/uthyres av: /ig, '')
      .replace(/^\s|\s$/, ''); // Remove leading and trailing whitespace
    
    var body = html('.object-text').text()
      .replace(/ +/g, ' ') // Replace multiple spaces by single space
      .replace(/\n+/g, '\n\n'); // Replace multiple newlines by double newlines
      
    // Get the adress if it exists, which is an h3 tag with the class h5
    var adress = _.attempt(function () {
      var addrContent = _.find(html('h3.h5').contents(), function (data) {
        // return find
        return !/hyra tryggt/gi.test(data.data);
      });
      
      // return attempt
      return addrContent.data;
    });
    
    // if an error was caught, there's no adress
    if (_.isError(adress)) { adress = undefined; }
    
    resolve({
      owner: owner,
      body: body,
      adress: adress,
      images: images,
      disabled: (/Hittade inte annonsen/.test(content)) ? true : undefined
    });
  });
}

/**
 * Processes all the item pages.
 * 
 * @param {Array} contents
 * @return {Promise} -> {Array} (ItemPage)
*/
function processManyItemPages(contents) {
  
  if (!_.isArray(contents)) { contents = [ contents ]; }
  
  return new Promise(function (resolve, reject) {
    Promise.settle(_.map(contents, processItemPage))
    .then(function (vals) {
      resolve(_.map(vals, function (val) { return val.value(); }));
    })
    .catch(resolve);
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
    utils.getPage(indexItem.url)
    .then(processItemPage)
    .then(function (itemPage) {
      resolve(_.assign({}, itemPage, indexItem));
    });
  });
}

/**
 * Returns a promise of a an array of complete items.
 * 
 * @param {Array} indexItems - array of items from the index list
 * @return {Promise} -> {Array} of complete items.
 */
function getManyItemPages(indexItems) {
  return new Promise(function (resolve, reject) {
    // Promise.settle(_.map(indexItems, getItemPage))
    utils.getManyPages(indexItems)
    .then(processManyItemPages)
    .then(function (itemPages) {
      return new Promise(function (resolve, reject) {
        resolve(
          _.map(indexItems, function (iItem, i) {
            return _.assign({}, iItem, itemPages[i]);
          })
        );
      });
    })
    .then(resolve)
    .catch(reject);
  });
}

module.exports = {
  getItemPage: getItemPage,
  getManyItemPages: getManyItemPages
};