import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth/users — public endpoint for login screen
// Returns only minimal info about active users (no PIN, no sessions)
export async function GET() {
  try {
    const users = await db.appUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Auth users list error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
