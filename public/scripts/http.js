'use strict'

var _http = {
  get: function (url, callback) {
    return new Promise(function (resolve, reject) {
      var req = new XMLHttpRequest();

      req.onload = function (e) {
        if (req.readyState === 4) {
          if (req.status === 200) {
            
            var res = _.attempt(function() {
              return JSON.parse(req.response);
            });
            
            if (_.isError(res)) { res = req.response; }
            
            resolve(res);
            if (_.isFunction(callback)) {
              callback(res);
            }
          } else {
            reject(new Error(req.statusText));
            if (_.isFunction(callback)) {
              callback(req.statusText);
            }
          }
        }
      };

      req.onerror = function (e) {
        reject(req.statusText);
        if (_.isFunction(callback)) {
          callback(req.statusText);
        }
      };

      req.open('GET', url, true);
      req.send(null);
    });
  },
  
  getUncached: function (url, callback) {
    url +=
    (url.indexOf('?') ? '?' : '&')
    + (100 * Math.random());

    return this.get(url, callback);
  },
  
  put: function (url, body, callback) {
    return new Promise(function (resolve, reject) {
      var req = new XMLHttpRequest;
      
      console.log(JSON.stringify(body));
      
      
      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          if (req.status === 200) {
            
            var res = _.attempt(function() {
              return JSON.parse(req.response);
            });
            
            if (_.isError(res)) { res = req.response; }
            
            resolve(res);
            if (_.isFunction(callback)) {
              callback(res);
            }
          } else {
            reject(new Error(req.statusText));
            if (_.isFunction(callback)) {
              callback(req.statusText);
            }
          }
        }
      }
      
      req.open('PUT', url, true);
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
      
      var data = encodeURI(
        _.map(body, function (value, key) {
          return [key, value].join('=');
        }).join('&')
      );
      
      console.log(data);
      
      req.send(data);
    });
  }
};