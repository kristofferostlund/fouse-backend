'use strict'

var _ = require('lodash');
var Promise = require('bluebird');
var chalk = require('chalk');
var moment = require('moment');

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

/**
 * Parses *body* and atempts to find
 * 
 * @param {String} body
 * @return {Array} (Date)
 */
function findDayMonthStringYear(body) {
  
  var months = sweMonthsShort.map(function (i) { return i.toLowerCase(); }).join('|');;
  
  // saved as an explaniation
  // var year = '(20?\-?[0-9]{2})?';
  // var preMonths = '(\/|\\s|\-|[0-9])';
  // var postMonths = '[a-z]{0,7}';
  // var _months = '(' + months + ')';
  // var date = '(\\s|\-)?[0-9]{1,4}(:e)?';
  
  var r = new RegExp([
    '(20?\-?[0-9]{2})?((\/|\\s|\-|[0-9])(' + months + ')[a-z]{0,7}(\\s|\-)?[0-9]{1,4}(:e)?',
    '(\\s|\-)?[0-9]{1,4}(:e)?\\s?(\/|\\s|\-|[0-9])(' + months + ')[a-z]{0,7}\\s?(20?\-?[0-9]{2})?)'
  ].join('|'), 'gi');
  
  var _dates = _.attempt(function () {
    var dates = (/[0-9]-[a-z]|[a-z]-[0-9]/i.test(body) ? body.replace(/\-/, ' - ') : body).match(r)
    
    // Map over all found date-ish items to clean them up
    dates = _.map(dates, function (date) {
      
      // Find any numbers in the date, I.E. day an/or year
      var numbersInDate = date.match(/[0-9]{2,4}/g);
      
      // Check to see if there is a year to be found in the date, otherwise the upcoming year for the month will be appended.
      // Years are assumed to be either one of two numbers, OR be longer than 2 characters long.
      if (!(numbersInDate.length > 1 || _.some(numbersInDate, function (num) { return num.length > 2; }))) {
        
        // If the year is missing, add it.
        var year = utils.nextMonth(new Date(), date.match(/[a-z]+/gi)).year();
        
        date = [date, year].join(' ');
      }
      
      // Clean the text up and return the Date object.
      return new Date(
        date
          .replace(/[^a-z0-9\\s]/gi, ' ')
          .replace(/\s{2,}/gi, ' ')
          .replace(/^\s|\s$/gi, '')
        );
    });
    
    return dates;
  });
  
  // No dates were found and cleanup failed
  if (_.isError(_dates)) {
    return [];
  } else {
    return _dates;
  }
  
}

function getDateSpan(body) {
  return findDayMonthStringYear(body);
}

setTimeout(function() {
  console.log('\n\n');
  
  console.log('Finding items');
  
  HomeItem.find()
  .sort({$natural: -1})
  .limit(50)
  .exec(function (err, _items) {
    
    console.log('Found items: ' + _items.length);
    
    var items = _.filter(_items, function (item) {
      return hasMonth(item.body);
    });
    
  
    var pos = _.random(0, items.length, false);
    
    _.chain(items)
    .map(function (item) {
      return getDateSpan(item.body);
    })
    .filter()
    .map(function (item) {
      // console.log(item);
    }).value();
    
    console.log('\n\n');
    
    console.log('Done?');
    
    return;
    
    pos = 533; // 1Dec 2015
    console.log(getDateSpan(items[pos].body));
    
    pos = 209; // 1 jan 2016
    console.log(getDateSpan(items[pos].body));
    
    pos = 87; //  15:e December
    console.log(getDateSpan(items[pos].body));
    
    pos = 597; // 1 /januari -15, misses -15 (though it should probably be 2016)
    console.log(getDateSpan(items[pos].body));
    
    pos = 293; // 20 dec-15 april
    console.log(getDateSpan(items[pos].body));
    
    pos = 481; // Februari 2016-Januari 2017, catches [ ' Februari 2016', '-Januari 2017' ] which needs cleaning
    console.log(getDateSpan(items[pos].body));
    
    pos = 745; // jan-mar, not solved without messing with the others
    console.log(getDateSpan(items[pos].body));
    
    pos = 240; // nyrenoverad 2:a, should not match | fix in clearing cleaning out these instead.
    console.log(getDateSpan(items[pos].body));
    
    pos = 613; // ['\njulhelgen 23', '12 separat '], neither should match | fix in clearing cleaning out these instead.
    console.log(getDateSpan(items[pos].body));
   
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
