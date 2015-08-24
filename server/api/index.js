var express = require('express');
var controller = require('./api.controller');
var router = express.Router();

router.get('/recent', controller.recent);

module.exports = router;