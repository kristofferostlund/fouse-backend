'use strict'

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var HomeItemSchema = new Schema({
  title: String,
  owner: String,
  rent: String, // As is
  price: Number, // Parsed from this.rent
  body: String,
  rooms: String,
  size: String,
  location: String,
  adress: String,
  date: Date,
  url: String,
  shortUrl: String,
  tel: String,
  images: [ String ],
  thumbnail: String,
  notified: Boolean,
  classification: {
    girls: Boolean, // For girls only
    commuters: Boolean, // Something like only 5 days a week
    shared: Boolean, // Rooms, collectives and other shared solutions
    swap: Boolean, // For swap - home for home
    noKitchen: Boolean // Tenant lacks access to kitchen
  },
  time: {
    period: Number, // The rental period in month
    start: Date, // Approximate start of the the contract
    end: Date, // Approximate end of the contract
    isLongTerm: Boolean // 'Until further notice'
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateModified: {
    type: Date,
    default: Date.now
  },
  dateRemoved: {
    // Approximate as I cannot know exactly when it was removed
    type: Date
  },
  active: {
    // For slowly changing dimensions like data
    type: Boolean,
    default: true
  },
  disabled: Boolean
});


HomeItemSchema.pre('save', function (next) {
  this.dateModified = new Date();
  
  // Remove trailing "'n" to fix bug where linking doesn't work.
  if (/'n$/.test(this.url)) {
    this.url = this.url.replace(/('n)$/, '')
  }
  
  next();
});

module.exports = mongoose.model('HomeItem', HomeItemSchema);