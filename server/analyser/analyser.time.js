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
 * Ensures there's a year in the date string
 * 
 * @param {String} date
 * @return {String}
 */
function ensureYear(date) {
  // If it's a date already, there's obviously a year
  if (_.isDate(date)) { return moment(date).format('YYYY-MM-DD'); }
  
  // If there's no string, return today's date
  if (!date) { return moment().format('YYYY-MM-DD'); }

  // Get all number groups in the date
  var numbersInDate = date.match(/[0-9]{1,4}/g);
  
  // Check if no number group has more than 2 numbers AND there are less than three groups
  // I.E. [20, 2016] and [12, 10, 16] will pass, but not [12, 10]
  if (!_.some(numbersInDate, function (num) { return num.length > 2; }) && numbersInDate.length < 3) {
    
    // If the year is missing, add it.
    var year = utils.nextMonth(new Date(), date.match(/[a-z]+/gi)).year();
      
    // Add the year to the datestring
    date = [date, year].join(' ');
  }

  return date;
}

/**
 * Formats the string as to ensure a date
 * is of the format yyyy-mm-dd or dd-mm-yyyy.
 * 
 * This works only with dates made up of numbers only.
 * 
 * @param {String} date
 * @return {String}
 */
function ensureDateFormat(date) {
  if (_.isDate(date)) { return moment(date).format('YYYY-MM-DD'); }
  if (!date) { return moment().format('YYYY-MM-DD'); }
  
  date = (function () {
    var d = date.split(/[^0-9]+/);
    
    // d = (!!d[3] && d[3].length > 3) ? d.reverse() : d;
    if (_.last(d).length > 3) { d.reverse(); }
    
    return d;
  })().join('-');
  
  return date;
}

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
function getPeriod(body) {
  
  // TODO: Add support for periods as strings, such as 'sju månader', 'ett halvår' and so on.
  
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
 * Parses *body* and atempts to find dates containing a month
 * and some date info, either year or day of month.
 * 
 * Matches dates such as 2 feb 2016, 7 march, september 2016 etc.
 * Will find multiple dates as well, E.G. 2 march - 9 september.
 * 
 * @param {String} body
 * @return {Array} (Date)
 */
function findDateWithMonthAsString(body) {
  
  var months = sweMonthsShort.map(function (i) { return i.toLowerCase(); }).join('|');;
  
  // // Saved as an explaniation for below regexes
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
      date = ensureYear(date);
      
      // Clean the text up and return the Date object.
      var rDate = new Date(
        date
          .replace(/[^a-z0-9\\s]/gi, ' ')
          .replace(/\s{2,}/gi, ' ')
          .replace(/  ^\s|\s$/gi, '')
        );
      
      // As it's inside an _.attempt (try-ish), throw the error
      if (!moment(rDate).isValid()) {
        throw(new Error('Invalid date'));
      } else if (!/[12]0[12][0-9]/.test('' + rDate.getFullYear())) {
        // The date is incorrect, probably because a phonenumber is matched.
        throw(new Error('Incorrecet date.'));
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
 * @param {String} body
 * @return {Array}
 */
function findDateWithNumbers(body) {
  var matches = [];
  
  var spanRegex = new RegExp([
    '([0-9]{1,4}\s?\/\s?[0-9]{1,4}(\s?\/\s?[0-9]{1,4})?)', // matches first dates in span <date|month>/<month|year> sort of
    // '(?:[0-9]{1,4}\s?\/\s?[0-9]{1,4}.){1,4}[0-9]{1,4}\s?\/\s?[0-9]{1,4}' // apparently matches spans such as '27/1-31/3'
  ].join('|'), 'g');
  
  var match;
  while (match = spanRegex.exec(body)) {
    matches.push(match[0]);
  }
  
  // Filter out supposed non dates, such as internet speeds or bus lines
  matches = _.filter(matches, function (match) {
    // 24/7 is most probably a gym or an expression rather than a date
    if (match === '24/7') { return false; }
    return _.every(match.split('/'), function (m) {
      m = parseFloat(m);
      return (m <= 31 || (2010 <= m && m <= 2020));
    });
  });
  
  var dateRegex = new RegExp([
    '[0-9]{4}\-[0-9]{1,2}\-[0-9]{1,2}',
    '[0-9]{1,2}\-[0-9]{1,2}\-[0-9]{4}',
    '[0-9]{1,4}(\s|(\/|\-|\s))([0-9]{1,2})(\s|(\/|\-|\s))[0-9]{1,4}'
  ].join('|'), 'g');
  
  return _.chain(matches)
    .map(matches.concat(body.match(dateRegex) || []), function (date) {
      date = ensureYear(date);
      return ensureDateFormat(date);
    })
    .map(function (date) { return new Date(date); })
    .filter(function (date) { return date != 'Invalid Date'; })
    .value();
}

/**
 * @param {String} body
 * @param {Object} homeItem (HomeItem)
 * @return {Array}
 */
function findDates(body, homeItem) {
  return _.chain([
    findDateWithMonthAsString(body),
    findDateWithNumbers(body)
  ])
  .flatten()
  .uniq(function (date) {
    return moment(date).format('YYYY-MM-DD');
  })
  .filter(function (date) {
    // Filter out really old objects
    return moment().subtract(15, 'years') < date;
  })
  .filter(function (date) {
    // Ensure there are no dates before the date of posting
    // as they are assumed to not be relevant for the timespan.
    return date > homeItem.date;
  })
  .value()
  .sort(function (a, b) { return a - b; });
}

/**
 * Returns the a timespan object
 * 
 * @param {Array} dates
 * @param {Number} period
 * @param {Boolean} isLongTerm
 * @param {Object} homeItem (HomeItem)
 * @return {Object} ({ period: {Number}, start: {Date}, end: {Date}, isLongTerm: {Boolean} })
 */
function getTimeSpan(dates, period, isLongTerm, homeItem) {
  
  // Sort them chronologically or ensure dates exists
  dates = !!dates
    ? dates.sort(function (a, b) { return a < b; })
    : [];
  
  if (dates && dates.length > 1) {
    // If a span exists, assume the greatest period,
    // which is either the span between the first and last dates or the provided *period*.
    
    // The span is assumed to be between the first and the last dates, which may be slightly off.
    var _p = Math.abs(moment(_.last(dates)).diff(_.first(dates), 'months'));
    
    if (_.isUndefined(period)) {
      // Set *period* to the calculated period
      period = _p;
    } else {
      // Set *period* to the longest value
      period = [period, _p].sort(function (a, b) { return a < b; }).shift();
      
      // Set dates to match span, will therefore only be approximate.
      dates = [ _.first(dates), moment(_.first(dates)).add(period, 'months') ];
    }
  } else if (!_.isUndefined(period)) {
    // If there aren't 2 or more dates, but there is a period, add an approximate date
    // If there is no start date, *homeItem.date* is assumed to be the start
    dates = (dates && dates.length)
      ? _.map(dates).concat([ moment().add(period, 'months').toDate() ])
      : [ homeItem.date, moment().add(period, 'months').toDate() ];
  }
  
  return {
    period: period,
    // The earliest date is assumed to be the start date,
    // if none is provided *homeItem.date* will be used.
    start: _.first(dates) || homeItem.date,
    // The latest date is assumed to be the end date
    end: (dates && dates.length > 1) ? _.last(dates) : undefined,
    isLongTerm: isLongTerm
  }
}

/**
 * Long term alludes to the contract being 'until further notice',
 * or as it's called in Sweden, 'tills vidare'.
 * 
 * @param {String} body
 * @return {Boolean}
 */
function getIsLongTerm(body) {
  // TODO: add more precise checks?
  return /till(s\s?|\s?)vidare/i.test(body);
}

/**
 * Returns the time info found in the homeItem.
 * 
 * @param {Object} homeItem
 * @return {Object} ({ period: {Number}, start: {Date}, end: {Date}, isLongTerm: {Boolean} })
 */
function getTimeInfo(homeItem) {
  
  // Existence check
  if (!homeItem || !_.isObject(homeItem)) {
    return undefined;
  }
  
  // Get all mentioned dates
  var dates = findDates([homeItem.title, homeItem.body].join('\n'), homeItem);
  
  // Get the mentioned period
  var period  = getPeriod([homeItem.title, homeItem.body].join('\n'));
  
  var isLongTerm = getIsLongTerm([homeItem.title, homeItem.body].join('\n'));
  
  // Clean and return proper object
  return getTimeSpan(dates, period, isLongTerm, homeItem)
}

module.exports = {
  getTimeInfo: getTimeInfo
}
