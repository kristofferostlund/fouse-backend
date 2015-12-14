'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');

var HomeItem = require('../models/homeItem/homeItem.model');
var utils = require('../utils/general.utils');

var sweMonths = [
  'Januari',
  'Februari',
  'Mars',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'Augusti',
  'Septemper',
  'Oktober',
  'November',
  'December'
];

var sweMonthsShort = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Maj',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec'
];


/**
 * Returns the number of months 
 * 
 * @param {String} body
 * @return {Number}
 */
function getGivenTimeByMonth(body) {
  
  var years = body.match(/[0-9]{1,2}(?=\s{0,3}år)/gi);
  var months = body.match(/[0-9]{1,2}(?=\s{0,3}månad(?!shyra))/gi);
  var weeks = body.match(/[0-9]{1,2}(?=\s{0,3}veck)/gi);
  var days = body.match(/[0-9]{1,2}(?=\s{0,3}dag)/gi);
  
  return Math.round(_.chain([
    years * 12,
    months,
    weeks / 4,
    days / 30 // accurate enough
  ])
  .filter()
  .value()) || undefined;
}

/**
 * Checks whether there is a month referenced in the text.
 * 
 * @param {String} body - string to test
 * @return {Boolean}
 */
function hasMonth(body) {
  return sweMonths.concat(sweMonthsShort)
    .some(function (month) { return utils.literalRegExp(month, 'gi').test(body); });
}

function findDayMonthStringYear(body) {
  
  var months = sweMonthsShort.map(function (i) { return i.toLowerCase(); }).join('|');;
  
  var year = '(20?\-?[0-9]{2})?';
  var preMonths = '(\/|\\s|\-|[0-9])';
  var postMonths = '[a-z]{0,7}';
  var _months = '(' + months + ')';
  var date = '(\\s|\-)?[0-9]{1,4}(:e)?';
  
  
  var rString = [
    
    [
      year,
      '(',
      preMonths,
      _months,
      postMonths,
      date
    ].join(''),
    [
      date,
      preMonths,
      _months,
      postMonths,
      year  
    ].join('')
    
  ].join('|');
  
  
  
  
  var r = new RegExp([
    '(20?\-?[0-9]{2})?((\/|\\s|\-|[0-9])(' + months + ')[a-z]{0,7}(\\s|\-)?[0-9]{1,4}(:e)?',
    '(\\s|\-)?[0-9]{1,4}(:e)?\\s?(\/|\\s|\-|[0-9])(' + months + ')[a-z]{0,7}\\s?(20?\-?[0-9]{2})?)'
  ].join('|'), 'gi');
  
  var dates = (/[0-9]-[a-z]|[a-z]-[0-9]/i.test(body) ? body.replace(/\-/, ' - ') : body).match(r);
  
  console.log(dates);
}

function getDateSpan(body) {
  
  console.log('___');
  
  console.log('months', getGivenTimeByMonth(body));
  findDayMonthStringYear(body);
}

setTimeout(function() {
  console.log('\n\n');
  
  HomeItem.find(function (err, _items) {
    
    var items = _.filter(_items, function (item) {
      return hasMonth(item.body);
    });
    
  
    var pos = _.random(0, items.length, false);
    
    pos = 533; // 1Dec 2015
    getDateSpan(items[pos].body)
    
    pos = 209; // 1 jan 2016
    getDateSpan(items[pos].body)
    
    pos = 87; //  15:e December
    getDateSpan(items[pos].body)
    
    pos = 597; // 1 /januari -15, misses -15 (though it should probably be 2016)
    getDateSpan(items[pos].body)
    
    pos = 293; // 20 dec-15 april
    getDateSpan(items[pos].body)
    
    pos = 481; // Februari 2016-Januari 2017, catches [ ' Februari 2016', '-Januari 2017' ] which needs cleaning
    getDateSpan(items[pos].body)
    
    pos = 745; // jan-mar, not solved without messing with the others
    getDateSpan(items[pos].body)
    
    pos = 240; // nyrenoverad 2:a, should not match | fix in clearing cleaning out these instead.
    getDateSpan(items[pos].body)
    
    pos = 613; // ['\njulhelgen 23', '12 separat '], neither should match | fix in clearing cleaning out these instead.
    getDateSpan(items[pos].body)
   
  })
  
  console.log('\n\n');
}, 200);

/**
 * Checks whether there are amounts of months referenced in the item.
 * 
 * @param {String} body
 * @return {Boolean}
 */
function hasAmountOfMonths(body) {
  return /[0-9]{1,2} {0,1}mån/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function isSwap(body) {
  return /byte|byte(s|s )krav/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function isShared(body) {
  return /dela|del (i|med)|delas med|dela en|uthyrningsdel|inneboende|rum.{1,15}(i|till)|rum.{1,20}(?=hyr)|hyr.{1,15}(?=möblerat.{1,10}(?=rum))|hyr.{1,20}(?=rum)|room|mate|share (an|a)|a room|room.{1,40}for rent|rent.{1,15}room| room is|furnished room/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forGirls(body) {
  return /tjej|kvinn|flick|girl|wom(a|e)n/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function forCommuters(body) {
  return /pendlare|veckopendlare/i.test(body);
}

/**
 * @param {String} body
 * @return {Boolean}
 */
function lacksKitchen(body) {
  return /kök saknas|inget kök| (ej|ingen).{1,15}tillgång.{1,15}kök|ej kök|no( | access.{1,5})kitchen/gi.test(body);
}

/**
 * @param {Object} homeItem
 * @returm {Object}
 */ 
function getClassifications(homeItem) {
  return _.assign({}, homeItem, { classification: {
    girls: forGirls(homeItem.body) || forGirls(homeItem.title),
    commuters: forCommuters(homeItem.body) || forCommuters(homeItem.title),
    shared: isShared(homeItem.body) || isShared(homeItem.title),
    swap: isSwap(homeItem.body) || isSwap(homeItem.title),
    noKitchen: lacksKitchen(homeItem.body) || lacksKitchen(homeItem.title)
  }});
}

/**
 * @param {Array|Object} homeItems
 * @return {Array|Object}
 */
function classify(homeItems) {
  return new Promise(function (resolve, reject) {
    if (!_.isArray(homeItems)) { resolve(getClassifications(homeItems)); }
    else { resolve(_.map(homeItems, getClassifications)); }
  });
}

module.exports = {
  getClassifications: getClassifications,
  classify: classify
};

// TODO: Add area stuff (use Google maps API?)
