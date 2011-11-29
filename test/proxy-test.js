var test = require('tap').test
  , createProxy = require('../proxy')
  , u = require('ubelt')
  , http = require('http')
  , request = require('request')
  , url = require('url')
  , pipes = require('mw-pipes')
  ;

function createProxyTest(opts) {
  var target, proxy
  var helpers = {
    target: u.randomInt(1000, 50000)
  , proxy: u.randomInt(1000, 50000)
  , close: function () {target.close(); proxy.close()}
  }
  return function (t) {
    helpers.test = t
    t.plan(opts.plan)
    target = http.createServer(opts.target(t, helpers))
    target.listen(helpers.target, function (){ 
      proxy = http.createServer(opts.proxy(t, helpers))
      proxy.listen(helpers.proxy, function () {
        opts.request(t, helpers)
      })    
    })
  }
}

function createPlainProxy(t, h) {
  return createProxy(function (req) {
    t.ok(true, 'proxy requested')
    return {
      hostname: 'localhost'
    , port: h.target
    }
  })
}

var r = '' + Math.random()
test('simple proxy', createProxyTest({
  plan:3,
  target: function (t, h) {
      return function (req, res) {
      t.ok(true, 'target requested')  
      res.end(r)
    }
  },
  proxy: createPlainProxy,
  request: function (t, h) {  
    request({
      url: url.format({protocol: 'http',hostname: 'localhost', port: h.proxy})
    },function (err, res, body) {
      t.equal(body, r, 'proxy responded')
      if(err) throw err
      h.close()
      t.end()
    }) 
  }
}))

var r2 = '' + Math.random()
var r3 = '' + Math.random()

test('custom headers', createProxyTest({
  plan:3,
  target: function (t, h) {
      return function (req, res) {
      t.ok(true, 'target requested')  
      t.equal(req.headers['x-whatever'], r3, 'custom header arrived correctly')
      res.end(r)
    }
  },
  proxy: createPlainProxy,
  request: function (t, h) {  
    request({
      url: url.format({protocol: 'http',hostname: 'localhost', port: h.proxy})
    , headers: {
        'x-whatever': r3
      }
    },function (err, res, body) {
      t.equal(body, r, 'proxy responded')
      if(err) throw err
      h.close()
      t.end()
    }) 
  }
}))

test('error response', createProxyTest({
  plan:4,
  target: function (t, h) {
      return function (req, res) {
      t.fail('expected error handler')  
      res.end(r)
    }
  },
  proxy: function createPlainProxy(t, h) {
    return pipes(createProxy(function (req) {
      t.ok(true, 'proxy requested')
      return null
    }), function (err, req, res, next) {
      t.ok(true, 'error handler requested')      
      res.writeHeader(404)
      res.end('404')
    })
  }
  ,
  request: function (t, h) {  
    request({
      url: url.format({protocol: 'http',hostname: 'localhost', port: h.proxy})
    },function (err, res, body) {
      t.equal(body, '404', 'proxy responded with error handler')
      t.equal(res.statusCode, 404, 'proxy responded with 404 status')
      if(err) throw err
      h.close()
      t.end()
    }) 
  }
}))

