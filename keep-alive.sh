#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

# Kill any existing server on port 3000 to avoid conflicts
EXISTING_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
  echo "[$(date)] Killing existing process on port 3000: $EXISTING_PID" >> /home/z/my-project/server.log
  kill -9 $EXISTING_PID 2>/dev/null
  sleep 2
fi

# Rotate logs if too big
if [ -f /home/z/my-project/server.log ] && [ $(wc -c < /home/z/my-project/server.log 2>/dev/null) -gt 1048576 ]; then
  tail -100 /home/z/my-project/server.log > /home/z/my-project/server.log.tmp
  mv /home/z/my-project/server.log.tmp /home/z/my-project/server.log
fi

echo "[$(date)] Starting keep-alive monitor..." >> /home/z/my-project/server.log

while true; do
  # Check if port is already in use
  PORT_CHECK=$(lsof -ti:3000 2>/dev/null)
  if [ -n "$PORT_CHECK" ]; then
    echo "[$(date)] Port 3000 already in use (PID: $PORT_CHECK), skipping start" >> /home/z/my-project/server.log
    sleep 5
    continue
  fi

  node .next/standalone/server.js 2>&1 >> /home/z/my-project/server.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited (code $EXIT_CODE), restarting in 5s..." >> /home/z/my-project/server.log
  sleep 5
done
