'use strict'

var express = require('express');
var controller = require('./api.controller');
var router = express.Router();
var cors = require('cors');

var auth = require('./../services/auth.service');

router.use(cors());

router.post('/authenticate', controller.login);
router.get('/users', auth.isAuthenticated(), controller.listUsers)
router.post('/users', controller.createUser);

module.exports = router;