#!/usr/bin/env bash

### BEGIN INIT INFO
# Provides:		split-testing-balancer
# Required-Start:	$syslog $remote_fs
# Required-Stop:	$syslog $remote_fs
# Should-Start:		$local_fs
# Should-Stop:		$local_fs
# Default-Start:	2 3 4 5
# Default-Stop:		0 1 6
# Short-Description:	split testing balancer for nodejs
# Description:		split testing balancer for nodejs
### END INIT INFO


#
# this is a ugly hack that uses globals, and assumes that all node processes 
# are children of the balancer. 
# I've done it this way after struggling with pids and processes and found that
# it's a messy problem. 
# this should be reliable and effective as long as it's used as intended.
# --Dominic (5-12-2011)
#
. ~/.nvm/nvm.sh

cont () {
  mkdir -p ~/logs
  dif=2
  restarts=0
  echo $$ > pid

  while test -e pid && [ $dif -ge 2 ]; do 
    let restarts="$restarts"+1
    start=`date +%s`
    echo "starting balancer for $restarts time " `date` 

    echo $$ > pid
    #swap for npm start ? ... will be the only thing to couple to node
    node ./index.js "$@"  >> ~/logs/balancer.out.log 2>> ~/logs/balancer.err.log
    stop=`date +%s`
    dif=$(($stop - $start))

    # echo the stderr to show the 
    tail ~/logs/balancer.err.log

  done

  echo exited in $dif seconds, bailing out >&2
  rm -f pid 
  kill -9 `pidof node`
  echo balancer exited `date` >> ~/logs/balancer.out.log 

}

start () {
  #if pid exists, balancer is already running.
  if [ -e pid ] ; then 
    echo already running
    exit 1
  else
    cat pid
    pwd
  fi
  shift
  cont "$@" &
}

stop () {

  if [ -e pid ] ; then 
    rm -f pid
    echo stopping balancer...
    kill -9 `pidof node`
  else
    echo already stopped
  fi

}

setup () {

  OLD=$PWD
  pushd /etc/rc2.d
  ln -s $OLD/start.sh S99balancer
  popd
  
} 

restart () {
  stop
  sleep 1
  start
}

"$@" ##run start or stop
