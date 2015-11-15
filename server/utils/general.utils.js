'use strict'

var _ = require('lodash');

/**
 * Returns true or false for all properties of *target* matches those of *source*.
 * Any property names matching an elemtn in *exclude* won't be checked.
 * 
 * NOTE: not all properties must be present in target for a truthy return,
 * source may contain more properties and still be considered similar.
 * 
 * @param {Object} source - Object to compare against
 * @param {Object} target - Object to compare
 * @param {Array} exclude - optional, key names to not check
 * @return {Boolean}
 */
function lazyCompare(source, target, exclude) {
  // Check instance equality and return true if truthy
  // This also checks whether both are undefined or null
  if (source == target) { return true; }
  
  // If either is falesy, they aren't equal
  if (!source || !target) { return false; }
  
  // Ensure exclude is an array
  if (!_.isArray(exclude)) { exclude = []; }
  
  // Get keys for comparison
  var keys = _.chain(target)
    .map(function (value, key) { return key; })
    .filter(function (key) { return !~exclude.indexOf(key); })
    .value();
  
  // TODO: add object comparison, recursion maybe?
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (_.isArray(source[key])) {
      // For arrays
      if (_.difference(source[key, target[key]]).length) { return false; }
    } else if (_.isDate(source[key])) {
      // For dates
      if (source[key].getTime() != target[key].getTime()) { return false; }
    } else {
      // For values
      if (source[key] != target[key]) { return false; }
    }
  }
  
  return true;
}

module.exports = {
  lazyCompare: lazyCompare
};