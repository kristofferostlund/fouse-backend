/* global moment */
'use strict'

var _homes;
var homeContainer = document.getElementById('home-container');
var homeCollection = [];

var homesCheck = document.getElementById('homes-check');
var roomsCheck = document.getElementById('rooms-check');

homesCheck.addEventListener('change', function (e) { filterHomes(homeCollection) });
roomsCheck.addEventListener('change', function (e) { filterHomes(homeCollection) });


function openHome(event, home) {
  console.log(event);
  console.log(home);
}

function filterHomes(collection) {
  _.map(collection, function (item) {
    item.element.hidden = !showItem(item);
  });
}

function showItem(homeItem) {
  if (!roomsCheck.checked && !homesCheck.checked) { return true; }

  if (homeItem.home.isRoom) { return roomsCheck.checked; }
  if (!homeItem.home.isRoom) { return homesCheck.checked; }

  return true;
}

function addToDOM(collection) {

  homeContainer.innerHTML = _.map(collection, function (item) {
    return item.tempElement.outerHTML;
  }).join('');
  
  _.map(document.getElementsByClassName('home-item'), function (node, i) {    
    homeCollection[i].element = node;
    
    var homeIdentifier = node.className.match(/home\-[0-9]+/ig).toString();
    var index = Number(homeIdentifier.match(/[0-9]+/g));
    
    node.addEventListener('click', function (event) { openHome(event, collection[index].home); }, false);
  });
}

function createHomeElements(homes) {
  return new Promise(function (resolve, reject) {
    homeCollection = _.map(homes, function (home, index) {
      return {
        home: home,
        tempElement: _render.createElement('article',
          _render.createElement('header', home.title).outerHTML +
          _render.createElement('section',
            _render.createElement('div', 'Pris: ' + home.rent).outerHTML +
            _render.createElement('div', 'Antal rum: ' + home.rooms).outerHTML +
            _render.createElement('div', 'Område: ' + home.location).outerHTML +
            _render.createElement('div', 'Datum utlagd: ' + moment(home.date).format('YYYY-MM-DD, HH:mm')).outerHTML
            ).outerHTML
          , { 'className': 'home-item', 'identifier': 'home-' + index })
      };
    });

    resolve(homeCollection)
  });
}

function getHomes() { return _http.get('/api/recent') };

function analyze(homes) {
  return new Promise(function (resolve, reject) {
    _homes = homes;

    homes = _.map(homes, function (home) {
      home.isRoom = /rum|room/i.test(home.title);
      return home;
    });

    resolve(homes);
  });
}

getHomes()
  .then(analyze)
  .then(createHomeElements)
  .then(addToDOM)
['catch'](function (err) {
  console.log(err);
});