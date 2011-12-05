# frankenstien

mini platform for continous deployment with split testing.

##TODO

  * figure out cookies -- DONE
  * support branches.  -- DONE
  * refactor out _admin api. --DONE
  * stats aggregation.
  * minimal persistance.  -- DONE

## persistance.

if the proxy crashes, it must restart without losing it's state.
what must it remember?

  * which apps are running... restart the apps as if they had been just updated.
  
## stats

each event needs to be valid?

``` js
{ user: id, //set with cookie
  event: name, //conversion status
  value: amount, //purchase amount?
  time: new Date() 
  app: app.name
  branch: app.branch //either master or test.
}
```
calc stats (mean, stddev, count) for each event 
(maybe reduce to unique visits etc?, purchases per user?)

and show stats across various time buckets. (hour, day, week, month)

aggregate with map-reduce in couchdb?

## tests

so, a user connects and we give her a cookies that:
  id them uniquely
  current test branch they are assigned to.
  test id (so we know to assign a new branch if the test is changed)
  
okay... if there are test IDs, that requires tests to bedefined somewhere...

a test should be associated with an app.
an app has a current test... automatically create the app test IDs and clear them explicitly?

a request to set the branches?
_newtest/appname/testid?branches=master,test

if an incoming request does not match to testid, then assign a new test id.
when logging test events, attach the branch and testid.
(so it will be possible to aggregate all info by a test)
