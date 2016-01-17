'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var timeAnalyser = require('./analyser.time');
var HomeItem = require('../models/homeItem/homeItem.model');
var utils = require('../utils/general.utils');

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
  return /kök saknas|inget kök| (ej|ingen).{1,15}tillgång.{1,15}kök|ej kök|no( | access.{1,5})kitchen/gi.test(body);
}

/**
 * @param {Object} homeItem
 * @returm {Object}
 */ 
function getClassifications(homeItem) {
  return _.assign({}, homeItem, { classification: {
    girls: forGirls(homeItem.body) || forGirls(homeItem.title),
    commuters: forCommuters(homeItem.body) || forCommuters(homeItem.title),
    shared: isShared(homeItem.body) || isShared(homeItem.title),
    swap: isSwap(homeItem.body) || isSwap(homeItem.title),
    noKitchen: lacksKitchen(homeItem.body) || lacksKitchen(homeItem.title)
  }});
}

/**
 * @param {Array|Object} homeItems
 * @return {Array|Object}
 */
function classify(homeItems) {
  return new Promise(function (resolve, reject) {
    if (!_.isArray(homeItems)) { resolve(getClassifications(homeItems)); }
    else { resolve(_.map(homeItems, getClassifications)); }
  });
}

module.exports = {
  getClassifications: getClassifications,
  classify: classify
};

// TODO: Add area stuff (use Google maps API?)
