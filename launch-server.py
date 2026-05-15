#!/usr/bin/env python3
"""Persistent server launcher using double-fork daemon technique.
The server process is adopted by PID 1 (tini/init) and survives
agent session disconnects."""
import os, sys, time, signal

SERVER_LOG = "/home/z/my-project/server.log"
PID_FILE = "/home/z/my-project/.server-pid"
SERVER_CMD = "cd /home/z/my-project && PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js"
MAX_RESTARTS = 1000
RESTART_DELAY = 5

def write_pid():
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))

def log(msg):
    with open(SERVER_LOG, 'a') as f:
        f.write(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] [daemon] {msg}\n')

def run_server():
    restarts = 0
    while restarts < MAX_RESTARTS:
        restarts += 1
        log(f'Starting server (attempt {restarts})...')
        ret = os.system(SERVER_CMD)
        log(f'Server exited with code {ret}, restarting in {RESTART_DELAY}s...')
        time.sleep(RESTART_DELAY)
    log(f'Max restarts reached, re-executing self...')
    os.execv(sys.executable, [sys.executable] + sys.argv)

def daemonize():
    # First fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)  # Parent exits
    except OSError as e:
        sys.exit(1)

    # Become session leader
    os.setsid()

    # Second fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)  # Child exits
    except OSError as e:
        sys.exit(1)

    # Grandchild - adopted by PID 1
    os.chdir('/')
    os.umask(0)
    
    # Close standard file descriptors
    sys.stdout.flush()
    sys.stderr.flush()
    si = open(os.devnull, 'r')
    so = open(os.devnull, 'a+')
    se = open(os.devnull, 'a+')
    os.dup2(si.fileno(), sys.stdin.fileno())
    os.dup2(so.fileno(), sys.stdout.fileno())
    os.dup2(se.fileno(), sys.stderr.fileno())

    write_pid()
    log(f'Daemon started with PID {os.getpid()}, PPID {os.getppid()}')
    run_server()

if __name__ == '__main__':
    daemonize()
