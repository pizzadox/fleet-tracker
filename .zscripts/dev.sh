#!/bin/bash

set -euo pipefail

# Получить каталог скрипта
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
        local step_name="$1"
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
        echo "=========================================="
        export STEP_START_TIME
        STEP_START_TIME=$(date +%s)
}

log_step_end() {
        local step_name="${1:-Unknown step}"
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - STEP_START_TIME))
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
        echo "[LOG] Step: $step_name | Duration: ${duration}s"
        echo "=========================================="
        echo ""
}

wait_for_service() {
        local host="$1"
        local port="$2"
        local service_name="$3"
        local max_attempts="${4:-60}"
        local attempt=1

        echo "Waiting for $service_name to be ready on $host:$port..."

        while [ "$attempt" -le "$max_attempts" ]; do
                if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
                        echo "$service_name is ready!"
                        return 0
                fi

                echo "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting..."
                sleep 1
                attempt=$((attempt + 1))
        done

        echo "ERROR: $service_name failed to start within $max_attempts seconds"
        return 1
}

cd "$PROJECT_DIR"

# Явно устанавливаем DATABASE_URL для dev.db (с демо-данными)
# Это перекрывает любое значение из системного окружения
export DATABASE_URL="file:$PROJECT_DIR/db/dev.db"
echo "[ENV] DATABASE_URL=$DATABASE_URL"

# Установить зависимости если нужно
if [ -f "package.json" ]; then
        log_step_start "npm install"
        echo "[NPM] Installing dependencies..."
        npm install --legacy-peer-deps 2>/dev/null || true
        log_step_end "npm install"
fi

# Патчим bundler ПОСЛЕ install (next.config.ts делает это при загрузке,
# но npm install может перезаписать файл)
log_step_start "Patch bundler"
echo "[PATCH] Forcing webpack bundler..."
node -e "
const fs = require('fs');
const path = require('path');
const bundlerPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'lib', 'bundler.js');
if (!fs.existsSync(bundlerPath)) { console.log('bundler.js not found'); process.exit(0); }
let content = fs.readFileSync(bundlerPath, 'utf8');
if (content.includes('Force Webpack instead of Turbopack')) { console.log('Already patched'); process.exit(0); }
const pattern = /if \\(bundlerFlags\\.size === 0\\) \\{[\\s\\S]*?return\\s+0\\s*;/;
if (pattern.test(content)) {
  content = content.replace(pattern, 'if (bundlerFlags.size === 0) {\\n    return 1;  // Force Webpack instead of Turbopack (patched)');
  fs.writeFileSync(bundlerPath, content, 'utf8');
  console.log('Patched bundler to use Webpack');
} else { console.log('Pattern not found, skipping'); }
"
log_step_end "Patch bundler"

# Настроить базу данных
if [ -f "prisma/schema.prisma" ]; then
        log_step_start "prisma db push"
        echo "[PRISMA] Setting up database..."
        npx prisma db push --accept-data-loss 2>/dev/null || true
        npx prisma generate 2>/dev/null || true
        log_step_end "prisma db push"
fi

# Собрать production build
# ВСЕГДА пересобираем чтобы гарантировать актуальный билд
log_step_start "next build"
echo "[NEXT] Building production server (webpack)..."
rm -rf .next
npx next build --webpack 2>&1 || true
log_step_end "next build"

# Копировать статику и public для standalone сервера
log_step_start "Copying static assets"
if [ -d ".next/static" ] && [ -d ".next/standalone/.next" ]; then
        rm -rf .next/standalone/.next/static 2>/dev/null
        cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
        echo "[SETUP] Copied .next/static -> .next/standalone/.next/static"
fi
if [ -d "public" ] && [ -d ".next/standalone" ]; then
        rm -rf .next/standalone/public 2>/dev/null
        cp -r public .next/standalone/ 2>/dev/null || true
        echo "[SETUP] Copied public -> .next/standalone/public"
fi
if [ -f "Caddyfile" ] && [ -d ".next/standalone" ]; then
        cp Caddyfile .next/standalone/ 2>/dev/null || true
        echo "[SETUP] Copied Caddyfile -> .next/standalone/"
fi
if [ -f ".env.production" ] && [ -d ".next/standalone" ]; then
        cp .env.production .next/standalone/ 2>/dev/null || true
        rm -f .next/standalone/.env 2>/dev/null || true
        echo "[SETUP] Copied .env.production -> .next/standalone/"
fi
if [ -d ".next/standalone" ] && [ -f "db/production.db" ]; then
        mkdir -p .next/standalone/db 2>/dev/null
        cp db/production.db .next/standalone/db/production.db 2>/dev/null || true
        echo "[SETUP] Copied db/production.db -> .next/standalone/db/"
fi
log_step_end "Copying static assets"

log_step_start "Starting Next.js production server"
echo "[SERVER] Starting production server daemon..."

# Запуск через double-fork daemon (python3 launch-server.py)
if [ -f "$PROJECT_DIR/launch-server.py" ]; then
        python3 "$PROJECT_DIR/launch-server.py"
        log_step_end "Starting Next.js production server"

        # Дождаться запуска сервера
        wait_for_service "localhost" "3000" "Next.js production server" 30

        log_step_start "Health check"
        curl -fsS localhost:3000 >/dev/null 2>/dev/null && echo "Health check passed" || echo "Health check warning"
        log_step_end "Health check"
else
        # Fallback: прямой запуск с автоперезапуском
        echo "[SERVER] Daemon launcher not found, using direct start with restart loop..."
        RESTART_COUNT=0
        MAX_RESTARTS=500
        SERVER_LOG="$PROJECT_DIR/server.log"

        while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
                RESTART_COUNT=$((RESTART_COUNT + 1))
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting server (attempt $RESTART_COUNT)..." >> "$SERVER_LOG"
                PORT=3000 HOSTNAME=0.0.0.0 DATABASE_URL="file:$PROJECT_DIR/db/dev.db" node .next/standalone/server.js >> "$SERVER_LOG" 2>&1
                EXIT_CODE=$?
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited with code $EXIT_CODE, restarting in 5s..." >> "$SERVER_LOG"
                sleep 5
        done
fi
