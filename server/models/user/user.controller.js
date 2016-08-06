'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

var User = require('./user.model');

var utils = require('../../utils/utils');
var homeController = require('../homeItem/homeItem.controller');
var auth = require('./../../services/auth.service');

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
 * @param {{ email: String, tel: String, password: String, passwordRepeat: String, notifyOptions: { email: Boolean, sms: Boolean, }, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean, }, time: { period: { min: Number,  max: Number, }, isLongTerm: Boolean, }, region: String }}} user
 * @return {Promise} -> {Object|Array} (User)
 */
function create(user) {
  return new Promise(function (resolve, reject) {
    if (!user.password) {
      return reject(new Error('Password is required'));
    } else if (!user.email) {
      return reject(new Error('Email is required'));
    } else if (!user.name) {
      return reject(new Error('Name is required'));
    }

    // Hash the password
    var _user = _.assign({}, user, { password: auth.encryptPassword(user.password), email: user.email.toLowerCase() });

    var _meta = { email: _user.email };

    utils.log('Creating a new user.', 'info', _meta);

    User.findOne({ email: _user.email }, { email: true })
    .exec()
    .then(function (emailUser) {
      if (!!emailUser) {
        utils.log('Cannot create user, email already exists', 'info', _meta);
        return reject(new Error('Email already exists'));
      }

      // Create the user, wrapped in a promise
      return new Promise(function (resolve, reject) {
        User.create(_user, function (err, createdUser) {
          return !err ? resolve(createdUser) : reject(err);
        });
      });
    })
    .then(function (createdUser) {
      // Omit user password
      var _createdUser = _.omit(createdUser._doc, ['password'])

      utils.log('Successfully created new user.', 'info', _meta);
      resolve(_createdUser);
    })
    .catch(function (err) {
      utils.log('Failed to create new user', 'info', _.assign({}, _meta, { error: err.toString() }));
      return reject(err);
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
    if (!user) {
      return reject(new Error('No user to update'));
    }

    var _meta = { _id : user._id, email: user.email };
    utils.log('Updating user.', 'info', _meta);

    User.findById(user._id)
    .exec(function (oldUser) {
      // Merge them together
      var updated = _.assign(oldUser, _.omit(user, ['_id', '__v', 'password']));

      // Save the updated version
      updated.save(function (err, _user) {
        if (err) {
          utils.log('Failed to update user.', 'error', _.assign({}, _meta, { error: err.toString() }));
          return reject(err);
        }

        utils.log('Successfully updated user.', 'info', _meta);

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