var fs = require('fs')
  , join = require('path').join
  , url = require ('url')
  , qs = require('querystring')

module.exports = {
  pre: pre,
  send: send,
  readJSON: readJSON,
  urlQuery: urlQuery
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

function send(res, obj, status, end) {
  res.writeHeader(status || 200, {'content-type': 'application/json'})
 
  res[end !== false ? 'end' : 'write'](JSON.stringify(obj.info ? obj.info() : obj))
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

function urlQuery (str) {
  var i = str.indexOf('?')
  return {
    url:   i === -1 ? str : str.substring(0, i)
  , query: i === -1 ? {}  : qs.parse(str.substring(i+1))
  }
}