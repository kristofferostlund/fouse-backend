'use strict'

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var os = require('os');
var moment = require('moment');

var arraysToXlsx = require('./arraysToXlsx');

var _path = path.resolve(os.homedir(), 'desktop', 'HomeItems.json');

var _split = fs.readFileSync(_path, 'utf8').split('\n');

var _header = [
  'Price',
  'Size (m²)',
  'Room count',
  'Region',
  'Location',
  'Address',
  'Owner',
  'Telephone number',
  'Is shared',
  'Girls only',
  'Lacks kitchen',
  'Commuters only',
  'For swap',
  'Contract length (months)',
  'Is longterm',
  'Start date of contract',
  'End date of contract',
  'Date posted',
  'Post title',
  'Post body',
  'Url',
  '_id',
];

var _data = _.chain(_split)
  .map(tryParse)
  .filter(isntError)
  .map(getItemArray)
  .tap(function (items) { items.unshift(_header); })
  .value();

var _filepath = path.resolve(os.homedir(), 'desktop', 'HomeItems.xlsx');

arraysToXlsx(_data, _filepath);

function isntError(item) {
  return !_.isError(item);
}

function tryParse (item, i) {
  return _.attempt(function () { return JSON.parse(item); });
}

function getItemArray(item) {
  return [
    item.price,
    parseInt(item.size) || '',
    parseInt(item.rooms) || '',
    item.region,
    item.location,
    item.address || item.adress,
    item.owner,
    item.tel,
    _.get(item, 'classification.shared'),
    _.get(item, 'classification.girls'),
    _.get(item, 'classification.noKitchen'),
    _.get(item, 'classification.commuters'),
    _.get(item, 'classification.swap'),
    _.get(item, 'time.period'),
    _.get(item, 'time.isLongTerm'),
    _.get(item, 'time.start.$date'),
    _.get(item, 'time.end.$date'),
    _.get(item, 'date.$date'),
    item.title,
    item.body,
    item.url,
    item._id.$oid,
  ];
}
