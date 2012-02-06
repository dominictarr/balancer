# balancer

mini platform for continous deployment with split testing.

##TODO

  * figure out cookies        -- DONE
  * support branches.         -- DONE
  * refactor out _admin api.  -- DONE
  * stats aggregation.
  * minimal persistance.      -- DONE
  * middleware that writes null chars to make curl stream nice (check user agent)
  * cli tool instead of curl

## FIX BUGS

  * app doesn't update properly -- DONE
  * tail logs after update.  (if pass in ?tail=true)
  * should reread package when restarting. --DONE
  * more tests, integration tests. update app test. -- DONE

parseable logging is gonna make integration testing really easy.
will be able to deploy apps and verify correct things in logs.

seems to basically be working now...

when update app and git deploy, http request with the correct thing

## testing

not testing up front sucks. I was obsessed with testing,
I got good enough to write organised code without testing...
but that only works on the first dash. when it comes time to refactor you need tests.

TESTS

  * model: create apps, find apps, getTestApp (also, move all cp stuff to runner) --done
  * controller... or integration tests?
  * admin/index: integration tests, test /_admin/tail.

INTEGRATION TESTS

  * start app, tail ... emits correct data
  * restart app. updates correctly.
  * writes cookie
  * proxies to correct branch.

next level

  * zero-downtime.
  * stats aggregation.

make sure integration tests are flexible enough to run against remote server.

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
