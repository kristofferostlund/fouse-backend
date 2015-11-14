'use strict'

var winston = require('winston');
var Promise = require('bluebird');

winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        // new winston.transports.File({
        //     level: 'info',
        //     filename: './logs/all-logs.log',
        //     handleExceptions: true,
        //     json: true,
        //     maxsize: 5242880, //5MB
        //     maxFiles: 5,
        //     colorize: false
        // }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
            timestamp: true
        })
    ],
    exitOnError: false
});

var stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

var promise = function (params, message) {
  return new Promise(function (resolve, reject) {
    if (!message) { message = '' + typeof(params) + ' resolved.' };
    
    stream.write(message);
    
    resolve(params);
  });
};

module.exports = logger;
module.exports.stream = stream;
module.exports.promise = promise;