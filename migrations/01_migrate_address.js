'use strict'

var Promise = require('bluebird');

var HomeItem = require('./../server/models/homeItem/homeItem.model');

module.exports = function () {
  return new Promise(function (resolve, reject) {
    HomeItem.collection.update(
      { adress: { $exists: true } },
      // {},
      { $rename: { 'adress': 'address' } },
      { upsert: false, multi: true },
      function (err, result) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(result.result);
          resolve(result.result);
        }
      });
  });
}
