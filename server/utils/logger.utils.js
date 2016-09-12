'use strict'

var winston = require('winston');
var fs = require('fs');
var path = require('path');

var relativeLogPath = './.logs/';
var sLogFileName = 'logfile.log';
var logPath = path.resolve(relativeLogPath, 'logfile');

if (!fs.existsSync(path.dirname(logPath))) {
  fs.mkdirSync(path.dirname(logPath));
}

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      json: false,
      colorize: true,
      timestamp: true,
    }),
    new winston.transports.File({
      level: 'debug',
      name: 'logfile',
      filename: './.logs/logfile.log',
      maxsize: 5242880, // 5 MB
    }),
  ],
  exitOnError: true
});

var stream = {
    write: function(message){ logger.info(message); }
};

module.exports = logger;
module.exports.stream = stream;