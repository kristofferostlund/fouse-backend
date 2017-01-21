'use strict'

const _ = require('lodash')
const Promise = require('bluebird')

const utils = require('../../../utils/utils')
const auth = require('../../../services/auth.service')
const HomeItem = require('../../../models/homeItem/homeItem.model')
const response = require('./../api.response.v0')

/**
 * Route GET '/api/home-items'
 */
function listHomes(req, res) {
  // Get the page number from the query params
  let page = parseInt(_.get(req, 'query.page')) || 1

  // *page* must be creater than zero, otherwise defaults to 1
  page = page >= 1 ? page : 1

  // Get the page size/limit from the query params
  let limit = parseInt(_.get(req, 'query.limit')) || 20

  //  Limut must be greater than zero, otherwise defaults to 20
  limit = limit >= 1 ? limit : 20

  // Get the number of items to skip
  const skip = (page - 1) * limit

  /** @type {{}[]} */
  let items

  return HomeItem
    .find({ isDisabled: { $ne: true }, active: true })
    .sort({ $natural: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v -notified -rent -body -address -active -owner -images -tel -dateCreated -dateModified')
    // .select('title rooms size price location thumbnail url')
    .exec()
    .then(homeItems => {
      items = homeItems

      return HomeItem
        .find({ isDisabled: { $ne: true }, active: true })
        .count()
        .exec()
    })
    .then(totalCount => {
      // Get the page count
      const maxPage = Math.floor(totalCount / limit) + 1
      // Get the next page
      const nextPage = page < maxPage ? page + 1 : null

      response.send(res, { data: items, meta: { itemCount: items.length, totalCount, maxPage, nextPage } })
    })
    .catch(err => response.internalError(res, err))
}

/**
 * Route GET '/api/home-items'
 */
function getHome(req, res) {
  var homeItemId = req.params.id

  HomeItem.findById(homeItemId)
    .select('-__v')
    .exec()
    .then(function (homeItem) {
      response.send(res, { data: homeItem })
    })
    .catch(function (err) {
      response.internalError(res, err)
    })
}

/**
 * Returns an array of the latest 10 homeItems
 *
 * Route GET '/api/home-items/latest'
 */
function listLatest(req, res) {
  HomeItem.find({ isDisabled: { $ne: true }, active: true })
    .select('-__v -notified -rent -body -address -active -owner -images -tel -dateCreated -dateModified')
    .sort({ $natural: -1 })
    .limit(10)
    .exec()
    .then(homeItems => {
      return response.send(res, { data: homeItems })
    })
    .catch(err => {
      return response.internalError(res, err)
    })
}

module.exports = {
  listHomes: listHomes,
  listLatest: listLatest,
  getHome: getHome,
}
