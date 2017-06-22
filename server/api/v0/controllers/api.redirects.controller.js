'use strict'

const url = require('url')

const config = require('../../../config')

/**
 * Route: GET '/api/v0/redirects/redirects/password-reset/:token'
 */
function passwordReset(req, res) {
  const redirectUrl = url.resolve(config.frontend_url, `/reset-password/${encodeURIComponent(req.resetToken.token)}`)

  return res.redirect(redirectUrl)
}

/**
 * Route: GET '/api/v0/redirects/redirects/password-reset/:token'
 */
function invitationResponse(req, res) {
  const redirectUrl = url.resolve(config.frontend_url, `/respond-invitation/${encodeURIComponent(req.invitation.token)}`)

  return res.redirect(redirectUrl)
}

module.exports = {
  passwordReset: passwordReset,
  invitationResponse: invitationResponse,
}
