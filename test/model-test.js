var test = require('tap').test
  , EventEmitter = require('events').EventEmitter
  , _model = require('../model')
  , a = require('assertions')
  , u = require('ubelt')

createModel = function (emitter) {
  return _model(emitter || new EventEmitter())
}

var validApp = 
  a._has({
    name: a._isString(),
    testid: a._isString(),
    type: 'app',
    instances: a._isArray(),
  })

var validInstance = 
  a._has({
    name: a._isString(),
    dir: a._isString(),
    branch: a._isString(),
    domains: a._isArray(),
    testid: a._isString(),
    app: validApp
  })


var dir1 = 'whatever/master'
  , dir2 = 'whatever/test'
  , pkg = {
  name: 'whatever',
  domains: ['whatever.com'],
  main: './index.js',
}

test('create', function (t) {
  var model = createModel()
    , inst1 = model.create(dir1, pkg)
    , inst2 = model.create(dir2, pkg)
  validInstance(inst1)
  validInstance(inst2)
  console.error(model.list())
  t.equal(model.find({dir: dir1}), inst1)
  t.equal(model.find({dir: dir2}), inst2)
  t.end()

})

//test that get test app will assign every branch

test('getTestApp -- random', function (t) {
  var model = createModel()
    , inst1 = model.create(dir1, pkg)
    , inst2 = model.create(dir2, pkg)
    , branches = []

  u.times(10, function (i) {
    var target = model.getTestApp({host: 'whatever.com'})
    a.ok(target)
    if(!~(branches.indexOf(target.branch)))
      branches.push(target.branch)
  })
  branches.sort()
  a.deepEqual(branches, ['master', 'test'])
  t.end()

})

//this test is like if the branch and testid was retrived from a cookie

test('getTestApp -- stored', function (t) {
  var model = createModel()
    , inst1 = model.create(dir1, pkg)
    , inst2 = model.create(dir2, pkg)
    , testid = inst1.testid 

  function getFromBranch(b) {
   return model.getTestApp({host: 'whatever.com', branch: b, testid: testid})
  }
  g1 = getFromBranch('master')
  g2 = getFromBranch('test')

  validInstance(g1)
  validInstance(g2)

  t.equal(inst1, g1)
  t.equal(inst2, g2)
      
  t.end()
})

//model should emit 'instance' and 'app' when data is updated.

test('events', function (t) {
  var emitter = new EventEmitter()
    , model = createModel(emitter)
    , ports = []
  emitter.on('instance', function (inst) {
    console.error('instance', inst)
    ports.push(inst.port)
    t.ok(inst, 'emitted instance')
  })
  emitter.on('app', function (app) {
    console.error('app', app)
    t.ok(app, 'emitted app')
  })

  var inst1 = model.create(dir1, pkg)
  var inst2 = model.create(dir1, pkg)
  
  t.equal(ports.shift(), inst1.port)
  t.equal(ports.shift(), inst2.port)
  var inst3 = model.update(inst1, {
    name: 'whatever',
    domains: ['whatever.com'],
    main: './index2.js',
  })
  t.equal(ports.shift(), inst3.port)
  a.equal(inst1, inst3)
  t.equal(model.list().length, 2)
  t.end()
})