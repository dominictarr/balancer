var pipes = require('mw-pipes')
  , qs = require('querystring')
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
    return dir
    //return dir[0] == '/' ? dir.slice(1) : dir  
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

function toBool (val) {
  return val === '' ? true : val
}
function tail (res, app, which) {
  if('false' === which.tail)
    return true
  var outs = []

  if(toBool(which.tailout) || toBool(which.tail))
   outs.push('stdout')
  if(toBool(which.tailerr) || toBool(which.tail))
   outs.push('stderr')

  outs.forEach(function (out) {
    app.monitor[out].pipe(res, {end: false})
  })

  return outs.length == 0
}

return pipes(
    function (req, res, next) {
      var p = util.urlQuery(req.url)
      req.url = p.url
      req.query = p.query
      next()
    },
    /*
      /status/
      get git commit

    */
    pre('/update/', function (req, res, next) {
      var dir = cleanUrl(req.url)

      ctrl.update(dir, function (err, inst) {
        if(err) return next(err)
        util.send(res, model.info(inst), 200, tail(res, inst, req.query))
      })
      // if the app isn't running, start it.
      // else, update it.
      // restart this app if it is currently running.
    }),
    //ADD TAILABITILY TO ALL THESE, ACTUALLY, TAIL BY DEFAULT
    pre('/restart/', function (req, res, next) {
      //XXX: error paths... if there is no app?
      console.log(req)
      var inst = ctrl.restart(cleanUrl(req.url))
      util.send(res, inst, 200, tail(res, inst, req.query))
    }),
    pre('/list', function (req, res, next) {
      util.send(res, ctrl.list())
    }),
    pre('/tailerr/', getApp(function (app) {
      app.monitor.stderr.pipe(this.res, {end: false})
    })),
    pre('/tailout/', getApp(function (app) {
    })),
    pre('/tail/', getApp(function (app) {
      app.monitor.stdout.pipe(this.res, {end: false})
      app.monitor.stderr.pipe(this.res, {end: false})
    })),
    function (req, res) {
      res.writeHeader(400)
      res.end('usage: update, restart, list, tail')
    },
    function (err, req, res, next) {
      console.error(err)
      util.send(res, err, 500)
    }
    //error handler here.
  ) 
}
