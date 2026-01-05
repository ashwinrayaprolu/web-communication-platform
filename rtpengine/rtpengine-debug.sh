#!/bin/sh
# Helper script for debugging RTPEngine

case "$1" in
  list)
    echo "list" | nc -u 127.0.0.1 22222
    ;;
  query)
    echo "query $2" | nc -u 127.0.0.1 22222
    ;;
  ping)
    echo "ping" | nc -u 127.0.0.1 22222
    ;;
  stats)
    echo "list" | nc -u 127.0.0.1 22222
    ;;
  capture)
    tcpdump -i any -n "udp and portrange 30000-30100" -c ${2:-50}
    ;;
  *)
    echo "Usage: $0 {list|query CALLID|ping|stats|capture [count]}"
    exit 1
    ;;
esac