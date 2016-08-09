'use strict'

var express = require('express');
var controller = require('./api.controller');
var router = express.Router();
var cors = require('cors');

var auth = require('./../services/auth.service');

router.use(cors());

router.post('/authenticate', controller.login);

router.post('/users', controller.createUser);
router.get('/users', auth.isAuthenticated(), controller.listUsers);
router.get('/users/me', auth.isAuthenticated(), controller.me);
router.get('/users/:id', auth.isAuthenticated(), controller.getUser);
router.put('/users/:id', auth.isAuthenticated(), controller.updateUser);
router.put('/users/:id/password', auth.isAuthenticated(), controller.updateUserPassword);

router.get('/home-items', auth.isAuthenticated(), controller.listHomes);

module.exports = router;