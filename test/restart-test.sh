#!/usr/bin/env bash


#  okay this test is for actually running the balancer with actual apps, and different types of errors.


cd `dirname $BASH_SOURCE`

. ./assert.sh

echo SETUP: stop node process, if it\'s running
echo running a single app, test that the app restarts correctly.
kill -9 `pidof node` || true

echo testing

node ../index.js --env test &

sleep 1

pushd ../examples/updateme/master


#make a unique value in the status file
date +%s > status

curl -sS localhost:9090/update/$PWD
sleep 1

assert diff <(curl -sS localhost:8080 -H 'host: update.me') status
echo $?

# restart the app

# hmm, should make a command cli that restarts this
# it would just call curl, but could enable more flexibility.
# it's probably time for a better name.

#update the status
date +%s > status

#restart the app
curl -sS localhost:9090/restart/$PWD
sleep 1

assert diff <(curl -sS localhost:8080 -H 'host: update.me') status

echo TEARDOWN: stop node process, if it\'s running
kill -9 `pidof node`
