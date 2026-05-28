#!/bin/bash

exec 2>&1
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXTJS_PROJECT_DIR="/home/z/my-project"

if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "❌ 错误: Next.js 项目目录不存在: $NEXTJS_PROJECT_DIR"
    exit 1
fi

echo "🚀 开始构建 Next.js 应用..."
cd "$NEXTJS_PROJECT_DIR" || exit 1

export NEXT_TELEMETRY_DISABLED=1

BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"
echo "📁 构建目录: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 安装依赖
echo "📦 安装依赖..."
bun install

# 生成 Prisma 客户端
echo "📦 生成 Prisma 客户端..."
npx prisma generate

# 构建 Next.js (next.config.ts патчит bundler на webpack)
echo "🔨 构建 Next.js..."
rm -rf .next
npx next build

# ── Копируем файлы в standalone ──
echo "📦 Копируем статические файлы в standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cp Caddyfile .next/standalone/
cp .env.production .next/standalone/
rm -f .next/standalone/.env
mkdir -p .next/standalone/db
cp db/production.db .next/standalone/db/production.db

# ── Собираем пакет для развёртывания ──
echo "📦 收集构建产物到 $BUILD_DIR..."

# Standalone сервер (включает минимальные node_modules)
cp -r .next/standalone "$BUILD_DIR/next-service-dist/"

# Статика (дубль для Caddy прямой отдачи)
mkdir -p "$BUILD_DIR/next-service-dist/.next"
cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"

# Public (дубль для Caddy)
cp -r public "$BUILD_DIR/next-service-dist/"

# База данных
mkdir -p "$BUILD_DIR/db"
cp db/production.db "$BUILD_DIR/db/production.db"

# Caddyfile
cp Caddyfile "$BUILD_DIR/"

# start.sh
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

# Проверка
echo "📊 Проверка standalone сборки..."
echo "  server.js: $(ls -la .next/standalone/server.js 2>/dev/null | awk '{print $5}' || echo 'MISSING') bytes"
echo "  chunks:    $(ls .next/standalone/.next/static/chunks/app/page-*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'MISSING')"
echo "  css:       $(ls .next/standalone/.next/static/css/*.css 2>/dev/null | wc -l) files"
echo "  db:        $(ls -la .next/standalone/db/production.db 2>/dev/null | awk '{print $5}' || echo 'MISSING') bytes"
echo "  env:       $(cat .next/standalone/.env.production 2>/dev/null || echo 'MISSING')"

# mini-services (если есть)
if [ -d "$NEXTJS_PROJECT_DIR/mini-services" ]; then
    echo "🔨 构建 mini-services..."
    sh "$SCRIPT_DIR/mini-services-install.sh"
    sh "$SCRIPT_DIR/mini-services-build.sh"
    cp "$SCRIPT_DIR/mini-services-start.sh" "$BUILD_DIR/mini-services-start.sh"
    chmod +x "$BUILD_DIR/mini-services-start.sh"
fi

# Пакуем
PACKAGE_FILE="${BUILD_DIR}.tar.gz"
echo "📦 打包到 $PACKAGE_FILE..."
cd "$BUILD_DIR" || exit 1
tar -czf "$PACKAGE_FILE" .
cd - > /dev/null || exit 1

echo "✅ 构建完成！"
ls -lh "$PACKAGE_FILE"
