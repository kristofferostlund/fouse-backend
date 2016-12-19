'use strict'

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var config = require('./config');
var utils = require('./utils/utils');
var logger = require('./utils/logger.utils');

utils.log('App starting')

mongoose.connect(config.dbString);
mongoose.Promise = require('bluebird');

utils.log('Connected to mongo database: ' + config.dbString);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(morgan('combined', { stream: logger.stream }));
require('./routes')(app, logger);

var server = app.listen(config.port, function() {
  var host = server.address().address;
  var port = server.address().port;

  utils.log('App listening on port ' + port, 'info');
});

module.exports = {}
