var test = require('tap').test
  , EventEmitter = require('events').EventEmitter
  , _model = require('../model')
  , _ctrl = require('../controller')
  , a = require('assertions')
  , u = require('ubelt')
  , join = require('path').join
  , exec = require('child_process').exec

function isRunning(inst, next) {
  exec('kill -0 '+inst.monitor.process.pid, next)
}

test('basic', function (t) {

  var emitter = new EventEmitter()
    , model = _model(emitter)
    , ctrl = _ctrl(model, emitter)
    , dir = join(__dirname, '../examples/helloworld/master')

  emitter.on('instance', console.error)
  emitter.on('app', console.error)
  
  ctrl.update(dir, function (err, inst) {
    if(err) throw err
    t.ok(inst, 'instance created')
    isRunning(inst, function (err){  
      t.equal(err, null, 'instance is running')
      inst.monitor.once('exit', function () {
        isRunning(inst, function (err) {
          t.ok(err, 'instance is stopped')
          t.end()
        })
      })
      ctrl.stop(dir)
    })
  })

})