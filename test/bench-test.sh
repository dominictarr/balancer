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

pushd ../examples/helloworld/master

curl -sS localhost:9090/update/$PWD

sleep 1

ab -n 100 -c 5 -H 'host: helloworld.com' -v 1 http://localhost:8080/


kill -9 `pidof node`
