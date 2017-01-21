'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const moment = require('moment')

const User = require('./user.model')

const utils = require('../../utils/utils')
const homeController = require('../homeItem/homeItem.controller')
const auth = require('./../../services/auth.service')

/**
 * Finds all users which somehow should be notified.
 * At least one of the two notify properties of the user must be set to true.
 *
 * @return {Promise<{ _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean }[]>} (User)
 */
function findNotifiable() {
  return new Promise(function (resolve, reject) {
    const opts = {
      disabled: { $ne: true },
      $or: [
        { 'notify.email': true },
        { 'notify.sms': true }
      ]
    }

    return User.find(opts)
      .select('-password -__v')
      .then(resolve)
      .catch(reject)
  })
}

/**
 * Finds a user by _id and returns a promise of it.
 *
 * Note: __v and password are omitted.
 *
 * @param {String} userId
 * @return {Promise<{ user: { _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean } >>}
 */
function findById(userId) {
  return new Promise(function (resolve, reject) {
    if (!userId) {
      return reject(new Error('Missing userId'))
    } else if (!/^[0-9a-f]{24}$/.test(userId)) {
      return reject(new Error('Invalid userId'))
    }

    User.findById(userId)
      .select('-password -__v')
      .exec()
      .then(resolve)
      .catch(reject)
  })
}

/**
 * Creates a new or multiple new users to the db.
 *
 * @param {{ email: String, tel: String, password: String, passwordRepeat: String, notifyOptions: { email: Boolean, sms: Boolean, }, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean, }, time: { period: { min: Number,  max: Number, }, isLongTerm: Boolean, }, region: String }}} user
 * @return {Promise<{ _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean }|{ _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean }[]>} (User)
 */
function create(user) {
  return new Promise(function (resolve, reject) {
    if (!user.password) {
      return reject(new Error('Password is required'))
    } else if (!user.email) {
      return reject(new Error('Email is required'))
    } else if (!user.name) {
      return reject(new Error('Name is required'))
    }

    // Hash the password, sanitize email and set role
    var _user = _.assign({}, user, { password: auth.encryptPassword(user.password), email: user.email.toLowerCase(), role: 1 })

    var _meta = { email: _user.email }

    utils.log('Creating a new user.', 'info', _meta)

    User.findOne({ email: _user.email }, { email: true })
      .exec()
      .then(function (emailUser) {
        if (!!emailUser) {
          utils.log('Cannot create user, email already exists', 'info', _meta)
          return reject(new Error('Email already exists'))
        }

        // Create the user, wrapped in a promise
        return new Promise(function (resolve, reject) {
          User.create(_user, function (err, createdUser) {
            return !err ? resolve(createdUser) : reject(err)
          })
        })
      })
      .then(function (createdUser) {
        // Omit user password
        var _createdUser = _.omit(createdUser._doc, ['password', '__v'])

        utils.log('Successfully created new user.', 'info', _meta)
        resolve(_createdUser)
      })
      .catch(function (err) {
        utils.log('Failed to create new user', 'info', _.assign({}, _meta, { error: err.toString() }))
        return reject(err)
      })
  })
}

/**
 * Updates a user and returns a promise the updated version.
 *
 * @param {String} userId The _id of the user to update
 * @param {Object} user User object to update
 * @return {Promise<{ _id: String, name: String, email: String, tel: String, role: Number, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean }>} The new user
 */
function update(userId, user) {
  return new Promise(function (resolve, reject) {
    if (!user || !userId) {
      return reject(new Error('No user to update'))
    }

    var _meta = { _id: userId, email: user.email }
    utils.log('Updating user.', 'info', _meta)

    User.findById(userId)
      .exec(function (err, oldUser) {

        // Merge them together
        var updated = _.assign(oldUser, _.omit(user, ['_id', '__v', 'password', 'role']))

        // Save the updated version
        updated.save(function (err, _user) {
          if (err) {
            utils.log('Failed to update user.', 'error', _.assign({}, _meta, { error: err.toString() }))
            return reject(err)
          }

          utils.log('Successfully updated user.', 'info', _meta)

          resolve(_.omit(_user, ['password', '__v']))
        })
      })
  })
}

/**
 * @param {String} userId The _id of the user to set password for
 * @param {String} password New password to set
 * @param {String} currentPassword Current password to use for safety
 * @return {Promise<{ successful: Boolean, message: String, error: Error }>}
 */
function updatePassword(userId, password, currentPassword) {
  return new Promise(function (resolve, reject) {
    utils.log('Updating user password.', 'info', { userId: userId })

    var _err

    if (!userId) {
      _err = new Error('Incorrect or missing userId.')
    } else if (!password) {
      _err = new Error('Missing new password.')
    } else if (!currentPassword) {
      _err = new Error('Missing current password.')
    }

    if (_err) {
      utils.log('Failed to update user password.', 'error', { error: _err.toString(), userId: userId })
      return resolve({ successful: false, message: _err.message, error: _err })
    }

    User.findById(userId).exec()
      .then(function (user) {
        if (!user) {
          _err = new Error('User does not exist.')
        } else if (!auth.validatePassword(user.password, currentPassword)) {
          _err = new Error('Incorrect password.')
        }

        if (_err) {
          utils.log('Failed to update user password.', 'error', { error: _err.toString(), userId: userId })
          return resolve({ successful: false, message: _err.message, error: _err })
        }

        // Set the new password
        user.password = auth.encryptPassword(password)

        return user.save()
      })
      .then(function (user) {
        utils.log('Password updated!', 'info', { userId: userId })
        resolve({ successful: true, message: 'Password successfully updated.', error: null })
      })
      .catch(function (err) {
        utils.log('Failed to update user password.', 'error', { error: err.toString(), userId: userId })
        reject(err)
      })
  })
}

module.exports = {
  findNotifiable: findNotifiable,
  findById: findById,
  create: create,
  update: update,
  updatePassword: updatePassword,
}