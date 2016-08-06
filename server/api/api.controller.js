'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var express = require('express');

var HomeItem = require('./../models/homeItem/homeItem.model');
var User = require('./../models/user/user.model');
var UserController = require('./../models/user/user.controller');
var utils = require('./../utils/utils');
var auth = require('./../services/auth.service');

/**
 * Route GET '/api/users'
 */
function listUsers(req, res) {
  User.find({ isDisabled: { $ne: true } })
  .select('-password')
  .exec(function (err, users) {
    if (err) { utils.handleError(res, err); }

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

/**
 * Route GET '/api/home-items'
 */
function listHomes(req, res) {
  // Get the page number from the query params
  var page = _.get(req, 'query.page') || 1;

  // *page* must be creater than zero, otherwise defaults to 1
  page = page >= 1 ? page : 1;

  // Get the page size/limit from the query params
  var limit = _.get(req, 'query.limit') || 20;

  //  Limut must be greater than zero, otherwise defaults to 20
  limit = limit >= 1 ? limit : 20 ;

  // Get the number of items to skip
  var _skip = (page - 1 ) * limit;

  HomeItem.find({ isDisabled: { $ne: true } })
  .skip(_skip)
  .limit(limit)
  .sort({ $natural: -1 })
  .exec()
  .then(function (homeItems) {
    res.status(200).json(homeItems);
  })
  .catch(function (err) {
    utils.handleError(res, err);
  });
}

module.exports = {
  listUsers: listUsers,
  createUser: createUser,
  login: login,
  listHomes: listHomes,
}

