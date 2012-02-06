#!/usr/bin/env bash


#  okay this test is for actually running the balancer with actual apps, and different types of errors.


cd `dirname $BASH_SOURCE`

. ./assert.sh

echo "#SETUP: stop node process, if it\'s running"
echo "#running a single app, test that the app restarts correctly."
kill -9 `pidof node` || true

echo testing

node ../index.js --env test 2> /dev/null &

sleep 1

pushd ../examples/crashable/master

curl -sS localhost:9090/update/$PWD
sleep 1

assert diff <(curl -sS localhost:8080 -H 'host: crashable.com') <(echo -n 'OKAY')

echo '#the balancer should respond an error when the app crashes'

curl localhost:8080/crash -H 'host: crashable.com' -w code=%{http_code} | grep -o --color=no code=500 > /tmp/grep500
cat /tmp/grep500
assert diff /tmp/grep500 <(echo code=500)

echo '#the balancer should restart the app after it crashes'

sleep 1
assert diff <(curl -sS localhost:8080 -H 'host: crashable.com') <(echo -n 'OKAY')


echo TEARDOWN: stop node process, if it\'s running
kill -9 `pidof node`
