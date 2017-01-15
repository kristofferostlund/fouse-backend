'use strict'

var express = require('express')
var controller = require('./api.controller')
var router = express.Router()
var cors = require('cors')

var auth = require('../../services/auth.service')

router.use(cors())

router.post('/authenticate', controller.user.login)

router.post('/users', controller.user.createUser)
router.get('/users', auth.isAuthenticated(), controller.user.listUsers)
router.get('/users/me', auth.isAuthenticated(), controller.user.me)
router.get('/users/:id', auth.isAuthenticated(), controller.user.getUser)
router.put('/users/:id', auth.isAuthenticated(), controller.user.updateUser)
router.put('/users/:id/password', auth.isAuthenticated(), controller.user.updateUserPassword)

router.post('/invitation/invite', auth.isAuthenticated(), controller.invitation.invite)
router.get('/invitation/respond/:token', auth.isInvited(), controller.invitation.respond)

router.get('/home-items', auth.isAuthenticated(), controller.homeItems.listHomes)
router.get('/home-items/:id', auth.isAuthenticated(), controller.homeItems.getHome)

module.exports = router
