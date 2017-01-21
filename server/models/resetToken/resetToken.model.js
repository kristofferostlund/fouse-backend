'use strict'

var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ResetTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    default: guid(),
  },
  dateValidFrom: {
    type: Date,
    default: Date.now,
  },
  dateValidTo: {
    type: Date,
    default:  moment().add(1, 'hour').toDate().getTime(),
  },
  isUsed: {
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
});

ResetTokenSchema.pre('save', function (next) {
  this.dateModified = new Date();
  next();
});

module.exports = mongoose.model('ResetToken', ResetTokenSchema);

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
    var n = [2, 1, 1, 1, 3][i];

    return _.times(n, function () { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(); }).join('');
  }).join('-');
}
