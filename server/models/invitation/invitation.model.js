'use strict'

const mongoose = require('mongoose')
const moment = require('moment')
const _ = require('lodash')

const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const InvitationSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  dateValidFrom: {
    type: Date,
    default: Date.now,
  },
  dateValidTo: {
    type: Date,
    default:  moment().add(1, 'week').toDate().getTime(),
  },
  dateInvited: {
    type: Date,
    default: Date.now,
  },
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  toUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  token: {
    type: String,
    default: guid(),
  },
  tempPassword: {
    type: String,
    default: guid().replace(/-/g, ''),
  },
  dateAccepted: Date,
  /**
   * If isAnswered is true and toUser is populated
   * the invitation was successful.
   */
  isAnswered: Boolean,
  failedSending: {
    type: Boolean,
    default: false,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  dateModified: {
    type: Date,
    default: Date.now,
  },
  disabled: Boolean,
})

InvitationSchema.pre('save', function (next) {
  this.dateModified = new Date()

  this.email = this.email.toLowerCase()

  next()
})

module.exports = mongoose.model('Invitation', InvitationSchema)

/**
 * Returns a GUID string.
 *
 * Example output: '1a729180f8-1f9c3-18d86-13b26-15ff6120931f241'
 *
 * @return {String} GUID string
 */
function guid () {
  return _.times(5, function (i) {
    // Assign n to 2 if i === 0, 3 if i === 4, otherwise 1
    var n = [2, 1, 1, 1, 3][i]

    return _.times(n, function () { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring() }).join('')
  }).join('-')
}
