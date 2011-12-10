var pipes = require('mw-pipes')
  , fs = require('fs')
  , join = require('path').join
  , runner = require('./runner')
  , u = require('ubelt')
  , util = require('./util')
  ;

var pre = util.pre

module.exports = function(ctrl, model, emitter) {

//retrives apps by path.
//creates apps.
//updates apps.

  function cleanUrl(dir) {
    return dir[0] == '/' ? dir.slice(1) : dir  
  }

  function getApp(handler) {
    return function (req, res, next) {
      try {
        var dir = cleanUrl(req.url)
        var app = model.find({dir:dir})
        //no. pass to error handler.

        if(!app)
          return next({error: 'not_found', path: dir, message: 'app does not exist'})
        handler.call({req:req, res:res, next:next}, app)
      } catch (err) {
        next(err)
      }
    }
  }

return pipes(
    pre('/update/', function (req, res, next) {
      var dir = cleanUrl(req.url)

      ctrl.update(dir, function (err, data) {
        if(err) return next(err)
        util.send(res, data)
      })
      // if the app isn't running, start it.
      // else, update it.
      // restart this app if it is currently running.
    }),
    pre('/restart/', function (req, res, next) {
      //XXX: error paths... if there is no app?
      util.send(res, ctrl.restart(cleanUrl(req.url)))
    }),
    pre('/list', function (req, res, next) {
      util.send(res, ctrl.list(cleanUrl(req.url)))
    }),
    pre('/tailerr/', getApp(function (app) {
      app.monitor.stderr.pipe(this.res, {end: false})
    })),
    pre('/tailout/', getApp(function (app) {
      app.monitor.stdout.pipe(this.res, {end: false})
    })),
    pre('/tail/', getApp(function (app) {
      app.monitor.stdout.pipe(this.res, {end: false})
      app.monitor.stderr.pipe(this.res, {end: false})
    }))
    //error handler here.
  ) 
}
