'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var emailNotifier = require('./../../notifier/notifier.email');
var Invitation = require('./invitation.model');
var utils = require('./../../utils/utils');
var auth = require('./../../services/auth.service');
var config = require('./../../config');

/**
 * @param {String} token
 * @param {{ name: String }} user
 * @return {String}
 */
function getInvitationBody(token, user) {
  return [
    'Hej!',
    'Du har blivit inbjuden att börja Fouse. För att komma igång är det bara att klicka på länken har nedan.',
    config.app_url + '/api/invitation/token/' + encodeURIComponent(token),
  ].join('\n\n');
}

/**
 * @param {{ email: String, fromUser: { name: String, _id: String } }} context
 * @return {Promise<Object>}
 */
function createInvitation(context) {
  return new Promise(function (resolve, reject) {
    var fromUser = context.fromUser;
    var email = context.email;

    var _err;

    if (!_.get(fromUser, '_id')) {
      _err = new Error('Missing user.');
    } else if (!email || !auth.validateEmail(email)) {
      _err = new Error('Missing or invalid email.');
    }

    if (_err) {
      utils.log('Cannot create inivation.', { error: _err.toString(), fromUser: fromUser, email: email })
      return reject(_err);
    }

    utils.log('Creating invitation.', 'info', { fromUser: fromUser, email: email });

    Invitation.create({ email: email, fromUser: fromUser }, function (err, invitation) {
      if (err) {
        utils.log('Failed to create invitation.', 'error', { fromUser: fromUser, email: email });
        return reject(err);
      }

      utils.log('Invitation created. Sending email.', 'info', { fromUser: fromUser, email: email });
      emailNotifier.plainSend(email, 'Inbjudan att använda Fouse', getInvitationBody(invitation.token, fromUser))
      .then(function (data) {
        console.log(data);

        resolve(invitation);
      })
      .catch(function (err) {
        utils.log('Failed to send invitation.', 'error', { error: err.toString(), fromUser: fromUser, email: email });


        // Set the invitation to failed
        invitation.failedSending = true;
        invitation.save(function (_err, _invitation) {
          utils.log('Setting invitation to failed.', 'info', { fromUser: fromUser, email: email })

          // Reject the error
          reject(err);
        });
      });
    });
  });
}

module.exports = {
  createInvitation: createInvitation,
}
