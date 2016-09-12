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

  // Run a node client on server.js
  node = spawn('node', ['server.js'], { stdio: 'inherit' });

  // If it closes with the error code 8, something crashed
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('mongod', function () {
  if (mongod) { mongod.kill(); }
  // Run mongod in quiet mode
  mongod = spawn('mongod', ['--quiet'], { stdio: 'inherit' });

  mongod.on('close', function (code) {
    console.log(code);
  });
})

gulp.task('watch', function () {
  gulp.watch(['./server/**'], ['server']);
})

// Default task
gulp.task('default', ['server', 'watch']);

gulp.task('app', ['server', 'watch']);

gulp.task('standalone', ['mongod', 'server', 'watch']);

// On process close, clean up.
process.on('exit', function () {
  if (node) { node.kill() };
  if (mongod) { mongod.kill(); }
});