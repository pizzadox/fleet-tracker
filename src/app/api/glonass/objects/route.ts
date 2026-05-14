import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Axenta.cloud Objects Proxy
// GET /api/glonass/objects — list available objects from Axenta
// ═══════════════════════════════════════════════════════════════

async function getToken(): Promise<string | null> {
  const settings = await db.axentaSettings.findFirst()
  if (!settings || !settings.apiKey) return null

  // Verify token
  try {
    const testUrl = `${settings.apiUrl}/api/current_user/`
    const res = await fetch(testUrl, {
      headers: { 'Authorization': `Token ${settings.apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return settings.apiKey

    // Try re-login
    if (settings.username && settings.password) {
      const loginUrl = `${settings.apiUrl}/api/auth/login/`
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: settings.username, password: settings.password }),
        signal: AbortSignal.timeout(8000),
      })
      if (loginRes.ok) {
        const data = await loginRes.json()
        if (data.token) {
          await db.axentaSettings.update({ where: { id: settings.id }, data: { apiKey: data.token } })
          return data.token
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

// GET — list objects from Axenta monitoring
export async function GET(request: NextRequest) {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl) {
      return NextResponse.json({ error: 'Интеграция не настроена' }, { status: 400 })
    }

    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const perPage = searchParams.get('perPage') || '100'
    const page = searchParams.get('page') || '1'
    const objectIds = searchParams.get('objectIds')

    // Use /api/objects/ for full list or /api/objects/monitoring/ for monitoring data
    const url = new URL(`${settings.apiUrl}/api/objects/monitoring/`)
    url.searchParams.set('perPage', perPage)
    url.searchParams.set('page', page)
    if (objectIds) url.searchParams.set('objectIds', objectIds)

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`)
      return NextResponse.json({ error: `Axenta API: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()

    // Also get list of already linked trackers for reference
    const linkedTrackers = await db.glonassTracker.findMany({
      select: { axentaCloudId: true, trackerId: true, equipmentId: true,
        equipment: { select: { id: true, name: true } }
      }
    })
    const linkedIds = new Set(
      linkedTrackers
        .map(t => t.axentaCloudId || t.trackerId)
        .filter(Boolean)
    )

    // Normalize response — handle both array and paginated response
    const objects = Array.isArray(data) ? data : (data.results || [])

    return NextResponse.json({
      objects: objects.map((obj: Record<string, unknown>) => ({
        id: obj.id,
        name: obj.name,
        uniqueId: obj.uniqueId,
        connectedStatus: obj.connectedStatus,
        isLinked: linkedIds.has(String(obj.id)),
        lastMessage: obj.lastMessage ? {
          time: (obj.lastMessage as Record<string, unknown>).t,
          posTime: (obj.lastMessage as Record<string, unknown>).tpos,
          position: (obj.lastMessage as Record<string, unknown>).pos,
        } : null,
      })),
      linkedTrackers,
      total: data.count || objects.length,
    })
  } catch (error) {
    console.error('[GLONASS Objects] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения объектов' }, { status: 500 })
  }
}
