require('http').createServer(function (req, res){
  res.end('HELLO THERE')
}).listen(process.env.PORT || 8080)