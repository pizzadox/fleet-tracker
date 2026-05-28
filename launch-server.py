#!/usr/bin/env python3
"""Double-fork daemon launcher for Next.js standalone server.

Ensures the server process survives agent session disconnections
by reparenting it to PID 1 (tini/init).
"""
import os
import sys
import signal

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_BIN = os.path.join(PROJECT_DIR, ".next", "standalone", "server.js")
LOG_FILE = os.path.join(PROJECT_DIR, "server.log")
PID_FILE = os.path.join(PROJECT_DIR, ".server-pid")
PORT = 3000

def write_pid(path, pid):
    with open(path, "w") as f:
        f.write(str(pid))

def daemonize():
    # First fork
    pid = os.fork()
    if pid > 0:
        # Parent waits briefly then exits
        os._exit(0)

    # First child — become session leader
    os.setsid()

    # Second fork
    pid = os.fork()
    if pid > 0:
        os._exit(0)

    # Second child — the actual daemon
    os.chdir(PROJECT_DIR)
    os.umask(0)

    # Close standard file descriptors
    sys.stdout.flush()
    sys.stderr.flush()
    devnull = os.open(os.devnull, os.O_RDWR)
    os.dup2(devnull, 0)
    log_fd = os.open(LOG_FILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, 1)
    os.dup2(log_fd, 2)
    os.close(devnull)
    if log_fd > 2:
        os.close(log_fd)

def main():
    # Kill previous server if running
    # 1. Try PID file first
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
                old_pid = int(f.read().strip())
            os.kill(old_pid, signal.SIGTERM)
            print(f"Killed previous server (PID {old_pid})")
            import time
            time.sleep(1)
        except (ProcessLookupError, ValueError, FileNotFoundError):
            pass
        os.remove(PID_FILE)

    # 2. Also kill any orphaned node server processes on port 3000
    import subprocess, time
    try:
        result = subprocess.run(
            ["fuser", str(PORT) + "/tcp"],
            capture_output=True, text=True, timeout=5
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split()
            for pid_str in pids:
                try:
                    os.kill(int(pid_str), signal.SIGKILL)
                    print(f"Killed orphaned process on port {PORT} (PID {pid_str})")
                except (ProcessLookupError, ValueError):
                    pass
            time.sleep(1)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    daemonize()

    # Write PID
    write_pid(PID_FILE, os.getpid())

    # Set environment
    os.environ["PORT"] = str(PORT)
    os.environ["HOSTNAME"] = "0.0.0.0"
    os.environ["NODE_ENV"] = "production"

    # DATABASE_URL: always use dev.db for local server (with demo data)
    # For deployed production, start.sh sets DATABASE_URL to production.db
    db_path = os.path.join(PROJECT_DIR, "db", "dev.db")
    if os.path.exists(db_path):
        os.environ["DATABASE_URL"] = f"file:{db_path}"
    else:
        # Fallback: read from .env file
        env_path = os.path.join(PROJECT_DIR, ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL="):
                        os.environ["DATABASE_URL"] = line.split("=", 1)[1]
                        break

    # Exec the Node.js server (replaces the Python process)
    os.execvp("node", ["node", SERVER_BIN])

if __name__ == "__main__":
    main()
