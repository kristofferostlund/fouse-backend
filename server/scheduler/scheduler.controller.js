'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var later = require('later');
var moment = require('moment');

var crawler = require('../crawler/crawler.controller');
var homeItemController = require('../models/homeItem/homeItem.controller');

/**
 * Gets the first page.
 */
function getFirstPage() {
  console.log('Getting first page at ', moment().format('YYYY-MM-DD, HH:mm'));
  crawler.getPageAt(1)
  .then(homeItemController.getItemsOfInterest)
  .then(function (items) {
    // Send sms if any are of interest
    console.log('First page gotten at ', moment().format('YYYY-MM-DD, HH:mm'));
  })
  .catch(function (err) {
    console.log(err);
  });
}

/**
 * Gets every page.
 */
function getEveryPage() {
  console.log('Getting all pages at ', moment().format('YYYY-MM-DD, HH:mm'));
  crawler.getAllItems()
  .then(homeItemController.getDaySummary)
  .then(function (items) {
    // Send an email if any are of interest
    console.log('All pages gotten at ', moment().format('YYYY-MM-DD, HH:mm'));
  })
  .catch(function (err) {
    console.log(err);
  });
}

// Schedule to get the first index page
var scheduleEvery15 = later.parse.recur()
  .every(15).minute()
  .except().every().hour().between(0,6);

// Schedule to get every index page
var scheduleOn6 = later.parse.recur()
  .on(6).hour();

console.log('Schedule starts in 15 minutes.');
// Starts schedules in 15 minutes
setTimeout(function() {
  later.setInterval(getFirstPage(), scheduleEvery15);
  later.setInterval(getEveryPage(), scheduleOn6);
}, 900000);

