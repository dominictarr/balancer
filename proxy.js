var http = require('http')
  , u = require('ubelt')
  , pipes = require('mw-pipes')
  , connect = require('connect')
  ;

module.exports = 
function createHandler(getOpts) {
 return function (req, res, next) { 
    var _opts = getOpts(req)
    if(!_opts) return next({error: 'not_found', message: 'no proxy destination'})
    var opts = u.deepMerge(_opts, {headers: req.headers, method: req.method, path: req.url})

    //if the other errors, then give an error message.
    var _req = http.request(opts)
    if(next)
      _req.on('error', next)
    req.pipe(_req)
    _req.on('response', function (_res) {
      res.writeHeader(_res.statusCode, _res.headers)
      _res.pipe(res)
    })
  }

}