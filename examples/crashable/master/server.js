function log(name) {
  var event = {}
  event[name] = new Date()
  console.log(JSON.stringify(event))
}
log('started')

require('http').createServer(function (req, res){

  if(~req.url.indexOf('crash'))
    throw new Error('INTENSIONALLY CRASHED')

  log('request:'+ req.url)
  res.end('OKAY')
}).listen(process.env.PORT || 8081)

process.on('exit', function () {log('exit')})
process.on('SIGINT', function () { log('SIGINT'); process.exit(1) })