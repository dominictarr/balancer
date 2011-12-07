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
echo $PWD
#cd "$BASH_SOURCE"
cont () {
  dif=2
  while test -e pid && [ $dif -ge 2 ]; do 
    echo starting balancer... `date`
    start=`date +%s`
    node ./index "$@"  >> ~/logs/balancer.out.log 2>> ~/logs/balancer.err.log
    stop=`date +%s`
    dif=$(($stop - $start))
    #echo $start - $stop = $dif
    tail ~/logs/balancer.err.log
    sleep 1 # if it crashed, spin slowly, so don't hog CPU
    # would be better to detect spinning...
  done
  [ $dif -lt 2 ] && echo exited in $dif seconds >&2
  rm -f pid 
  echo balancer exited `date` >> ~/logs/balancer.out.log 
}

start () {
  #if pid exists, balancer is already running.
  if [ -e pid ] ; then 
    echo already running
    exit 1
  else
    echo $$ > pid
  fi
  shift
  mkdir -p ~/logs
  cont "$@" &
}

stop () {
  if [ -e pid ] ; then 
  rm -f pid
  echo stopping balancer...
  kill -9 `pidof node`
  fi
}

setup () {
  OLD="$PWD"
  cd /etc/rc2.d
  ln -s $OLD/start.sh S99balancer
  cd $OLD
  git config --add receive.denyCurrentBranch ignore
  cd .git/hooks
  ln -s post-receive $OLD
} 

restart () {
  stop
  start
}

"$@" ##run start or stop
