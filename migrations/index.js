'use strict'

var mongoose = require('mongoose');
var Promise = require('bluebird');

var config = require('./../server/config');

mongoose.connect(config.dbString);
mongoose.Promise = Promise;

var migrations = [
  require('./01_migrate_address'),
];

migrations
  .reduce(function (p, fn) { return p.then(fn); }, Promise.resolve())
  .then(function (values) {
    console.log('migrations completed');
  })
