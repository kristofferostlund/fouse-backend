'use strict'

var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var InvitationSchema = new Schema({
  name: String,
  email: {
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
  dateAccepted: Date,
  isAccepted: Boolean,
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  dateModified: {
    type: Date,
    default: Date.now,
  },
  disabled: Boolean
});

InvitationSchema.pre('save', function (next) {
  this.dateModified = new Date();

  this.email = this.email.toLowerCase();

  next();
});

module.exports = mongoose.model('Invitation', InvitationSchema);