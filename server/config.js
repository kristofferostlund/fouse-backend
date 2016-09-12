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
  sendSms: parseBool(process.env.SEND_SMS) || false,
  sendEmail: parseBool(process.env.SEND_EMAIL) || false,
  notifyAll: parseBool(process.env.NOTIFY_ALL) || false,
  email_from: process.env.EMAIL_FROM || 'info@fouse.io',
  bitlyToken: process.env.BITLY_TOKEN || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  cellsynt_pass: process.env.CELLSYNT_PASS || 'password',
  cellsynt_username: process.env.CELLSYNT_USERNAME || 'user_name',
  geo_api_key: process.env.GEO_API_KEY || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  asana_token: process.env.ASANA_TOKEN || 'xxxxxxxxxxxxx',
  asana_workspace: process.env.ASANA_WORKSPACE || 'xxxxxxxxxxxxx',
  asana_projects: _.chain((process.env.ASANA_PROJECTS || '').split('|'))
    .filter()
    .map(function (project) { return project.split(':'); })
    .unzip()
    .thru(function (items) { return _.zipObject(_.first(items), _.last(items)); })
    .value(),
  interval: !_.isUndefined(process.env.INTERVAL) ? parseInt(process.env.INTERVAL) : 15,
  wait: !_.isUndefined(process.env.WAIT) ? parseInt(process.env.WAIT) : 5,
  send_grid_api_key: process.env.SEND_GRID_API_KEY || 'XXXXXXXXXXXX.xxxxxxxxxxxxxxxxxxxx',
  qasa_sms_api_token: process.env.QASA_SMS_API_TOKEN || 'xxxxxxxxxxxxxxxx',
  qasa_notify: !_.isUndefined(process.env.QASA_NOTIFY) ? parseBool(process.env.QASA_NOTIFY) : false,
  app_secret: 'sssshhh',
  skip_schedules: parseBool(process.env.SKIP_SCHEDULES),
  get app_url(){
    return process.env.APP_URL || ('http://127.0.0.1:' + this.port);
  },
};