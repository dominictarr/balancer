function log(name) {
  var event = {}
  event[name] = new Date()
  console.log(JSON.stringify(event))
}
log('started')

require('http').createServer(function (req, res){
  log('request')
  res.end('HOLA')
}).listen(process.env.PORT || 8081)

process.on('exit', function () {log('exit')})
process.on('SIGINT', function () { log('SIGINT'); process.exit(1) })