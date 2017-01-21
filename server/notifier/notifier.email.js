'use strict'

var _ = require('lodash')
var Promise = require('bluebird')
var chalk = require('chalk')
var moment = require('moment')

var utils = require('../utils/utils')
var config = require('../config')

var sendgrid = require('sendgrid')(config.send_grid_api_key)

/**
 * Sends an email to *receivers* with the subject of *subject*
 * and the text body of *text*.
 *
 * @param {Array|String} receivers Array or string of reciever email addresses
 * @param {String} subject The subject of the email
 * @param {String} text The content of the email
 * @return {Promise}
 */
function _send(receivers, subject, text) {
  return new Promise(function (resolve, reject) {
    // Ensure array
    const to = _.isArray(receivers)
      ? receivers
      : [receivers]

    if (!config.sendEmail) {
      utils.log('Not sending email(s) as email is turned off.', 'info', { subject, to, text })
      return resolve()
    }

    // Log the email
    utils.log('Sending email.', 'info', { subject, to, text })

    sendgrid.send({
      to,
      text,
      subject,
      from: config.email_from || 'info@fouse.io',
      fromname: 'Fouse',
    }, function (err, result) {
      // Handle errors
      if (err) {
        return utils.logReject(err, 'Failed to send email.', 'info', { error: err.toString(), subject, to }, reject)
      }

      utils.log('Sucessfully sent email.', 'info', { subject, to })

      // Resolve the result
      resolve(result)
    })
  })
}

/**
 * Sends an email to a single user and returns a promise of it.
 *
 * @param {Object} user The user to notify
 * @param {Array} homeItems Array of HomeItems the user may find interesting
 * @return {Promise}
 */
function send(user, homeItems) {
  // Don't send emails to users not asking for it
  if (!user || !_.get(user, 'notify.email') || !user.email) {
    return Promise.resolve()
  }

  // Get the email address
  const { email } = user

  const subject = `Fouse: ${homeItem.length} ${homeItems.length === 1 ? 'ny bostad' : 'nya bostäder'} av intresse`

  // Create the message
  const text = [
    `Hej${!!user.name ? ' ' + user.name : ''}, vi på Fouse tror att följande ${homeItems.length === 1 ? 'bostad' : homeItems.length + ' bostäder'} kan vara ${homeItems.length === 1 ? 'intressant' : 'intressanta'}`,
    _.chain(homeItems)
      // Filter out any undefined items
      // which somehow got here
      .filter()
      .map(function (homeItem) {
        return [
          // Make the title uppercase only
          (homeItem.title || '').toUpperCase(),
          // Prefer the shortUrl but fall back to the regular url if the short doesn't exist.
          homeItem.shortUrl || homeItem.url,
          _.chain(homeItem)
            // Use only these values
            .pick(['location', 'rent', 'rooms', 'size', 'address'])
            // Filter out undefined properties and create an array of the items
            .filter(function (e) { return /[^\s]/.test(e) })
            .value()
            .join(', '),
          homeItem.body,
        ].join('\n\n')
      })
      .value()
      .join('\n\n--------\n\n'),
  ].join('\n\n')

  return _send(email, subject, text)
}

module.exports = {
  send: send,
  plainSend: _send,
}
