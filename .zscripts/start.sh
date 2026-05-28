#!/bin/sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

pids=""

cleanup() {
    echo ""
    echo "🛑 正在关闭所有服务..."
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
        fi
    done
    sleep 1
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null
        fi
    done
    echo "✅ 所有服务已关闭"
    exit 0
}

echo "🚀 启动服务..."
cd "$BUILD_DIR" || exit 1

# ── Next.js (standalone server.js) ──
if [ -f "./next-service-dist/server.js" ]; then
    echo "🚀 启动 Next.js (standalone)..."
    cd next-service-dist/ || exit 1

    export NODE_ENV=production
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    export DATABASE_URL="${DATABASE_URL:-file:./db/production.db}"

    echo "   PORT=$PORT"
    echo "   DATABASE_URL=$DATABASE_URL"

    node server.js &
    NEXT_PID=$!
    pids="$NEXT_PID"

    sleep 2
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "❌ Next.js 启动失败"
        exit 1
    fi
    echo "✅ Next.js 已启动 (PID: $NEXT_PID)"

    cd ../
else
    echo "❌ 未找到 next-service-dist/server.js"
    exit 1
fi

# ── mini-services ──
if [ -f "./mini-services-start.sh" ]; then
    sh ./mini-services-start.sh &
    pids="$pids $!"
fi

# ── Caddy ──
if [ -f "./Caddyfile" ]; then
    echo "🚀 启动 Caddy..."
    exec caddy run --config Caddyfile --adapter caddyfile
else
    echo "⚠️  Caddyfile 不存在"
    wait
fi
