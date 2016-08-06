'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var express = require('express');

var HomeItem = require('./../models/homeItem/homeItem.model');
var User = require('./../models/user/user.model');
var UserController = require('./../models/user/user.controller');
var utils = require('./../utils/general.utils');

/**
 * Route GET '/api/users'
 */
function listUsers(req, res) {
  User.find({ isDisabled: { $ne: true } })
  .exec(function (err, users) {
    if (err) {
      console.log(err);
      return res.status(400).send(err);
    }

    res.status(200).json(users);
  });
}

/**
 * Route POST '/api/users'
 */
function createUser(req, res) {
  var _user = req.body || {};

  UserController.create(_user)
  .then(function (user) {
    res.status(200).json(user);
  })
  .catch(function (err) {
    if (/is required|already exists/i.test(err.message)) {
      res.status(400).send(err.message);
    } else {
      utils.handleError(res, err);
    }
  });
}

module.exports = {
  listUsers: listUsers,
  createUser: createUser,
}
