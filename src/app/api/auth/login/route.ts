import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPin, createSession, SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, pin } = body

    if (!userId || !pin) {
      return NextResponse.json({ error: 'userId и PIN обязательны' }, { status: 400 })
    }

    // Find the user
    const user = await db.appUser.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Пользователь деактивирован' }, { status: 403 })
    }

    // Verify PIN
    const hashedPin = hashPin(String(pin))
    if (user.pin !== hashedPin) {
      return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 })
    }

    // Create session
    const token = await createSession(user.id)

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Must be false for localhost HTTP
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
