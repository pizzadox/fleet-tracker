import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/snapshot?equipmentId=...&datetime=...
// Returns fuel level, mileage, address, lat/lng at a given moment
// Uses multiple Axenta API sources with fallbacks:
//   1. Track API (±30 min window) — trips + top-level sensors
//   2. Sensor graph API — per-sensor historical data
//   3. Messages API — raw messages near target time
//   4. Object state API — current/last known values (fallback)
//   5. Reverse geocoding — address from coordinates
// ═══════════════════════════════════════════════════════════════

// Helper: get valid Axenta token (re-login if expired)
async function getValidToken(settings: { apiUrl: string; apiKey: string; username?: string | null; password?: string | null; id?: string }): Promise<string> {
  let token = settings.apiKey
  try {
    const testRes = await fetch(`${settings.apiUrl}/api/current_user/`, {
      headers: { 'Authorization': `Token ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!testRes.ok && settings.username && settings.password) {
      const loginRes = await fetch(`${settings.apiUrl}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: settings.username, password: settings.password }),
        signal: AbortSignal.timeout(8000),
      })
      if (loginRes.ok) {
        const loginData = await loginRes.json()
        if (loginData.token) {
          token = loginData.token
          if (settings.id) {
            await db.axentaSettings.update({ where: { id: settings.id }, data: { apiKey: token } })
          }
        }
      }
    }
  } catch { /* ignore token check errors */ }
  return token
}

// Sensor type detection helpers
const isFuelSensorType = (type: string, name: string) =>
  type === 'fuel_level_sensor' || type === 'absolute_fuel_impulse_sensor' ||
  name?.toLowerCase().includes('бак') || name?.toLowerCase().includes('топлив') || name?.toLowerCase().includes('fuel') || name?.toLowerCase().includes('бенз')
const isMileageSensorType = (type: string, name: string) =>
  type === 'odometer' || type === 'mileage' ||
  name?.toLowerCase().includes('пробег') || name?.toLowerCase().includes('одометр') || name?.toLowerCase().includes('mileage')
const isIgnitionSensorType = (type: string, name: string) =>
  type === 'ignition_sensor' ||
  name?.toLowerCase().includes('зажиган') || name?.toLowerCase().includes('ignition')

// Find closest data point to a target time in a sensor's data array
function findClosestValue(points: any[], targetTime: Date): number | null {
  if (!Array.isArray(points) || points.length === 0) return null
  const targetMs = targetTime.getTime()
  let closestVal: number | null = null
  let closestDiff = Infinity
  for (const pt of points) {
    const ptTime = pt.date ? new Date(pt.date).getTime() : (pt.time ? new Date(pt.time).getTime() : null)
    if (ptTime == null) continue
    const diff = Math.abs(ptTime - targetMs)
    if (diff < closestDiff && pt.value != null) {
      closestDiff = diff
      closestVal = Number(pt.value)
    }
  }
  return closestVal
}

