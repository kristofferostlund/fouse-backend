'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var indexer = require('./crawler.indexer');
var itemHandler = require('./crawler.itemHandler');

/**
 * Returns a promise of an array of complete items.
 * 
 * @param {Number|String} pageNum
 * @return {Promise} -> {Array} of complete items
 */
function getPageAt(pageNum) {
    return indexer.getIndexPage(pageNum)
    .then(itemHandler.getManyItemPages);
}

module.exports = {
  getPageAt: getPageAt
}