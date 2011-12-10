var fs = require('fs')
  , join = require('path').join

module.exports = {
  pre: pre,
  send: send,
  readJSON: readJSON
}

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
  res.end(JSON.stringify(obj.info ? obj.info() : obj))
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
