'use strict'

const express = require('express')
const controller = require('./api.controller')
const router = express.Router()
const cors = require('cors')

const auth = require('../../services/auth.service')

router.use(cors())

router.post('/authenticate', controller.user.login)

router.post('/users', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.user.createUser)
router.get('/users', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.user.listUsers)
router.get('/users/me', auth.isAuthenticatedMiddleware(), controller.user.me)
router.get('/users/:id', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.getUser)
router.put('/users/:id', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.updateUser)
router.put('/users/:id/password', auth.isAuthenticatedMiddleware(), controller.user.updateUserPassword)

router.post('/invitation/invite', auth.isAuthenticatedMiddleware(), controller.invitation.invite)
router.get('/invitation/respond/:token', auth.isInvitedMiddleware(), controller.invitation.respond)

router.get('/home-items/latest', auth.isAuthenticatedMiddleware(), controller.homeItems.listLatest)
router.get('/home-items', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.homeItems.listHomes)
router.get('/home-items/:id', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.homeItems.getHome)

module.exports = router
