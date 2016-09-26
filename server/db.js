'use strict'

var r = require('rethinkdb');

var config = require('./config');
var utils = require('./utils/utils');

var Eventer = require('tiny-eventer').Eventer;
var _eventer = new Eventer();

/** @type {rethinkdb~Connection} */
var _conn = null;

/**
 * Initializes the database by creating it
 * if it doesn't exist.
 *
 * @param {String} name
 * @return {Promise}
 */
function initDb(name) {
  return r.dbList.run(_conn)
  .then(function (dbs) {
    if (utils.contains(dbs, name)) {
      utils.log('Not creating DB, it already exists', 'info', { name: name });

      return Promise.resolve();
    }

    utils.log('Creating DB', 'info', { name: name });
    return r.dbCreate(name).run(_conn);
  })
  .then(function (output) {
    if (output) {
      utils.log('DB created', 'info', { name: name });
    }

    return Promise.resolve();
  });
}

/**
 * Initializes the able by cerating it
 * if it doesn't exist.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {Promise}
 */
function initTable(name, options) {
  return r.db(config.rethink.db).tableList().run(_conn)
  .then(function (tables) {
    if (utils.contains(tables, name)) {
      utils.log('Not creating table, it already exists', 'info', { name: name, });
      return Promise.resolve();
    }

    // Ensure options exist
    options = _.isUndefined(options) ? {} : options;

    utils.log('Creating table', 'info', { name: name });
    return r.db(config.rethink.db).tableCreate(name, options).run(_conn);
  })
  .then(function (output) {
    if (output) {
      logger.log('Table created', 'info', { name: name });
    }

    return Promise.resolve();
  });
}

/**
 * @param {{ db: String }} context
 * @return {Promise}
 */
function init(context) {
  return r.connect(config.rethink)
  .then(function (connection) {
    _conn = connection;

    if (!context.db) { context.db = 'test'; }

    return initDb(context.db);
  })
  .then(function () {
    _eventer.trigger('initialized');
    return Promise.resolve();
  });
}

module.exports = {
  r: r,
  conn: function () { return _conn; },
  setConnection: function (value) { _conn = value; },
  initDb: initDb,
  initTable: initTable,
  init: init,
  table: function (name) { return r.db(config.db).table(name); },
  on: _eventer.on,
  off: _eventer.off,
  trigger: _eventer.trigger,
}
