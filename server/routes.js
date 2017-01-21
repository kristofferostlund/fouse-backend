'use strict'

const express = require('express')
const path = require('path')

const root = path.resolve()

module.exports = function (app) {
  // Front end stuff
  // app.use(express.static(root + '/public'))

  // Back end stuff
  app.use('/api/', require('./api'))
  app.use('/crawler/', require('./crawler'))
  app.use('/analyser/', require('./analyser'))
  app.use('/scheduler/', require('./scheduler'))
  app.use('/notifier/', require('./notifier'))
}