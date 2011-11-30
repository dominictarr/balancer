
var pipes = require('mw-pipes')
  , connect = require('connect')
  , fs = require('fs')
  , join = require('path').join
  , http = require('http')
  , runner = require('./runner')
  , u = require('ubelt')
  ;

var createHandler = module.exports = function (db) { //inject memory database.

  var model = require('./model')(db) //db does nothing so far
    , admin = require('./admin')(model)
    , proxy = require('./testing-proxy')(model)
    , util = require('./util')
    ;

  return pipes(
      util.pre('/_admin', admin),
      proxy,
      connect.errorHandler()
    )
}

var port = process.getuid() == 0 ? 80 : 8080
if(!module.parent)
  http.createServer(createHandler()).listen(port, function () {
    console.error('listening on ' + port)
  })
