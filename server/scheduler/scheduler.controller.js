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
var utils = require('./../utils/utils');

/**
 * Gets the front page.
 */
function getFrontPage() {
  utils.log('Getting front page. Fetching items.', 'info');
  crawler.getAndSavePageAt(1)
  .then(notifier.notifyUsers)
  .then(notifier.notifyQasa)
  .then(homeItemController.getItemsOfInterest)
  .then(function (items) {
    utils.log('Front page gotten. All items fetched.', 'info', { homeItemsLength: !!items ? items.length : 0 });

    // Notify if there are any items of interest.
    return notifier.notify(items)
  })
  .then(function (items) {
    if (items && items.length) {
      utils.log('All notifications sent.', 'info', { homeItemsLength: !!items ? items.length : 0 });
    }
  })
  .catch(function (err) {
    utils.log('An error occurred when getting the front page', 'error', { error: err.toString() });
  });
}

// Schedule to get the first index page
var scheduleEveryInterval = later.parse.recur()
  .every(config.interval).minute()
  .except().every().hour().between(0,6);

// Starts schedules in 5 minutes
if (!config.skip_schedules) {
  utils.log('Schedule starts in :wait minutes.'.replace(':wait', config.wait));
  setTimeout(function() {
    utils.log('Schedule for every :interval minute started.'.replace(':interval', config.interval));
    later.setInterval(getFrontPage, scheduleEveryInterval);
  }, config.wait * 60000);
} else {
  utils.log('Not running schedules because it is turned off in the environment file.');
}
