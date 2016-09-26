'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var User = require('../../../models/user/user.model');
var UserController = require('../../../models/user/user.controller');
var Invitation = require('../../../models/invitation/invitation.model');
var InvitationController = require('../../../models/invitation/invitation.controller');
var utils = require('../../../utils/utils');
var auth = require('../../../services/auth.service');
var response = require('./../api.response.v0');

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
    response.send(res, { data: data, message: 'Invitation sent' });
  })
  .catch(function (err) {
    if (/missing user|invalid email|already exists|invitation already/i.test(err.message)) {
      response.sendError(res, err, err.message);
    } else {
      response.internalError(res, err);
    }
  });
}

/**
 * Route POST 'api/invitation/invite'
 */
function handleInvitation(req, res) {
  response.send(res, { data: req.invitation });
}

module.exports = {
  invite: invite,
  handleInvitation: handleInvitation,
}
