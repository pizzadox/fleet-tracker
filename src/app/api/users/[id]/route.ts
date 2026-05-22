import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPin, getSessionUserFromRequest } from '@/lib/auth'

// GET /api/users/[id] — get single user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params
    const user = await db.appUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// PUT /api/users/[id] — update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, pin, role, isActive, avatar } = body

    const existing = await db.appUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (pin !== undefined && pin !== '') {
      const pinStr = String(pin)
      if (pinStr.length < 4 || pinStr.length > 6 || !/^\d+$/.test(pinStr)) {
        return NextResponse.json({ error: 'PIN должен содержать 4-6 цифр' }, { status: 400 })
      }
      data.pin = hashPin(pinStr)
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'trip_master', 'repair_worker', 'worker']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
      }
      data.role = role
    }
    if (isActive !== undefined) data.isActive = isActive
    if (avatar !== undefined) data.avatar = avatar

    const user = await db.appUser.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const { id } = await params

    // Prevent deleting self
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 400 })
    }

    const existing = await db.appUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    await db.appUser.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
