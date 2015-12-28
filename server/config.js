'use strict'

var _ = require('lodash');

var userConfig; // Set it to the requried file if it exists
try { userConfig = require('../userConfig'); }
catch (error) { userConfig = {}; }

module.exports = {
  port: userConfig.port || process.env.PORT || '3000',
  ip: userConfig.ip || process.env.IP || 'localhost',
  dbString: userConfig.dbString || process.env.dbString || 'mongodb://localhost/home-please',
  tel: userConfig.tel || process.env.tel || '0046700000000',
  email: userConfig.email || process.env.email || 'recipient.email@example.com',
  sendSms: userConfig.sendSms || process.env.sendSms || false,
  name: userConfig.name || process.env.name || 'John Doe',
  email_from: userConfig.email_from || process.env.email_from || 'outbound.email@example.com',
  bitlyToken: userConfig.bitlyToken || process.env.bitlyToken || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  cellsynt_pass: userConfig.cellsynt_pass || process.env.cellsynt_pass || 'password' ,
  cellsynt_username: userConfig.cellsynt_username || process.env.cellsynt_username || 'user_name' ,
  cellsynt_originator: userConfig.cellsynt_originator || process.env.cellsynt_originator || '46700000000' ,
  mandrill_api_key: userConfig.mandrill_api_key || process.env.mandrill_api_key || 'xxxxxxxxxxxxxx-xxxxxxx',
  geo_api_key: userConfig.geo_api_key || process.env.geo_api_key || 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};