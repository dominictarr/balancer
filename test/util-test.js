

var test = require('tap').test
  , util = require('../util')

test('urlQuery', function (t) {
  var u = util.urlQuery('/path/to?key=val&bool')

  t.deepEqual(u, {url: '/path/to', query: { key: 'val', bool: ''}})
  t.end()
})