/* global moment */
'use strict'

var homeContainer = document.getElementById('home-container');

_http.get('/api/recent')
  .then(function (homes) {
    
    var elements = _.map(homes, function (home) {
      return _render.createElement('article', 
        _render.createElement('header', home.title).outerHTML +
        _render.createElement('section',
          _render.createElement('div', 'Pris: ' + home.rent).outerHTML +
          _render.createElement('div', 'Antal rum: ' + home.rooms).outerHTML +
          _render.createElement('div', 'Område: ' + home.location).outerHTML +
          _render.createElement('div', 'Datum utlagd: ' + moment(home.date).format('YYYY-MM-DD, HH:mm')).outerHTML +
          _render.createElement('a', 'Gå till annonsen', { 'href': home.link }).outerHTML
          ).outerHTML
        , { 'className': 'home-card' }).outerHTML;
    });
    
    console.log(homes);
    
    homeContainer.innerHTML = elements.join('');
  })
['catch'](function (err) {
  console.log(err);
});