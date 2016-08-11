'use strict'

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
  name: String,
  email: {
    type: String,
    unique: true,
    required: true,
  },
  tel: {
    unique: true,
    type: String
  },
  password: {
    type: String,
    required: true,
  },
  options: {
    maxPrice: Number, // Translates into { $lte: *price* }
    minPrice: Number, // Translates into { $gte: *maxPrice* }
    classification: {
      girls: Boolean, // For girls only
      commuters: Boolean, // Something like only 5 days a week
      shared: Boolean, // Rooms, collectives and other shared solutions
      swap: Boolean, // For swap - home for home
      noKitchen: Boolean // Tenant lacks access to kitchen
    },
    time: {
      period: {
        min: Number, // Translates into { $gte: *min* }
        max: Number // Translates into { $lte: *max* }
      },
      isLongTerm: Boolean
    },
    region: String, // The region of interest
  },
  notify: {
    email: Boolean,
    sms: Boolean
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateModified: {
    type: Date,
    default: Date.now
  },
  disabled: Boolean
});

UserSchema.pre('save', function (next) {
  this.dateModified = new Date();

  // Ensure proper formatting.
  // only allows Swedish numbers for now
  if (this.tel && !/^46/.test(this.tel)) {
    this.tel = this.tel.replace(/(^\+46|^46|^0046|^0(?!046))/, '46');
  }

  this.email = this.email.toLowerCase();

  next();
});

module.exports = mongoose.model('User', UserSchema);