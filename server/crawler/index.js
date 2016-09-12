'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var express = require('express');
var router = express.Router();

var controller = require('./crawler.controller');

module.exports = router;
