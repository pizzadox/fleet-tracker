import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserFromRequest } from '@/lib/auth'

// GET /api/permissions/me — get current user's permissions
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Admin always has all permissions
    const allPermissions = [
      'equipment', 'equipment_read',
      'repairs', 'repairs_read',
      'trips', 'trips_read',
      'employees', 'companies', 'crews',
      'map', 'settings', 'users',
    ]

    if (currentUser.role === 'admin') {
      return NextResponse.json({ role: currentUser.role, permissions: allPermissions })
    }

    // Look up from DB
    const rolePerms = await db.rolePermission.findMany({
      where: { role: currentUser.role },
      select: { permission: true },
    })

    const permissions = rolePerms.map(p => p.permission)

    // Fallback to hardcoded defaults if no DB entries exist
    if (permissions.length === 0) {
      const defaults: Record<string, string[]> = {
        manager: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map'],
        trip_master: ['trips', 'crews', 'map', 'equipment_read'],
        repair_worker: ['repairs', 'equipment_read'],
        worker: ['equipment_read', 'map'],
      }
      return NextResponse.json({ role: currentUser.role, permissions: defaults[currentUser.role] || [] })
    }

    return NextResponse.json({ role: currentUser.role, permissions })
  } catch (error) {
    console.error('Get my permissions error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
