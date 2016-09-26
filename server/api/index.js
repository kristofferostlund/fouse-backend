'use strict'

var express = require('express');

var router = express.Router();

router.use('/v0', require('./v0'));

module.exports = router;