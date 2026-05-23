import { db } from '@/lib/db'
import crypto from 'crypto'

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7', '#d946ef',
]

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

async function seed() {
  console.log('🌱 Seeding default data...')

  // ── Admin User ──
  const existingAdmin = await db.appUser.findFirst({
    where: { role: 'admin' },
  })

  if (existingAdmin) {
    console.log('✅ Admin user already exists, skipping user seed.')
  } else {
    const admin = await db.appUser.create({
      data: {
        name: 'Администратор',
        pin: hashPin('1234'),
        role: 'admin',
        isActive: true,
        avatar: '#6366f1',
      },
    })
    console.log(`✅ Created admin user: ${admin.name} (ID: ${admin.id})`)
    console.log('   PIN: 1234')
  }

  // ── Role Permissions ──
  const existingPerms = await db.rolePermission.count()
  if (existingPerms > 0) {
    console.log('✅ Role permissions already exist, skipping seed.')
  } else {
    const defaults: Record<string, string[]> = {
      admin: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map', 'settings', 'users'],
      manager: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map'],
      trip_master: ['trips', 'crews', 'map', 'equipment_read'],
      repair_worker: ['repairs', 'equipment_read'],
      worker: ['equipment_read', 'map'],
    }

    const data: { role: string; permission: string }[] = []
    for (const [role, perms] of Object.entries(defaults)) {
      for (const permission of perms) {
        data.push({ role, permission })
      }
    }

    await db.rolePermission.createMany({ data })
    console.log(`✅ Created ${data.length} role permission entries`)
  }
}

seed()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
