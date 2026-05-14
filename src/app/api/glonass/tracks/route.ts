import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Axenta.cloud Tracks API
// POST /api/glonass/tracks — build a track for an object
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl || !settings.apiKey) {
      return NextResponse.json({ error: 'Интеграция не настроена' }, { status: 400 })
    }

    const body = await request.json()
    const { objectId, startDate, endDate, withStops, withParkings, withRefuels, withPlums, withOverSpeed } = body

    if (!objectId || !startDate || !endDate) {
      return NextResponse.json({ error: 'objectId, startDate, endDate обязательны' }, { status: 400 })
    }

    const url = `${settings.apiUrl}/api/tracks/create/`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objectId: Number(objectId),
        startDate,
        endDate,
        trackType: 'single',
        detectTrips: true,
        withStops: withStops !== false,
        withParkings: withParkings !== false,
        withRefuels: withRefuels === true,
        withPlums: withPlums === true,
        withOverSpeed: withOverSpeed === true,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`)
      return NextResponse.json({ error: `Axenta Tracks API: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GLONASS Tracks] Error:', error)
    return NextResponse.json({ error: 'Ошибка построения трека' }, { status: 500 })
  }
}
