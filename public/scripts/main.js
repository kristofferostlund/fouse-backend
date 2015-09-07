/* global moment */
'use strict'

var _homes;
var homeContainer = document.getElementById('home-container');
var homeCollection = [];

var preview = {
  dom: {
    title: document.getElementById('preview-title'), 
    text: document.getElementById('preview-text'),
    owner: document.getElementById('preview-owner'),
    rent:  document.getElementById('preview-rent'),
    rooms:  document.getElementById('preview-rooms'),
    location:  document.getElementById('preview-location'),
    date: document.getElementById('preview-date')
  },
  data: {
    title: '', 
    text: '',
    owner: '',
    rent:  '',
    rooms:  '',
    location:  '',
    date: ''
  }
};

var roomsCheck = document.getElementById('rooms-check');
var homesCheck = document.getElementById('homes-check');

/*
Subscribes to the change eventlisteners and on change filters the homes.
*/
homesCheck.addEventListener('change', function (e) { filterHomes(homeCollection) });
roomsCheck.addEventListener('change', function (e) { filterHomes(homeCollection) });

/*
Calls getPreview via the home object, 
after which it selects the home and updates the preview.
@param {Event} event
@param {Object} home
*/
function openHome(event, home) {
  getPreview(home)
  .then(function (value) {
    selectHome(home);
    updatePreview(value, home);
  });
}

/*
Sets the element which matches _home.url to selected and deselects every other element.
@param {Object} _home
*/
function selectHome(_home) {
  _.map(homeCollection, function (home) {
    if (home.home.url == _home.url) {
      home.element.className = home.element.className + ' selected'; 
    } else {
      // Possibly speed this up?
      home.element.className = home.element.className.replace(/selected/g, '');
    }
  });
}

/*
Iterates over the home collection to either show or hide the element.
@param {Array} collection
*/
function filterHomes(collection) {
  console.log(collection);
  _.map(collection, function (item) {
    item.element.hidden = !shouldShow(item);
  });
}

function updatePreview(item, home) {
  _.assign(preview.data, home, item);
  _.map(preview.dom, function (element, key) {
    element.innerHTML = preview.data[key];
  });
}

/*
Returns either true or false for whether the home type matches the the check boxes.
For instance, if homeItem.isRoom and roomsCheck.checked then return true is returned.
If neither check is checked, the function will return true.
@param {Object} homeItem
@return {Bool}
*/
function shouldShow(homeItem) {
  if (!roomsCheck.checked && !homesCheck.checked) { return true; }

  if (homeItem.home.isRoom) { return roomsCheck.checked; }
  if (!homeItem.home.isRoom) { return homesCheck.checked; }

  return true;
}

/*
Adds the collection's elements to DOM.
@param {Array} collection
@return {Promise}
*/
function addToDOM(collection) {
  return new Promise(function (resolve, reject) {
    homeContainer.innerHTML = _.map(collection, function (item) {
      return item.tempElement.outerHTML;
    }).join('');

    _.map(document.getElementsByClassName('home-item'), function (node, i) {
      
      collection[i].element = node;

      var homeIdentifier = node.className.match(/home\-[0-9]+/ig).toString();
      var index = Number(homeIdentifier.match(/[0-9]+/g));

      node.addEventListener('click', function (event) { openHome(event, collection[index].home); }, false);
    });
    resolve(collection);
  });
}

/*
Iterates over the homes and creates elements populated with their data.
Returns a homeCollection containing all elements for the home list.
@param {Array} homes
@return {Promise}
*/
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

/*
Fetches recent homes from serves
@return {Promise}
*/
function getHomes() { return _http.get('/api/recent') };

/*
Analyzes and classifies the homes,
tagging it as home if it is believed to be a home based on the title.
@param {Array} homes
@return {Promise}
*/
function analyze(homes) {
  console.log(homes);
  return new Promise(function (resolve, reject) {
    _homes = homes;

    homes = _.map(homes, function (home) {
      home.isRoom = /rum|room/i.test(home.title);
      return home;
    });

    resolve(homes);
  });
}

/*
Fetches the input home item from server.
@param {Object} homeItem
@return {Promise}
*/
function getPreview(homeItem) {
  return _http.put('/api/preview', { url: homeItem.url });
}

/*
Gets homes and sets everything up.
*/
getHomes()
  .then(analyze)
  .then(createHomeElements)
  .then(addToDOM)
['catch'](function (err) {
  console.log(err);
});