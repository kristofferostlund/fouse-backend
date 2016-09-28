'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var request = require('request');

var utils = require('../utils/utils');
var config = require('../config');

var qasaNotifier = require('./notifier.qasa');

/**
 * Returns all matching project IDs.
 *
 * @param {homeItem} homeItem
 * @return {Array}
 */
function getProjects(homeItem) {

  return _.chain(config.asana_projects)
    .filter(function (projectId, key) {

      if (/stockholm|göteborg/i.test(key)) {
        return (homeItem.region || '').toLowerCase() === key
          ? projectId
          : undefined;
      }

      if (/^hasTel/i.test(key)) {
        return /[0-9]/.test(homeItem.tel)
          ? projectId
          : undefined;
      }

      if (/^isApartment/i.test(key)) {
        return !_.get(homeItem, 'classification.shared')
          ? projectId
          : undefined;
      }

      if (/apartmentTel/i.test(key)) {
        return (/[0-9]/.test(homeItem.tel) && !_.get(homeItem, 'classification.shared'))
          ? projectId
          : undefined;
      }

      if (/qasaNotified/i.test(key)) {
        return qasaNotifier.shouldNotify(homeItem)
          ? projectId
          : undefined;
      }

      return (homeItem.classification || {})[key]
        ? projectId
        : undefined;
    })
    .value();
}

/**
 * Creates the asan task and returns a promise of it.
 *
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object}
 */
function createOneAsanaTask(homeItem) {
  return new Promise(function (resolve, reject) {

    var task = {
      workspace: config.asana_workspace,
      projects: getProjects(homeItem),
      name: _.filter([
        homeItem.region,
        homeItem.title,
        (homeItem.price || 0) + ' kr',
        homeItem.tel
      ]).join(', '),
      notes: [
        homeItem.url,
        '',
        'Owner: ' + homeItem.owner,
        'Phone number: ' + (homeItem.tel || 'data missing'),
        'Price: ' + homeItem.price + ' kr',
        'Rooms: ' + homeItem.rooms,
        'Size: ' + homeItem.size,
        'Region: ' + homeItem.region,
        'Location: ' + homeItem.location,
        'Address: ' + homeItem.address,
        '',
        '----',
        '',
        homeItem.body
      ].join('\n')
    };

    // Check to see if the Asana stuff has any other alphanumeric characters than only 'x',
    // to ensure calls can be made to a working endpoint.
    if (!/[a-vy-ä0-9]+/.test(config.asana_token) || !/[a-vy-ä0-9]+/.test(config.asana_workspace)) {
      utils.log('No valid Asana token, or no workspace found.', 'info', { task: _.omit(task, ['notes']) });
      return resolve();
    }

    // Log what's going on
    utils.log('Creating Asana task.', 'info', { task: task });

    request.post({
      uri: 'https://app.asana.com/api/1.0/tasks',
      headers: {
        'Authorization': 'Bearer ' + config.asana_token
      },
      json: true,
      body: {
        data: task
      }
    }, function (err, response, body) {

      // Whoops, something went wrong here
      if (err) {
        utils.log('Could not create Asana task.', 'info', { error: err.toString(), task: task });
        reject(err);
      } else {
        utils.log('Task created.', 'info', { task: task });
        resolve(homeItem);
      }
    });
  });
}

/**
 * Creates tasks Asana tasks for all *homeItems*
 * and returns a Promise of the *homeItems*.
 *
 * Works with both single and multiple homeItems.
 *
 * @param {Object|Array} homeItems
 * @return {Promise} -> {Object|Array}
 */
function createAsanaTasks(homeItems) {
  new Promise(function (resolve, reject) {

    // Ensure array
    var _homeItems = _.isArray(homeItems)
      ? homeItems
      : [ homeItems ];

    var promises = _.map(_homeItems, createOneAsanaTask);

    Promise.all(_.map(promises, function (promise) { return promise.reflect(); }))
    .then(function (data) {
      resolve(_.map(data, function (val, i) { return val.isRejected() ? _homeItems[i] : val.value() }))
    })
    .catch(function (err) {
      utils.log('Something went wrong when creating Assan tasks', 'error', { error: err.toString() });
      resolve(homeItems);
    });
  });
}

module.exports = {
  createAsanaTasks: createAsanaTasks
}
