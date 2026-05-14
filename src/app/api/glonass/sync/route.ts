import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Axenta.cloud API Integration
// Documentation: https://axenta.cloud/api-docs/
// OpenAPI spec: https://axenta.cloud/api-docs/openapi.yaml
// ═══════════════════════════════════════════════════════════════

// Get a valid token — re-login if needed
async function getValidToken(settings: {
  id: string
  apiUrl: string
  apiKey: string
  username: string | null
  password: string | null
}): Promise<string | null> {
  // First try the existing token via /api/current_user/
  try {
    const testUrl = `${settings.apiUrl}/api/current_user/`
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
        const newToken = loginData.token || ''

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

// Fetch monitoring data from Axenta for all trackers
// Uses: GET /api/objects/monitoring/
async function fetchMonitoringData(apiUrl: string, token: string, objectIds?: number[]) {
  const url = new URL(`${apiUrl}/api/objects/monitoring/`)
  if (objectIds && objectIds.length > 0) {
    url.searchParams.set('objectIds', objectIds.join(','))
  }
  url.searchParams.set('perPage', '1000')

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Monitoring API returned ${response.status}`)
  }

  return await response.json()
}

// Fetch object details from Axenta
// Uses: GET /api/objects/{id}/?full=true
async function fetchObjectDetails(apiUrl: string, token: string, objectId: number) {
  const url = `${apiUrl}/api/objects/${objectId}/?full=true`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Object detail API returned ${response.status}`)
  }

  return await response.json()
}

// Fetch sensors for an object
// Uses: GET /api/objects/{id}/sensors/
async function fetchObjectSensors(apiUrl: string, token: string, objectId: number) {
  const url = `${apiUrl}/api/objects/${objectId}/sensors/`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    return []
  }

  return await response.json()
}

// Fetch stats for an object
// Uses: POST /api/objects/stats/
async function fetchObjectStats(apiUrl: string, token: string, objectId: number, startDate: string, endDate: string) {
  const url = `${apiUrl}/api/objects/stats/`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      objectId,
      startDate,
      endDate,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    return null
  }

  return await response.json()
}

