module.exports = {
  apps: [{
    name: 'next-app',
    script: './.next/standalone/server.js',
    env: {
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production'
    },
    max_restarts: 100,
    restart_delay: 3000,
    autorestart: true,
    max_memory_restart: '500M',
    kill_timeout: 5000,
    listen_timeout: 10000,
  }]
};
