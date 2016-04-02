'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

var User = require('./user.model');

var utils = require('../../utils/general.utils');
var notifier = require('../../notifier/notifier.controller');
var homeController = require('../homeItem/homeItem.controller');

/**
 * Finds all users which somehow should be notified.
 * At least one of the two notify properties of the user must be set to true.
 *
 * @return {Promise} -> {Array} (User)
 */
function find() {
  return new Promise(function (resolve, reject) {

    var options = {
      disabled: { $ne: true },
      $or: [
        { 'notify.email': true },
        { 'notify.sms': true }
      ]
    }

    User.find(options)
    .exec(function (err, users) {
      if (err) {
        reject(err);
      } else {
        resolve(users);
      }
    });

  });
}

/**
 * Creates a new or multiple new users to the db.
 *
 * @param {Object|Array} user
 * @return {Promise} -> {Object|Array} (User)
 */
function create(user) {
  return new Promise(function (resolve, reject) {
    // Create the user
    User.create(user, function (err, user) {
      if (err) { return reject(err); }

      resolve(user);
    });

  });
}

/**
 * Updates a user and returns a promise the updated version.
 *
 * @param {Object} user User object to update
 * @return {Promise} -> {Object} The new user
 */
function update(user) {
  return new Promise(function (resolve, reject) {
    User.findById(user._id)
    .exec(function (oldUser) {
      // Delete the _id and version of the user, just in case
      delete user._id
      delete user.__v

      // Merge them together
      var updated = _.assign(oldUser, user);

      // Save the updated version
      updated.save(function (err, _user) {
        if (err) { return reject(err); }

        resolve(_user);
      })
    })

  });
}

module.exports = {
  find: find,
  create: create,
  update: update,
}