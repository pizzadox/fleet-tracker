#!/bin/bash
cd /home/z/my-project
while true; do
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
  echo "Server died, restarting in 2s..."
  sleep 2
done
