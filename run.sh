#!/bin/bash
# Persistent server runner
cd /home/z/my-project

# Kill existing
pkill -f "next" 2>/dev/null || true
sleep 2

# Create a PID file
PIDFILE=/home/z/my-project/.next-dev.pid

# Start server in background
nohup node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 > /home/z/my-project/next.log 2>&1 &
echo $! > "$PIDFILE"
echo "Server started with PID: $(cat $PIDFILE)"

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
