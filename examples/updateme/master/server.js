
function log(name) {
  var event = {}
  event[name] = new Date()
  console.log(JSON.stringify(event))
}
log('started')

var fs = require('fs')
  , path = require('path')

/*
  this app responds with the contents of ./status
  (which can be set by a bash test script)
  it only loads the file at startup,
  this is to test the restart feature of the admin.
*/

var current = null
try {
  current = fs.readFileSync(path.join(__dirname, 'status'), 'utf-8')
} catch (err) {
  current = 'NA'
}

require('http').createServer(function (req, res){
  log('request')
  res.end(current)
}).listen(process.env.PORT || 8081)

process.on('exit', function () {log('exit')})
process.on('SIGINT', function () { log('SIGINT'); process.exit(1) })