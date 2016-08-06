'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

var User = require('./user.model');

var utils = require('../../utils/general.utils');
var notifier = require('../../notifier/notifier.controller');
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
    var _user = _.assign({}, user, { password: auth.encryptPassword(user.password) });

    console.log('Creating a new user. {email}'.replace('{email}', _user.email));

    User.findOne({ email: _user.email }, { email: true })
    .exec()
    .then(function (emailUser) {
      if (!!emailUser) {
        console.log('Cannot create user, email already exists. {email}'.replace('{email}', _user.email));

        return reject(new Error('Email already exists'));
      }

      // Create the user, wrapped in a promise
        return new Promise(function (resolve, reject) {
          User.create(_user, function (err, createdUser) {
            return !err ? resolve(createdUser): reject(err);
          });
        });
    })
    .then(function (createdUser) {
      var _createdUser = _.omit(createdUser._doc, ['password']);

      console.log('Successfully created new user. {email}'.replace('{email}', _createdUser.email));

      // Resolve the user with the password omitted
      resolve(_createdUser);
    })
    .catch(function (err) {
      console.log(
        'Failed to create new user: {email}, {err}'
          .replace('{email}', _user.email)
          .replace('{err}', err.toString())
      );

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