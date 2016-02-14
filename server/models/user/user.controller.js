'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

var User = require('./user.model');

var utils = require('../../utils/general.utils');

/**
 * Finds and returns all non-disabled users
 * and returns a promise of them.
 * 
 * @return {Promise} -> {Array} (User)
 */
function findNotifiable() {
  return new Promise(function (resolve, reject) {
    
    User.find({ disabled: { $ne: true } })
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
    
    User.create(user, function (err, user) {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
    
  });
}

module.exports = {
  find: find,
  findNotifiable: findNotifiable,
  create: create
}