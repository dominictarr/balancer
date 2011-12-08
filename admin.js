var pipes = require('mw-pipes')
  , fs = require('fs')
  , join = require('path').join
  , runner = require('./runner')
  , u = require('ubelt')
  , util = require('./util')
  ;

var pre = util.pre

module.exports = function(model) {

//retrives apps by path.
//creates apps.
//updates apps.

  function getApp(handler) {
    return function (req, res, next) {
      var p = req.url
        , app = model.find({dir:p})
      //no. pass to error handler.
      if(!app)
        return util.send(res, {error: 'not_found', path: p, message: 'app does not exist'})
      handler.call({req:req, res:res, next:next}, app)
    }
  }

return pipes(
    pre('/update/', function (req, res, next) {
      var p = req.url
      model.update(p, function (err, data) {
        if(err) return next(err)
        util.send(res, model.info(data))
      })
      // if the app isn't running, start it.
      // else, update it.
      // restart this app if it is currently running.
    }),
/*    pre('/enable/', function (req, res, next) {  
      var p = req.url
      model.getApp({dir: p})
      if(!apps[p])
        return send(res, {
          error: 'not_found', 
          path: p, 
          message: 'no app at that path'
        }, 404)
      apps[p].enabled = true        
    }),*/
    pre('/list', function (req, res, next) {
      util.send(res, model.list())
    }),
    //_restart
    //_tail    -- log stats to stdout, newline seperated json.
    //_tailerr -- log debug to stderr, just whatever.
    //_stats
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