#!/bin/bash
cd /home/z/my-project

# Start server with PM2 (auto-restart on crash)
npx pm2 start .next/standalone/server.js \
  --name "next-app" \
  --env PORT=3000 \
  --env HOSTNAME=0.0.0.0 \
  --cwd /home/z/my-project

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "Server is ready on http://127.0.0.1:3000/"
    npx pm2 save
    exit 0
  fi
  sleep 1
done
echo "Server failed to start within 30 seconds"
npx pm2 logs next-app --lines 20
exit 1
