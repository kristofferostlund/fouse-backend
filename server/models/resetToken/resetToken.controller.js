'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');

var emailNotifier = require('./../../notifier/notifier.email');
var ResetToken = require('./resetToken.model');
var User = require('./../user/user.model');
var utils = require('./../../utils/utils');
var auth = require('./../../services/auth.service');
var config = require('./../../config');

/**
 * Resets the password of the user referenced
 * in the ResetToken model.
 *
 * @param {String} token
 * @return {Promise}
 */
function resetPassword(token, password) {
  var _err;
  var _resetToken;

  if (!token) {
    _err = new Error('Missing token.');
  } else if (!auth.validateGuidToken(token)) {
    _err = new Error('Invalid token');
  } else if (!password) {
    _err = new Error('Missing password');
  }

  if (_err) {
    utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() });
    return Promise.reject(err);
  }

  return ResetToken.findOne({ token: token, dateValidTo: { $gt: new Date() }, isUsed: { $ne: true } })
  .exec()
  .then(function (resetToken) {
    if (!resetToken) {
      // Set _err
      _err = new Error('Valid reset token not found.');
      utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() });
      return Promise.reject(_err);
    }

    _resetToken = resetToken;

    utils.log('Found valid reset token, attempting to find user.', 'info', { token: token })

    return User.findOne({ _id: resetToken.user, disabled: { $ne: true } })
    .exec();
  })
  .then(function (user) {
    if (!user) {
      // Set _err
      _err = new Error('User not found');
      utils.log('Cannot reset password.', 'info', { token: token, error: _err.toString() });
      return Promise.reject(_err);
    }

    user.password = auth.encryptPassword(password);
    return utils.savePromise(user);
  })
  .then(function (_user) {
    utils.log('Updated user\'s password', 'info', { token: token, user: _user._id });

    _resetToken.isUsed = true;
    return utils.savePromise(_resetToken);
  })
  .then(function (resetToken) {
    utils.log('Reset token used.', 'info', { token: token, user: resetToken.user });
    return Promise.resolve(resetToken);
  })
  .catch(function (err) {
    // Only log the error if it's mine.
    if (err !== _err) {
      utils.log('Failed to reset password', 'error', { token: token, error: err.toString() });
    }

    return Promise.reject(err);
  })
}

module.exports = {
  resetPassword: resetPassword,
}
