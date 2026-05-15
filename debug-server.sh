#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

cleanup() {
  echo "[$(date)] CAUGHT SIGNAL: $1 - Server killed!" >> /home/z/my-project/server-death.log
}

trap 'cleanup SIGTERM' SIGTERM
trap 'cleanup SIGINT' SIGINT
trap 'cleanup SIGHUP' SIGHUP
trap 'cleanup SIGKILL' SIGKILL 2>/dev/null

echo "[$(date)] Starting server with PID $$" >> /home/z/my-project/server-death.log
node .next/standalone/server.js 2>&1
echo "[$(date)] Server exited with code: $?" >> /home/z/my-project/server-death.log
