'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var express = require('express');

var HomeItem = require('./../models/homeItem/homeItem.model');
var User = require('./../models/user/user.model');
var UserController = require('./../models/user/user.controller');
var utils = require('./../utils/general.utils');
var auth = require('./../services/auth.service');

/**
 * Route GET '/api/users'
 */
function listUsers(req, res) {
  User.find({ isDisabled: { $ne: true } })
  .select('-password')
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
      res.status(400).send(err);
    } else {
      utils.handleError(res, err);
    }
  });
}

/**
 * Route POST '/api/authenticate'
 */
function login(req, res) {
  auth.login(_.get(req, 'body.email'), _.get(req, 'body.password'))
  .then(function (data) {
    res.status(200).send(data);
  })
  .catch(function (err) {
    if (/does not exist|incorrect password|is required/.test(err.mesage)) {
      res.status(401).send(err);
    } else {
      utils.handleError(res, err);
    }
  })
}

module.exports = {
  listUsers: listUsers,
  createUser: createUser,
  login: login,
}
