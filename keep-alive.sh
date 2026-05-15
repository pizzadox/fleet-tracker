#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
while true; do
  node .next/standalone/server.js 2>&1 >> /home/z/my-project/server.log
  echo "[$(date)] Server crashed, restarting..." >> /home/z/my-project/server.log
  sleep 2
done
