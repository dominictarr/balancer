#!/usr/bin/env node

var pipes = require('mw-pipes')
  , connect = require('connect')
  , fs = require('fs')
  , join = require('path').join
  , http = require('http')
  , runner = require('./runner')
  , u = require('ubelt')
  , cc = require('config-chain')
  , dirty = require('dirty')
  , opts = require('optimist')
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
      {
        dbpath: join(process.env.HOME, 'frank.'+env+'.dirty')
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

var createHandler = module.exports = function (db) { //inject memory database.

  var emitter = new EventEmitter()
    , model = require('./model')(emitter) //db does nothing so far
    , admin = require('./admin')(model)
    , proxy = require('./testing-proxy')(model)
    , util = require('./util')
    ;


  //hook up model to persistance
  //whenever a instance or app is updated, save it.

  function save(k,v) {
    db.set(k, v, function logSave() {
      console.error('saved', k, v)
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
  
  //on load, recreate apps, and set testid
  db.forEach(function (key, value) {
    if(value.type == 'app') {
      console.error(value)
      model.createApp(value)
    }
  })
  db.forEach(function (key, value) {
    if(value.type == 'instance'){
          console.error(value)
      model.update(key, console.error)
    }
  })

  return pipes(
      connect.logger(),
      util.pre('/_admin', admin),
      proxy,
      connect.errorHandler()
    )
}

if(!module.parent)
  loadDB(config, function (err, db) {
    http.createServer(createHandler(db)).listen(config.port, function () {
      console.error('balancer listening on ' + config.port + ' in ' + config.env + ' enviroment')
    })
  })
