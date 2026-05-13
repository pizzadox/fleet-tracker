#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

while true; do
  node .next/standalone/server.js 2>&1 | while IFS= read -r line; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') $line" >> /tmp/persist-server.log
  done
  echo "$(date '+%Y-%m-%d %H:%M:%S') Server exited, restarting in 1s..." >> /tmp/persist-server.log
  sleep 1
done
