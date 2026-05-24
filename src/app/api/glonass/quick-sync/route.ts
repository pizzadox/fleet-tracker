import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// POST /api/glonass/quick-sync
// Ultra-fast sensor refresh for a single tracker or all trackers.
// Skips reverse geocoding and stats — only updates sensor values.
// Returns updated data directly so UI doesn't need to refetch.
// ═══════════════════════════════════════════════════════════════

const ONLINE_THRESHOLD_MINUTES = 30

// Re-use token helper
async function getValidToken(settings: {
  id: string; apiUrl: string; apiKey: string;
  username: string | null; password: string | null;
}): Promise<string | null> {
  try {
    const testUrl = `${settings.apiUrl}/api/current_user/`
    const testResponse = await fetch(testUrl, {
      headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (testResponse.ok) return settings.apiKey
    if ((testResponse.status === 401 || testResponse.status === 403) && settings.username && settings.password) {
      const loginUrl = `${settings.apiUrl}/api/auth/login/`
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: settings.username, password: settings.password }),
        signal: AbortSignal.timeout(10000),
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
  } catch { return null }
}

// Fetch monitoring data (all objects)
async function fetchMonitoringData(apiUrl: string, token: string, objectIds?: number[]) {
  const url = new URL(`${apiUrl}/api/objects/monitoring/`)
  if (objectIds && objectIds.length > 0) {
    url.searchParams.set('objectIds', objectIds.join(','))
  }
  url.searchParams.set('perPage', '1000')
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Monitoring API returned ${response.status}`)
  return await response.json()
}

// Fetch object details with sensor values
async function fetchObjectDetails(apiUrl: string, token: string, objectId: number) {
  const response = await fetch(`${apiUrl}/api/objects/${objectId}/?full=true`, {
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Object detail API returned ${response.status}`)
  return await response.json()
}

