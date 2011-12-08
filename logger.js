
var trees = require('trees')
/*
make logging be a simple line seperated json format to ease integration tests.

  what sort of stuff do I need?
  
  hmm, it's also gonna be like a event format...
  
  ["eventname", {data: value}, timestamp]

  

*/

function timestamp () {
  var d = new Date()

  return (
      d.getUTCFullYear()
    + '-'
    + d.getUTCMonth()
    + '-'
    + d.getUTCDate()
    + '_'
    + d.getUTCHours()
    + ':'
    + d.getUTCMinutes()
    + ':'
    + d.getUTCSeconds()
     + ':'
   + d.getUTCMilliseconds()
  )

}

function safestring(obj){
  try {
    return JSON.stringify(obj)
  } catch (err) {
    return trees.untangle.stringify(obj)
  }
}

function stringify (event, data) {
  //XXX: guard against stringify throwing on circular objects
  if('string' !== typeof event)
    event = safestring(event)
  if(!data)
    data = {}
  return safestring([event, data, timestamp()])
}

function log(event, data) {
  console.log(stringify(event, data))
}

function err(event, data) {
  console.err(stringify(event, data))
}

function logEvents(emitter) {
  var _emit = emitter.emit
  emitter.emit = function (event, data) {
    log.apply(null, arguments)
    _emit.apply(emitter, arguments)
  } 
}

exports.log = log
exports.err = err
exports.stringify = stringify
exports.timestamp = timestamp
exports.logEvents = logEvents
