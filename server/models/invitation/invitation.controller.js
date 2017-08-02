'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const moment = require('moment')

const emailNotifier = require('./../../notifier/notifier.email')
const Invitation = require('./invitation.model')
const User = require('./../user/user.model')
const userController = require('./../user/user.controller')
const utils = require('./../../utils/utils')
const auth = require('./../../services/auth.service')
const config = require('./../../config')

/**
 * @param {{ token: String, email: String }}
 * @param {{ name: String }} user
 * @return {String}
 */
function getInvitationBody({ token, email }, user) {
  return `Hi!

You've been invited to use Fouse by ${user.name}.

To get started and create your account, click the link below!

${config.app_url}/api/v0/redirects/invitation-response?_t=${encodeURIComponent(token)}&_e=${encodeURIComponent(email)}

Best wishes,

The Fouse team
`
}

/**
 * @param {{ email: String, name: String, fromUser: { name: String, _id: String } }} context
 * @return {Promise<Object>}
 */
function createInvitation(context) {
  return new Promise(function (resolve, reject) {
    const fromUser = context.fromUser
    const { email, name } = context

    let _err
    let __invitation

    if (!_.get(fromUser, '_id')) {
      _err = new Error('Missing user.')
    } else if (!email || !auth.validateEmail(email)) {
      _err = new Error('Missing or invalid email.')
    } else if (!name) {
      _err = new Error('Missing name.')
    }

    const _meta = { invite: { email, name }, fromUser }

    if (_err) {
      utils.log('Cannot create invitation.', 'info', _.assign({}, { error: _err.toString(), _meta }))
      return reject(_err)
    }

    utils.log('Creating invitation.', 'info', _meta)

    User.findOne({ email: email.toLowerCase() })
    .select('_id')
    .exec()
    .then(function (user) {
      if (user) {
        var _err = new Error('User already exists')
        utils.log('Cannot create invitation.', 'info', _.assign({}, { error: _err.toString(), _meta }))
        return Promise.reject(_err)
      }

      return Invitation.findOne({ email: email, $or: [ { dateValidTo: { $gt: new Date() } }, { toUser: { $exists: true } } ] })
    })
    .then(function (_invitation) {
      if (_invitation) {
        var _err = _.isUndefined(_invitation.toUser)
          ? new Error('Valid invitation already exists.')
          : new Error('Invitation already accepted.')

        utils.log('Cannot create invitation.', 'info', _.assign({}, { error: _err.toString() }, _meta))

        return Promise.reject(_err)
      }

      return Invitation.create({ email, name, fromUser })
    })
    .then(function (invitation) {
      __invitation = invitation
      utils.log('Invitation created. Sending email.', 'info', _meta)
      return emailNotifier.plainSend(email, 'Invitation to ue Fouse', getInvitationBody(invitation, fromUser))
    })
    .then(function (data) {
      utils.log('Invitation successfully sent.', 'info', _meta)
      resolve(__invitation)
    })
    .catch(function (err) {
      utils.log('Failed to send invitation.', 'error', _.assign({}, { error: err.toString() }, _meta))

      if (!__invitation) {
        utils.log('No invitation to set as failed.', 'info', _.assign({}, { error: err.toString() }, _meta))
        return reject(err)
      }

      var _inviteId = __invitation._id

      // Set the invitation to failed
      __invitation.failedSending = true
        utils.log('Setting invitation to failed.', 'info', _.assign({}, { invitation_Id: _inviteId }, _meta))
      __invitation.save(function (_err, _invitation) {
        utils.log('Successfully set invitation to failed.', 'info', _.assign({}, { invitation_Id: _inviteId }, _meta))
        // Reject the error
        reject(err)
      })
    })
  })
}

/**
 * Creates a new user based on the invitation as long as there's a valid,
 * unused email address stored on the invitation.
 *
 * @param {{ _id: String, email: String, password: String, name: String }} opts
 * @returns {Promise<{ token: String, user: { name: String, email: String, tel: String, options: { maxPrice: Number, minPrice: Number, classification: { girls: Boolean, commuters: Boolean, shared: Boolean, swap: Boolean, noKitchen: Boolean }, time: { period: { min: Number, max: Number }, isLongTerm: Boolean }, region: String }, notify: { email: Boolean, sms: Boolean }, dateCreated: Date, dateModified: Date, disabled: Boolean } >}
 */
function completeInvitation(opts) {
  if (!auth.validateEmail(opts.email)) {
    const err = new Error('Missing or incorrect email address')
    return Promise.reject(err)
  }

  // Finally returned user
  let user

  const _user = {
    email: opts.email.toLowerCase(),
    name: opts.name,
    password: opts.password,
  }

  // First create the user
  return userController.create(_user)
    .then(newUser => {
      user = newUser._doc !== undefined
        ? newUser.doc
        : newUser

      // Then find the invitation
      return Invitation.findById(opts._id).exec()
    })
    .then(invitation => {
      // The update it with the new values
      invitation.dateAccepted = new Date()
      invitation.isAnswered = true
      invitation.toUser = user._id

      // save it
      return invitation.save()
    })
    // resolve the values
    .then(invitation => {
      const output = {
        user: user,
        invitation: _.omit(invitation._doc, ['tempPassword', '__v']),
        token: auth.createUserToken(user),
      }

      return Promise.resolve(output)
    })
    .catch(err => {
      utils.log('Cannot create invitation.', 'error', { error: _err.toString() })

      return Promise.reject(err)
    })
}

module.exports = {
  createInvitation: createInvitation,
  completeInvitation: completeInvitation,
}
