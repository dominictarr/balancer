
var test = require('tap').test
  , es = require('event-stream')
  , runner = require('../runner')
  , join = require('path').join
  , a = require('assertions')
  ;
  
var pkg = {
  name: 'helloworld',
  main: 'server.js',
  domains:['helloworld.com']
}
  
test('start child process', function (t) {
  var m = runner({dir: join(__dirname, '../examples/helloworld/master'), package: pkg})

  m.stderr.pipe(process.stderr, {end: false})
  
  es.connect(
    m.stdout,
    es.split(),
    es.log(),
    es.parse(),
    es.writeArray(function (err, changes) {
      console.error(changes)      
      a.has(changes, [
        {started: a._isValidDate()},
        {SIGINT: a._isValidDate()},
        {exit: a._isValidDate()},
        {started: a._isValidDate()},
        {SIGINT: a._isValidDate()},
        {exit: a._isValidDate()}
      ])      
      t.end()
    })
  )
  setTimeout(function (){
    m.restart()
    console.error('restarted')
    setTimeout(function (){
      m.stop()
    }, 522)
  }, 523)
})
