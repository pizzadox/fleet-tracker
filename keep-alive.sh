#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
while true; do
  npx next dev -p 3000 -H 0.0.0.0 2>&1 >> /home/z/my-project/dev.log
  echo "[$(date)] Server crashed, restarting..." >> /home/z/my-project/dev.log
  sleep 2
done
