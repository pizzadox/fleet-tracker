#!/usr/bin/env node
/**
 * Setup development database with demo data
 * Usage: node scripts/setup-dev-db.js
 */

const { execSync } = require('child_process')

console.log(`📦 Setting up development database with demo data...`)
console.log()

try {
  console.log('🔄 Pushing schema...')
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
  })
  console.log('✅ Schema pushed')

  console.log('🌱 Seeding demo data...')
  execSync('bunx tsx prisma/seed-demo.ts', {
    stdio: 'inherit',
  })
  console.log('✅ Development database ready!')
} catch (err) {
  console.error('❌ Failed to setup development database:', err.message)
  process.exit(1)
}
