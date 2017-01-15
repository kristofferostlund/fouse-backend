'use strict'

const _ = require('lodash')
const Promise = require('bluebird')

const User = require('../../../models/user/user.model')
const UserController = require('../../../models/user/user.controller')
const Invitation = require('../../../models/invitation/invitation.model')
const InvitationController = require('../../../models/invitation/invitation.controller')
const utils = require('../../../utils/utils')
const auth = require('../../../services/auth.service')
const response = require('./../api.response.v0')

/**
 * Route POST 'api/invitation/invite'
 */
function invite(req, res) {
  const user = {
    _id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
  }

  const email = _.get(req, 'body.email')

  InvitationController.createInvitation({
    email: email,
    fromUser: user,
  })
  .then(function (data) {
    response.send(res, { data: data, message: 'Invitation sent' })
  })
  .catch(function (err) {
    if (/missing user|invalid email|already exists|invitation already/i.test(err.message)) {
      response.sendError(res, err, err.message)
    } else {
      response.internalError(res, err)
    }
  })
}

/**
 * Route POST 'api/invitation/invite'
 */
function handleInvitation(req, res) {
  const { _id, email, tempPassword, name } = req.invitation

  /**
   * Ensure the email doesn't start with a dot,
   */
  if (!auth.validateEmail(email)) {
    const err = new Error('Missing or incorrect email address')
    return response.sendError(res, err, 'Cannot complete sign up, a missing or invalid email address has been used when inviting')
  }

  return InvitationController
    .completeInvitation({ _id, email, tempPassword, name })
    .then(user => {
      return response.send(res, { status: 200, data: user, message: 'User successfully created' })
    })
    .catch(err => {
      return response.sendError(res, err, 'Failed to create invited user')
    })
}

module.exports = {
  invite: invite,
  handleInvitation: handleInvitation,
}
