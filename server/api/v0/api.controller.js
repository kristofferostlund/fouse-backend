'use strict'

const ApiUser = require('./controllers/api.user.controller')
const ApiHomeItems = require('./controllers/api.homeItems.controller')
const ApiInvitation = require('./controllers/api.invitation.controller')
const ApiRedirects = require('./controllers/api.redirects.controller')

module.exports = {
  user: ApiUser,
  homeItems: ApiHomeItems,
  invitation: ApiInvitation,
  redirects: ApiRedirects,
}

