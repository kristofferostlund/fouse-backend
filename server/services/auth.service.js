'use strict'

const _ = require('lodash')
const compose = require('composable-middleware')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Promise = require('bluebird')
const moment = require('moment')

const User = require('./../models/user/user.model')
const Invitation = require('./../models/invitation/invitation.model')
const config = require('./../config')
const utils = require('./../utils/utils')
const response = require('../api/v0/api.response.v0')

const roles = {
  USER: 1,
  ADMIN: 10,
  GOD: 100,
}

/**
 * Validates *email* address format and returns a Boolean value.
 *
 * @param {String} email Email address to validate
 * @return {Boolean}
 */
function validateEmail(email) {
  return /^(([^<>()\[\]\\.,:\s@"]+(\.[^<>()\[\]\\.,:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)
}

/**
 * Validates the token to ensure it's of correct format.
 *
 * @param {String} token
 * @return {Boolean}
 */
function validateGuidToken(token) {
  return /^[0-9a-f]{10}\-[0-9a-f]{5}\-[0-9a-f]{5}\-[0-9a-f]{5}\-[0-9a-f]{15}$/.test(token)
}

/**
 * Finds the token from either query params, headers or cookies
 * and return it token.
 *
 * If 'Bearer ' is part it of the token, it's stripped out.
 *
 * @param {Object} req Express request object
 * @return {String}
 */
function findToken(req) {
  // Find the token from any of these sources
  var _appToken = _.find([
    _.get(req, 'query.token'),
    _.get(req, 'query.access_token'),
    _.get(req, 'headers.token'),
    _.get(req, 'headers.authorization'),
    _.get(req, 'headers.Authorization'),
    _.get(req, 'cookies.token'),
    _.get(req, 'cookies.access_token'),
    _.get(req, 'cookies.authorization'),
    _.get(req, 'cookies.Authorization'),
  ], function (token) { return !!token })

  // Remove Bearer from token if it's there
  if (/^Bearer /i.test(_appToken)) {
    _appToken = _appToken.split(' ')[1]
  }

  // Return it
  return _appToken
}

/**
 * Finds the corresponding user stored in the token
 * and returns a promise of it.
 *
 * @param {String} token
 * @returns {Promise<{ _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean }>}
 */
function getUserByToken(token) {
  // Get the decoded data
  /** @type {{ _id: String }} */
  const decoded = decodeToken(token)

  const _userId = !!decoded ? decoded._id : null

  // If no userId was found, return a response of 401, Unauthorized.
  if (_userId === null) {
    return Promise.reject(new Error('Unauthorized'))
  }

  // Find the user and if it exists, resolve it
  return User.findById(_userId)
    .then(user => {
      // If there is no registered user, reject an Unauthorized error
      if (!user || !user._id) {
        return Promise.reject(new Error('Unauthorized'))
      }

      return Promise.resolve(user)
    })
}

/**
 * Middlewhare for ensuring authentication.
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
function isAuthenticatedMiddleware(req, res, next) {
  return compose().use(function (req, res, next) {
    // Find the token
    const token = findToken(req)

    return getUserByToken(token)
      .then(user => {
        req.user = user._doc

        return next()
      })
      .catch(err => {
        if (err.message === 'Unauthorized') {
          return response.sendError(res, err, 'User unauthorized')
        }

        return response.internalError(res, err)
      })
  })
}

/**
 * Middlewhare for ensuring an invitation is present.
 *
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
function isInvitedMiddleware(req, res, next) {
  return compose().use(function (req, res, next) {
    const invOpts = {
      token: req.params.token,
      // We don't want any answered invitations
      isAnswered: { $ne: true, },
      // nor can they be disabled
      disabled: { $ne: true },
      // they must be valid as well
      dateValidTo: { $gt: new Date() },
      dateValidFrom: { $lte: new Date() },
    }

    return Invitation.findOne(invOpts)
      .exec()
      .then(function (invitation) {
        req.invitation = invitation

        if (!invitation) {
          const err = new Error('Invalid invitation token')
          return response.sendError(res, err, 'The invitation does either not exist, is invalid or is already responded to')
        }

        next()
      })
      .catch(function (err) {
        response.internalError(res, err)
      })
  })
}

/**
 * Checks whether the user is authorized to perform the current action
 * by checking its role against *role*.
 *
 * @param {Number} role
 */
function isAdminEnoughMiddleware(role = 10) {
  return compose().use((req, res, next) => {
    return (
      typeof req.user === 'undefined'
        ? getUserByToken(findToken(req))
        : Promise.resolve(req.user)
    )
      .then(user => {
        if (user.role < role) {
          const err = new Error('Unauthorized')
          return response.sendError(res, err, 'User is unauthorized to perform this action')
        }

        if (typeof req.user === 'undefined') {
          req.user = user._doc
        }

        next()
      })
      .catch(err => {
        if (err.message === 'Unauthorized') {
          return response.sendError(res, err, 'User unauthorized')
        }
      })

  })
}

/**
 * Checks whether the user is authorized to perform the current action
 * by checking its role against *role*.
 *
 * @param {Number} role
 */
function isAdminOrMeMiddleware(role = 10) {
  return compose().use((req, res, next) => {
    const userId = req.params.id

    return (
      typeof req.user === 'undefined'
        ? getUserByToken(findToken(req))
        : Promise.resolve(req.user)
    )
      .then(user => {
        if (user.role < role && userId != user._id) {
          const err = new Error('Unauthorized')
          return response.sendError(res, err, 'User is unauthorized to perform this action')
        }

        if (typeof req.user !== 'undefined') {
          req.user = user._doc
        }

        next()
      })
      .catch(err => {
        if (err.message === 'Unauthorized') {
          return response.sendError(res, err, 'User unauthorized')
        }
      })

  })
}

/**
 * Attempts to log user in.
 *
 * @param {String} email Email address matching user to log in
 * @param {String} password Password to use for authentication
 * @return {Promise<{ user: Object, token: String }>}
 */
function login(email, password) {
  return new Promise(function (resolve, reject) {
    var _err
    if (!email) {
      _err = new Error('Email is required')
    } else if (!password) {
      _err = new Error('Password is required')
    }

    if (_err) {
      utils.log('Could not log in user.', 'info', { error: _err.toString(), email: !!email ? email : 'Email not provided' })
      return reject(_err)
    }

    // Cast it to lowerCase
    var _email = email.toLowerCase()

    utils.log('Trying to log in user', 'info', { email: _email })

    User.findOne({ email: _email })
      .exec()
      .then(function (user) {
        var err
        if (!user) {
          err = new Error('User does not exist')
        } else if (!validatePassword(user.password, password)) {
          err = new Error('Incorrect password')
        }

        if (err) {
          utils.log('Could not log in user.', 'info', { error: err.toString(), email: _email })
          return reject(err)
        }

        var _token = signToken({ _id: user._id })

        utils.log('Sucessfully logged in user', 'info', { email: _email, token: _token })

        resolve({ user: _.omit(user._doc, ['password']), token: _token })
      })
      .catch(function (err) {
        utils.log('Could not log in user.', 'info', { error: err.toString(), email: _email })
        reject(err)
      })
  })
}

/**
 * Signs a token and returns it.
 *
 * @param {Data} data Data to sign into the token
 * @return {String} token
 */
function signToken(data) {
  return jwt.sign(data, config.app_secret, { expiresIn: 60 * 60 * 24 * 365 })
}

/**
 * Decodes a token and returns the result.
 *
 * @param {Stirng} token
 * @return {Object}
 */
function decodeToken(token) {
  // Return the decoded token.
  return jwt.decode(token, config.app_secret)
}

/**
 * Returns an encrypted password.
 *
 * @param {String} plainPassword The password to encrypt
 * @return {String}
 */
function encryptPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, bcrypt.genSaltSync(10))
}

/**
 * Returns true or false for whether the *plainPassword* is valid against *hashedPassword*.
 *
 * @param {String} hashedPassword The hashed password to compare against
 * @param {String} plainPassword The plain password to compare against *hashedPassword*
 * @return {Boolean}
 */
function validatePassword(hashedPassword, plainPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword)
}

module.exports = {
  roles: roles,
  isAuthenticatedMiddleware: isAuthenticatedMiddleware,
  isInvitedMiddleware: isInvitedMiddleware,
  isAdminEnoughMiddleware: isAdminEnoughMiddleware,
  isAdminOrMeMiddleware: isAdminOrMeMiddleware,
  validateEmail: validateEmail,
  validateGuidToken: validateGuidToken,
  signToken: signToken,
  decodeToken: decodeToken,
  encryptPassword: encryptPassword,
  validatePassword: validatePassword,
  login: login,
}

