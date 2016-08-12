'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

var emailNotifier = require('./../../notifier/notifier.email');
var Invitation = require('./invitation.model');
var User = require('./../user/user.model');
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
    var __invitation;

    if (!_.get(fromUser, '_id')) {
      _err = new Error('Missing user.');
    } else if (!email || !auth.validateEmail(email)) {
      _err = new Error('Missing or invalid email.');
    }

    var _meta = {
      'fromUser._id': _.get(fromUser, '_id'),
      email: email,
    }

    if (_err) {
      utils.log('Cannot create invitation.', 'info', _.assign({}, { error: _err.toString(), _meta }));
      return reject(_err);
    }

    utils.log('Creating invitation.', 'info', _meta);

    User.findOne({ email: email.toLowerCase() })
    .select('_id')
    .exec()
    .then(function (user) {
      if (user) {
        var _err = new Error('User already exists');
        utils.log('Cannot create invitation.', 'info', _.assign({}, { error: _err.toString(), _meta }));
        return Promise.reject(_err);
      }

      return Invitation.create({ email: email, fromUser: fromUser })
    })
    .then(function (invitation) {
      __invitation = invitation;
      utils.log('Invitation created. Sending email.', 'info', _meta);
      return emailNotifier.plainSend(email, 'Inbjudan att använda Fouse', getInvitationBody(invitation.token, fromUser))
    })
    .then(function (data) {
      utils.log('Invitation successfully sent.', 'info', _meta);
      resolve(__invitation);
    })
    .catch(function (err) {
      utils.log('Failed to send invitation.', 'error', _.assign({}, { error: err.toString() }, _meta));

      if (!__invitation) {
        utils.log('No invitation to set as failed.', 'info', _meta);
        return reject(err);
      }

      var _inviteId = __invitation._id;

      // Set the invitation to failed
      __invitation.failedSending = true;
        utils.log('Setting invitation to failed.', 'info', _.assign({}, { invitation_Id: _inviteId }, _meta))
      __invitation.save(function (_err, _invitation) {
        utils.log('Successfully set invitation to failed.', 'info', _.assign({}, { invitation_Id: _inviteId }, _meta))
        // Reject the error
        reject(err);
      });
    });
  });
}

module.exports = {
  createInvitation: createInvitation,
}
