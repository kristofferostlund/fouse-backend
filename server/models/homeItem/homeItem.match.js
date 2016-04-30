'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

/**
 * Returns true or false for whether *user* matches *homeItem*.
 *
 * @param {Object} user User object to match *homeItem* against
 * @param {Array} homeItem HomeItem object to match *User against*
 * @return {Boolean}
 */
function userMatchHomeItem(user, homeItem) {
  return _.every([
    priceInRange(homeItem.price, _.get(user, 'options.maxPrice'), _.get(user, 'options.minPrice')),
    classificationsMatch(homeItem.classification, _.get(user, 'options.classification')),
    timeMatch(homeItem.time, _.get(user, 'options.time')),
  ]);
}

/**
 * Returns true or false for whether *price* is in range of *minPrice* and *maxPrice*.
 *
 * If *price* is undefined, true will be returned.
 * If *maxPrice* is falsy, it'll be ignored.
 * If *minPrice* is falsy, it'll be ignored.
 *
 * @param {Number} price The price to check if it's in range
 * @param {Number} maxPrice The maximum price to match.
 * @param {Number} minPrice The minimum price to match.
 * @return {Boolean}
 */
function priceInRange(price, maxPrice, minPrice) {
  // Handle missing prices
  if (_.isUndefined(price)) { return true; }

  return _.every([
    // Either *maxPrice* is falsy, or maxPrice is <= price
    !maxPrice || price <= maxPrice,
    // Either *minPrice* is falsy, or minr
    !minPrice || minPrice <= price
  ]);
}

/**
 * Return true or false for whether the classifications are "matching".
 *
 * Currently only supports "everyone or this specifically".
 * E.G. if a user _only_ wants a commuter's only flat, that is ignored,
 * though if the user _don't_ want a commuter's only flat, those are returned as false.
 *
 * @param {Object} homeClassification The classification object from a HomeItem
 * @param {Object} userClassification The classification object from User.options
 * @return {Boolean}
 */
function classificationsMatch(homeClassification, userClassification) {
  return _.every([
    // Either everyone can apply, or the user don't want to filter out girls only items
    !homeClassification.girls || userClassification.girls,
    // Either the item is for everyone, or the user don't want to filter out commuters only items
    !homeClassification.commuters || userClassification.commuters,
    // Either the item is for everyone, or the user don't want to filter out shared items
    !homeClassification.shared || userClassification.shared,
    // Either the item is for everyone, or the user don't want to filter out swap only items
    !homeClassification.swap || userClassification.swap,
    // Either the item has a kitchen, or the user don't want to filter out items without kitchens
    !homeClassification.noKitchen || userClassification.noKitchen,
  ]);
}

/**
 * Returns true or false for whether the *homeTime* "matches" *userTime*.
 *
 * NOTE: Currently skips max-period.
 *
 * @param {Object} homeTime The time object from a HomeItem
 * @param {Object} userTime The time object from a user
 * @return {Boolean}
 */
function timeMatch(homeTime, userTime) {
  return _.some([
    // There is no end of rental term
    !homeTime.end,
    // The rental is "until further notice"
    homeTime.isLongTerm,
    // Either there is no min period or the period >= min period
    !_.get(userTime, 'period.min') || _.get(userTime, 'period.min') <= homeTime.period
  ])
}

module.exports = {
  userMatchHomeItem: userMatchHomeItem
}
