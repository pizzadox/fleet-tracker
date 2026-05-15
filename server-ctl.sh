#!/bin/bash
# Server control script for the Next.js equipment tracker

cd /home/z/my-project
PID_FILE=".server-pid"

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "Server daemon is already running (PID: $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Starting server daemon..."
    python3 /home/z/my-project/launch-server.py
    sleep 3
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      echo "Server started successfully on http://localhost:3000/"
    else
      echo "Server may still be starting..."
    fi
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      DAEMON_PID=$(cat "$PID_FILE")
      echo "Stopping daemon (PID: $DAEMON_PID)..."
      kill "$DAEMON_PID" 2>/dev/null
      rm -f "$PID_FILE"
    fi
    # Kill any server processes
    fuser -k 3000/tcp 2>/dev/null
    echo "Server stopped"
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "Daemon: RUNNING (PID: $(cat "$PID_FILE"))"
    else
      echo "Daemon: STOPPED"
    fi
    if curl -s -o /dev/null -m 3 http://localhost:3000/ 2>/dev/null; then
      echo "Server: RESPONDING on :3000"
    else
      echo "Server: NOT RESPONDING"
    fi
    ;;
  log)
    tail -20 /home/z/my-project/server.log
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|log}"
    exit 1
    ;;
esac
