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
 * Returns the number of months found in the text.
 * 
 * Years are kind of matched as '<length> år' and multiplied by twelve.
 * Months are kind of matched as '<length> måndad' whilst not matching if it's 'månadshyra'.
 * Weeks are kind of matched as '<length> veck' and are divided by 4 (assumed to be accurate enough).
 * Days are matched as '<length> dag' and are divided by 30 (assumed to be accurate enough).
 * 
 * @param {String} body
 * @return {Number}
 */
function getGivenTimeByMonth(body) {
  
  var years = body.match(/[0-9,.]{1,4}(?=\s{0,3}år)/gi);
  var months = body.match(/[0-9,.]{1,4}(?=\s{0,3}månad(?!shyra))/gi);
  var weeks = body.match(/[0-9,.]{1,4}(?=\s{0,3}veck)/gi);
  var days = body.match(/[0-9,.]{1,4}(?=\s{0,3}dag)/gi);
  
  years = _.chain(years)
    .map(function (year) {
      // Replaces Swedish decimals with English version (',' -> '.')
      year = parseFloat(year.replace(/\,/g, '.'));
      // It's very unlikely someone would want to rent out for over ten years.
      // Like really?
      return year < 10 ? year : undefined;
    })
    .filter() // Filter out any undefined entries:
    .value();
  
  months = _.chain(months)
    .map(function (month) {
      // Replaces Swedish decimals with English version (',' -> '.')
      return parseFloat(month.replace(/\,/g, '.'));
    })
    .value();
  
  weeks = _.chain(weeks)
    .map(function (week) {
      // Replaces Swedish decimals with English version (',' -> '.')
      return parseFloat(week.replace(/\,/g, '.'));
    })
    .value();
  
  days = _.chain(days)
    .map(function (day) {
      // Replaces Swedish decimals with English version (',' -> '.')
      return parseFloat(day.replace(/\,/g, '.'));
    })
    .value();
    
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
 * Parses *body* and atempts to find dates containing a month
 * and some date info, either year or day of month.
 * 
 * Matches dates such as 2 feb 2016, 7 march, september 2016 etc.
 * Will find multiple dates as well, E.G. 2 march - 9 september.
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
    return _.map(dates, function (date) {
      
      // Find any numbers in the date, I.E. day an/or year
      var numbersInDate = date.match(/[0-9]{1,4}/g);
      
      // Check to see if there is a year to be found in the date, otherwise the upcoming year for the month will be appended.
      // Years are assumed to be either one of two numbers, OR be longer than 2 characters long.
      if (numbersInDate && (!_.some(numbersInDate, function (num) { return num.length > 2; }) || numbersInDate.length < 2)) {
        
        // If the year is missing, add it.
        var year = utils.nextMonth(new Date(), date.match(/[a-z]+/gi)).year();
        
        // Add the year to the datestring
        date = [date, year].join(' ');
      }
      
      // Clean the text up and return the Date object.
      var rDate = new Date(
        date
          .replace(/[^a-z0-9\\s]/gi, ' ')
          .replace(/\s{2,}/gi, ' ')
          .replace(/^\s|\s$/gi, '')
        );
      
      // As it's inside an _.attempt (try-ish), throw the error
      if (!moment(rDate).isValid()) {
        throw(new Error('Invalid date'));
      }
      
      return rDate;
    });
  });
  
  // No dates were found and cleanup failed
  if (_.isError(_dates)) {
    return [];
  } else {
    return _dates;
  }
  
}

/**
 * Returns the time info found in the ticket.
 * 
 * @param {Object} ticket
 * @return {Object}
 */
function getTimeInfo(ticket) {
  
  // Existence check
  if (!ticket || !_.isObject(ticket)) {
    return undefined;
  }
  
  var dates = findDayMonthStringYear(ticket.body)
  var period  = getGivenTimeByMonth(ticket.body);
  
  return {
    dates: dates,
    period: period
  }
}

module.exports = {
  getTimeInfo: getTimeInfo
}

// Only for testing
setTimeout(function() {
  console.log('\n\n');
  
  console.log('Finding items');
  
  HomeItem.find()
  .sort({$natural: -1})
  .limit(100)
  .exec(function (err, _items) {
    
    console.log('Found items: ' + _items.length);
    
    var items = _.filter(_items, function (item) {
      return hasMonth(item.body);
    });
   
    _.chain(items)
    .map(function (item) {
      item.time = getTimeInfo(item);
      return item;
    }).value();
    
    console.log('\n\n');
    
    console.log('Done?');
  })
  
  console.log('\n\n');
}, 200);
