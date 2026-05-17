import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/snapshot?equipmentId=...&datetime=...
// Returns fuel level, mileage, address, lat/lng at a given moment
// ═══════════════════════════════════════════════════════════════

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

    // Find tracker for this equipment
    const tracker = await db.glonassTracker.findFirst({
      where: { equipmentId, isActive: true }
    })
    if (!tracker) {
      return NextResponse.json({ error: 'Трекер не найден для данной техники' }, { status: 404 })
    }

    const objectId = tracker.axentaCloudId || tracker.trackerId
    if (!objectId) {
      return NextResponse.json({ error: 'Трекер не привязан к объекту Axenta' }, { status: 400 })
    }

    // Build a narrow time window around the requested datetime (±5 min)
    const targetTime = new Date(datetime)
    const windowMin = new Date(targetTime.getTime() - 5 * 60 * 1000)
    const windowMax = new Date(targetTime.getTime() + 5 * 60 * 1000)

    // Fetch tracks from Axenta for this short window
    const url = `${settings.apiUrl}/api/tracks/create/`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${settings.apiKey}`,
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

    if (!response.ok) {
      return NextResponse.json({ error: 'Ошибка запроса к Axenta' }, { status: response.status })
    }

    const data = await response.json()

    // Extract data from the response
    const tripsArr = data.trips || data.track || []
    let fuel: number | null = null
    let mileage: number | null = null
    let lat: number | null = null
    let lng: number | null = null
    let address: string | null = null
    let speed: number | null = null
    let ignition: boolean | null = null

    // Try to get data from the first trip's startSensors / endSensors
    if (Array.isArray(tripsArr) && tripsArr.length > 0) {
      const trip = tripsArr[0]

      // Parse coordinates from the first/last point
      const coords = trip.messagesCoordinates || trip.points || trip.route || trip.coordinates
      if (Array.isArray(coords) && coords.length > 0) {
        const firstPt = coords[0]
        if (Array.isArray(firstPt) && firstPt.length >= 2) {
          lat = Number(firstPt[0])
          lng = Number(firstPt[1])
        } else if (typeof firstPt === 'object' && firstPt !== null) {
          lat = Number(firstPt.latitude ?? firstPt.lat ?? 0)
          lng = Number(firstPt.longitude ?? firstPt.lng ?? 0)
        }
      }

      // Parse sensors from startSensors or endSensors
      // Use startSensors for start of trip, endSensors for end
      const sensors = trip.startSensors || trip.sensors || []
      const endSensors = trip.endSensors || sensors

      // Determine which sensor set is closer to our target time
      let useSensors = sensors
      if (trip.startTime && trip.endTime) {
        const startDist = Math.abs(new Date(trip.startTime).getTime() - targetTime.getTime())
        const endDist = Math.abs(new Date(trip.endTime).getTime() - targetTime.getTime())
        if (endDist < startDist) useSensors = endSensors
      }

      if (Array.isArray(useSensors)) {
        for (const s of useSensors) {
          const sType = (s.sensorType || s.type || '').toLowerCase()
          const sName = (s.sensorName || s.name || '').toLowerCase()
          const val = s.value ?? s.rawValue ?? null

          if (sType.includes('fuel') || sName.includes('топлив') || sName.includes('fuel') || sName.includes('бенз')) {
            if (fuel === null && val != null) fuel = Number(val)
          }
          if (sType.includes('mileage') || sType.includes('odometer') || sName.includes('пробег') || sName.includes('одометр')) {
            if (mileage === null && val != null) mileage = Number(val)
          }
          if (sType.includes('ignition') || sName.includes('зажиган') || sName.includes('ignition')) {
            if (val != null) ignition = Boolean(val || val === 1 || val === '1')
          }
          if (sType.includes('speed') || sName.includes('скорость')) {
            if (speed === null && val != null) speed = Number(val)
          }
        }
      }
    }

    // Also try to parse from top-level sensors (graph data)
    if (data.sensors && Array.isArray(data.sensors)) {
      for (const s of data.sensors) {
        const sType = (s.sensorType || s.type || '').toLowerCase()
        const sName = (s.sensorName || s.name || '').toLowerCase()

        if ((sType.includes('fuel') || sName.includes('топлив') || sName.includes('fuel') || sName.includes('бенз')) && fuel === null) {
          // Get the closest data point to our target time
          const points = s.graph || s.data || s.points || []
          if (Array.isArray(points) && points.length > 0) {
            let closest = points[0]
            let minDist = Infinity
            for (const p of points) {
              const pTime = new Date(p.date || p.time || p.x || 0).getTime()
              const dist = Math.abs(pTime - targetTime.getTime())
              if (dist < minDist) { minDist = dist; closest = p }
            }
            const val = closest.value ?? closest.y ?? closest.v ?? null
            if (val != null) fuel = Number(val)
          }
        }

        if ((sType.includes('mileage') || sName.includes('пробег') || sName.includes('одометр')) && mileage === null) {
          const points = s.graph || s.data || s.points || []
          if (Array.isArray(points) && points.length > 0) {
            let closest = points[0]
            let minDist = Infinity
            for (const p of points) {
              const pTime = new Date(p.date || p.time || p.x || 0).getTime()
              const dist = Math.abs(pTime - targetTime.getTime())
              if (dist < minDist) { minDist = dist; closest = p }
            }
            const val = closest.value ?? closest.y ?? closest.v ?? null
            if (val != null) mileage = Number(val)
          }
        }
      }
    }

    // Try to get address via reverse geocoding if we have coordinates but no address
    if (lat && lng && !address) {
      try {
        const geoUrl = `${settings.apiUrl}/api/geocode/reverse/?lat=${lat}&lng=${lng}`
        const geoRes = await fetch(geoUrl, {
          headers: { 'Authorization': `Token ${settings.apiKey}` },
          signal: AbortSignal.timeout(5000),
        })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          address = geoData.address || geoData.display_name || geoData.formatted || null
        }
      } catch {
        // Reverse geocoding failed — not critical
      }
    }

    // Also try firstMessage/lastMessage from trips
    if (Array.isArray(tripsArr) && tripsArr.length > 0) {
      const trip = tripsArr[0]
      const msg = trip.firstMessage || trip.lastMessage
      if (msg) {
        if (msg.fuel != null && fuel === null) fuel = Number(msg.fuel)
        if (msg.mileage != null && mileage === null) mileage = Number(msg.mileage)
        if (msg.latitude != null && lat === null) lat = Number(msg.latitude)
        if (msg.longitude != null && lng === null) lng = Number(msg.longitude)
        if (msg.speed != null && speed === null) speed = Number(msg.speed)
        if (msg.address && !address) address = msg.address
      }
    }

    return NextResponse.json({
      fuel,
      mileage,
      lat,
      lng,
      address,
      speed,
      ignition,
      datetime: targetTime.toISOString(),
    })
  } catch (error) {
    console.error('[GLONASS Snapshot] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения данных трекера' }, { status: 500 })
  }
}
