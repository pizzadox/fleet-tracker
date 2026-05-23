import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

// GET /api/permissions — get all role permissions (admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const permissions = await db.rolePermission.findMany({
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
    })

    // Group by role for easier consumption
    const grouped: Record<string, string[]> = {}
    for (const p of permissions) {
      if (!grouped[p.role]) grouped[p.role] = []
      grouped[p.role].push(p.permission)
    }

    return NextResponse.json({ permissions, grouped })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// PUT /api/permissions — update role permissions (admin only)
// Body: { role: string, permissions: string[] }
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const body = await request.json()
    const { role, permissions } = body

    const validRoles = ['admin', 'manager', 'trip_master', 'repair_worker', 'worker']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
    }

    const validPermissions = [
      'equipment', 'equipment_read',
      'repairs', 'repairs_read',
      'trips', 'trips_read',
      'employees', 'companies', 'crews',
      'map', 'settings', 'users',
    ]

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'permissions должен быть массивом' }, { status: 400 })
    }

    // Filter invalid permissions
    const filtered = permissions.filter((p: string) => validPermissions.includes(p))

    // Admin always has all permissions
    const finalPermissions = role === 'admin' ? [...validPermissions] : filtered

    // Delete existing permissions for this role
    await db.rolePermission.deleteMany({ where: { role } })

    // Create new permissions
    if (finalPermissions.length > 0) {
      await db.rolePermission.createMany({
        data: finalPermissions.map((permission: string) => ({ role, permission })),
      })
    }

    return NextResponse.json({ success: true, role, permissions: finalPermissions })
  } catch (error) {
    console.error('Update permissions error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// POST /api/permissions/seed — seed default permissions (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const existing = await db.rolePermission.count()
    if (existing > 0) {
      return NextResponse.json({ error: 'Права уже инициализированы' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, seeded: data.length })
  } catch (error) {
    console.error('Seed permissions error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
