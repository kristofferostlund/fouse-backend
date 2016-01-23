'use strict'

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
  name: String,
  email: String,
  homeOptions: {
    price: Number,
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
    }
  },
  notificationOptions: {
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
  this.modified = new Date();
  
  next();
});

module.exports = mongoose.model('User', UserSchema);