#!/usr/bin/env node
// Persistent server launcher that survives agent session disconnects
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_PATH = path.join(__dirname, '.next/standalone/server.js');
const LOG_PATH = path.join(__dirname, 'server.log');
const PID_PATH = path.join(__dirname, '.server-pid');

let restarts = 0;
const MAX_RESTARTS = 1000;

// Ignore signals that would kill the launcher
process.on('SIGHUP', () => { /* ignore */ });
process.on('SIGINT', () => { /* ignore - don't die */ });
process.on('SIGTERM', () => { /* ignore - don't die */ });

function log(msg) {
  const line = `[${new Date().toISOString()}] [launcher] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(line.trim());
}

function startServer() {
  if (restarts >= MAX_RESTARTS) {
    log(`Max restarts (${MAX_RESTARTS}) reached. Waiting 60s then resetting counter.`);
    setTimeout(() => { restarts = 0; startServer(); }, 60000);
    return;
  }

  restarts++;
  log(`Starting server (attempt ${restarts})...`);

  const server = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0', NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });

  // Write PID file
  fs.writeFileSync(PID_PATH, String(server.pid));

  server.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_PATH, data);
    process.stdout.write(data);
  });

  server.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_PATH, data);
    process.stderr.write(data);
  });

  server.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}. Restarting in 5s...`);
    setTimeout(startServer, 5000);
  });

  server.on('error', (err) => {
    log(`Failed to start server: ${err.message}. Retrying in 5s...`);
    setTimeout(startServer, 5000);
  });
}

log('Persistent launcher started');
startServer();
