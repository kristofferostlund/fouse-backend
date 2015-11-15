'use strict'

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var logger = require('./utils/logger.util');

mongoose.connect('mongodb://localhost/home-please');

app.use(morgan('combined', { stream: logger.stream }));
require('./routes')(app, logger);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('App listening at http://%s:%s', host, port);
});