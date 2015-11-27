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
  date: Date,
  url: String,
  images: [ String ],
  thumbnail: String,
  classifications: {
    girls: Boolean, // For girls only
    commuters: Boolean, // Something like only 5 days a week
    shared: Boolean, // Rooms, collectives and other shared solutions
    swap: Boolean, // For swap - home for home
    noKitchen: Boolean // Tenant lacks access to kitchen
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
  
  next();
});

module.exports = mongoose.model('HomeItem', HomeItemSchema);