'use strict'

const url = require('url')

const config = require('../../../config')

/**
 * Route: GET '/api/v0/redirects/redirects/password-reset/:token'
 */
function passwordReset(req, res) {
  const redirectUrl = url.resolve(config.frontend_url, `/reset-password?_t=${encodeURIComponent(req.resetToken.token)}`)

  return res.redirect(redirectUrl)
}

/**
 * Route: GET '/api/v0/redirects/invitation-response?_t&_e'
 */
function invitationResponse(req, res) {
  const redirectUrl = url.resolve(config.frontend_url, `/respond-to-invitation?_t=${encodeURIComponent(req.invitation.token)}&_e=${encodeURIComponent(req.invitation.email)}`)

  return res.redirect(redirectUrl)
}

module.exports = {
  passwordReset: passwordReset,
  invitationResponse: invitationResponse,
}
