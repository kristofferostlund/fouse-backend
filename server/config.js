'use strict'

var _ = require('lodash');
var env = require('node-env-file');

env('./.env');

var userConfig; // Set it to the requried file if it exists
try { userConfig = require('../userConfig'); }
catch (error) { userConfig = {}; }

/**
 * Converts somewhat boolean values and strings such as 'false'.
 * 
 * @param {Any} input
 * @return {Boolean}
 */
function parseBool(input) {
  if (_.isUndefined(input)) { return undefined; }
  if (_.isBoolean(input)) { return input; }
  if (_.isString(input)) { return input != 'false'; }
  
  return !!input;
}

module.exports = {
  port: process.env.PORT || '3000',
  ip: process.env.IP || 'localhost',
  base_url: process.env.BASE_URL || 'http://www.blocket.se/bostad/uthyres/stockholm?o=1',
  dbString: process.env.DB_STRING || 'mongodb://localhost/home_please',
  tel: process.env.TEL || '0046700000000',
  email: process.env.EMAIL || 'recipient.email@example.com',
  sendSms: parseBool(process.env.SEND_SMS) || false,
  sendEmail: parseBool(process.env.SEND_EMAIL) || false,
  name: process.env.NAME || 'John Doe',
  email_from: process.env.EMAIL_FROM || 'outbound.email@example.com',
  bitlyToken: process.env.BITLY_TOKEN || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  cellsynt_pass: process.env.CELLSYNT_PASS || 'password',
  cellsynt_username: process.env.CELLSYNT_USERNAME || 'user_name',
  cellsynt_originator: process.env.CELLSYNT_ORIGINATOR || '46700000000',
  mandrill_api_key: process.env.MANDRILL_API_KEY || 'xxxxxxxxxxxxxx-xxxxxxx',
  geo_api_key: process.env.GEO_API_KEY || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  asana_token: process.env.ASANA_TOKEN || 'xxxxxxxxxxxxx',
  asana_workspace: process.env.ASANA_WORKSPACE || 'xxxxxxxxxxxxx',
};