'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var User = require('../../../models/user/user.model');
var UserController = require('../../../models/user/user.controller');
var Invitation = require('../../../models/invitation/invitation.model');
var InvitationController = require('../../../models/invitation/invitation.controller');
var ResetTokenController = require('../../../models/resetToken/resetToken.controller');
var utils = require('../../../utils/utils');
var auth = require('../../../services/auth.service');
var response = require('./../api.response.v0');

/**
 * Route GET '/api/users'
 */
function listUsers(req, res) {
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

  User.find({ isDisabled: { $ne: true } })
  .skip(_skip)
  .limit(limit)
  .sort({ $natural: -1 })
  .select('-password -__v')
  .exec(function (err, users) {
    if (err) { response.internalError(res, err); }

response.send(res, { data: users });
  });
}

/**
 * Route GET '/api/users/:id'
 */
function getUser(req, res) {
  var userId = req.params.id;

  UserController.findById(userId)
  .then(function (user) {
    response.send(res, { data: user });
  })
  .catch(function (err) {
    if (/missing userid|invalid userid/i.test(err.message)) {
      response.sendError(res, err);
    } else {
      response.internalError(res, err);
    }
  });
}

/**
 * Route GET '/api/users/me'
 */
function me(req, res) {
  var userId = req.user._id;

  UserController.findById(userId)
  .then(function (user) {
    response.send(res, { data: user });
  })
  .catch(function (err) {
    response.internalError(res, err);
  });
}

/**
 * Route POST '/api/users'
 */
function createUser(req, res) {
  var _user = req.body || {};

  UserController.create(_user)
  .then(function (user) {
    response.send(res, { data: user });
  })
  .catch(function (err) {
    if (/is required|already exists/i.test(err.message)) {
      response.sendError(res, err);
    } else {
      response.internalError(res, err);
    }
  });
}

/**
 * Route PUT '/api/users/:id'
 */
function updateUser(req, res) {
  var _user = req.body;
  var _userId = req.params.id;

  UserController.update(_userId, _user)
  .then(function (user) {
    response.send(res, { data: user });
  })
  .catch(function (err) {
    response.internalError(res, err);
  });
}

/**
 * Route PUT '/api/users/:id/password'
 */
function updateUserPassword(req, res) {
  var userId = req.params.id;
  var password = req.body.password;
  var currentPassword = req.body.currentPassword;

  UserController.updatePassword(userId, password, currentPassword)
  .then(function (data) {
    response.send(res, { data: data });
  })
  .catch(function (err) {
    response.internalError(res, err);
  });
}

/**
 * Route POST '/api/authenticate'
 */
function login(req, res) {
  auth.login(_.get(req, 'body.email'), _.get(req, 'body.password'))
  .then(function (data) {
    response.send(res, { data: data });
  })
  .catch(function (err) {
    if (/does not exist|incorrect password|is required/i.test(err.message)) {
      response.sendError(res, err);
      // res.status(401).send(err);
    } else {
      response.internalError(res, err);
    }
  });
}

/**
 * Route PUT '/api/users/reset-password'
 */
function resetPassword(req, res) {
  var _token = req.body.token;
  var _password = req.body.password;

  ResetTokenController.resetPassword(_token, _password)
  .then(function (token) {
    response.sendError(res, err);
    // res.status(204).send('Password updated');
  })
  .catch(function (err) {
    if (/missing|invalid|not found/i.test(err.message)) {
      response.sendError(res, err);
    } else {
      response.internalError(res, err);
    }
  })
}

module.exports = {
  listUsers: listUsers,
  getUser: getUser,
  me: me,
  createUser: createUser,
  updateUser: updateUser,
  updateUserPassword: updateUserPassword,
  login: login,
}
