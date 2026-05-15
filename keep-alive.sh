#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

# Rotate logs if too big
if [ -f /home/z/my-project/server.log ] && [ $(wc -c < /home/z/my-project/server.log 2>/dev/null) -gt 1048576 ]; then
  tail -100 /home/z/my-project/server.log > /home/z/my-project/server.log.tmp
  mv /home/z/my-project/server.log.tmp /home/z/my-project/server.log
fi

while true; do
  node .next/standalone/server.js 2>&1 >> /home/z/my-project/server.log
  echo "[$(date)] Server exited (code $?), restarting in 3s..." >> /home/z/my-project/server.log
  sleep 3
done
