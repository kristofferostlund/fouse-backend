'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const moment = require('moment')

const emailNotifier = require('./../../notifier/notifier.email')
const ResetToken = require('./resetToken.model')
const User = require('./../user/user.model')
const utils = require('./../../utils/utils')
const auth = require('./../../services/auth.service')
const config = require('./../../config')

/**
 * Returns the message to send to the user
 * who requested the password change.
 *
 * @param {String} token
 * @returns {String}
 */
function getResetBody(token) {
  return `Hi,

You've requested a password reset, click on the link below to reset your password.

${config.app_url}/api/v0/redirects/password-reset/${encodeURIComponent(token)}

Best wishes,

The Fouse team
`
}

/***********************
 * Exports below here: *
 ***********************/

/**
 * Resets the password of the user referenced
 * in the ResetToken model.
 *
 * @param {String} token
 * @return {Promise}
 */
function resetPassword(token, password) {
  let _err
  let _resetToken

  if (!token) {
    _err = new Error('Missing token.')
  } else if (!auth.validateGuidToken(token)) {
    _err = new Error('Invalid token')
  } else if (!password) {
    _err = new Error('Missing password')
  }

  if (_err) {
    utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() })
    return Promise.reject(err)
  }

  return ResetToken.findOne({ token: token, dateValidTo: { $gt: new Date() }, isUsed: { $ne: true } })
  .exec()
  .then(resetToken => {
    if (!resetToken) {
      // Set _err
      _err = new Error('Valid reset token not found.')
      utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() })
      return Promise.reject(_err)
    }

    _resetToken = resetToken

    utils.log('Found valid reset token, attempting to find user.', 'info', { token: token })

    return User.findOne({ _id: resetToken.user, disabled: { $ne: true } })
    .exec()
  })
  .then(user => {
    if (!user) {
      // Set _err
      _err = new Error('User not found')
      utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() })
      return Promise.reject(_err)
    }

    // Set the user password and store it
    user.password = auth.encryptPassword(password)
    return utils.savePromise(user)
  })
  .then(_user => {
    utils.log(`Updated user's password`, 'info', { token: token, user: _user._id })

    _resetToken.isUsed = true
    return utils.savePromise(_resetToken)
  })
  .then(resetToken => {
    utils.log('Reset token used.', 'info', { token: token, user: resetToken.user })
    return Promise.resolve(resetToken)
  })
  .catch(err => {
    // Only log the error if it's mine.
    if (err !== _err) {
      utils.log('Failed to reset password', 'error', { token: token, error: err.toString() })
    }

    return Promise.reject(err)
  })
}

/**
 * Requests a password reset by sending out an
 * email to the user.
 *
 * @param {String} email
 * @returns {Promise<{ message: String }>}
 */
function requestReset(email) {
  if (!email) {
    return Promise.reject(new Error('Email is required'))
  } else if (!auth.validateEmail(email)) {
    return Promise.reject(new Error('Malformed or invalid email'))
  }

  return User
    .findOne({ email: email.toLowerCase() })
    .exec()
    .then(user => {
      if (!user) {
        return Promise.reject(new Error(`User doesn't exist`))
      }

      return ResetToken.create({ user })
    })
    .then(resetToken => {
      utils.print(resetToken, 10)

      emailNotifier.plainSend(email, 'Reset password', getResetBody(resetToken.token))

      return Promise.resolve({ message: `An email has been sent to ${email}` })
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  resetPassword: resetPassword,
  requestReset: requestReset
}
