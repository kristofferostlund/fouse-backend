'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var logger = require('./../../utils/logger.utils');

/**
 * Serializes an error so it can be sent via JSON.
 *
 * @param {Error} err
 * @return {{ type: String, message: String }}
 */
function serializeError(err) {
  var _message = _.isError(err)
    ? err.message
    : err;

  // Try get the  error type (e.g. TypeError, Error or whatever)
  var _type = _.isError(err)
    ? _.attempt(function () { return err.constructor.toString().match(/^function ([a-zA-Z]+)/)[1]; })
    : 'Error';

  // Set the message to null if it's falsy
  if (!_message) {
    _message = null;
  }

  // If the type check failed, return null
  if (!_.isString(_type)) {
    _type = 'Error';
  }

  return { type: _type, message: _message };
}

/**
 * @param {{ status: Function }} res Express response object
 * @param {Error} err
 */
function internalError(res, err) {
  logger.log('Internal error', 'error', { error: err.toString(), stackTrace: err.stack });
  res.status(500).send('Internal error');
}

/**
 * @param {{ status: Function }} res Express response object
 * @param {{ status: Number, data: Any, error: Error, message: String, meta: Object }} context
 */
function send(res, context) {
  // Get the status of the response. Defaults to 200
  var _status = _.isUndefined(context.status)
    ? 200
    : context.status;

  // Create the response object
  var _responseData = {
    data: context.data,
    error: !!context.error ? serializeError(context.error) : undefined,
    message: context.message,
    meta: _.assign({}, {
      api_version: 'v0',
      timestamp: Date.now(),
      status: _status,
    }, context.meta),
  };

  res.status(_status).json(_responseData);
}

/**
 * @param {{ status: Function }} res Express response object
 * @param {Error} err
 * @param {String} [message=err.message]
 */
function sendError(res, err, message) {
  message = _.isUndefined(message) ? _.get(err, 'message') : message;

  return send(res, { status: 400, error: err, message: message });
}

module.exports = {
  internalError: internalError,
  send: send,
  sendError: sendError,
}
