'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var utils = require('../../../utils/utils');
var auth = require('../../../services/auth.service');
var HomeItem = require('../../../models/homeItem/homeItem.model');
var response = require('./../api.response.v0');

/**
 * Route GET '/api/home-items'
 */
function listHomes(req, res) {
  // Get the page number from the query params
  var page = parseInt(_.get(req, 'query.page')) || 1;

  // *page* must be creater than zero, otherwise defaults to 1
  page = page >= 1 ? page : 1;

  // Get the page size/limit from the query params
  var limit = parseInt(_.get(req, 'query.limit')) || 20;

  //  Limut must be greater than zero, otherwise defaults to 20
  limit = limit >= 1 ? limit : 20 ;

  // Get the number of items to skip
  var _skip = (page - 1 ) * limit;

  /** @type {{}[]} */
  var _items;

  HomeItem.find({ isDisabled: { $ne: true }, active: true })
  .skip(_skip)
  .limit(limit)
  .sort({ $natural: -1 })
  .select('-__v -notified -rent -body -adress -address -active -owner -images -tel -dateCreated -dateModified')
  // .select('title rooms size price location thumbnail url')
  .exec()
  .then(function (homeItems) {

    _items = homeItems;

    return HomeItem.find({ isDisabled: { $ne: true }, active: true })
      .count()
      .exec();
  }).then(function (totalCount) {
    // Get the page count
    var _pageCount = Math.floor(totalCount / limit) + 1;
    // Get the next page
    var _nextPage = page < _pageCount ? page + 1 : null;

    response.send(res, { data: _items, meta: { itemCount: _items.length, totalCount: totalCount, maxPage: _pageCount, nextPage: _nextPage } });
  })
  .catch(function (err) {
    response.internalError(res, err);
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
    response.send(res, { data: homeItem });
  })
  .catch(function (err) {
    response.internalError(res, err);
  });
}

module.exports = {
  listHomes: listHomes,
  getHome: getHome,
}
