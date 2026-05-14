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

// Threshold in minutes — if lastMessage time is within this, consider tracker online
const ONLINE_THRESHOLD_MINUTES = 30

// Update tracker data from Axenta monitoring/web response
// Uses fetchObjectDetails (full=true) to get sensor values from lastMessage.sensors
async function updateTrackerFromAxenta(trackerDbId: string, axentaObject: Record<string, unknown>, token: string, apiUrl: string) {
  const updateData: Record<string, unknown> = {}

  const axentaId = axentaObject.id as number

  // ── Step 1: Fetch FULL object details to get sensor values ──
  // The monitoring API only has position data, but /api/objects/{id}/?full=true
  // includes lastMessage.sensors with actual sensor values like:
  // { "sensor_2287338": 486.06, "sensor_2287340": 28.07 }
  let fullObjectData: Record<string, unknown> | null = null
  let sensorValuesMap: Record<string, number | null> = {}

  if (axentaId != null) {
    try {
      fullObjectData = await fetchObjectDetails(apiUrl, token, axentaId)
      const fullLastMsg = fullObjectData?.lastMessage as Record<string, unknown> | undefined
      if (fullLastMsg?.sensors && typeof fullLastMsg.sensors === 'object') {
        sensorValuesMap = fullLastMsg.sensors as Record<string, number | null>
      }
    } catch (err) {
      console.error(`[GLONASS Sync] Error fetching full details for object ${axentaId}:`, err)
    }
  }

  // Use full object data if available (has sensor values), otherwise fall back to monitoring data
  const dataSource = fullObjectData || axentaObject

  // ── Step 2: Parse position and time data ──
  const lastMessage = dataSource.lastMessage as Record<string, unknown> | undefined
  const pos = lastMessage?.pos as Record<string, unknown> | undefined

  // Position: pos.x = longitude, pos.y = latitude (Axenta convention)
  if (pos) {
    if (pos.y != null) updateData.lastLatitude = Number(pos.y)
    if (pos.x != null) updateData.lastLongitude = Number(pos.x)
    if (pos.z != null) updateData.lastAltitude = Number(pos.z)
    if (pos.s != null) updateData.lastSpeed = Number(pos.s)  // speed in km/h
    if (pos.c != null) updateData.lastCourse = Number(pos.c)  // course in degrees
  }

  // Time fields from lastMessage
  if (lastMessage) {
    if (lastMessage.t) updateData.lastPositionAt = new Date(lastMessage.t as string)
    if (lastMessage.tpos) updateData.lastSeenAt = new Date(lastMessage.tpos as string)
  }

  // ── Step 3: Determine online/offline status ──
  // Use time-based logic: if the tracker sent data within the threshold, it's online.
  // connectedStatus only reflects real-time TCP connection, which is often false
  // even for actively moving vehicles (GSM trackers don't maintain persistent connections).
  const lastPositionTime = lastMessage?.tpos ? new Date(lastMessage.tpos as string) : null
  const lastMessageTime = lastMessage?.t ? new Date(lastMessage.t as string) : null
  const mostRecentTime = lastPositionTime && lastMessageTime
    ? new Date(Math.max(lastPositionTime.getTime(), lastMessageTime.getTime()))
    : lastPositionTime || lastMessageTime

  if (mostRecentTime) {
    const minutesSinceLastSeen = (Date.now() - mostRecentTime.getTime()) / 60000
    updateData.isActive = minutesSinceLastSeen < ONLINE_THRESHOLD_MINUTES
  } else if (dataSource.connectedStatus != null) {
    // Fallback: use connectedStatus if no time data available
    updateData.isActive = Boolean(dataSource.connectedStatus)
  }

  // ── Step 4: Parse isIgnition / isMotion from monitoring data ──
  // These fields come from the monitoring API, not from full details
  if (axentaObject.isIgnition != null) {
    updateData.lastIgnition = Boolean(axentaObject.isIgnition)
  }

  // ── Step 5: Fetch sensor metadata and map values ──
  if (axentaId != null) {
    try {
      const sensors = await fetchObjectSensors(apiUrl, token, axentaId)
      if (Array.isArray(sensors)) {
        // Delete old sensor data before saving new ones (avoid duplicates)
        await db.glonassSensorData.deleteMany({
          where: { trackerId: trackerDbId }
        })

        let totalFuel = 0
        let hasFuelSensor = false

        for (const sensor of sensors) {
          const s = sensor as Record<string, unknown>
          const sensorType = String(s.type || '').toLowerCase()
          const sensorName = String(s.name || '')
          const sensorApiId = s.id as number | undefined

          // Look up the actual value from sensorValuesMap
          // The map uses keys like "sensor_2287338" where 2287338 is the sensor ID
          let sensorValue: number | null = null
          if (sensorApiId != null && sensorValuesMap[`sensor_${sensorApiId}`] != null) {
            sensorValue = sensorValuesMap[`sensor_${sensorApiId}`]
          }

          // Build display string
          let sensorStringValue: string | null = null
          if (sensorValue != null) {
            const unit = s.unit ? String(s.unit) : ''
            sensorStringValue = unit ? `${sensorValue} ${unit}` : String(sensorValue)
          }

          // Map Axenta sensor types to our tracker fields
          if (sensorType.includes('fuel') || sensorName.toLowerCase().includes('топлив') || (sensorType === 'custom_sensor' && sensorName.toLowerCase().includes('бак'))) {
            // Fuel level sensor
            if (sensorValue != null) {
              totalFuel += sensorValue
              hasFuelSensor = true
            }
          } else if (sensorType.includes('ignition') || sensorName.toLowerCase().includes('зажиган')) {
            // Ignition sensor — use value to determine state
            if (sensorValue != null) {
              updateData.lastIgnition = sensorValue > 0
            }
          } else if (sensorType.includes('temperature') || sensorType.includes('temp') || sensorName.toLowerCase().includes('темпер')) {
            if (sensorValue != null) {
              updateData.lastEngineTemp = sensorValue
            }
          } else if (sensorType.includes('odometer') || sensorType.includes('mileage') || sensorName.toLowerCase().includes('пробег')) {
            if (sensorValue != null) {
              updateData.lastMileage = sensorValue
            }
          } else if (sensorType.includes('voltage') || sensorName.toLowerCase().includes('напряжен')) {
            // Voltage sensor — just save as sensor data, no special tracker field
          }

          // Save sensor data with actual values
          await db.glonassSensorData.create({
            data: {
              trackerId: trackerDbId,
              sensorType: String(s.type || 'custom'),
              sensorName: s.name ? String(s.name) : null,
              value: sensorValue,
              stringValue: sensorStringValue,
              unit: s.unit ? String(s.unit) : null,
              timestamp: new Date(),
            }
          }).catch(() => { /* ignore duplicate errors */ })
        }

        // Set total fuel level if any fuel sensors reported values
        if (hasFuelSensor) {
          updateData.lastFuelLevel = totalFuel
        }
      }
    } catch (err) {
      console.error(`[GLONASS Sync] Error fetching sensors for object ${axentaId}:`, err)
    }
  }

  // ── Step 6: Try to get object stats for today ──
  if (axentaId != null) {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const stats = await fetchObjectStats(apiUrl, token, axentaId, startOfDay, now.toISOString())
      if (stats) {
        // Only use stats if we don't already have values from sensors
        if (stats.mileage != null && updateData.lastMileage == null) updateData.lastMileage = Number(stats.mileage)
        if (stats.avgSpeed != null && updateData.lastSpeed == null) updateData.lastSpeed = Number(stats.avgSpeed)
        if (stats.fuelConsumption != null && updateData.lastFuelLevel == null) updateData.lastFuelLevel = Number(stats.fuelConsumption)
      }
    } catch {
      // Stats are optional, continue
    }
  }

  // ── Step 7: Try reverse geocoding for current position ──
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

  // ── Step 8: Update metadata fields ──
  if (dataSource.id != null) {
    updateData.axentaCloudId = String(dataSource.id)
  }
  if (dataSource.name && typeof dataSource.name === 'string') {
    updateData.trackerName = dataSource.name
  }
  if (dataSource.uniqueId) {
    updateData.imei = String(dataSource.uniqueId)
  }
  if (dataSource.phoneNumber) {
    updateData.phoneNumber = String(dataSource.phoneNumber)
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

    const trackers = await db.glonassTracker.findMany()

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

    // Build lookup maps for trackers:
    // 1. By axentaCloudId (primary)
    // 2. By trackerId matching Axenta object ID
    // 3. By trackerName matching Axenta object name
    const trackerByAxentaId = new Map<string, typeof trackers[0]>() // axentaCloudId -> tracker
    const trackerByTrackerId = new Map<string, typeof trackers[0]>() // trackerId -> tracker
    const trackerByName = new Map<string, typeof trackers[0]>() // trackerName -> tracker

    for (const tracker of trackers) {
      if (tracker.axentaCloudId) {
        trackerByAxentaId.set(tracker.axentaCloudId, tracker)
      }
      trackerByTrackerId.set(tracker.trackerId, tracker)
      if (tracker.trackerName) {
        trackerByName.set(tracker.trackerName.toLowerCase(), tracker)
      }
    }

    // Fetch ALL monitoring data from Axenta (not filtered by IDs)
    // This ensures we can match trackers by name even without axentaCloudId
    try {
      const monitoringData = await fetchMonitoringData(settings.apiUrl, token)
      const objects = Array.isArray(monitoringData) ? monitoringData :
        (monitoringData.results || [])

      const matchedTrackerIds = new Set<string>()

      for (const obj of objects) {
        const axentaObj = obj as Record<string, unknown>
        const axentaId = String(axentaObj.id)
        const axentaName = String(axentaObj.name || '')
        const axentaUniqueId = String(axentaObj.uniqueId || '')

        // Try to find matching tracker by:
        // 1. axentaCloudId (exact match)
        // 2. trackerId matching Axenta object ID
        // 3. trackerId matching Axenta uniqueId
        // 4. trackerName matching Axenta object name
        let matchedTracker = trackerByAxentaId.get(axentaId) ||
          trackerByTrackerId.get(axentaId) ||
          trackerByTrackerId.get(axentaUniqueId)

        if (!matchedTracker && axentaName) {
          matchedTracker = trackerByName.get(axentaName.toLowerCase())
        }

        if (matchedTracker) {
          // Update axentaCloudId if it was missing
          if (!matchedTracker.axentaCloudId) {
            await db.glonassTracker.update({
              where: { id: matchedTracker.id },
              data: { axentaCloudId: axentaId }
            })
            console.log(`[GLONASS Sync] Updated axentaCloudId for tracker ${matchedTracker.trackerId} -> ${axentaId}`)
          }

          try {
            await updateTrackerFromAxenta(matchedTracker.id, axentaObj, token, settings.apiUrl)
            syncedCount++
            matchedTrackerIds.add(matchedTracker.id)
          } catch (err) {
            errorCount++
            const msg = err instanceof Error ? err.message : 'Unknown error'
            errors.push(`Объект ${axentaId}: ${msg}`)
          }
        }
      }

      // Report unmatched trackers
      for (const tracker of trackers) {
        if (!matchedTrackerIds.has(tracker.id)) {
          errors.push(`Трекер ${tracker.trackerId} (${tracker.trackerName || 'без имени'}) не найден в Axenta`)
        }
      }
    } catch (err) {
      // If bulk monitoring fetch fails, try individual requests by ID
      console.error('[GLONASS Sync] Bulk monitoring failed, trying individual:', err)
      for (const tracker of trackers) {
        try {
          const axentaId = tracker.axentaCloudId || tracker.trackerId
          const numericId = parseInt(axentaId)

          if (isNaN(numericId)) {
            errorCount++
            errors.push(`Трекер ${tracker.trackerId}: ID не число и не найден в мониторинге`)
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
