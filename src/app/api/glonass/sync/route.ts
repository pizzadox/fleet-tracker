import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Get a valid token — re-login if needed
async function getValidToken(settings: {
  id: string
  apiUrl: string
  apiKey: string
  username: string | null
  password: string | null
}): Promise<string | null> {
  // First try the existing token
  try {
    const testUrl = `${settings.apiUrl}/api/objects/`
    const testResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Token ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (testResponse.ok) {
      return settings.apiKey
    }

    // If token is invalid, try to re-login
    if ((testResponse.status === 401 || testResponse.status === 403) && settings.username && settings.password) {
      console.log('[GLONASS Sync] Token expired, re-logging in...')
      const loginUrl = `${settings.apiUrl}/api/auth/login/`
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: settings.username,
          password: settings.password,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        const newToken = loginData.token || loginData.key || loginData.auth_token || loginData.access || ''

        if (newToken) {
          await db.axentaSettings.update({
            where: { id: settings.id },
            data: { apiKey: newToken }
          })
          console.log('[GLONASS Sync] Token refreshed successfully')
          return newToken
        }
      }
    }

    return null
  } catch (error) {
    console.error('[GLONASS Sync] Token validation error:', error)
    return null
  }
}

// Sync data from Axenta.cloud API
export async function POST() {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: 'Интеграция с Axenta.cloud не настроена или неактивна' }, { status: 400 })
    }

    if (!settings.apiUrl) {
      return NextResponse.json({ error: 'API URL не задан' }, { status: 400 })
    }

    // Get a valid token (will re-login if expired)
    const token = await getValidToken(settings)
    if (!token) {
      return NextResponse.json({ error: 'Не удалось получить токен авторизации. Проверьте логин и пароль.' }, { status: 401 })
    }

    const trackers = await db.glonassTracker.findMany({
      where: { isActive: true },
    })

    if (trackers.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        errors: 0,
        errorDetails: [],
        totalTrackers: 0,
        message: 'Нет активных трекеров для синхронизации',
        syncedAt: new Date().toISOString(),
      })
    }

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Fetch data from Axenta.cloud API for each tracker
    for (const tracker of trackers) {
      try {
        const objectId = tracker.axentaCloudId || tracker.trackerId

        // Axenta.cloud API: Get object state
        // Using Token auth format as per Axenta documentation
        const objectUrl = `${settings.apiUrl}/api/objects/${objectId}/`
        const response = await fetch(objectUrl, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          errorCount++
          errors.push(`Трекер ${tracker.trackerId}: HTTP ${response.status}`)
          continue
        }

        const data = await response.json()

        // Process the response and update tracker data
        await updateTrackerFromAxenta(tracker.id, data)
        syncedCount++
      } catch (err) {
        errorCount++
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Трекер ${tracker.trackerId}: ${msg}`)
      }
    }

    // Update last sync time
    await db.axentaSettings.update({
      where: { id: settings.id },
      data: { lastSyncAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      errorDetails: errors,
      totalTrackers: trackers.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error syncing with Axenta.cloud:', error)
    return NextResponse.json({ error: 'Ошибка синхронизации с Axenta.cloud' }, { status: 500 })
  }
}

// Helper to update tracker data from Axenta response
async function updateTrackerFromAxenta(trackerDbId: string, data: Record<string, unknown>) {
  const state = (data as Record<string, unknown>).state || (data as Record<string, unknown>).last_state || data
  const position = (state as Record<string, unknown>).position || (data as Record<string, unknown>).position
  const sensors = (state as Record<string, unknown>).sensors || (data as Record<string, unknown>).sensors || []

  const updateData: Record<string, unknown> = {}

  if (position && typeof position === 'object') {
    const pos = position as Record<string, unknown>
    if (pos.latitude != null) updateData.lastLatitude = Number(pos.latitude)
    if (pos.longitude != null) updateData.lastLongitude = Number(pos.longitude)
    if (pos.speed != null) updateData.lastSpeed = Number(pos.speed)
    if (pos.course != null) updateData.lastCourse = Number(pos.course)
    if (pos.altitude != null) updateData.lastAltitude = Number(pos.altitude)
    if (pos.timestamp) updateData.lastPositionAt = new Date(pos.timestamp as string)
  }

  if (Array.isArray(sensors)) {
    for (const sensor of sensors) {
      const s = sensor as Record<string, unknown>
      const sensorType = String(s.type || s.name || 'custom').toLowerCase()

      if (sensorType.includes('fuel') || sensorType.includes('топлив')) {
        updateData.lastFuelLevel = s.value != null ? Number(s.value) : undefined
      } else if (sensorType.includes('ignition') || sensorType.includes('зажиган')) {
        updateData.lastIgnition = s.value === 1 || s.value === true || s.value === 'on'
      } else if (sensorType.includes('temp') || sensorType.includes('темпер')) {
        updateData.lastEngineTemp = s.value != null ? Number(s.value) : undefined
      } else if (sensorType.includes('mileage') || sensorType.includes('пробег') || sensorType.includes('odometer')) {
        updateData.lastMileage = s.value != null ? Number(s.value) : undefined
      }

      await db.glonassSensorData.create({
        data: {
          trackerId: trackerDbId,
          sensorType: String(s.type || s.name || 'custom'),
          sensorName: s.name ? String(s.name) : null,
          value: s.value != null ? Number(s.value) : null,
          stringValue: s.value != null ? String(s.value) : null,
          unit: s.unit ? String(s.unit) : null,
          timestamp: s.timestamp ? new Date(s.timestamp as string) : new Date(),
        }
      })
    }
  }

  if (state && typeof state === 'object') {
    const st = state as Record<string, unknown>
    if (st.last_seen || st.lastSeen || st.last_online) {
      updateData.lastSeenAt = new Date((st.last_seen || st.lastSeen || st.last_online) as string)
    }
  }

  if (Object.keys(updateData).length > 0) {
    await db.glonassTracker.update({
      where: { id: trackerDbId },
      data: updateData,
    })
  }
}
