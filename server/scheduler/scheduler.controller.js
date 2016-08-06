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
  .then(notifier.notifyUsers)
  .then(notifier.notifyQasa)
  .then(homeItemController.getItemsOfInterest)
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
    console.log(
      '\nThe following error occured when getting the front page at {time}:'
        .replace('{time}', moment().format('YYYY-MM-DD, HH:mm'))
      );
    console.log(err);
  });
}


/**
 * Simply gets all items from yesterday instead of fetching first.
 */
function getDaySummary() {
  console.log('Summarizing ' + moment().subtract(1, 'days').format('YYYY-MM-DD'));
  homeItemController.getDaySummary()
  .then(function (items) {
    if (items && items.length) {
      notifier.sendSummaryEmail(items);
    } else {
      console.log('No items were deemed interesting yesterday, ' + moment().subtract(1, 'days').format('YYYY-MM-DD'));
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
if (!config.skip_schedules) {
  console.log('Schedule starts in :wait minutes.'.replace(':wait', config.wait));
  setTimeout(function() {
    console.log('Schedule for every :interval minute started.'.replace(':interval', config.interval));
    later.setInterval(getFrontPage, scheduleEveryInterval);
    later.setInterval(getDaySummary, scheduleOn6);
  }, config.wait * 60000);
} else {
  console.log('Not running schedules because it is turned off in the environment file.');
}
