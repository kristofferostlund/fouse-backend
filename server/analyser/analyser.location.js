'use strict'

var _ = require('lodash');
var Promise = require('bluebird');

var utils = require('../utils/general.utils');
var config = require('../config');
var HomeItem = require('../models/homeItem/homeItem.model');

/**
 * Gets the region of the homeItem.
 * 
 * Currently only works properly for Gothenburg (Göteborg) and Stockholm.
 * It does _sort of_ work for other locations, but not as reliably.
 *
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object} (HomeItem)
 */
function getRegion(homeItem) {
  return new Promise(function (resolve, reject) {
    
    homeItem = homeItem || {};
    
    // Will be set further down.
    var region;
    
    // Check for clues without checking with Google.
    // Only works properly for Stockholm and Gothenburg.
    if (/uthyres\/(stockholm|goteborg)\?/i.test(config.base_url)) {
      
      // Check if it can be deducted from the base_url.
      region = _.attempt(function () { return /uthyres\/(stockholm|goteborg)\?/i.exec(config.base_url)[0]; });
      
    } else if (/(^stockholm|^göteborg)/i.test(homeItem.location)) {
      // Check if it can be deducted from homeItem.location.
      region = _.attempt(function () { return /(^stockholm|^göteborg)/i.exec(homeItem.location)[0]; });
    }
    
    if (!!region && !_.isError(region)) {
      homeItem.region = /g(o|ö)teborg/i.test(region)
          ? 'Göteborg'
          : 'Stockholm';
        
        return resolve(homeItem);
    }
    
    // Check with Google.
    var url = [
      'https://maps.googleapis.com/maps/api/geocode/json',
      '?address=' + encodeURIComponent(homeItem.location),
      '&region=se',
      '&key=' + config.geo_api_key
    ].join('');
    
    // Get the results from google
    utils.getPage(url, {}, true)
    .then(function (resp) {
      
      // Get the address component of which to find the region.
      region = _.find(_.get(resp, 'results[0].address_components'), function (addressComponent) {
        return /(county|län)/i.test((addressComponent.long_name || ''));
      });
      
      region = !!region
        ? region.long_name
        : region;
      
      // Check for Gothenburg (Göteborg)
      if (/västra götaland/i.test(region)) {
        homeItem.region = 'Göteborg';
      } else {
        // Try get the region from the result
        region = _.attempt(function () { return /^[a-ö ]+(?= (county|län))/i.exec(region)[0]; });
        
        homeItem.region = _.isError(region)
          ? undefined
          : region;
      }
      
      resolve(homeItem);
    })
    .catch(function (err) {
      reject(err);
    });
  });
}

/**
 * Gets various location data from the homeItem.
 * 
 * @param {Object} homeItem (HomeItem)
 * @return {Promise} -> {Object} (HomeItem)
 */
function getLocationInfo(homeItem) {
  
  // Fill up the promise chain when needed.
  return getRegion(homeItem);
}

module.exports = {
  getLocationInfo: getLocationInfo
};
