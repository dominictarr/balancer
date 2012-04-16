#!/usr/bin/env node

var pipes = require('mw-pipes')
  , connect = require('connect')
  , join = require('path').join
  , http = require('http')
  , u = require('ubelt')
  , cc = require('config-chain')
  , dirty = require('dirty')
  , opts = require('optimist').argv
  , EventEmitter = require('events').EventEmitter
  ;

//automatically set production if running as root.
var env = opts.env 
  || process.env.frank_env 
  || ( process.getuid() == 0 ?  'production' : 'development' )

var config = cc(
      {env: env},
      opts,
      //don't need any other config yet    
      { dbpath: join(process.env.HOME, 'frank.'+env+'.dirty')
      , adminPort: 9090
      , port: env == 'production' ? 80 : 8080
      }
    ).store

function loadDB(config, cb) {

  //use an in memory db if env == 'test'
  if(config.env == 'test') {
    cb(null, dirty())
  } else {
    var db = dirty(config.dbpath)
    db.once('load', function () {
      cb(null, db)
    })
  }
}

var createApp = function (db) {

  /*
    here we are setting up all the modules with dependency injection.
    this makes it really easy to seperate each part for testing.
  */
  var emitter = new EventEmitter()
    , model = require('./model')(emitter)
    , ctrl = require('./controller')(model, emitter)
    , admin = require('./admin')(ctrl, model, emitter)
    , proxy = require('./testing-proxy')(model, emitter)
    , util = require('./util')
    , logger = require('./logger')
    ;
  /*
    listen for update events on the model, and saving them to disk.
    most of the data is kept in memory, only likely to be running tens of apps.
  */

  function save(k,v) {
    db.set(k, v, function logSave() {
      emitter.emit ('saved', v)
    })
  }
  emitter.on('instance', function (inst) {
    save(inst.dir, model.info(inst))
  })
  emitter.on('app', function (app) {
    save(app.name, 
      u.filter(app, function (v, k) {
        return ~['name', 'type', 'testid'].indexOf(k)
      }))
  })
/*
  after the db loads, initialize the model.
*/
  //on load, recreate apps, and set testid
  db.forEach(function (key, value) {
    if(value.type == 'app') {
      model.createApp(value)
    }
  })
  db.forEach(function (key, value) {
    if(value.type == 'instance'){
      ctrl.update(key, function (){})
    }
  })
    
  logger.logEvents(emitter)

  var handler = connect(
      function (req, res, next) {
        emitter.emit('request', {method: req.method, url: req.url })
        next()
      },
      connect.logger(),
      proxy,
      function (err, req, res, next) {
        console.error(err.stack)
        util.send(res, err, 500)
      }
    )

  return {
    model: model,
    adminHandler: admin,
    controller: ctrl,
    proxy: proxy,
    emitter: emitter,
    handler: handler,
  }
}

if(!module.parent) {
  loadDB(config, function (err, db) {

    var app = createApp(db)
    app.handler.listen(config.port, function () {
      app.emitter.emit('listening',
        {app:'balancer', port: config.port, env: config.env })
    })
    app.adminHandler.listen(config.adminPort, function () {
      app.emitter.emit('admin_listening',
        {app:'admin', port: config.adminPort })
    })
  })
}
