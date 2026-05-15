#!/bin/bash
# Persistent production server runner
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

# Kill existing
pkill -f "next" 2>/dev/null || true
pkill -f "server.js" 2>/dev/null || true
sleep 2

# Start production server in background
nohup node .next/standalone/server.js > /home/z/my-project/server.log 2>&1 &
echo $! > /home/z/my-project/.next-dev.pid
echo "Production server started with PID: $(cat /home/z/my-project/.next-dev.pid)"

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "Server is ready on http://127.0.0.1:3000/"
    exit 0
  fi
  sleep 1
done
echo "Server failed to start within 30 seconds"
exit 1
