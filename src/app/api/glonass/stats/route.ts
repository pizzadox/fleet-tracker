import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Axenta.cloud Stats API
// POST /api/glonass/stats — get object statistics for a period
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl || !settings.apiKey) {
      return NextResponse.json({ error: 'Интеграция не настроена' }, { status: 400 })
    }

    const body = await request.json()
    const { objectId, startDate, endDate } = body

    if (!objectId || !startDate || !endDate) {
      return NextResponse.json({ error: 'objectId, startDate, endDate обязательны' }, { status: 400 })
    }

    // POST /api/objects/stats/
    const url = `${settings.apiUrl}/api/objects/stats/`
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
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`)
      return NextResponse.json({ error: `Axenta Stats API: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      mileage: data.mileage || 0,           // Пробег (км)
      avgSpeed: data.avgSpeed || 0,         // Средняя скорость (км/ч)
      maxSpeed: data.maxSpeed || 0,         // Максимальная скорость (км/ч)
      fuelConsumption: data.fuelConsumption || 0,     // Расход топлива (л)
      avgFuelConsumption: data.avgFuelConsumption || 0, // Средний расход (л/100км)
      refuelVolume: data.refuelVolume || 0,     // Заправки (л)
      plumVolume: data.plumVolume || 0,         // Сливы (л)
      parkingsDuration: data.parkingsDuration || 0, // Время стоянок (сек)
      tripsDuration: data.tripsDuration || 0,     // Время поездок (сек)
      engineHours: data.engineHours || 0,         // Моточасы
      idleTime: data.idleTime || 0,               // Холостой ход (сек)
    })
  } catch (error) {
    console.error('[GLONASS Stats] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения статистики' }, { status: 500 })
  }
}
