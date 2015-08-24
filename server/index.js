var express = require('express');
var app = express();
var path = require('path');

var root = path.resolve();

app.use(express.static(root + '/public'));
app.use('/api/', require('./api'));

var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('App listening at http://%s:%s', host, port);
})
