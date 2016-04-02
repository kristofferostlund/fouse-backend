'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var later = require('later');
var moment = require('moment');

var config = require('../config');
var crawler = require('../crawler/crawler.controller');
var homeItemController = require('../models/homeItem/homeItem.controller');
var notifier = require('../notifier/notifier.controller');

/**
 * Gets the front page.
 */
function getFrontPage() {
  console.log('Getting front page at', moment().format('YYYY-MM-DD, HH:mm'));
  crawler.getAndSavePageAt(1)
  .then(homeItemController.getItemsOfInterest)
  .then(notifier.notifyUsers)
  .then(function (items) {
    console.log('Front page gotten at', moment().format('YYYY-MM-DD, HH:mm'));

    // Notify if there are any items of interest.
    return notifier.notify(items)
  })
  .then(function (items) {
    if (items && items.length) {
      console.log('All notifications sent.');
    }
  })
  .catch(function (err) {
    console.log(err);
  });
}

/**
 * Gets every page.
 */
function getEveryPage() {
  console.log('Getting all pages at', moment().format('YYYY-MM-DD, HH:mm'));
  crawler.getAndSaveAllItems()
  .then(homeItemController.getDaySummary)
  .then(function (items) {
    console.log('All pages gotten at', moment().format('YYYY-MM-DD, HH:mm'));
    // Send an email if any are of interest
    if (items && items.length) {
      notifier.sendSummaryEmail(items);
    }
  })
  .catch(function (err) {
    console.log(err);
  });
}

/**
 * Simply gets all items from yesterday instead of fetching first.
 */
function getDaySummary() {
  console.log('Summarizing ' + moment().subtract('days', 1).format('YYYY-MM-DD'));
  homeItemController.getDaySummary()
  .then(function (items) {
    if (items && items.length) {
      notifier.sendSummaryEmail(items);
    } else {
      console.log('No items were deemed interesting yesterday, ' + moment().subtract('days', 1).format('YYYY-MM-DD'));
      return;
    }
  })
}

// Schedule to get the first index page
var scheduleEveryInterval = later.parse.recur()
  .every(config.interval).minute()
  .except().every().hour().between(0,6);

// Schedule to get every index page
var scheduleOn6 = later.parse.recur()
  .on(6).hour();

// Starts schedules in 5 minutes
console.log('Schedule starts in :wait minutes.'.replace(':wait', config.wait));
setTimeout(function() {
  console.log('Schedule for every :interval minute started.'.replace(':interval', config.interval));
  later.setInterval(getFrontPage, scheduleEveryInterval);
  later.setInterval(getDaySummary, scheduleOn6);
}, config.wait * 60000);

getFrontPage();
