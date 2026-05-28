#!/usr/bin/env node
/**
 * Setup production database with only admin user (PIN: 1234)
 * Usage: node scripts/setup-prod-db.js
 */

const { execSync } = require('child_process')
const path = require('path')

const prodDbPath = path.join(process.cwd(), 'db', 'production.db')
const dbUrl = `file:${prodDbPath}`

console.log(`📦 Setting up production database...`)
console.log(`   Path: ${prodDbPath}`)
console.log(`   URL: ${dbUrl}`)
console.log()

const env = { ...process.env, DATABASE_URL: dbUrl }

try {
  console.log('🔄 Pushing schema...')
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env,
    stdio: 'inherit',
  })
  console.log('✅ Schema pushed')

  console.log('🌱 Seeding admin user...')
  execSync('bunx tsx prisma/seed.ts', {
    env,
    stdio: 'inherit',
  })
  console.log('✅ Production database ready!')
  console.log()
  console.log('   Login: Администратор')
  console.log('   PIN:  1234')
} catch (err) {
  console.error('❌ Failed to setup production database:', err.message)
  process.exit(1)
}
