
var cp = require('child_process')
  , u = require('ubelt')
  , EventEmitter = require('events').EventEmitter
  , es = require('event-stream')
  ;
//start, restart, stop...

/*
will also want the abitilty to set env variables on child processes
if the app crashes, start from the rollback dir.
(will typically be dir + '_stable'

hmm, there are many ways to do something like that...

make it seemlessly part of this thing? or handle rollbacks on the next level up?
it feels a bit messy here, and might want to gather different stats.

that suggests next level...
*/
function rport () {
  return Math.round(Math.random()*40000)+1000
}

function info(m) {
  return {
    port: m.env.PORT,
    dir: m.dir,
    name: m.package.name,
    pid: m.process.pid
  }
}

module.exports =
function run (opts) {
  var m = new EventEmitter()
  m.dir = opts.dir
  m.package = opts.package
  m.stdout = es.through()
  m.stderr = es.through()
  m.keepAlive = opts.keepAlive !== false // defalt to true
  opts.port = opts.port || rport()
  m.env = u.merge({PORT: opts.port}, process.env)

  //XXX: this should reload the package when it restarts
  
  function start () {
    m.process = cp.spawn(process.execPath, [m.package.main || 'index.js'], {cwd: m.dir, env: m.env})  

    m.process.stdout.pipe(m.stdout, {end: false})
    m.process.stderr.pipe(m.stderr, {end: false})

    var pid = m.process.pid
    m.process.on('exit', function () {
      if(m.keepAlive) 
        start()
      else{
        m.stdout.end()
        m.stderr.end()
      }
      m.emit('exit', info(m))
    })
    m.emit('start', info(m))
  }
  start()

  m.restart = function (sig) {
    m.process.kill(sig || 'SIGINT')
    m.emit('restart', info(m))
  }
  m.stop = function (sig) {
    m.keepAlive = false
    m.process.kill(sig || 'SIGINT')
    m.emit('stop', info(m))
  }
  return m
}
