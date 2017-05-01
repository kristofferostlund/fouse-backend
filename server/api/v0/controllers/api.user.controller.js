'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const url = require('url')

const User = require('../../../models/user/user.model')
const UserController = require('../../../models/user/user.controller')
const Invitation = require('../../../models/invitation/invitation.model')
const InvitationController = require('../../../models/invitation/invitation.controller')
const ResetTokenController = require('../../../models/resetToken/resetToken.controller')
const utils = require('../../../utils/utils')
const auth = require('../../../services/auth.service')
const response = require('./../api.response.v0')
const config = require('../../../config')

/**
 * Route GET '/api/v0/users'
 */
function listUsers(req, res) {
  // Get the page number from the query params
  let page = _.get(req, 'query.page') || 1

  // *page* must be creater than zero, otherwise defaults to 1
  page = page >= 1 ? page : 1

  // Get the page size/limit from the query params
  let limit = _.get(req, 'query.limit') || 20

  //  Limut must be greater than zero, otherwise defaults to 20
  limit = limit >= 1 ? limit : 20

  // Get the number of items to skip
  const skip = (page - 1) * limit

  User.find({ isDisabled: { $ne: true } })
    .skip(skip)
    .limit(limit)
    .sort({ $natural: -1 })
    .select('-password -__v')
    .exec((err, users) => {
      if (err) {
        return response.internalError(res, err)
      }

      return response.send(res, { data: users })
    })
}

/**
 * Route GET '/api/v0/users/:id'
 */
function getUser(req, res) {
  const userId = req.params.id

  UserController.findById(userId)
    .then(user => {
      response.send(res, { data: user })
    })
    .catch(err => {
      if (/missing userid|invalid userid/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route GET '/api/v0/users/me'
 */
function me(req, res) {
  return UserController.findById(req.user._id)
    .then(user => response.send(res, { data: user }))
    .catch(err => response.internalError(res, err))
}

/**
 * Route POST '/api/v0/users'
 */
function createUser(req, res) {
  const _user = req.body || {}

  UserController.create(_user)
    .then(user => response.send(res, { data: user }))
    .catch(err => {
      if (/is required|already exists/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route PUT '/api/v0/users/:id'
 */
function updateUser(req, res) {
  UserController.update(req.params.id, req.body)
    .then(user => response.send(res, { data: user }))
    .catch(err => response.internalError(res, err))
}

/**
 * Route PUT '/api/v0/users/:id/account
 */
function updateUserAccount(req, res) {
  UserController.updateAccount(req.params.id, req.body)
    .then(user => response.send(res, { data: user }))
    .catch(err => {
      if (/is required|already exists/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route PUT '/api/v0/users/:id/account
 */
function updateUserNotificationSettings(req, res) {
  UserController.updateNotificationSettings(req.params.id, req.body)
    .then(user => response.send(res, { data: user }))
    .catch(err => {
      if (/is required|already exists/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route PUT '/api/v0/users/:id/password'
 */
function updateUserPassword(req, res) {
  const userId = req.params.id === 'me'
    ? req.user._id.toString()
    : req.params.id

  const { password, currentPassword } = req.body

  UserController.updatePassword(userId, password, currentPassword)
    .then(data => response.send(res, { data: data }))
    .catch(err => response.internalError(res, err))
}

/**
 * Route POST '/api/v0/authenticate'
 */
function login(req, res) {
  const { email, password } = req.body

  auth.login(email, password)
    .then(data => response.send(res, { data }))
    .catch(err => {
      if (/does not exist|incorrect password|is required/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route PUT '/api/v0/users/reset-password/:token'
 */
function resetPassword(req, res) {
  const { password } = req.body
  const { token } = req.params

  ResetTokenController
    .resetPassword(token, password)
    .then(function (token) {
      response.send(res, { message: 'Password updated', data: { redirectUrl: url.resolve(config.frontend_url, '/#/login') } })
    })
    .catch(function (err) {
      if (/missing|invalid|not found/i.test(err.message)) {
        response.sendError(res, err)
      } else {
        response.internalError(res, err)
      }
    })
}

/**
 * Route: POST '/api/v0/users/request-password-reset'
 */
function requestPasswordReset(req, res) {
  const { email } = req.body

  ResetTokenController.requestReset(email)
    .then(({ message }) => response.send(res, { message }))
    .catch(err => {
      if (/email is required|malformed or invalid|user doesn/i.test(err.message)) {
        return response.sendError(res, err, err.message)
      } else {
        return response.internalError(res, err)
      }
    })
}

module.exports = {
  listUsers: listUsers,
  getUser: getUser,
  me: me,
  createUser: createUser,
  updateUser: updateUser,
  updateUserAccount: updateUserAccount,
  updateUserNotificationSettings: updateUserNotificationSettings,
  updateUserPassword: updateUserPassword,
  login: login,
  resetPassword: resetPassword,
  requestPasswordReset: requestPasswordReset,
}
