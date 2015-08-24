var _ = require('lodash');
var request = require('request');
var $ = require('cheerio');
var Promise = require('bluebird');

var fs = require('fs');

var reqUrl = 'http://www.blocket.se/bostad/uthyres/stockholm?sort=&ss=&se=&ros=&roe=&bs=&be=&mre=14&q=&q=&q=&is=1&save_search=1&l=0&md=th&f=p&f=c&f=b&as=131_1&as=131_3&as=131_4&as=131_6&as=131_7&as=131_8&as=131_9&as=131_10&as=131_11';
var reqUrl2 = 'http://www.blocket.se/bostad/uthyres/stockholm?mre=14&is=1&save_search=1&l=0&md=th&f=p&f=c&f=b&as=131_1&as=131_3&as=131_4&as=131_6&as=131_7&as=131_8&as=131_9&as=131_10&as=131_11';
var textFile = fs.readFileSync('./example.html').toString();

exports.recent = function (req, res) {
  getRecent()
  .then(processRecent)
  .then(function (homes) {
    res.status(200).json(homes);
  })
  .catch(function(err) {
    console.log(err);
    // res.status(500).send();
    // Only for dev. For instance if offline.
    processRecent(textFile).then(function(homes) {
      res.status(200).json(homes);
    });
  });
}

/*
Processes the response
@param {String} text
@return {Promise}
*/
function processRecent(text) {
  return new Promise(function (resolve, reject) {

    text = text.replace(/\r?\n|\r|\t/g, '');
    var html = $.load(text);

    var homes = _.chain(html('div[itemtype="http://schema.org/Offer"]'))
      .map(function (e) { return e; })
      .map(function (e, i) {
        
        var anchor = $(e).find('a')[0];
        var image = _.attempt(function () { return anchor.attribs.style.match(/\(.*?\)/g).toString().replace(/[()]/g, ''); });
        if (_.isError(image)) { image = undefined; }
        
        return {
          title: $(e).find('.media-heading').text(),
          rooms: $(e).find('.rooms').text(),
          rent: $(e).find('.monthly_rent').text(),
          location: $(e).find('.address').text(),
          date: new Date($(e).find('.jlist_date_image')[0].attribs['datetime']),
          link: anchor.attribs.href, 
          image: image
        };
      })
      .value();

    resolve(homes);
  });
}

/*
Gets the recent entries from blocket.se
@param {Function} errHandler - Error handling function, should take an error as parameter.
@param {Function} callback - Handles the request, should take the request response as a string as paramater
*/
function getRecent() {
  return new Promise(function (resolve, reject) {
    request.get({
      uri: reqUrl,
      encoding: null
    },
    function (err, res, body) {
      if (err) { reject(err); }
      else { resolve(body.toString('utf8')); }
    });
  });
}