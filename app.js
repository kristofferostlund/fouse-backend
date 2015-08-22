var express = require('express');
var app = express();

var _ = require('lodash');
var request = require('request');
var $ = require('cheerio');

var fs = require('fs');

var reqUrl = 'http://www.blocket.se/bostad/uthyres/stockholm?sort=&ss=&se=&ros=&roe=&bs=&be=&mre=14&q=&q=&q=&is=1&save_search=1&l=0&md=th&f=p&f=c&f=b&as=131_1&as=131_3&as=131_4&as=131_6&as=131_7&as=131_8&as=131_9&as=131_10&as=131_11';
var reqUrl2 = 'http://www.blocket.se/bostad/uthyres/stockholm?mre=14&is=1&save_search=1&l=0&md=th&f=p&f=c&f=b&as=131_1&as=131_3&as=131_4&as=131_6&as=131_7&as=131_8&as=131_9&as=131_10&as=131_11';

var textFile = fs.readFileSync('example.html').toString();

app.get('/', function(req, res) {
  
  getStuff(function(data) {
    var text = data.toString('utf8');
    
    var stuff = processStuff(text);
    
    res.status(200).json({ data: stuff });
  });
});

function processStuff(text) {
  text = text.replace(/\r?\n|\r|\t/g, '');
    
    var html = $.load(text);
    
    
    var result = _.map(html('div[itemtype="http://schema.org/Offer"]'), function(e) {
      return e;
    });
    
    
    var stuff = _.map(result, function(r) {
      return {
        title: $(r).find('.media-heading').text(),
        rooms: $(r).find('.rooms').text(),
        rent: $(r).find('.monthly_rent').text(),
        location: $(r).find('.address').text(), 
        date: new Date($(r).find('.jlist_date_image')[0].attribs['datetime'])
      };
    });
    
    console.log(stuff[0]);
    
    return stuff;
}

function getStuff(callback) {
  console.log(reqUrl);
  
  request.get({
    uri: reqUrl,
    encoding: null
  }, function(err, res, body) {
    if (err) {
      callback(err);
    } else {
      callback(body);
    }
  });
}

var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Example app listening at http://%s:%s', host, port);
});