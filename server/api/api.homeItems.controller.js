'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var utils = require('./../utils/utils');
var auth = require('./../services/auth.service');
var HomeItem = require('./../models/homeItem/homeItem.model');

/**
 * Route GET '/api/home-items'
 */
function listHomes(req, res) {
  // Get the page number from the query params
  var page = _.get(req, 'query.page') || 1;

  // *page* must be creater than zero, otherwise defaults to 1
  page = page >= 1 ? page : 1;

  // Get the page size/limit from the query params
  var limit = _.get(req, 'query.limit') || 20;

  //  Limut must be greater than zero, otherwise defaults to 20
  limit = limit >= 1 ? limit : 20 ;

  // Get the number of items to skip
  var _skip = (page - 1 ) * limit;

  HomeItem.find({ isDisabled: { $ne: true }, active: true })
  .skip(_skip)
  .limit(limit)
  .sort({ $natural: -1 })
  .select('-__v')
  .exec()
  .then(function (homeItems) {
    res.status(200).json(homeItems);
  })
  .catch(function (err) {
    utils.handleError(res, err);
  });
}

/**
 * Route GET '/api/home-items'
 */
function getHome(req, res) {
  var homeItemId = req.params.id;

  HomeItem.findById(homeItemId)
  .select('-__v')
  .exec()
  .then(function (homeItem) {
    res.status(200).json(homeItem);
  })
  .catch(function (err) {
    utils.handleError(res, err);
  });
}

module.exports = {
  listHomes: listHomes,
  getHome: getHome,
}
