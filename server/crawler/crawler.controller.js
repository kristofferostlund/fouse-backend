'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var indexer = require('./crawler.indexer');
var itemHandler = require('./crawler.itemHandler');
var analyser = require('../analyser/analyser.controller');

var homeItem = require('../models/homeItem/homeItem.controller');
var HomeItem = require('../models/homeItem/homeItem.model');

var utils = require('./../utils/utils');

/**
 * Returns a promise of an array of complete items.
 *
 * @param {Number|String} pageNum
 * @return {Promise} -> {Array} of complete items
 */
function getPageAt(pageNum) {
  return indexer.getIndexPage(pageNum)
  .then(itemHandler.getManyItemPages)
  .then(analyser.classify)
  .then(analyser.shortenUrls)
  .then(function (items) {
    return new Promise(function (resolve, reject) {
      // Save to db
      homeItem.createHistorical(items);
      resolve(items);
    });
  }); // Insert into db.
}


/**
 * Like getPageAt but returns only after the items been saved to db.
 *
 * @param {Number|String} pageNum
 * @return {Promise} -> {Array} of complete, saved items
 */
function getAndSavePageAt(pageNum) {
  return indexer.getIndexPage(pageNum)
  .then(cleanUrls)
  .then(filterOutExisting)
  .then(itemHandler.getManyItemPages)
  .then(analyser.classify)
  .then(analyser.shortenUrls)
  .then(homeItem.createHistorical);
}

/**
 * Cleans the URLs of all *indexItems* by removing the query params
 * and returns a promise of the result.
 *
 * @param {Array|Object} indexItems
 * @return {Promise}
 */
function cleanUrls(indexItems) {
  var _indexItems = _.isArray(indexItems)
    ? indexItems
    : [ indexItems ];

  return Promise.resolve(
    _.map(_indexItems, function (item) {
      return _.assign({}, item, { url: (item.url || '').replace(/(\?.+)$/, '') })
     })
  );
}

/**
 * Filters out all existing items and only returns new ones.
 *
 * @param {Array|Object} indexItems
 * @return {Promise}
 */
function filterOutExisting(indexItems) {
  return new Promise(function (resolve, reject) {
    var _indexItems = _.isArray(indexItems)
      ? indexItems
      : [ indexItems ];

    HomeItem.find({ disabled: { $ne: true }, url: { $in: _.map(_indexItems, 'url') } })
    .exec(function (err, items) {
      // If an error occured, assume everything is fine.
      if (err) { items = []; }

      // Resolve all indexItems which are not in the DB already.
      resolve(_.filter(_indexItems, function (indexItem) { return !_.find(items, { url: indexItem.url }) }));
    })
  });
}

/**
 * Returns a promise of the item at *pageNum* and *itemNum*.
 *
 * @param {Number|String} pageNum
 * @return {Promise} -> {Array} of complete items
 */
function getItemPageAt(pageNum, itemNum) {
  return indexer.getIndexPage(pageNum)
  .then(function (items) {
    return itemHandler.getItemPage(items[itemNum]);
  })
  .then(analyser.classify)
  .then(analyser.shortenUrls)
  .then(function (items) {
    return new Promise(function (resolve, reject) {
      // Save to db
      homeItem.createHistorical(items);
      resolve(items);
    });
  }); // Insert into db.
}

/**
 * Returns a promise of all home items.
 *
 * @return {Promise} -> {Array} (HomeItem)
 */
function getAllItems() {
  return indexer.getAllIndexPages()
  .then(itemHandler.getManyItemPages)
  .then(analyser.classify)
  .then(analyser.shortenUrls)
  .then(function (items) {
    return new Promise(function (resolve, reject) {
      // Save to db

      resolve(items);
    });
  }); // Insert into db.
}

/**
 * Like getAllItems but returns the saved items.
 *
 * @return {Promise} -> {Array} (HomeItem)
 */
function getAndSaveAllItems() {
  return indexer.getAllIndexPages()
  .then(itemHandler.getManyItemPages)
  .then(analyser.classify)
  .then(analyser.shortenUrls)
  .then(homeItem.createHistorical);
}

module.exports = {
  getPageAt: getPageAt,
  getItemPageAt: getItemPageAt,
  getAllItems: getAllItems,
  getAndSavePageAt: getAndSavePageAt,
  getAndSaveAllItems: getAndSaveAllItems
}