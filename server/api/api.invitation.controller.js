'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var User = require('./../models/user/user.model');
var UserController = require('./../models/user/user.controller');
var Invitation = require('./../models/invitation/invitation.model');
var InvitationController = require('./../models/invitation/invitation.controller');
var utils = require('./../utils/utils');
var auth = require('./../services/auth.service');

/**
 * Route POST 'api/invitation/invite'
 */
function invite(req, res) {
  var user = {
    _id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
  };

  var email = _.get(req, 'body.email');

  InvitationController.createInvitation({
    email: email,
    fromUser: user,
  })
  .then(function (data) {
    res.status(200).send(data);
  })
  .catch(function (err) {
    if (/missing user|invalid email|already exists|invitation already/i.test(err.message)) {
      res.status(400).send(err.message);
    } else {
      utils.handleError(res, err);
    }
  })
}

/**
 * Route POST 'api/invitation/invite'
 */
function handleInvitation(req, res) {
  res.status(200).json(req.invitation);
}

module.exports = {
  invite: invite,
  handleInvitation: handleInvitation,
}
