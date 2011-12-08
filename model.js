

/*
  queries:

  app by domain   # http request
  app by dir      # when updating the app.  

    * domain
    * dir

  when a new user requests an app that is running a test,
  they must be assigned to a test branch.
  
  when a old user requests an app that is running a test,
  but their testid is not current, 
  they mest beassigned a new test branch.
  
  so, the model contains an app object.
  and app-branch objects.


get app 
domain, branch, testid
if !branch or testid not current, assign new branch.

*/
var u = require('ubelt')
  , util = require('./util')
  , runner = require('./runner')
  , join = require('path').join

module.exports = 
function (emitter) {

  var instances = []
    , apps = {}
    , model = {}

  /*
    should rename this module to state,
    because 'model' suggests a representation, 
    and this also controls app processes...
    
    the coupling between the controller and the model is only
    small so it's not a problem to just leave it in here.
    
    will need to rethink this when this grows larger than a single server instance.  

    ... refactoring out the runner will make the model more testable.

    (probably look into little-big-events)
  */

  function matcher(on, select) {
    return function (match) {
      return select(on, function (app) {
        return u.has(app, match)
      })
    }  
  }

  model.find = matcher(instances, u.find)
  model.filter = matcher(instances, u.filter)
  //model.findApp = matcher(apps, u.find)

  model.createApp = 
    function (app) {
      app = apps[app.name] = {
          name: app.name,
          type: 'app',
          testid: app.testid || Math.random(), //updating the test id will randomly reassign users to branches.
          instances: app.instances || []
      }
      app.__defineGetter__('branches', function () {
        u.map(this.instances, function (v) { return v.branch })        
      })
      return app
    }

  model.updateApp =
    function (inst) {
      var name = inst.package.name
      if(apps[name]) {
        apps[name].instances.push(inst)
      } else {
        var info = model.createApp({
          name: name,
          instances: [inst]
        })
        //need to persist the testid's
        emitter.emit('app', info)
      }
    }
    model.setTestid = 
      function (name, testid) {
        apps[name].testid = testid    
      }

  model.getTestApp = 
    function (opts) {
    //expect {host: ..., branch: ..., testid: ...}
      function selectDomain(domains) {
        return ~domains.indexOf(opts.host)
      }
      var inst = model.find({
        domains: selectDomain,
        branch: opts.branch,
        testid: opts.testid
      })
      
      if(!inst) {
        inst = model.find({
          domains: selectDomain
        })
        if(!inst) return //okay... something messy is happening here...
        var app = inst.app
        var r = {
          branch: u.randomOf(app.instances.map(function (v) {
            return v.branch
          }))
        , testid: app.testid //set to the current testid
        , domains: selectDomain
        }
        inst = model.find(r)
      }
      return inst
    }

  function overwrite (inst, package){ 
    inst.package = package
    inst.domains = package.domains || []
    return inst
  }

  model.create =
    function create (dir, data) {
      var inst = overwrite({
        type: 'instance',
        dir: dir,
        branch: dir.split('/').pop(),
        port: u.randomInt(1000, 50000)
      }, data)
      inst.__defineGetter__('testid', function () {
        return apps[this.package.name].testid
      })
      inst.__defineGetter__('app', function () {
        return apps[this.package.name]
      })
  
      //XXX validate instance XXX
      inst.monitor = runner(inst)
      model.updateApp(inst)
      emitter.emit('instance', model.info(inst))
      return inst
    }

  model.update = 
    function update(p, cb) {
      var dir = p.indexOf(process.env.HOME) == 0 ? p : join(process.env.HOME, p)
      util.readJSON(dir+'/package.json', function (err, package) {
        if(err) return cb(err)
        var inst = model.find({dir: p})
        if(!inst) {
          instances.push(inst = model.create(dir, package))
          ///XXX
          inst.monitor.stderr.pipe(process.stderr, {end: false})
          inst.monitor.stdout.pipe(process.stdout, {end: false})
          //XXX
        } else {
          overwrite(inst, package)
          inst.monitor.restart()
        }
        cb(null, inst)
      })
    }

  model.info = 
    function info(app) {
      return {
        dir: app.dir
      , port: app.port
      , branch: app.branch  
      , package: app.package
      , type: app.type
      }  
    }

  model.list = 
    function list (opts) {
      return u.map(opts ? model.filter(opts) : instances, model.info)
    }

  return model
}