// Reverse geocode coordinates
// Uses: POST /api/geocoding/reverse/
async function reverseGeocode(apiUrl: string, token: string, lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${apiUrl}/api/geocoding/reverse/`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [{ lat, lng }],
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data[0].address || data[0].formatted || null
    }
    return null
  } catch {
    return null
  }
}

// Update tracker data from Axenta monitoring/web response
async function updateTrackerFromAxenta(trackerDbId: string, axentaObject: Record<string, unknown>, token: string, apiUrl: string) {
  const updateData: Record<string, unknown> = {}

  // According to API docs, the monitoring endpoint returns MonitoringWebObject:
  // lastMessage.pos — position data
  // lastMessage.t — message time
  // lastMessage.tpos — position time
  // connectedStatus — online status
  const lastMessage = axentaObject.lastMessage as Record<string, unknown> | undefined
  const pos = lastMessage?.pos as Record<string, unknown> | undefined

  // Position: pos.x = longitude, pos.y = latitude (Axenta convention)
  if (pos) {
    if (pos.y != null) updateData.lastLatitude = Number(pos.y)
    if (pos.x != null) updateData.lastLongitude = Number(pos.x)
    if (pos.z != null) updateData.lastAltitude = Number(pos.z)
    if (pos.s != null) updateData.lastSpeed = Number(pos.s)  // speed in km/h
    if (pos.c != null) updateData.lastCourse = Number(pos.c)  // course in degrees

    // Satellites
    if (pos.sat != null) {
      updateData.lastSeenAt = new Date()
    }
  }

  // Time fields from lastMessage
  if (lastMessage) {
    if (lastMessage.t) updateData.lastPositionAt = new Date(lastMessage.t as string)
    if (lastMessage.tpos) updateData.lastSeenAt = new Date(lastMessage.tpos as string)
  }

  // Connected status
  if (axentaObject.connectedStatus != null) {
    // We can use this for online/offline tracking
    updateData.isActive = Boolean(axentaObject.connectedStatus)
  }

  // Fetch sensors separately for this object
  const axentaId = axentaObject.id as number
  if (axentaId != null) {
    try {
      const sensors = await fetchObjectSensors(apiUrl, token, axentaId)
      if (Array.isArray(sensors)) {
        for (const sensor of sensors) {
          const s = sensor as Record<string, unknown>
          const sensorType = String(s.type || '').toLowerCase()
          const sensorName = String(s.name || '')

          // Map Axenta sensor types to our tracker fields
          // Common Axenta sensor types: fuel, ignition, temperature, odometer, speed, etc.
          if (sensorType.includes('fuel') || sensorName.toLowerCase().includes('топлив')) {
            // Fuel level — value needs to be fetched from messages/stats
          } else if (sensorType.includes('ignition') || sensorName.toLowerCase().includes('зажиган')) {
            updateData.lastIgnition = true // If present, likely active
          } else if (sensorType.includes('temperature') || sensorType.includes('temp') || sensorName.toLowerCase().includes('темпер')) {
            // Temperature sensor detected
          } else if (sensorType.includes('odometer') || sensorType.includes('mileage') || sensorName.toLowerCase().includes('пробег')) {
            // Mileage sensor detected
          }

          // Save sensor metadata
          await db.glonassSensorData.create({
            data: {
              trackerId: trackerDbId,
              sensorType: String(s.type || 'custom'),
              sensorName: s.name ? String(s.name) : null,
              value: s.value != null ? Number(s.value) : null,
              stringValue: s.value != null ? String(s.value) : null,
              unit: s.unit ? String(s.unit) : null,
              timestamp: new Date(),
            }
          }).catch(() => { /* ignore duplicate errors */ })
        }
      }
    } catch (err) {
      console.error(`[GLONASS Sync] Error fetching sensors for object ${axentaId}:`, err)
    }
  }

  // Try to get object stats for today
  if (axentaId != null) {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const stats = await fetchObjectStats(apiUrl, token, axentaId, startOfDay, now.toISOString())
      if (stats) {
        if (stats.mileage != null) updateData.lastMileage = Number(stats.mileage)
        if (stats.avgSpeed != null) updateData.lastSpeed = Number(stats.avgSpeed)
        if (stats.fuelConsumption != null) updateData.lastFuelLevel = Number(stats.fuelConsumption)
      }
    } catch {
      // Stats are optional, continue
    }
  }

  // Try reverse geocoding for current position
  if (updateData.lastLatitude != null && updateData.lastLongitude != null) {
    const address = await reverseGeocode(
      apiUrl, token,
      Number(updateData.lastLatitude),
      Number(updateData.lastLongitude)
    )
    if (address) {
      updateData.lastAddress = address
    }
  }

  // Only update if we have new data
  if (Object.keys(updateData).length > 0) {
    await db.glonassTracker.update({
      where: { id: trackerDbId },
      data: updateData,
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN SYNC ENDPOINT
// ═══════════════════════════════════════════════════════════════

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
      // Even with no linked trackers, try to fetch all objects from Axenta
      // to show available objects for linking
      try {
        const monitoringData = await fetchMonitoringData(settings.apiUrl, token)
        const objectsCount = Array.isArray(monitoringData) ? monitoringData.length :
          (monitoringData.results ? monitoringData.results.length : 0)

        return NextResponse.json({
          success: true,
          synced: 0,
          errors: 0,
          errorDetails: [],
          totalTrackers: 0,
          availableObjects: objectsCount,
          message: objectsCount > 0
            ? `Нет привязанных трекеров. Доступно ${objectsCount} объектов в Axenta для привязки.`
            : 'Нет привязанных трекеров и объектов в Axenta.',
          syncedAt: new Date().toISOString(),
        })
      } catch {
        return NextResponse.json({
          success: true, synced: 0, errors: 0, errorDetails: [],
          totalTrackers: 0, syncedAt: new Date().toISOString(),
        })
      }
    }

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Collect Axenta object IDs from trackers
    const axentaObjectIds: number[] = []
    const trackerIdMap = new Map<number, string>() // axentaId -> trackerDbId

    for (const tracker of trackers) {
      const axentaId = tracker.axentaCloudId ? parseInt(tracker.axentaCloudId) : parseInt(tracker.trackerId)
      if (!isNaN(axentaId)) {
        axentaObjectIds.push(axentaId)
        trackerIdMap.set(axentaId, tracker.id)
      }
    }

    // Method 1: Fetch all monitoring data at once (efficient)
    if (axentaObjectIds.length > 0) {
      try {
        const monitoringData = await fetchMonitoringData(settings.apiUrl, token, axentaObjectIds)
        const objects = Array.isArray(monitoringData) ? monitoringData :
          (monitoringData.results || [])

        for (const obj of objects) {
          const axentaObj = obj as Record<string, unknown>
          const axentaId = Number(axentaObj.id)
          const trackerDbId = trackerIdMap.get(axentaId)

          if (trackerDbId) {
            try {
              await updateTrackerFromAxenta(trackerDbId, axentaObj, token, settings.apiUrl)
              syncedCount++
            } catch (err) {
              errorCount++
              const msg = err instanceof Error ? err.message : 'Unknown error'
              errors.push(`Объект ${axentaId}: ${msg}`)
            }
          }
        }
      } catch (err) {
        // If bulk monitoring fetch fails, try individual requests
        console.error('[GLONASS Sync] Bulk monitoring failed, trying individual:', err)
        for (const tracker of trackers) {
          try {
            const axentaId = tracker.axentaCloudId || tracker.trackerId
            const numericId = parseInt(axentaId)

            if (isNaN(numericId)) {
              errorCount++
              errors.push(`Трекер ${tracker.trackerId}: ID не число`)
              continue
            }

            const objectData = await fetchObjectDetails(settings.apiUrl, token, numericId)
            await updateTrackerFromAxenta(tracker.id, objectData, token, settings.apiUrl)
            syncedCount++
          } catch (err2) {
            errorCount++
            const msg = err2 instanceof Error ? err2.message : 'Unknown error'
            errors.push(`Трекер ${tracker.trackerId}: ${msg}`)
          }
        }
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
