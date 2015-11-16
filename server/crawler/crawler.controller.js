'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var indexer = require('./crawler.indexer');
var itemHandler = require('./crawler.itemHandler');

var homeItem = require('../models/homeItem/homeItem.controller');

/**
 * Returns a promise of an array of complete items.
 * 
 * @param {Number|String} pageNum
 * @return {Promise} -> {Array} of complete items
 */
function getPageAt(pageNum) {
  return indexer.getIndexPage(pageNum)
  .then(itemHandler.getManyItemPages)
  .then(function (items) {
    return new Promise(function (resolve, reject) {
      // Save to db
      homeItem.createHistorical(items);
      resolve(items);
    });
  }); // Insert into db.
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
  .then(function (items) {
    return new Promise(function (resolve, reject) {
      // Save to db
      homeItem.createHistorical(items);
      resolve(items);
    });
  }); // Insert into db.
}

module.exports = {
  getPageAt: getPageAt,
  getItemPageAt: getItemPageAt,
  getAllItems: getAllItems
}