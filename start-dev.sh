#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start the server
exec npx next dev -p 3000 -H 0.0.0.0 2>&1
