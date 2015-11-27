'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var later = require('later');

var crawler = require('../crawler/crawler.controller');
var homeItemController = require('../models/homeItem/homeItem.controller');

/**
 * Gets the first page.
 */
function getFirstPage() {
  crawler.getPageAt(1)
  .then(homeItemController.getItemsOfInterest)
  .then(function (items) {
    // Send sms if any are of interest
  })
  .catch(function (err) {
    console.log(err);
  });
}

/**
 * Gets every page.
 */
function getEveryPage() {
  crawler.getAllItems()
  .then(homeItemController.getDaySummary)
  .then(function (items) {
    // Send an email if any are of interest
  })
  .catch(function (err) {
    console.log(err);
  });
}

// Schedule to get the first index page
var scheduleEvery15 = later.parse.recur()
  .every(15).minute();

// Schedule to get every index page
var scheduleOn6 = later.parse.recur()
  .on(6).hour();

// later.setInterval(getFirstPage(), scheduleEvery15);
// later.setInterval(getEveryPage(), scheduleOn6);
