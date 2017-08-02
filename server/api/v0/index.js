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
router.put('/users/reset-password', auth.hasPasswordResetMiddleware(), controller.user.resetPassword)
router.post('/users/request-password-reset', controller.user.requestPasswordReset)
router.get('/users/me', auth.isAuthenticatedMiddleware(), controller.user.me)
router.get('/users/:id', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.getUser)
router.put('/users/:id', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.updateUser)
router.put('/users/:id/account', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.updateUserAccount)
router.put('/users/:id/notification-settings', auth.isAdminOrMeMiddleware(auth.roles.ADMIN), controller.user.updateUserNotificationSettings)
router.put('/users/:id/password', auth.isAuthenticatedMiddleware(), controller.user.updateUserPassword)

router.post('/invitation/invite', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.invitation.invite)
router.post('/invitation/respond', auth.isInvitedMiddleware(), controller.invitation.respond)

router.get('/home-items/latest', auth.isAuthenticatedMiddleware(), controller.homeItems.listLatest)
router.get('/home-items', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.homeItems.listHomes)
router.get('/home-items/:id', auth.isAdminEnoughMiddleware(auth.roles.ADMIN), controller.homeItems.getHome)

router.get('/redirects/password-reset', auth.hasPasswordResetMiddleware(), controller.redirects.passwordReset)
router.get('/redirects/invitation-response', auth.isInvitedMiddleware(), controller.redirects.invitationResponse)

module.exports = router