// Reverse geocode coordinates to address
async function reverseGeocode(
  settings: { apiUrl: string; apiKey: string; username?: string | null; password?: string | null; id?: string },
  lat: number, lng: number, token: string
): Promise<string | null> {
  // Try multiple geocoding endpoints
  const endpoints = [
    `${settings.apiUrl}/api/geocode/reverse/?lat=${lat}&lng=${lng}`,
    `${settings.apiUrl}/api/geocoding/reverse/?lat=${lat}&lng=${lng}`,
  ]
  for (const geoUrl of endpoints) {
    try {
      const geoRes = await fetch(geoUrl, {
        headers: { 'Authorization': `Token ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        const addr = geoData.address || geoData.display_name || geoData.formatted || geoData.text || null
        if (addr) return addr
      }
    } catch { /* try next endpoint */ }
  }
  // Try POST method
  try {
    const geoRes = await fetch(`${settings.apiUrl}/api/geocode/reverse/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      signal: AbortSignal.timeout(5000),
    })
    if (geoRes.ok) {
      const geoData = await geoRes.json()
      const addr = geoData.address || geoData.display_name || geoData.formatted || geoData.text || null
      if (addr) return addr
    }
  } catch { /* ignore */ }

  // Fallback: Nominatim (OpenStreetMap) — free, no key required
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'FleetTracker/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (nomRes.ok) {
      const nomData = await nomRes.json()
      const addr = nomData.display_name || null
      if (addr) return addr
    }
  } catch { /* ignore */ }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const datetime = searchParams.get('datetime')

    if (!equipmentId || !datetime) {
      return NextResponse.json({ error: 'equipmentId и datetime обязательны' }, { status: 400 })
    }

    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl || !settings.apiKey) {
      return NextResponse.json({ error: 'Интеграция ГЛОНАСС не настроена' }, { status: 400 })
    }

    // Find tracker for this equipment (include inactive ones too — they may still have historical data)
    const tracker = await db.glonassTracker.findFirst({
      where: { equipmentId }
    })
    if (!tracker) {
      return NextResponse.json({ error: 'Трекер не найден для данной техники' }, { status: 404 })
    }

    const objectId = tracker.axentaCloudId || tracker.trackerId
    if (!objectId) {
      return NextResponse.json({ error: 'Трекер не привязан к объекту Axenta' }, { status: 400 })
    }

    // Get valid token (re-login if expired)
    const token = await getValidToken(settings as any)

    const targetTime = new Date(datetime)
    const targetISO = targetTime.toISOString()

    // Use a wider time window (±30 minutes) for better data availability
    const windowMin = new Date(targetTime.getTime() - 30 * 60 * 1000)
    const windowMax = new Date(targetTime.getTime() + 30 * 60 * 1000)

    let fuel: number | null = null
    let mileage: number | null = null
    let lat: number | null = null
    let lng: number | null = null
    let address: string | null = null
    let speed: number | null = null
    let ignition: boolean | null = null

    // ═══════════════════════════════════════════════════════════
    // SOURCE 1: Track API (POST /api/tracks/create/)
    // ═══════════════════════════════════════════════════════════
    console.log('[GLONASS Snapshot] Fetching track data for object', objectId, 'at', targetISO)
    try {
      const url = `${settings.apiUrl}/api/tracks/create/`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectId: Number(objectId),
          startDate: windowMin.toISOString(),
          endDate: windowMax.toISOString(),
          trackType: 'single',
          detectTrips: true,
          withStops: true,
          withParkings: true,
          withRefuels: true,
          withPlums: true,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (response.ok) {
        const data = await response.json()
        const tripsArr = data.trips || data.track || []
        console.log('[GLONASS Snapshot] Track API response: trips=', tripsArr.length,
          'top-level keys:', Object.keys(data).join(', '))

        // Parse coordinates and sensors from trip data
        if (Array.isArray(tripsArr) && tripsArr.length > 0) {
          // Find the trip closest to our target time
          let bestTrip = tripsArr[0]
          let bestDist = Infinity
          for (const trip of tripsArr) {
            const tripStart = trip.startTime || trip.startDate ? new Date(trip.startTime || trip.startDate).getTime() : Infinity
            const tripEnd = trip.endTime || trip.endDate ? new Date(trip.endTime || trip.endDate).getTime() : Infinity
            const distToStart = Math.abs(tripStart - targetTime.getTime())
            const distToEnd = Math.abs(tripEnd - targetTime.getTime())
            const minDist = Math.min(distToStart, distToEnd)
            if (minDist < bestDist) { bestDist = minDist; bestTrip = trip }
          }

          // Extract coordinates
          const coords = bestTrip.messagesCoordinates || bestTrip.points || bestTrip.route || bestTrip.coordinates
          if (Array.isArray(coords) && coords.length > 0) {
            // Find the coordinate point closest to target time
            const firstPt = coords[0]
            if (Array.isArray(firstPt) && firstPt.length >= 2) {
              // Simple array format [lat, lng, speed, ...]
              // Try to find closest by timestamp (index 5 or last element)
              let bestIdx = 0
              let bestCoordDist = Infinity
              for (let i = 0; i < coords.length; i++) {
                const ts = coords[i].length > 5 ? coords[i][5] : (coords[i].length > 3 ? coords[i][3] : null)
                if (ts) {
                  const dist = Math.abs(new Date(ts).getTime() - targetTime.getTime())
                  if (dist < bestCoordDist) { bestCoordDist = dist; bestIdx = i }
                }
              }
              const pt = coords[bestIdx]
              lat = Number(pt[0])
              lng = Number(pt[1])
              if (pt.length > 2 && pt[2] != null) speed = Number(pt[2])
            } else if (typeof firstPt === 'object' && firstPt !== null) {
              // Object format {latitude, longitude, speed, date}
              let bestIdx = 0
              let bestCoordDist = Infinity
              for (let i = 0; i < coords.length; i++) {
                const ts = coords[i].date || coords[i].time || coords[i].timestamp
                if (ts) {
                  const dist = Math.abs(new Date(ts).getTime() - targetTime.getTime())
                  if (dist < bestCoordDist) { bestCoordDist = dist; bestIdx = i }
                }
              }
              const pt = coords[bestIdx]
              lat = Number(pt.latitude ?? pt.lat ?? 0)
              lng = Number(pt.longitude ?? pt.lng ?? 0)
              if (pt.speed != null) speed = Number(pt.speed)
            }
          }

          // Extract sensors from startSensors/endSensors
          const startSensors = bestTrip.startSensors || []
          const endSensors = bestTrip.endSensors || []
          // Pick sensor set closest to target time
          let useSensors = startSensors
          if (bestTrip.startTime && bestTrip.endTime) {
            const startDist = Math.abs(new Date(bestTrip.startTime).getTime() - targetTime.getTime())
            const endDist = Math.abs(new Date(bestTrip.endTime).getTime() - targetTime.getTime())
            if (endDist < startDist && endSensors.length > 0) useSensors = endSensors
          }
          if (useSensors.length === 0 && endSensors.length > 0) useSensors = endSensors

          if (Array.isArray(useSensors)) {
            for (const s of useSensors) {
              const sType = (s.sensorType || s.type || '').toLowerCase()
              const sName = (s.sensorName || s.name || '').toLowerCase()
              const val = s.value ?? s.rawValue ?? null

              if (isFuelSensorType(sType, sName) && fuel === null && val != null) fuel = Number(val)
              if (isMileageSensorType(sType, sName) && mileage === null && val != null) mileage = Number(val)
              if (isIgnitionSensorType(sType, sName) && val != null) ignition = Boolean(val || val === 1 || val === '1')
              if ((sType.includes('speed') || sName.includes('скорость')) && speed === null && val != null) speed = Number(val)
            }
          }

          // Also try firstMessage/lastMessage
          const msg = bestTrip.firstMessage || bestTrip.lastMessage
          if (msg) {
            if (msg.fuel != null && fuel === null) fuel = Number(msg.fuel)
            if (msg.mileage != null && mileage === null) mileage = Number(msg.mileage)
            if (msg.latitude != null && lat === null) lat = Number(msg.latitude)
            if (msg.longitude != null && lng === null) lng = Number(msg.longitude)
            if (msg.speed != null && speed === null) speed = Number(msg.speed)
            if (msg.address && !address) address = msg.address
          }
        }

        // Also try top-level sensors (graph data)
        const topLevelSensors = data.sensors
        if (topLevelSensors) {
          console.log('[GLONASS Snapshot] Top-level sensors:', Array.isArray(topLevelSensors)
            ? `array[${topLevelSensors.length}]`
            : `object keys: ${Object.keys(topLevelSensors).slice(0, 10).join(',')}`)

          // Load sensor metadata first
          let sensorTypeMap = new Map<string, { type: string; name: string; unit: string }>()
          try {
            const sensorsMetaRes = await fetch(`${settings.apiUrl}/api/objects/${objectId}/sensors/`, {
              headers: { 'Authorization': `Token ${token}` },
              signal: AbortSignal.timeout(8000),
            })
            if (sensorsMetaRes.ok) {
              const sensorsMeta = await sensorsMetaRes.json()
              const metaArr = Array.isArray(sensorsMeta) ? sensorsMeta : (sensorsMeta.results || [])
              for (const sm of metaArr) {
                const sid = String(sm.id)
                sensorTypeMap.set(`sensor_${sid}`, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
                sensorTypeMap.set(sid, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
              }
              console.log('[GLONASS Snapshot] Sensor metadata loaded:', sensorTypeMap.size / 2, 'sensors')
            }
          } catch { /* ignore */ }

          // Parse top-level sensors data
          if (typeof topLevelSensors === 'object' && !Array.isArray(topLevelSensors)) {
            // Format: { sensor_1: [{date, value}, ...], sensor_2: [...] }
            for (const [sensorKey, points] of Object.entries(topLevelSensors as Record<string, unknown>)) {
              if (!Array.isArray(points)) continue
              const meta = sensorTypeMap.get(sensorKey) || sensorTypeMap.get(sensorKey.replace('sensor_', ''))
              if (!meta) continue
              const val = findClosestValue(points, targetTime)
              if (val == null) continue
              if (isFuelSensorType(meta.type, meta.name) && fuel === null) fuel = val
              if (isMileageSensorType(meta.type, meta.name) && mileage === null) mileage = val
            }
          } else if (Array.isArray(topLevelSensors)) {
            // Format: [{id, type, name, data: [{date, value}, ...]}]
            for (const sensor of topLevelSensors) {
              const sensorId = String(sensor.id || sensor.sensorId || '')
              const meta = sensorTypeMap.get(sensorId) || sensorTypeMap.get(`sensor_${sensorId}`)
                || { type: sensor.type || '', name: sensor.name || '', unit: sensor.unit || '' }
              const points = sensor.data || sensor.points || sensor.values || sensor.graph || []
              if (!Array.isArray(points) || points.length === 0) continue
              const val = findClosestValue(points, targetTime)
              if (val == null) continue
              if (isFuelSensorType(meta.type, meta.name) && fuel === null) fuel = val
              if (isMileageSensorType(meta.type, meta.name) && mileage === null) mileage = val
            }
          }

          // SOURCE 2: If top-level sensors had no graph data, try individual sensor graph API
          if (fuel === null && Array.isArray(topLevelSensors)) {
            console.log('[GLONASS Snapshot] Trying individual sensor graph API...')
            const fuelSensorIds: string[] = []
            const mileageSensorIds: string[] = []
            for (const sensor of topLevelSensors) {
              const sid = String(sensor.id || sensor.sensorId || '')
              const sType = sensor.type || ''
              const sName = sensor.name || ''
              if (isFuelSensorType(sType, sName)) fuelSensorIds.push(sid)
              else if (isMileageSensorType(sType, sName)) mileageSensorIds.push(sid)
            }
            const relevantIds = mileage === null ? [...fuelSensorIds, ...mileageSensorIds] : fuelSensorIds
            console.log('[GLONASS Snapshot] Sensor graph API — fuel IDs:', fuelSensorIds, 'mileage IDs:', mileageSensorIds)

            for (const sid of relevantIds) {
              try {
                const graphRes = await fetch(
                  `${settings.apiUrl}/api/objects/${objectId}/sensors/${sid}/graph/?from=${encodeURIComponent(windowMin.toISOString())}&to=${encodeURIComponent(windowMax.toISOString())}`,
                  { headers: { 'Authorization': `Token ${token}` }, signal: AbortSignal.timeout(8000) }
                )
                if (!graphRes.ok) continue
                const graphData = await graphRes.json()
                const graphPoints = Array.isArray(graphData) ? graphData : (graphData.data || graphData.results || graphData.values || graphData.points || [])
                if (!Array.isArray(graphPoints) || graphPoints.length === 0) continue

                const meta = sensorTypeMap.get(sid) || sensorTypeMap.get(`sensor_${sid}`)
                  || { type: '', name: '', unit: '' }
                const val = findClosestValue(graphPoints, targetTime)
                console.log('[GLONASS Snapshot] Sensor graph — sensor', sid, '(' + meta.name + '):', val, 'from', graphPoints.length, 'points')
                if (val != null) {
                  if (isFuelSensorType(meta.type, meta.name) && fuel === null) fuel = val
                  if (isMileageSensorType(meta.type, meta.name) && mileage === null) mileage = val
                }
              } catch (graphErr) {
                console.error('[GLONASS Snapshot] Sensor graph API error for', sid, ':', graphErr)
              }
            }
          }
        }
      } else {
        console.error('[GLONASS Snapshot] Track API error:', response.status, await response.text().catch(() => ''))
      }
    } catch (trackErr) {
      console.error('[GLONASS Snapshot] Track API error:', trackErr)
    }

    // ═══════════════════════════════════════════════════════════
    // SOURCE 3: Messages API (GET /api/objects/{id}/messages/)
    // ═══════════════════════════════════════════════════════════
    if (fuel === null || mileage === null || (lat === null && lng === null)) {
      console.log('[GLONASS Snapshot] Trying messages API...')
      try {
        // Load sensor metadata if not already loaded
        let sensorTypeMap = new Map<string, { type: string; name: string; unit: string }>()
        try {
          const sensorsMetaRes = await fetch(`${settings.apiUrl}/api/objects/${objectId}/sensors/`, {
            headers: { 'Authorization': `Token ${token}` },
            signal: AbortSignal.timeout(8000),
          })
          if (sensorsMetaRes.ok) {
            const sensorsMeta = await sensorsMetaRes.json()
            const metaArr = Array.isArray(sensorsMeta) ? sensorsMeta : (sensorsMeta.results || [])
            for (const sm of metaArr) {
              const sid = String(sm.id)
              sensorTypeMap.set(`sensor_${sid}`, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
              sensorTypeMap.set(sid, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
            }
          }
        } catch { /* ignore */ }

        const msgUrl = `${settings.apiUrl}/api/objects/${objectId}/messages/?startDate=${encodeURIComponent(new Date(targetTime.getTime() - 10 * 60 * 1000).toISOString())}&endDate=${encodeURIComponent(new Date(targetTime.getTime() + 10 * 60 * 1000).toISOString())}&limit=5`
        const msgRes = await fetch(msgUrl, {
          headers: { 'Authorization': `Token ${token}` },
          signal: AbortSignal.timeout(8000),
        })
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          const msgs = Array.isArray(msgData) ? msgData : (msgData.results || msgData.messages || [])
          console.log('[GLONASS Snapshot] Messages API: got', msgs.length, 'messages')

          // Find the message closest to target time
          let bestMsg: any = null
          let bestDist = Infinity
          for (const msg of msgs) {
            const msgTime = msg.date || msg.time || msg.timestamp
            if (msgTime) {
              const dist = Math.abs(new Date(msgTime).getTime() - targetTime.getTime())
              if (dist < bestDist) { bestDist = dist; bestMsg = msg }
            }
          }
          // If no timestamp, use first message
          if (!bestMsg && msgs.length > 0) bestMsg = msgs[0]

          if (bestMsg) {
            // Extract position
            if (bestMsg.latitude != null && lat === null) lat = Number(bestMsg.latitude)
            if (bestMsg.longitude != null && lng === null) lng = Number(bestMsg.longitude)
            if (bestMsg.speed != null && speed === null) speed = Number(bestMsg.speed)
            if (bestMsg.address && !address) address = bestMsg.address

            // Extract sensor values
            if (bestMsg.sensors && sensorTypeMap.size > 0) {
              for (const [sensorKey, rawVal] of Object.entries(bestMsg.sensors as Record<string, unknown>)) {
                const meta = sensorTypeMap.get(String(sensorKey)) || sensorTypeMap.get(String(sensorKey).replace('sensor_', ''))
                if (!meta || rawVal == null) continue
                const val = Number(rawVal)
                if (isNaN(val)) continue
                if (isFuelSensorType(meta.type, meta.name) && fuel === null) fuel = val
                if (isMileageSensorType(meta.type, meta.name) && mileage === null) mileage = val
                if (isIgnitionSensorType(meta.type, meta.name) && ignition === null) ignition = val > 0
              }
              console.log('[GLONASS Snapshot] Message sensor values — fuel:', fuel, 'mileage:', mileage)
            }

            // Also try flat sensor fields on message (fuel, mileage, etc.)
            if (bestMsg.fuel != null && fuel === null) fuel = Number(bestMsg.fuel)
            if (bestMsg.mileage != null && mileage === null) mileage = Number(bestMsg.mileage)
          }
        }
      } catch (msgErr) {
        console.error('[GLONASS Snapshot] Messages API error:', msgErr)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SOURCE 4: Object state API (GET /api/objects/{id}/?full=true)
    // This returns current/last known values — use as fallback only
    // ═══════════════════════════════════════════════════════════
    if (fuel === null || (lat === null && lng === null)) {
      console.log('[GLONASS Snapshot] Trying object state API as fallback...')
      try {
        const objRes = await fetch(`${settings.apiUrl}/api/objects/${objectId}/?full=true`, {
          headers: { 'Authorization': `Token ${token}` },
          signal: AbortSignal.timeout(8000),
        })
        if (objRes.ok) {
          const objData = await objRes.json()
          const lastMsg = objData.lastMessage
          if (lastMsg) {
            if (lastMsg.latitude != null && lat === null) lat = Number(lastMsg.latitude)
            if (lastMsg.longitude != null && lng === null) lng = Number(lastMsg.longitude)
            if (lastMsg.speed != null && speed === null) speed = Number(lastMsg.speed)
            if (lastMsg.address && !address) address = lastMsg.address
            if (lastMsg.fuel != null && fuel === null) fuel = Number(lastMsg.fuel)
            if (lastMsg.mileage != null && mileage === null) mileage = Number(lastMsg.mileage)

            // Parse sensor values from lastMessage.sensors
            if (lastMsg.sensors) {
              // Load sensor metadata if needed
              let sensorTypeMap = new Map<string, { type: string; name: string; unit: string }>()
              try {
                const sensorsMetaRes = await fetch(`${settings.apiUrl}/api/objects/${objectId}/sensors/`, {
                  headers: { 'Authorization': `Token ${token}` },
                  signal: AbortSignal.timeout(8000),
                })
                if (sensorsMetaRes.ok) {
                  const sensorsMeta = await sensorsMetaRes.json()
                  const metaArr = Array.isArray(sensorsMeta) ? sensorsMeta : (sensorsMeta.results || [])
                  for (const sm of metaArr) {
                    const sid = String(sm.id)
                    sensorTypeMap.set(`sensor_${sid}`, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
                    sensorTypeMap.set(sid, { type: sm.type || '', name: sm.name || '', unit: sm.unit || '' })
                  }
                }
              } catch { /* ignore */ }

              for (const [sensorKey, rawVal] of Object.entries(lastMsg.sensors as Record<string, unknown>)) {
                const meta = sensorTypeMap.get(String(sensorKey)) || sensorTypeMap.get(String(sensorKey).replace('sensor_', ''))
                if (!meta || rawVal == null) continue
                const val = Number(rawVal)
                if (isNaN(val)) continue
                if (isFuelSensorType(meta.type, meta.name) && fuel === null) fuel = val
                if (isMileageSensorType(meta.type, meta.name) && mileage === null) mileage = val
                if (isIgnitionSensorType(meta.type, meta.name) && ignition === null) ignition = val > 0
              }
            }
          }

          // Mark that this is current state, not historical
          const stateData = objData.state || objData.status
          if (stateData) {
            if (stateData.fuel_level != null && fuel === null) fuel = Number(stateData.fuel_level)
            if (stateData.mileage != null && mileage === null) mileage = Number(stateData.mileage)
          }
        }
      } catch (objErr) {
        console.error('[GLONASS Snapshot] Object state API error:', objErr)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SOURCE 5: Local DB cache (last known values from sync)
    // Uses data stored in GlonassTracker + GlonassSensorData
    // ═══════════════════════════════════════════════════════════
    if (fuel === null || mileage === null || (lat === null && lng === null) || !address) {
      console.log('[GLONASS Snapshot] Trying local DB cache...')
      try {
        // Re-read tracker with latest cached values
        const cachedTracker = await db.glonassTracker.findFirst({ where: { equipmentId } })
        if (cachedTracker) {
          if (fuel === null && cachedTracker.lastFuelLevel != null) {
            fuel = cachedTracker.lastFuelLevel
            console.log('[GLONASS Snapshot] DB cache: fuel =', fuel)
          }
          if (mileage === null && cachedTracker.lastMileage != null) {
            mileage = cachedTracker.lastMileage
            console.log('[GLONASS Snapshot] DB cache: mileage =', mileage)
          }
          if (lat === null && cachedTracker.lastLatitude != null) lat = cachedTracker.lastLatitude
          if (lng === null && cachedTracker.lastLongitude != null) lng = cachedTracker.lastLongitude
          if (speed === null && cachedTracker.lastSpeed != null) speed = cachedTracker.lastSpeed
          if (ignition === null && cachedTracker.lastIgnition != null) ignition = cachedTracker.lastIgnition
          if (!address && cachedTracker.lastAddress) address = cachedTracker.lastAddress
        }

        // Also check GlonassSensorData for more granular sensor values
        if (fuel === null || mileage === null) {
          const sensorRecords = await db.glonassSensorData.findMany({
            where: { trackerId: tracker.id },
            orderBy: { timestamp: 'desc' },
            take: 20,
          })
          for (const rec of sensorRecords) {
            const sType = (rec.sensorType || '').toLowerCase()
            const sName = (rec.sensorName || '').toLowerCase()
            if (isFuelSensorType(sType, sName) && fuel === null && rec.value != null) {
              fuel = rec.value
              console.log('[GLONASS Snapshot] DB sensor cache: fuel =', fuel, '(from', rec.timestamp.toISOString(), ')')
            }
            if (isMileageSensorType(sType, sName) && mileage === null && rec.value != null) {
              mileage = rec.value
              console.log('[GLONASS Snapshot] DB sensor cache: mileage =', mileage, '(from', rec.timestamp.toISOString(), ')')
            }
          }
        }
      } catch (dbErr) {
        console.error('[GLONASS Snapshot] DB cache error:', dbErr)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SOURCE 6: Reverse geocoding
    // ═══════════════════════════════════════════════════════════
    if (lat && lng && !address) {
      console.log('[GLONASS Snapshot] Trying reverse geocoding for', lat, lng)
      address = await reverseGeocode(settings as any, lat, lng, token)
    }

    // Flag which source provided the data (for UI feedback)
    const source = fuel !== null || mileage !== null || lat !== null
      ? (fuel != null && fuel !== tracker.lastFuelLevel ? 'historical' : 'cached')
      : 'none'

    console.log('[GLONASS Snapshot] Result — fuel:', fuel, 'mileage:', mileage, 'lat:', lat, 'lng:', lng, 'address:', address, 'speed:', speed, 'ignition:', ignition, 'source:', source)

    return NextResponse.json({
      fuel,
      mileage,
      lat,
      lng,
      address,
      speed,
      ignition,
      source,
      datetime: targetTime.toISOString(),
    })
  } catch (error) {
    console.error('[GLONASS Snapshot] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения данных трекера' }, { status: 500 })
  }
}
