/* global moment */
'use strict'

var _homes;
var homeContainer = document.getElementById('home-container');

function openHome(event, home) {
  console.log(event);
  console.log(home);
}

function renderHomes(homes) {
  return new Promise(function (resolve, reject) {
    var homeElements = _.map(homes, function (home, index) {
      home.clickIdentifier = ['clickId', index].join(' ');
      
      return _render.createElement('article',
        _render.createElement('header', home.title).outerHTML +
        _render.createElement('section',
          _render.createElement('div', 'Pris: ' + home.rent).outerHTML +
          _render.createElement('div', 'Antal rum: ' + home.rooms).outerHTML +
          _render.createElement('div', 'Område: ' + home.location).outerHTML +
          _render.createElement('div', 'Datum utlagd: ' + moment(home.date).format('YYYY-MM-DD, HH:mm')).outerHTML
          // _render.createElement('a', 'Öppna på blocket', { 'href': home.link }).outerHTML
          ).outerHTML
        , { 'className': 'home-item', 'clickIdentifier': home.clickIdentifier }).outerHTML;
    });
    
    homeContainer.innerHTML = homeElements.join('');
    
    _.map(document.getElementsByClassName('clickId'), function (node) {
      var clickId = node.className.match(/clickId [0-9]+/ig).toString();
      var index = Number(clickId.match(/[0-9]+/g));
      
      node.addEventListener('click', function(event) { openHome(event, homes[index]); }, false);
    });
  });
}

function getHomes() { return _http.get('/api/recent') };

function analyze(homes) {
  return new Promise(function (resolve, reject) {
    _homes = homes;
    
    var roomOnly = _.filter(homes, function (home) {
      return /rum|room/i.test(home.title);
    });
    
    var possibleFlats = _.filter(homes, function(home) {
      return _.indexOf(roomOnly, home) < 0;
    });
    resolve(possibleFlats);
  });
}

getHomes().then(analyze).then(renderHomes)
['catch'](function (err) {
  console.log(err);
});