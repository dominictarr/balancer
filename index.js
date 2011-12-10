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

var createHandler = module.exports = function (db) { //inject memory database when testing

  var emitter = new EventEmitter()
    , model = require('./model')(emitter) //db does nothing so far
    , ctrl = require('./controller')(model, emitter)
    , admin = require('./admin')(ctrl, model, emitter)
    , proxy = require('./testing-proxy')(model, emitter)
    , util = require('./util')
    , logger = require('./logger')
    ;
    
  logger.logEvents(emitter)

  //hook up model to persistance
  //whenever a instance or app is updated, save it.

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

  var handler = pipes(
      function (req, res, next) {
        emitter.emit('request', {method: req.method, url: req.url})
        next()
      },
      connect.logger(),
      util.pre('/_admin', admin),
      proxy,
      function (err, req, res, next) {
        console.error(err)
        util.send(res, err, 500)
      }
    )

  return {
    model: model,
    admin: admin,
    controller: ctrl,
    proxy: proxy,
    emitter: emitter,
    handler: handler,
  }
}

if(!module.parent)
  loadDB(config, function (err, db) {
    var balancer = createHandler(db)
    http.createServer(balancer.handler).listen(config.port, function () {
      
      balancer.emitter.emit('listening',
        {app:'balancer', port: config.port, env: config.env })
    })
  })
