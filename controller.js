

var util = require('./util')
  , runner = require('./runner')
  , join = require('path').join

/*
  glue the model to the real-life process stuff.
*/

module.exports = function (model, emitter) {

  var ctrl = {}

  ctrl.update = 
    function (dir, callback) {
      var _dir = dir.indexOf(process.env.HOME) == 0 ? dir : join(process.env.HOME, dir)
      util.readJSON(_dir+'/package.json', function (err, package) { //move into controller
        if(err) return callback(err)
        try {
          var inst = model.find({dir: dir})
          console.error('eouaontuhaonsehu', inst)
          if (inst) {
            model.update(inst, package)      
            inst.monitor.restart()
          } else {
            inst = model.create(dir, package)
            //XXX ugly. handling all this dir stuff wrong.
            inst.dir = _dir
            inst.monitor = runner(inst)
            inst.monitor.stderr.pipe(process.stderr, {end: false})
            inst.monitor.stdout.pipe(process.stdout, {end: false})
            //starts automatically
                        
            ;['exit','start', 'restart'].forEach(function (event) {
              console.error('REEMIT', event)
              inst.monitor.on(event, function () { 
                console.error(event, '!!!!!!!!!!!!!!')
                emitter.emit(event, inst)
              })
            })
            inst.monitor.start()

          }
        } catch (err) {
          return callback(err)
        }
        callback(err, inst)
      })
    }

  function getApp(action) {
    return function (dir) {
      var inst = model.find({dir: dir})
      if(inst) {
        action(inst)
      return model.info(inst)
      } 
      throw {
        error: 'not_found',
        message: 'no app at:' + dir,
        stack: new Error().stack
      }
    }
  }

  ctrl.restart = getApp(function (inst) {
    inst.monitor.restart() 
  })

  ctrl.stop = getApp(function (inst) {
    inst.monitor.stop() 
  })
  
  ctrl.list = model.list

  return ctrl
}