#!/bin/bash

exec 2>&1
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXTJS_PROJECT_DIR="/home/z/my-project"

if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "❌ Next.js 项目目录不存在: $NEXTJS_PROJECT_DIR"
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

# Патчим bundler ПОСЛЕ install
echo "📦 Patching bundler to force webpack..."
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
} else { console.log('Pattern not found'); }
"

# 生成 Prisma 客户端
echo "📦 生成 Prisma 客户端..."
npx prisma generate

# 构建 Next.js (ЯВНО --webpack!)
echo "🔨 构建 Next.js (webpack)..."
rm -rf .next
npx next build --webpack

# ── Копируем файлы в standalone ──
echo "📦 Копируем статические файлы в standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cp Caddyfile .next/standalone/
cp .env.production .next/standalone/
rm -f .next/standalone/.env
mkdir -p .next/standalone/db
cp db/production.db .next/standalone/db/production.db

# ── Собираем пакет ──
echo "📦 收集构建产物..."
cp -r .next/standalone "$BUILD_DIR/next-service-dist/"
cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"
cp -r public "$BUILD_DIR/next-service-dist/"
mkdir -p "$BUILD_DIR/db"
cp db/production.db "$BUILD_DIR/db/production.db"
cp Caddyfile "$BUILD_DIR/"
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

# Проверка
echo "📊 Проверка сборки..."
echo "  Build ID: $(cat .next/BUILD_ID)"
echo "  Page chunk: $(ls .next/standalone/.next/static/chunks/app/page-*.js 2>/dev/null | xargs basename || echo 'MISSING')"
echo "  CSS files: $(ls .next/standalone/.next/static/css/*.css 2>/dev/null | wc -l)"
echo "  DB: $(ls -la .next/standalone/db/production.db 2>/dev/null | awk '{print $5}' || echo '0') bytes"

# mini-services
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
