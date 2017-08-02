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
  const fromUser = {
    _id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
  }

  const { email, name } = req.body

  InvitationController
    .createInvitation({ email, fromUser, name })
    .then(function (data) {
      response.send(res, { data: data, message: 'Invitation sent' })
    })
    .catch(function (err) {
      if (/missing user|invalid email|already exists|invitation already|missing name/i.test(err.message)) {
        response.sendError(res, err, err.message)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Note: Must be preceded by the auth.isInvited middleware.
 *
 * Route POST 'api/invitation/respond/:token'
 */
function respond(req, res) {
  const { _id, name } = req.invitation || {}
  const { password } = req.body
  let { email } = req.body

  // Fall back to invitation email if none is set
  if (!email) {
    email = req.invitation.email
  }

  /**
   * Ensure the email is valid
   */
  if (!auth.validateEmail(email)) {
    const err = new Error('Missing or incorrect email address')
    return response.sendError(res, err, 'Cannot complete sign up, a missing or invalid email address has been used when inviting')
  }

  return InvitationController
    .completeInvitation({ _id, email, password, name })
    .then(data => {
      return response.send(res, { status: 200, data: data, message: 'User successfully created' })
    })
    .catch(err => {
      return response.sendError(res, err, 'Failed to create invited user')
    })
}

module.exports = {
  invite: invite,
  respond: respond,
}
