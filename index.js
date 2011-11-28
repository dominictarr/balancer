
var pipes = require('mw-pipes')
  , connect = require('connect')
  , fs = require('fs')
  , join = require('path').join
  , http = require('http')
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
      fs.readFile(join(process.env.HOME, file), 'utf-8', function (err, data) {
        if(err) return cb(err)
        try{
          data = JSON.parse(data)
        } catch (err) {
          return cb(err)
        }
        cb(null, data)
      })
    }

  /*
  //don't prematurely refactor
  function getApp (handler) {
    return function (req, res, next) {
      if(!apps[p])
        return send(res, {
          error: 'not_found', 
          path: p, 
          message: 'no app at that path'
        }, 404)  
    }
  }*/
  var handler =
    pipes(
      pre('/_update/', function (req, res, next) {
        var p = req.url
        readJSON(p+'/package.json', function (err, data) {
          if(err) return send(res, err, 400)
          apps[p] = data     
          send(res, data)
        })
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
        send(res, apps)
      }),
      //_restart
      //_tail    -- log stats to stdout, newline seperated json.
      //_tailerr -- log debug to stderr, just whatever.
      //_stats
      function (req, res, next) {
        //check the host, and the cookie
        //and proxy to the appropiate server
        res.end('hello test')    
      }
    )

  return handler
}

var port = process.getuid() == 0 ? 80 : 8080
if(!module.parent)
  http.createServer(createHandler()).listen(port, function () {
    console.error('listening on ' + port)
  })
