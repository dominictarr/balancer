
var pipes = require('mw-pipes')
  , connect = require('connect')
  , fs = require('fs')
  , join = require('path').join
  , http = require('http')
  , createProxy = require('./proxy')
  , runner = require('./runner')
  , u = require('ubelt')
  ;

var createHandler = module.exports = function (db) { //inject memory database.

  var apps = {}
    ;

    function pre (prefix, handler) {
      return function (req, res, next) {
        if(req.url.indexOf(prefix) == 0) {
          req.url = req.url.replace(prefix, '')
          if(req.url[0] != '/')
            req.url = '/' + req.url
          handler(req, res, next)
        } else
          next()
      }  
    }

    function send(res, obj, status) {
      res.writeHeader(status || 200, {'content-type': 'application/json'})
      res.end(JSON.stringify(obj))
    }

    function readJSON(file, cb) {
      fs.readFile(file, 'utf-8', function (err, data) {
        if(err) return cb(err)
        try{
          data = JSON.parse(data)
        } catch (err) {
          return cb(err)
        }
        cb(null, data)
      })
    }

  function getApp(handler) {
  
    return function (req, res, next) {
      var p = req.url
      if(!apps[p])
        return send(res, {error: 'not_found', path: p, message: 'app does not exist'})
  
      handler.call({req:req, res:res, next:next}, apps[p])
    }
  }
  
  function findApp(test) {
    return u.find(apps, test)
  }
  var handler =
    pipes(
      pre('/_update/', function (req, res, next) {
        var p = req.url
        var dir = join(process.env.HOME, p)
        readJSON(dir+'/package.json', function (err, data) {
          if(err) return send(res, err, 400)
          
          if(!apps[p]) {
            var app = apps[p] = {
              dir: dir,
              branch: dir.split('/').pop(),
              package: data,
              domains: data.domains || [],
              port: u.randomInt(1000, 50000)
            }
            app.monitor = runner(app) 
            app.monitor.stderr.pipe(process.stderr, {end: false})
            app.monitor.stdout.pipe(process.stdout, {end: false})
            //setup logging from stderr, stats from stdout
          } else {
            var app = apps[p]
            app.monitor.restart()
          }
          send(res, data)
        })
        // if the app isn't running, start it.
        // else, update it.
        // restart this app if it is currently running.
      }),
      pre('/_enable/', function (req, res, next) {  
        var p = req.url
        if(!apps[p])
          return send(res, {
            error: 'not_found', 
            path: p, 
            message: 'no app at that path'
          }, 404)
        apps[p].enabled = true        
      }),
      pre('/_list', function (req, res, next) {
        send(res, u.mapToArray(apps, function (app) {
          return {
            dir: app.dir,
            port: app.port,
            branch: app.branch,
            package: app.package          
          }
        }))
      }),
      //_restart
      //_tail    -- log stats to stdout, newline seperated json.
      //_tailerr -- log debug to stderr, just whatever.
      //_stats
      pre('/_tailerr/', getApp(function (app) {
        app.monitor.stderr.pipe(this.res, {end: false})
      })),
      pre('/_tailout/', getApp(function (app) {
        app.monitor.stdout.pipe(this.res, {end: false})
      })),
      pre('/_tail/', getApp(function (app) {
        app.monitor.stdout.pipe(this.res, {end: false})
        app.monitor.stderr.pipe(this.res, {end: false})
      })),
      createProxy(function (req) {
        var app = findApp(function (app) {
          console.error(req.headers.host, app.package.domains, ~app.package.domains.indexOf(req.headers.host))
          if(~app.package.domains.indexOf(req.headers.host))
            return true
        })
        if(!app)
         return null
        console.error(app)
        return {
          port: app.port
        }
      }),
      connect.errorHandler()
    )
  return handler
}

var port = process.getuid() == 0 ? 80 : 8080
if(!module.parent)
  http.createServer(createHandler()).listen(port, function () {
    console.error('listening on ' + port)
  })
