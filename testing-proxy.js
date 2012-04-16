var pipes = require('mw-pipes')
  , connect = require('connect')
  , proxy = require('http-proxy')


//XXX will want to unit test the sticky session stuff.

module.exports = function (model) {

  function assignBranch (req) {
    var host = req.headers.host.split(':').shift() //ignore the port

    var inst = model.getTestApp({
      host: host,
      branch: req.cookies.branch,
      testid: req.cookies.testid
    })
    if(!inst) return next({error:'not_found', message: 'no app', host: req.headers.host})
    return {
      host: inst.host || 'localhost',
      port: inst.port,
      inst: inst
    }
  }

 var p =  proxy.createServer(
    connect.cookieParser(),
    function (req, res, next) {
      //get the current app.
      //get the current test.
      //assign the session to this app if it's not already.
      //get the current test for app.   
      var dest = assignBranch(req)
      var inst = dest.inst
      res.setHeader('set-cookie', 
          'branch='+inst.branch
        + '; testid='+inst.app.testid
        + '; expires='+new Date(Date.now()+6e10) //~two years
        + ';')

      //the proxy doesn't care what the userid is.
      //the process can set that.
      next.proxyRequest(req, res, dest)
    }
      //I don't really like this way connect puts every thing into
        //the bag of the request context.
      //could nicen this by respecting some RFC about forward proxy headers?
  )

  p.on('upgrade', function (req, socket, head) {

    p.proxyWebSocketRequest(req, socket, head, assignBranch(req))
  })
  return p

}
