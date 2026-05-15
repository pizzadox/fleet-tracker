#!/bin/bash
# Immortal server - keeps Next.js running no matter what
# This script monitors and restarts the server continuously

cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

LOG="/home/z/my-project/server.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

start_server() {
  # Kill anything on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 1

  # Start server
  node .next/standalone/server.js >> "$LOG" 2>&1 &
  SERVER_PID=$!
  log "Started server PID=$SERVER_PID"
  echo "$SERVER_PID" > /home/z/my-project/.server-pid
  return $SERVER_PID
}

# Main loop
log "Immortal server monitor started (PID=$$)"
while true; do
  # Check if server is responding
  if ! curl -s -o /dev/null -m 5 http://localhost:3000/ 2>/dev/null; then
    log "Server not responding, starting..."
    start_server
    sleep 5
    
    # Verify it started
    if curl -s -o /dev/null -m 5 http://localhost:3000/ 2>/dev/null; then
      log "Server is now responding"
    else
      log "Server failed to start, will retry in 10s"
      sleep 10
    fi
  else
    # Server is up, check periodically
    sleep 15
  fi
done
