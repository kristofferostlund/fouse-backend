'use strict'

_http.get('/api/recent')
  .then(function (res) {
    console.log(res);
  })
['catch'](function (err) {
  console.log(err);
});
p