'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var express = require('express');
var router = express.Router();

var controller = require('./crawler.controller');

/**
 * Gets all items pages on the index page at *pageNum*.
 * 
 * Route: /crawler/:pageNum
 */
router.get('/:pageNum', function (req, res) {
  if (!req.params.pageNum) {
    return handleError(res, new Error('No pageNum provided'));
  }
  controller.getPageAt(req.params.pageNum)
  .then(function (items) { res.status(200).json(items); })
  .catch(function (err) { handleError(res, err); })
});

/**
 * Gets item page at *itemNum* on the index page at *pageNum*.
 * 
 * Route: /crawler/:pageNum/:itemNum
 */
router.get('/:pageNum/:itemNum', function (req, res) {
  if (!req.params.itemNum) {
    return handleError(res, new Error('No pageNum provided'));
  }
  
  controller.getItemPageAt(req.params.pageNum, req.params.itemNum)
  .then(function (items) { res.status(200).json(items); })
  .catch(function (err) { handleError(res, err); })
});

/**
 * Sends a response with the status code 500
 * and *err* as body.
 * 
 * @param {Object} res - express response object
 * @param {Object} err - error object
 */
function handleError(res, err) {
  res.status(500).json(err);
}

module.exports = router;
