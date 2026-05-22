import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// ─── PIN Hashing ────────────────────────────────────────────
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

// ─── Session Management ─────────────────────────────────────
const SESSION_COOKIE_NAME = 'fleet_session'
const SESSION_EXPIRY_DAYS = 7

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

  await db.userSession.create({
    data: { userId, token, expiresAt },
  })

  return token
}

// Get session user from NextRequest object (reliable in all environments)
export async function getSessionUserFromRequest(request: NextRequest): Promise<{
  id: string
  name: string
  role: string
  isActive: boolean
  avatar: string | null
} | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!token) return null

    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.userSession.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    if (!session.user.isActive) return null

    return {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      isActive: session.user.isActive,
      avatar: session.user.avatar,
    }
  } catch {
    return null
  }
}

export async function deleteSession(token: string): Promise<void> {
  await db.userSession.deleteMany({ where: { token } }).catch(() => {})
}

export { SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS }
