#!/usr/bin/env python3
"""Persistent server launcher using double-fork daemon technique.
The server process is adopted by PID 1 (tini/init) and survives
agent session disconnects."""
import os, sys, time, shutil, subprocess

PROJECT_DIR = "/home/z/my-project"
SERVER_LOG = os.path.join(PROJECT_DIR, "server.log")
PID_FILE = os.path.join(PROJECT_DIR, ".server-pid")
STANDALONE_DIR = os.path.join(PROJECT_DIR, ".next", "standalone")
MAX_RESTARTS = 1000
RESTART_DELAY = 5

def write_pid():
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))

def log(msg):
    with open(SERVER_LOG, 'a') as f:
        f.write(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] [daemon] {msg}\n')

def ensure_static_files():
    """Copy static files and public directory to standalone output.
    Next.js standalone build doesn't include these by default."""
    try:
        src_static = os.path.join(PROJECT_DIR, ".next", "static")
        dst_static = os.path.join(STANDALONE_DIR, ".next", "static")
        if os.path.exists(src_static) and not os.path.exists(dst_static):
            shutil.copytree(src_static, dst_static)
            log("Copied .next/static to standalone/.next/static")

        src_public = os.path.join(PROJECT_DIR, "public")
        dst_public = os.path.join(STANDALONE_DIR, "public")
        if os.path.exists(src_public) and not os.path.exists(dst_public):
            shutil.copytree(src_public, dst_public)
            log("Copied public to standalone/public")
    except Exception as e:
        log(f"Warning: could not copy static files: {e}")

def build_if_needed():
    """Build the project if standalone server doesn't exist."""
    server_js = os.path.join(STANDALONE_DIR, "server.js")
    if not os.path.exists(server_js):
        log("Standalone server not found, building...")
        subprocess.run(["npx", "next", "build"], cwd=PROJECT_DIR, capture_output=True)
        ensure_static_files()
        log("Build completed")

def run_server():
    restarts = 0
    while restarts < MAX_RESTARTS:
        restarts += 1
        ensure_static_files()
        log(f'Starting server (attempt {restarts})...')
        env = os.environ.copy()
        env["PORT"] = "3000"
        env["HOSTNAME"] = "0.0.0.0"
        env["NODE_ENV"] = "production"
        try:
            ret = subprocess.run(
                ["node", os.path.join(STANDALONE_DIR, "server.js")],
                cwd=STANDALONE_DIR,
                env=env,
                stdout=open(SERVER_LOG, 'a'),
                stderr=subprocess.STDOUT
            )
            log(f'Server exited with code {ret.returncode}, restarting in {RESTART_DELAY}s...')
        except Exception as e:
            log(f'Server start failed: {e}, restarting in {RESTART_DELAY}s...')
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

    # Ensure static files exist before running
    ensure_static_files()
    run_server()

if __name__ == '__main__':
    daemonize()
