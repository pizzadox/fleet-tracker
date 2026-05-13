import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Sync data from Axenta.cloud API
export async function POST() {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: 'Axenta.cloud integration not configured or inactive' }, { status: 400 })
    }

    if (!settings.apiUrl || !settings.apiKey) {
      return NextResponse.json({ error: 'API URL and API Key are required' }, { status: 400 })
    }

    const trackers = await db.glonassTracker.findMany({
      where: { isActive: true },
    })

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Fetch data from Axenta.cloud API for each tracker
    for (const tracker of trackers) {
      try {
        // Axenta.cloud API: Get object state
        // Documentation: https://axenta.cloud/api/docs
        const objectUrl = `${settings.apiUrl}/objects/${tracker.axentaCloudId || tracker.trackerId}`
        const response = await fetch(objectUrl, {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          // Try alternative auth method (basic auth)
          if (settings.username && settings.password) {
            const basicAuth = Buffer.from(`${settings.username}:${settings.password}`).toString('base64')
            const retryResponse = await fetch(objectUrl, {
              headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            })

            if (!retryResponse.ok) {
              errorCount++
              errors.push(`Tracker ${tracker.trackerId}: HTTP ${retryResponse.status}`)
              continue
            }

            const data = await retryResponse.json()
            await updateTrackerFromAxenta(tracker.id, data)
            syncedCount++
            continue
          }

          errorCount++
          errors.push(`Tracker ${tracker.trackerId}: HTTP ${response.status}`)
          continue
        }

        const data = await response.json()

        // Process the response and update tracker data
        await updateTrackerFromAxenta(tracker.id, data)
        syncedCount++
      } catch (err) {
        errorCount++
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Tracker ${tracker.trackerId}: ${msg}`)
      }
    }

    // Update last sync time
    if (settings) {
      await db.axentaSettings.update({
        where: { id: settings.id },
        data: { lastSyncAt: new Date() }
      })
    }

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
    return NextResponse.json({ error: 'Failed to sync with Axenta.cloud' }, { status: 500 })
  }
}

// Helper to update tracker data from Axenta response
async function updateTrackerFromAxenta(trackerDbId: string, data: Record<string, unknown>) {
  // Axenta.cloud API typically returns data in various formats
  // We try to extract the most common fields
  const state = (data as Record<string, unknown>).state || (data as Record<string, unknown>).last_state || data
  const position = (state as Record<string, unknown>).position || (data as Record<string, unknown>).position
  const sensors = (state as Record<string, unknown>).sensors || (data as Record<string, unknown>).sensors || []

  // Update tracker position
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

  // Process sensor data
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

      // Save individual sensor data
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

  // Handle last_seen
  if (state && typeof state === 'object') {
    const st = state as Record<string, unknown>
    if (st.last_seen || st.lastSeen || st.last_online) {
      updateData.lastSeenAt = new Date((st.last_seen || st.lastSeen || st.last_online) as string)
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
