'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');

var HomeItem = require('../models/homeItem/homeItem.model');
var utils = require('../utils/general.utils');

var options = {
  price: { $lt: 8000 },
  location: /stockholm/gi
};


var sweMonths = [
  'Januari',
  'Februari',
  'Mars',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'Augusti',
  'Septemper',
  'Oktober',
  'November',
  'December'
];

var sweMonthsShort = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Maj',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec'
];

/**
 * Checks whether there is a month referenced in the text.
 * 
 * @param {String} body - string to test
 * @return {Boolean}
 */
function hasMonth(body) {
  return sweMonths.concat(sweMonthsShort)
    .some(function (month) { return utils.literalRegExp(month, 'gi').test(body); });
}

/**
 * Checks whether there are amounts of months referenced in the item.
 * 
 * @param {String} body
 * @return {Boolean}
 */
function hasAmountOfMonths(body) {
  return /[0-9]{1,2} {0,1}mån/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function isSwap(body) {
  return /byte|byte(s|s )krav/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function isShared(body) {
  return /dela|del (i|med)|delas med|dela en|uthyrningsdel|inneboende|rum.{1,15}(i|till)|rum.{1,20}(?=hyr)|hyr.{1,15}(?=möblerat.{1,10}(?=rum))|hyr.{1,20}(?=rum)|room|mate|share (an|a)|a room|room.{1,40}for rent|rent.{1,15}room| room is|furnished room/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forGirls(body) {
  return /tjej|kvinn|flick|girl|wom(a|e)n/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forCommuters(body) {
  return /pendlare|veckopendlare/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function lacksKitchen(body) {
  return !/kök saknas|inget kök| (ej|ingen).{1,15}tillgång.{1,15}kök|ej kök|no( | access.{1,5})kitchen/gi.test(body);
}

/**
 * @param {String} body
 * @param {String} title
 * @returm {Object}
 */
function getClassifications(body, title) {
  return {
    girls: forGirls(body) || forGirls(title),
    commuters: forCommuters(body) || forCommuters(title),
    shared: isShared(body) || isShared(title),
    swap: isSwap(body) || isSwap(title),
    noKitchen: lacksKitchen(body) || lacksKitchen(title)
  };
}
