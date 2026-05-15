#!/usr/bin/env node
// Persistent server launcher with auto-restart
const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, '.next/standalone/server.js');
const MAX_RESTARTS = 50;
let restarts = 0;

function startServer() {
  if (restarts >= MAX_RESTARTS) {
    console.error(`[launcher] Max restarts (${MAX_RESTARTS}) reached. Exiting.`);
    process.exit(1);
  }

  restarts++;
  console.log(`[launcher] Starting server (attempt ${restarts})...`);

  const server = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  server.on('exit', (code, signal) => {
    console.log(`[launcher] Server exited with code=${code} signal=${signal}. Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  server.on('error', (err) => {
    console.error(`[launcher] Failed to start server:`, err.message);
    setTimeout(startServer, 2000);
  });
}

// Handle signals
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

startServer();
