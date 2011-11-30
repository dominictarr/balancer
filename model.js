

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
function () {

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
//  model.findApp = matcher(apps, u.find)

  model.createAppInfo =
    function (inst) {
      var name = inst.package.name
      if(apps[name]) {
        apps[name].instances.push(inst)
      } else {
        var info = apps[name] = {
          name: name,
          testid: Math.random(), //updating the test id will randomly reassign users to branches.
          instances: [inst]
        }
        info.__defineGetter__('branches', function () {
          u.map(this.instances, function (v) { return v.branch })        
        })
      }
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
        var app = inst.app
        var r = {
          branch: u.randomOf(app.instances.map(function (v) {
            console.error(v.branch)
            return v.branch
          }))
        , testid: app.testid //set to the current testid
        , domains: selectDomain
        }
        console.error(r)
        inst = model.find(r)
        console.error(inst)
      }
      return inst
    }

  model.create =
    function create (dir, data) {
      var app = {
        dir: dir,
        branch: dir.split('/').pop(),
        package: data,
        domains: data.domains || [],
        port: u.randomInt(1000, 50000)
      }
      app.__defineGetter__('testid', function () {
        return apps[this.package.name].testid
      })
      app.__defineGetter__('app', function () {
        return apps[this.package.name]
      })

      //XXX validate app XXX
      app.monitor = runner(app)
      model.createAppInfo(app)
      return app
    }
  

  model.update = 
    function update(p, cb) {
      var dir = join(process.env.HOME, p)
      util.readJSON(dir+'/package.json', function (err, package) {
        if(err) return cb(err)
        var app = model.find({dir: p})
        if(!app) {
          instances.push(app = model.create(dir, package))
          ///XXX
          app.monitor.stderr.pipe(process.stderr, {end: false})
          app.monitor.stdout.pipe(process.stdout, {end: false})
          //XXX
        } else {
          app.monitor.restart()
        }
        cb(null, app)
      })
    }

  model.info = 
    function info(app) {
      return {
        dir: app.dir,
        port: app.port,
        branch: app.branch,
        package: app.package          
      }  
    }

  model.list = 
    function list (opts) {
      u.map(opts ? model.filter(opts) : apps, info)
    }

  return model
}