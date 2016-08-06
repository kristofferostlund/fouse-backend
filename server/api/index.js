'use strict'

var express = require('express');
var controller = require('./api.controller');
var router = express.Router();
var cors = require('cors');

router.use(cors());

router.get('/users', controller.listUsers)
router.post('/users', controller.createUser);

module.exports = router;