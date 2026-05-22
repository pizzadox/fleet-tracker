import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPin, getSessionUserFromRequest } from '@/lib/auth'

// GET /api/users — list all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const users = await db.appUser.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

// POST /api/users — create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSessionUserFromRequest(request)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }

    const body = await request.json()
    const { name, pin, role, isActive, avatar } = body

    if (!name || !pin) {
      return NextResponse.json({ error: 'Имя и PIN обязательны' }, { status: 400 })
    }

    const pinStr = String(pin)
    if (pinStr.length < 4 || pinStr.length > 6 || !/^\d+$/.test(pinStr)) {
      return NextResponse.json({ error: 'PIN должен содержать 4-6 цифр' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'trip_master', 'repair_worker', 'worker']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })
    }

    const user = await db.appUser.create({
      data: {
        name,
        pin: hashPin(pinStr),
        role: role || 'worker',
        isActive: isActive !== undefined ? isActive : true,
        avatar: avatar || null,
      },
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
