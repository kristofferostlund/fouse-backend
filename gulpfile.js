'use strict'

var gulp = require('gulp');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var shell = require('shelljs');

var node; // Will be the node command.
var mongod;

// Runs the server function via a custom nodemon.
gulp.task('server', function () {
  // Kill node if it's running already.
  if (node) { node.kill() };
  if (mongod) { mongod.kill(); }
  
  // Run a node client on server/app.js
  node = spawn('node', ['server/app.js'], { stdio: 'inherit' });
  
  // Run mongod in quiet mode
  mongod = spawn('mongod', ['--quiet'], { stdio: 'inherit' });
  
  // If it closes with the error code 8, something crashed
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
  mongod.on('close', function (code) {
    console.log(code);
  });
});

// Default task
gulp.task('default', function () {
  gulp.run('server');
  
  // Every change, do this.
  gulp.watch(['./**'], function () {
    gulp.run('server');
  });
});

// On process close, clean up.
process.on('exit', function () {
  if (node) { node.kill() };
  if (mongod) { mongod.kill(); }
});