// Fetch sensor metadata
async function fetchObjectSensors(apiUrl: string, token: string, objectId: number) {
  const response = await fetch(`${apiUrl}/api/objects/${objectId}/sensors/`, {
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return []
  return await response.json()
}

// Process a single tracker — returns updated tracker data for UI
async function quickSyncTracker(
  trackerDbId: string,
  axentaObject: Record<string, unknown>,
  token: string,
  apiUrl: string
) {
  const updateData: Record<string, unknown> = {}
  const axentaId = axentaObject.id as number

  // ── Fetch object details + sensors IN PARALLEL ──
  const [fullObjectData, sensorsRaw] = await Promise.all([
    fetchObjectDetails(apiUrl, token, axentaId).catch((err) => {
      console.error(`[QuickSync] Error fetching details for ${axentaId}:`, err)
      return null
    }),
    fetchObjectSensors(apiUrl, token, axentaId).catch((err) => {
      console.error(`[QuickSync] Error fetching sensors for ${axentaId}:`, err)
      return []
    }),
  ])

  // Extract sensor values map
  let sensorValuesMap: Record<string, number | null> = {}
  if (fullObjectData?.lastMessage?.sensors && typeof fullObjectData.lastMessage.sensors === 'object') {
    sensorValuesMap = fullObjectData.lastMessage.sensors as Record<string, number | null>
  }

  const dataSource = fullObjectData || axentaObject
  const lastMessage = dataSource.lastMessage as Record<string, unknown> | undefined
  const pos = lastMessage?.pos as Record<string, unknown> | undefined

  // Parse position
  if (pos) {
    if (pos.y != null) updateData.lastLatitude = Number(pos.y)
    if (pos.x != null) updateData.lastLongitude = Number(pos.x)
    if (pos.z != null) updateData.lastAltitude = Number(pos.z)
    if (pos.s != null) updateData.lastSpeed = Number(pos.s)
    if (pos.c != null) updateData.lastCourse = Number(pos.c)
  }

  // Time fields
  if (lastMessage) {
    if (lastMessage.t) updateData.lastPositionAt = new Date(lastMessage.t as string)
    if (lastMessage.tpos) updateData.lastSeenAt = new Date(lastMessage.tpos as string)
  }

  // Online/offline
  const lastPositionTime = lastMessage?.tpos ? new Date(lastMessage.tpos as string) : null
  const lastMessageTime = lastMessage?.t ? new Date(lastMessage.t as string) : null
  const mostRecentTime = lastPositionTime && lastMessageTime
    ? new Date(Math.max(lastPositionTime.getTime(), lastMessageTime.getTime()))
    : lastPositionTime || lastMessageTime
  if (mostRecentTime) {
    const minutesSinceLastSeen = (Date.now() - mostRecentTime.getTime()) / 60000
    updateData.isActive = minutesSinceLastSeen < ONLINE_THRESHOLD_MINUTES
  } else if (dataSource.connectedStatus != null) {
    updateData.isActive = Boolean(dataSource.connectedStatus)
  }

  // Ignition from monitoring
  if (axentaObject.isIgnition != null) {
    updateData.lastIgnition = Boolean(axentaObject.isIgnition)
  }

  // ── Process sensors with BULK createMany ──
  const sensors = Array.isArray(sensorsRaw) ? sensorsRaw : []
  if (sensors.length > 0) {
    // Delete old sensors
    await db.glonassSensorData.deleteMany({ where: { trackerId: trackerDbId } })

    let totalFuel = 0
    let hasFuelSensor = false
    const sensorCreates: Array<{
      trackerId: string
      sensorType: string
      sensorName: string | null
      value: number | null
      stringValue: string | null
      unit: string | null
      timestamp: Date
    }> = []

    for (const sensor of sensors) {
      const s = sensor as Record<string, unknown>
      const sensorType = String(s.type || '').toLowerCase()
      const sensorName = String(s.name || '')
      const sensorApiId = s.id as number | undefined

      let sensorValue: number | null = null
      if (sensorApiId != null && sensorValuesMap[`sensor_${sensorApiId}`] != null) {
        sensorValue = sensorValuesMap[`sensor_${sensorApiId}`]
      }

      let sensorStringValue: string | null = null
      if (sensorValue != null) {
        const unit = s.unit ? String(s.unit) : ''
        sensorStringValue = unit ? `${sensorValue} ${unit}` : String(sensorValue)
      }

      // Map special sensors to tracker fields
      if ((sensorType === 'fuel_level_sensor' || (sensorType === 'custom_sensor' && sensorName.toLowerCase().includes('бак')) || (sensorType.includes('fuel') && !sensorType.includes('impulse') && !sensorType.includes('absolute')))) {
        if (sensorValue != null) { totalFuel += sensorValue; hasFuelSensor = true }
      } else if (sensorType.includes('ignition') || sensorName.toLowerCase().includes('зажиган')) {
        if (sensorValue != null) updateData.lastIgnition = sensorValue > 0
      } else if (sensorType.includes('temperature') || sensorType.includes('temp') || sensorName.toLowerCase().includes('темпер')) {
        if (sensorValue != null) updateData.lastEngineTemp = sensorValue
      } else if (sensorType.includes('odometer') || sensorType.includes('mileage') || sensorName.toLowerCase().includes('пробег')) {
        if (sensorValue != null) updateData.lastMileage = sensorValue
      }

      sensorCreates.push({
        trackerId: trackerDbId,
        sensorType: String(s.type || 'custom'),
        sensorName: s.name ? String(s.name) : null,
        value: sensorValue,
        stringValue: sensorStringValue,
        unit: s.unit ? String(s.unit) : null,
        timestamp: new Date(),
      })
    }

    // BULK insert all sensors at once
    if (sensorCreates.length > 0) {
      await db.glonassSensorData.createMany({ data: sensorCreates, skipDuplicates: true })
    }

    if (hasFuelSensor) updateData.lastFuelLevel = totalFuel
  }

  // Metadata
  if (dataSource.id != null) updateData.axentaCloudId = String(dataSource.id)
  if (dataSource.name && typeof dataSource.name === 'string') updateData.trackerName = dataSource.name
  if (dataSource.uniqueId) updateData.imei = String(dataSource.uniqueId)
  if (dataSource.phoneNumber) updateData.phoneNumber = String(dataSource.phoneNumber)

  // Update tracker in DB
  if (Object.keys(updateData).length > 0) {
    await db.glonassTracker.update({
      where: { id: trackerDbId },
      data: updateData,
    })
  }

  // Return updated data for UI (no need to refetch equipment)
  const updatedTracker = await db.glonassTracker.findUnique({
    where: { id: trackerDbId },
    include: { sensorData: { orderBy: { timestamp: 'desc' } } }
  })

  return updatedTracker
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackerId, equipmentId } = body as { trackerId?: string; equipmentId?: string }

    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl) {
      return NextResponse.json({ error: 'Интеграция с Axenta не настроена' }, { status: 400 })
    }

    const token = await getValidToken(settings)
    if (!token) {
      return NextResponse.json({ error: 'Не удалось авторизоваться' }, { status: 401 })
    }

    // Determine which trackers to refresh
    let trackers: Array<{ id: string; axentaCloudId: string | null; trackerId: string; trackerName: string | null }>

    if (trackerId) {
      // Single tracker refresh
      const tracker = await db.glonassTracker.findUnique({ where: { id: trackerId } })
      if (!tracker) return NextResponse.json({ error: 'Трекер не найден' }, { status: 404 })
      trackers = [tracker]
    } else if (equipmentId) {
      // All trackers for an equipment
      const eqTrackers = await db.glonassTracker.findMany({ where: { equipmentId } })
      if (eqTrackers.length === 0) return NextResponse.json({ error: 'Нет трекеров у техники' }, { status: 404 })
      trackers = eqTrackers
    } else {
      // All trackers
      trackers = await db.glonassTracker.findMany()
    }

    if (trackers.length === 0) {
      return NextResponse.json({ success: true, updated: [], syncedAt: new Date().toISOString() })
    }

    // Fetch ALL monitoring data once (much faster than per-tracker)
    const monitoringData = await fetchMonitoringData(settings.apiUrl, token)
    const objects = Array.isArray(monitoringData) ? monitoringData : (monitoringData.results || [])

    // Build lookup maps for matching
    const trackerByAxentaId = new Map<string, typeof trackers[0]>()
    const trackerByTrackerId = new Map<string, typeof trackers[0]>()
    const trackerByName = new Map<string, typeof trackers[0]>()

    for (const tracker of trackers) {
      if (tracker.axentaCloudId) trackerByAxentaId.set(tracker.axentaCloudId, tracker)
      trackerByTrackerId.set(tracker.trackerId, tracker)
      if (tracker.trackerName) trackerByName.set(tracker.trackerName.toLowerCase(), tracker)
    }

    // Process trackers IN PARALLEL with concurrency limit
    const CONCURRENCY = 5
    const updatedTrackers: Array<Record<string, unknown>> = []
    const errors: string[] = []
    let syncedCount = 0

    // Chunk trackers for parallel processing
    for (let i = 0; i < objects.length; i += CONCURRENCY) {
      const chunk = objects.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        chunk.map(async (obj: unknown) => {
          const axentaObj = obj as Record<string, unknown>
          const axentaId = String(axentaObj.id)
          const axentaName = String(axentaObj.name || '')
          const axentaUniqueId = String(axentaObj.uniqueId || '')

          let matchedTracker = trackerByAxentaId.get(axentaId) ||
            trackerByTrackerId.get(axentaId) ||
            trackerByTrackerId.get(axentaUniqueId)

          if (!matchedTracker && axentaName) {
            matchedTracker = trackerByName.get(axentaName.toLowerCase())
          }

          if (!matchedTracker) return null

          return quickSyncTracker(matchedTracker.id, axentaObj, token, settings.apiUrl)
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          updatedTrackers.push(result.value as Record<string, unknown>)
          syncedCount++
        } else if (result.status === 'rejected') {
          errors.push(result.reason?.message || 'Unknown error')
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
      errors: errors.length,
      errorDetails: errors,
      updatedTrackers,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[QuickSync] Error:', error)
    return NextResponse.json({ error: 'Ошибка быстрой синхронизации' }, { status: 500 })
  }
}
