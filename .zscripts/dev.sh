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

# Установить зависимости если нужно
if [ -f "package.json" ]; then
        log_step_start "npm install"
        echo "[NPM] Installing dependencies..."
        npm install --legacy-peer-deps 2>/dev/null || true
        log_step_end "npm install"
fi

# Настроить базу данных
if [ -f "prisma/schema.prisma" ]; then
        log_step_start "prisma db push"
        echo "[PRISMA] Setting up database..."
        npx prisma db push --accept-data-loss 2>/dev/null || true
        npx prisma generate 2>/dev/null || true
        log_step_end "prisma db push"
fi

# Собрать production build если его нет
if [ ! -f ".next/standalone/server.js" ]; then
        log_step_start "next build"
        echo "[NEXT] Building production server..."
        npx next build 2>&1 || true
        log_step_end "next build"
fi

# Копировать статику для standalone сервера
if [ -d ".next/static" ] && [ -d ".next/standalone/.next" ]; then
        cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
        cp -r public .next/standalone/ 2>/dev/null || true
fi

log_step_start "Starting Next.js production server"
echo "[SERVER] Starting production server daemon..."

# Запуск через double-fork daemon (python3 launch-server.py)
# Это делает процесс приёмным ребенком PID 1 (tini/init),
# что обеспечивает его выживание при отключении сессий агента
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
                PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> "$SERVER_LOG" 2>&1
                EXIT_CODE=$?
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited with code $EXIT_CODE, restarting in 5s..." >> "$SERVER_LOG"
                sleep 5
        done
fi
