import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/live?trackerId=xxx
// Lightweight endpoint for fast auto-refresh:
// - Fetches ONLY object details from Axenta (1 request, not 2)
// - Skips sensor metadata fetch (sensor names/types cached from /sensors)
// - NO database writes — pure read from Axenta + return
// - Returns sensor values + position in minimal format
// ═══════════════════════════════════════════════════════════════

async function getValidToken(settings: {
  id: string; apiUrl: string; apiKey: string;
  username: string | null; password: string | null;
}): Promise<string | null> {
  try {
    const testUrl = `${settings.apiUrl}/api/current_user/`
    const testResponse = await fetch(testUrl, {
      headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (testResponse.ok) return settings.apiKey

    if ((testResponse.status === 401 || testResponse.status === 403) && settings.username && settings.password) {
      const loginUrl = `${settings.apiUrl}/api/auth/login/`
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: settings.username, password: settings.password }),
        signal: AbortSignal.timeout(8000),
      })
      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        const newToken = loginData.token || ''
        if (newToken) {
          await db.axentaSettings.update({ where: { id: settings.id }, data: { apiKey: newToken } })
          return newToken
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackerId = searchParams.get('trackerId')

    if (!trackerId) {
      return NextResponse.json({ error: 'Не указан trackerId' }, { status: 400 })
    }

    const tracker = await db.glonassTracker.findUnique({
      where: { id: trackerId },
      select: {
        id: true,
        axentaCloudId: true,
        trackerId: true,
        trackerName: true,
        isActive: true,
        lastLatitude: true,
        lastLongitude: true,
        lastSpeed: true,
        lastCourse: true,
        lastAltitude: true,
        lastAddress: true,
        lastIgnition: true,
        lastFuelLevel: true,
        lastMileage: true,
        lastEngineTemp: true,
        lastSeenAt: true,
        lastPositionAt: true,
        sensorData: {
          orderBy: { timestamp: 'desc' },
          select: {
            sensorType: true,
            sensorName: true,
            value: true,
            stringValue: true,
            unit: true,
          }
        }
      }
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Трекер не найден' }, { status: 404 })
    }

    if (!tracker.axentaCloudId) {
      // No Axenta link — return cached DB data only
      return NextResponse.json({
        source: 'cache',
        connectedStatus: false,
        position: {
          lat: tracker.lastLatitude,
          lng: tracker.lastLongitude,
          speed: tracker.lastSpeed,
          course: tracker.lastCourse,
          altitude: tracker.lastAltitude,
          address: tracker.lastAddress,
        },
        ignition: tracker.lastIgnition,
        fuelLevel: tracker.lastFuelLevel,
        mileage: tracker.lastMileage,
        engineTemp: tracker.lastEngineTemp,
        sensors: tracker.sensorData.map(s => ({
          name: s.sensorName || s.sensorType,
          type: s.sensorType,
          value: s.value,
          stringValue: s.stringValue,
          unit: s.unit,
        })),
        lastSeenAt: tracker.lastSeenAt,
        lastPositionAt: tracker.lastPositionAt,
      })
    }

    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl) {
      return NextResponse.json({ error: 'Интеграция с Axenta не настроена' }, { status: 400 })
    }

    const token = await getValidToken(settings)
    if (!token) {
      return NextResponse.json({ error: 'Не удалось авторизоваться в Axenta' }, { status: 401 })
    }

    const axentaId = parseInt(tracker.axentaCloudId)
    if (isNaN(axentaId)) {
      return NextResponse.json({ error: 'Некорректный Axenta ID' }, { status: 400 })
    }

    // Single request: fetch object details with lastMessage
    const fetchStart = Date.now()
    const url = `${settings.apiUrl}/api/objects/${axentaId}/?full=true`
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    const fetchDuration = Date.now() - fetchStart

    if (!response.ok) {
      return NextResponse.json({ error: 'Ошибка Axenta API' }, { status: 502 })
    }

    const objectDetails = await response.json()
    const lastMessage = objectDetails?.lastMessage as Record<string, unknown> | undefined
    const pos = lastMessage?.pos as Record<string, unknown> | undefined

    // Extract sensor values from lastMessage.sensors
    let sensorValuesMap: Record<string, number | null> = {}
    if (lastMessage?.sensors && typeof lastMessage.sensors === 'object') {
      sensorValuesMap = lastMessage.sensors as Record<string, number | null>
    }

    // Map cached sensor metadata to live values
    const liveSensors = tracker.sensorData.map(s => {
      // Try to find live value by matching sensor type/name pattern
      const sensorType = s.sensorType || ''
      const sensorName = (s.sensorName || '').toLowerCase()
      let liveValue: number | null = s.value

      // Try to find matching value in sensorValuesMap
      for (const [key, val] of Object.entries(sensorValuesMap)) {
        if (val == null) continue
        const keyLower = key.toLowerCase()
        if (keyLower.includes(sensorType.toLowerCase()) ||
            (sensorName && keyLower.includes(sensorName))) {
          liveValue = val
          break
        }
      }

      return {
        name: s.sensorName || s.sensorType,
        type: s.sensorType,
        value: liveValue,
        stringValue: liveValue != null
          ? (s.sensorType?.toLowerCase().includes('ignition') || s.sensorName?.toLowerCase().includes('зажиган')
            ? (liveValue > 0 ? 'Вкл' : 'Выкл')
            : (s.unit ? `${liveValue} ${s.unit}` : String(liveValue)))
          : s.stringValue,
        unit: s.unit,
      }
    })

    // Update ignition from monitoring data if available
    if (objectDetails?.isIgnition != null) {
      const ignSensor = liveSensors.find(s =>
        s.type?.toLowerCase().includes('ignition') || s.name?.toLowerCase().includes('зажиган')
      )
      if (ignSensor) {
        ignSensor.value = objectDetails.isIgnition ? 1 : 0
        ignSensor.stringValue = objectDetails.isIgnition ? 'Вкл' : 'Выкл'
      }
    }

    return NextResponse.json({
      source: 'live',
      connectedStatus: objectDetails?.connectedStatus ?? tracker.isActive,
      isMotion: objectDetails?.isMotion ?? null,
      isIgnition: objectDetails?.isIgnition ?? null,
      position: {
        lat: pos?.y != null ? Number(pos.y) : tracker.lastLatitude,
        lng: pos?.x != null ? Number(pos.x) : tracker.lastLongitude,
        speed: pos?.s != null ? Number(pos.s) : tracker.lastSpeed,
        course: pos?.c != null ? Number(pos.c) : tracker.lastCourse,
        altitude: pos?.z != null ? Number(pos.z) : tracker.lastAltitude,
        address: tracker.lastAddress,
      },
      ignition: objectDetails?.isIgnition != null ? Boolean(objectDetails.isIgnition) : tracker.lastIgnition,
      fuelLevel: tracker.lastFuelLevel,
      mileage: tracker.lastMileage,
      engineTemp: tracker.lastEngineTemp,
      sensors: liveSensors,
      // Diagnostic timestamps
      diagnostics: {
        // When the tracker last sent a message to Axenta server
        trackerLastMessage: lastMessage?.t
          ? new Date(lastMessage.t as string).toISOString()
          : null,
        // When the tracker last reported its GPS position
        trackerLastPosition: lastMessage?.tpos
          ? new Date(lastMessage.tpos as string).toISOString()
          : null,
        // Whether Axenta considers the tracker online right now
        axentaOnline: objectDetails?.connectedStatus ?? null,
        // When we (our server) last successfully queried Axenta
        ourLastFetch: new Date().toISOString(),
        // How long our Axenta API call took (ms)
        fetchDurationMs: fetchDuration,
        // Whether the data from Axenta is considered "fresh" (< 90s old)
        dataFresh: lastMessage?.t
          ? (Date.now() - new Date(lastMessage.t as string).getTime()) < 90000
          : false,
      },
      lastSeenAt: lastMessage?.t
        ? new Date(lastMessage.t as string).toISOString()
        : tracker.lastSeenAt?.toISOString() || null,
      lastPositionAt: lastMessage?.tpos
        ? new Date(lastMessage.tpos as string).toISOString()
        : tracker.lastPositionAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('[GLONASS Live] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 })
  }
}
