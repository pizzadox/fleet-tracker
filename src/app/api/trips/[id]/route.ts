import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/trips/[id] — Получить данные рейса
// GET /api/trips/[id]?action=track — Получить трек рейса из Axenta
// GET /api/trips/[id]?action=sensors — Загрузить данные датчиков из трекера
// GET /api/trips/[id]?action=sensor-compare — Сравнить датчики на старт/финиш
// ═══════════════════════════════════════════════════════════════

// Helper: get valid Axenta token (re-login if expired)
async function getValidToken(settings: { apiUrl: string; apiKey: string; username?: string | null; password?: string | null }): Promise<string> {
  let token = settings.apiKey
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
        await db.axentaSettings.update({ where: { id: (settings as any).id }, data: { apiKey: token } })
      }
    }
  }
  return token
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // ── Track action: fetch track from Axenta ──
    if (action === 'track') {
      const trip = await db.trip.findUnique({
        where: { id },
        include: { equipment: { select: { id: true, name: true, registrationNum: true } } },
      })
      if (!trip) return NextResponse.json({ error: 'Рейс не найден' }, { status: 404 })

      // Allow overriding dates via query params so that tracks can be loaded
      // for trips without endDate (e.g. in_progress) or with custom date range
      const overrideFrom = searchParams.get('from')
      const overrideTo = searchParams.get('to')
      const trackStartDate = overrideFrom ? new Date(overrideFrom) : trip.startDate
      // If no end date and no override, use now
      const trackEndDate = overrideTo ? new Date(overrideTo) : (trip.endDate || new Date())

      if (!trackStartDate) {
        return NextResponse.json({ error: 'Укажите дату начала для загрузки трека' }, { status: 400 })
      }

      // Find any tracker (not just active ones) — some trackers may be offline but still have Axenta ID
      const tracker = await db.glonassTracker.findFirst({
        where: { equipmentId: trip.equipmentId },
      })
      if (!tracker) {
        return NextResponse.json({
          error: 'У техники нет привязанного трекера',
          hint: 'Привяжите трекер к технике в разделе ГЛОНАСС/GPS или создайте трекер через синхронизацию с Axenta',
        }, { status: 404 })
      }

      const settings = await db.axentaSettings.findFirst()
      if (!settings?.isActive || !settings.apiUrl || !settings.apiKey) {
        return NextResponse.json({ error: 'Интеграция с Axenta.cloud не настроена' }, { status: 400 })
      }

      const objectId = tracker.axentaCloudId || tracker.trackerId
      if (!objectId) return NextResponse.json({ error: 'У трекера нет ID объекта в Axenta' }, { status: 400 })

      try {
        const token = await getValidToken(settings)

        const tracksUrl = `${settings.apiUrl}/api/tracks/create/`
        const tracksResponse = await fetch(tracksUrl, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: Number(objectId),
            startDate: new Date(trackStartDate).toISOString(),
            endDate: new Date(trackEndDate).toISOString(),
            trackType: 'single', detectTrips: true, withStops: true, withParkings: true, withRefuels: true, withPlums: true,
          }),
          signal: AbortSignal.timeout(30000),
        })

        if (!tracksResponse.ok) {
          const errorText = await tracksResponse.text().catch(() => `HTTP ${tracksResponse.status}`)
          return NextResponse.json({ error: `Axenta API: ${errorText}` }, { status: tracksResponse.status })
        }

        const trackData = await tracksResponse.json()
        const result: Record<string, unknown> = {
          tripId: id, equipmentName: trip.equipment.name, registrationNum: trip.equipment.registrationNum,
        }
        if (trackData.trips && Array.isArray(trackData.trips)) {
          result.trips = trackData.trips.map((trip: Record<string, unknown>) => {
            const raw = trip.messagesCoordinates || []
            let points: Array<{ lat: number; lng: number; speed: number; time: string | null }> = []

            if (Array.isArray(raw) && raw.length > 0) {
              const first = raw[0]
              if (Array.isArray(first)) {
                for (const pt of raw) {
                  if (Array.isArray(pt) && pt.length >= 2) {
                    const lat = Number(pt[0])
                    const lng = Number(pt[1])
                    const speed = Number(pt[2]) || 0
                    const time = String(pt[3] || '')
                    if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
                      points.push({ lat, lng, speed, time })
                    }
                  }
                }
              } else if (typeof first === 'object' && first !== null) {
                points = (raw as Record<string, unknown>[]).map((pt: Record<string, unknown>) => ({
                  lat: Number(pt.latitude ?? pt.lat ?? 0),
                  lng: Number(pt.longitude ?? pt.lng ?? 0),
                  speed: Number(pt.speed ?? 0),
                  time: String(pt.date || pt.time || ''),
                })).filter((pt: { lat: number; lng: number }) => isFinite(pt.lat) && isFinite(pt.lng) && pt.lat !== 0 && pt.lng !== 0)
              }
            }

            return {
              distance: trip.distance || 0, startDate: trip.startDate, endDate: trip.endDate, points,
            }
          }).filter((t: { points: unknown[] }) => t.points.length >= 2)
        }
        if (trackData.parkings && Array.isArray(trackData.parkings)) {
          result.parkings = trackData.parkings.map((p: Record<string, unknown>) => ({
            startDate: p.startDate, endDate: p.endDate, lat: p.latitude ?? p.lat, lng: p.longitude ?? p.lng,
            duration: p.duration || 0, ignitionTime: p.ignitionTime || 0,
          })).filter((p: { lat: unknown; lng: unknown }) => p.lat != null && p.lng != null)
        }
        if (trackData.stops && Array.isArray(trackData.stops)) {
          result.stops = trackData.stops.map((s: Record<string, unknown>) => ({
            startDate: s.startDate, endDate: s.endDate, lat: s.latitude ?? s.lat, lng: s.longitude ?? s.lng, duration: s.duration || 0,
          })).filter((s: { lat: unknown; lng: unknown }) => s.lat != null && s.lng != null)
        }
        if (trackData.refuels && Array.isArray(trackData.refuels)) {
          result.refuels = trackData.refuels.map((r: Record<string, unknown>) => ({
            startDate: r.startDate, endDate: r.endDate, volume: r.volume || r.fuelDiff, lat: r.latitude ?? r.lat, lng: r.longitude ?? r.lng,
          })).filter((r: { lat: unknown; lng: unknown }) => r.lat != null && r.lng != null)
        }
        if (trackData.plums && Array.isArray(trackData.plums)) {
          result.plums = trackData.plums.map((p: Record<string, unknown>) => ({
            startDate: p.startDate, endDate: p.endDate, volume: p.volume || p.fuelDiff, lat: p.latitude ?? p.lat, lng: p.longitude ?? p.lng,
          })).filter((p: { lat: unknown; lng: unknown }) => p.lat != null && p.lng != null)
        }
        return NextResponse.json(result)
      } catch (fetchErr: any) {
        console.error('[Trip Track] Fetch failed:', fetchErr)
        return NextResponse.json({ error: `Ошибка загрузки трека: ${fetchErr.message || 'таймаут'}` }, { status: 502 })
      }
    }

    // ── Sensors action: fetch current sensor data from tracker ──
    if (action === 'sensors') {
      const trip = await db.trip.findUnique({
        where: { id },
        include: { equipment: { select: { id: true, name: true, registrationNum: true } } },
      })
      if (!trip) return NextResponse.json({ error: 'Рейс не найден' }, { status: 404 })

      const tracker = await db.glonassTracker.findFirst({
        where: { equipmentId: trip.equipmentId },
        include: { sensorData: { orderBy: { timestamp: 'desc' } } },
      })
      if (!tracker) {
        return NextResponse.json({
          error: 'У техники нет привязанного трекера',
          hint: 'Привяжите трекер к технике в разделе ГЛОНАСС/GPS',
        }, { status: 404 })
      }

      // Current tracker state (from DB)
      const current: Record<string, unknown> = {
        fuelLevel: tracker.lastFuelLevel ?? null,
        mileage: tracker.lastMileage ?? null,
        speed: tracker.lastSpeed ?? null,
        ignition: tracker.lastIgnition ?? null,
        engineTemp: tracker.lastEngineTemp ?? null,
        latitude: tracker.lastLatitude ?? null,
        longitude: tracker.lastLongitude ?? null,
        altitude: tracker.lastAltitude ?? null,
        course: tracker.lastCourse ?? null,
        address: tracker.lastAddress ?? null,
        lastSeenAt: tracker.lastSeenAt?.toISOString() ?? null,
        lastPositionAt: tracker.lastPositionAt?.toISOString() ?? null,
      }

      // All sensor data from DB
      const sensors = tracker.sensorData.map(s => ({
        type: s.sensorType,
        name: s.sensorName,
        value: s.value,
        stringValue: s.stringValue,
        unit: s.unit,
        timestamp: s.timestamp?.toISOString(),
      }))

      // Try to get Axenta stats for the trip period
      let tripStats: Record<string, unknown> | null = null
      const settings = await db.axentaSettings.findFirst()
      if (settings?.isActive && settings.apiUrl && settings.apiKey) {
        const objectId = tracker.axentaCloudId || tracker.trackerId
        if (objectId) {
          try {
            const token = await getValidToken(settings)
            const startDate = trip.startDate.toISOString()
            const endDate = trip.endDate ? new Date(trip.endDate).toISOString() : new Date().toISOString()

            const statsUrl = `${settings.apiUrl}/api/objects/stats/`
            const statsResponse = await fetch(statsUrl, {
              method: 'POST',
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ objectId: Number(objectId), startDate, endDate }),
              signal: AbortSignal.timeout(15000),
            })
            if (statsResponse.ok) {
              const stats = await statsResponse.json()
              tripStats = {
                mileage: stats.mileage ?? null,
                avgSpeed: stats.avgSpeed ?? null,
                maxSpeed: stats.maxSpeed ?? null,
                fuelConsumption: stats.fuelConsumption ?? null,
                avgFuelConsumption: stats.avgFuelConsumption ?? null,
                refuelVolume: stats.refuelVolume ?? null,
                plumVolume: stats.plumVolume ?? null,
                tripsDuration: stats.tripsDuration ?? null,
                parkingsDuration: stats.parkingsDuration ?? null,
                engineHours: stats.engineHours ?? null,
                idleTime: stats.idleTime ?? null,
              }
            }
          } catch (statsErr) {
            console.error('[Trip Sensors] Stats fetch failed:', statsErr)
          }
        }
      }

      return NextResponse.json({
        tracker: {
          id: tracker.id,
          name: tracker.trackerName || tracker.trackerId,
          imei: tracker.imei,
          isActive: tracker.isActive,
        },
        current,
        sensors,
        tripStats,
        tripStatus: trip.status,
        tripStartDate: trip.startDate.toISOString(),
        tripEndDate: trip.endDate ? new Date(trip.endDate).toISOString() : null,
      })
    }

    // ── Sensor Compare action: compare sensor data at start vs end ──
    if (action === 'sensor-compare') {
      const trip = await db.trip.findUnique({
        where: { id },
        include: { equipment: { select: { id: true, name: true, registrationNum: true } } },
      })
      if (!trip) return NextResponse.json({ error: 'Рейс не найден' }, { status: 404 })

      // Get tracker data
      const tracker = await db.glonassTracker.findFirst({
        where: { equipmentId: trip.equipmentId },
        include: { sensorData: { orderBy: { timestamp: 'desc' } } },
      })

      let currentData: Record<string, unknown> | null = null
      if (tracker) {
        currentData = {
          fuelLevel: tracker.lastFuelLevel ?? null,
          mileage: tracker.lastMileage ?? null,
          speed: tracker.lastSpeed ?? null,
          ignition: tracker.lastIgnition ?? null,
          engineTemp: tracker.lastEngineTemp ?? null,
          latitude: tracker.lastLatitude ?? null,
          longitude: tracker.lastLongitude ?? null,
          altitude: tracker.lastAltitude ?? null,
          course: tracker.lastCourse ?? null,
          address: tracker.lastAddress ?? null,
          lastSeenAt: tracker.lastSeenAt?.toISOString() ?? null,
          sensors: tracker.sensorData.map(s => ({
            type: s.sensorType, name: s.sensorName, value: s.value, unit: s.unit,
          })),
        }
      }

      // Parse start snapshot
      let startSnapshot: Record<string, unknown> | null = null
      if (trip.trackerSnapshotStart) {
        try { startSnapshot = JSON.parse(trip.trackerSnapshotStart) } catch { /* ignore */ }
      }
      // Fallback for old trips that only have trackerSnapshot (was start snapshot before completion)
      if (!startSnapshot && trip.trackerSnapshot && trip.status !== 'completed') {
        try { startSnapshot = JSON.parse(trip.trackerSnapshot) } catch { /* ignore */ }
      }
      // Build start snapshot from trip fields if no snapshot exists
      if (!startSnapshot) {
        const startSensors: Array<{ type: string; name: string; value: number | null; unit: string }> = []
        if (trip.fuelStart != null) startSensors.push({ type: 'fuel', name: 'Топливо на старте', value: trip.fuelStart, unit: 'л' })
        if (trip.mileageStart != null) startSensors.push({ type: 'mileage', name: 'Пробег на старте', value: trip.mileageStart, unit: 'км' })
        startSnapshot = {
          trackerName: tracker?.trackerName || null,
          capturedAt: trip.startDate?.toISOString() || null,
          fuelLevel: trip.fuelStart ?? null,
          mileage: trip.mileageStart ?? null,
          engineTemp: null,
          speed: null,
          ignition: null,
          latitude: null,
          longitude: null,
          altitude: null,
          course: null,
          address: null,
          sensors: startSensors,
          _source: 'trip_fields', // flag that this was built from trip fields, not a real snapshot
        }
      }

      // Try to enrich startSnapshot from Axenta if it was built from trip_fields and has gaps
      if (startSnapshot && (startSnapshot as any)._source === 'trip_fields' && tracker) {
        const settings = await db.axentaSettings.findFirst()
        if (settings?.isActive && settings.apiUrl && settings.apiKey) {
          const objectId = tracker.axentaCloudId || tracker.trackerId
          if (objectId) {
            try {
              const token = await getValidToken(settings)
              // Fetch track for a short window around start to get first point's data
              const startISO = trip.startDate.toISOString()
              const windowEnd = new Date(trip.startDate.getTime() + 5 * 60 * 1000).toISOString() // +5 min window
              const tracksRes = await fetch(`${settings.apiUrl}/api/tracks/create/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  objectId: Number(objectId), startDate: startISO, endDate: windowEnd,
                  trackType: 'single', detectTrips: false, withStops: false, withParkings: false,
                }),
                signal: AbortSignal.timeout(10000),
              })
              if (tracksRes.ok) {
                const tracksData = await tracksRes.json()
                if (tracksData.trips && Array.isArray(tracksData.trips) && tracksData.trips.length > 0) {
                  const firstTrip = tracksData.trips[0]
                  const raw = firstTrip.messagesCoordinates
                  if (Array.isArray(raw) && raw.length > 0) {
                    // Get the first point
                    const firstPt = raw[0]
                    let lat: number | null = null, lng: number | null = null, spd: number | null = null
                    if (Array.isArray(firstPt) && firstPt.length >= 2) {
                      lat = Number(firstPt[0]); lng = Number(firstPt[1]); spd = Number(firstPt[2]) || null
                    } else if (typeof firstPt === 'object' && firstPt !== null) {
                      lat = Number((firstPt as any).latitude ?? (firstPt as any).lat ?? 0)
                      lng = Number((firstPt as any).longitude ?? (firstPt as any).lng ?? 0)
                      spd = Number((firstPt as any).speed ?? 0)
                    }
                    if (lat && lng && lat !== 0 && lng !== 0) {
                      // Fill in missing start snapshot fields from first track point
                      if (startSnapshot.latitude == null) (startSnapshot as any).latitude = lat
                      if (startSnapshot.longitude == null) (startSnapshot as any).longitude = lng
                      if (startSnapshot.speed == null && spd) (startSnapshot as any).speed = spd
                    }
                    // Also try to get sensor data from the first message
                    if (firstTrip.startSensors && Array.isArray(firstTrip.startSensors)) {
                      const existingSensors = new Set(((startSnapshot as any).sensors || []).map((s: any) => s.name || s.type))
                      const newSensors = [...((startSnapshot as any).sensors || [])]
                      for (const s of firstTrip.startSensors) {
                        const key = s.name || s.type
                        if (!existingSensors.has(key)) {
                          newSensors.push({ type: s.type, name: s.name, value: s.value, unit: s.unit })
                          existingSensors.add(key)
                        }
                      }
                      (startSnapshot as any).sensors = newSensors
                    }
                  }
                }
              }
              // Also try to get object state at start time for fuel/mileage
              try {
                const stateRes = await fetch(`${settings.apiUrl}/api/objects/${Number(objectId)}/state/`, {
                  headers: { 'Authorization': `Token ${token}` },
                  signal: AbortSignal.timeout(8000),
                })
                if (stateRes.ok) {
                  const stateData = await stateRes.json()
                  // If start snapshot still missing fuelLevel/mileage, fill from current state
                  if (stateData.fuelLevel != null && (startSnapshot as any).fuelLevel == null) {
                    (startSnapshot as any).fuelLevel = stateData.fuelLevel
                  }
                  if (stateData.mileage != null && (startSnapshot as any).mileage == null) {
                    (startSnapshot as any).mileage = stateData.mileage
                  }
                  if (stateData.engineTemp != null && (startSnapshot as any).engineTemp == null) {
                    (startSnapshot as any).engineTemp = stateData.engineTemp
                  }
                  if (stateData.ignition != null && (startSnapshot as any).ignition == null) {
                    (startSnapshot as any).ignition = stateData.ignition
                  }
                }
              } catch { /* state endpoint not available, ignore */ }
            } catch (enrichErr) {
              console.error('[Sensor Compare] Start enrichment failed:', enrichErr)
            }
          }
        }
        // If still missing after Axenta attempt, supplement with current tracker data as fallback
        if (currentData) {
          if ((startSnapshot as any).fuelLevel == null && currentData.fuelLevel != null) {
            (startSnapshot as any).fuelLevel = currentData.fuelLevel
          }
          if ((startSnapshot as any).mileage == null && currentData.mileage != null) {
            (startSnapshot as any).mileage = currentData.mileage
          }
          if ((startSnapshot as any).engineTemp == null && currentData.engineTemp != null) {
            (startSnapshot as any).engineTemp = currentData.engineTemp
          }
          if ((startSnapshot as any).ignition == null && currentData.ignition != null) {
            (startSnapshot as any).ignition = currentData.ignition
          }
          if ((startSnapshot as any).speed == null && currentData.speed != null) {
            (startSnapshot as any).speed = currentData.speed
          }
          if ((startSnapshot as any).latitude == null && currentData.latitude != null) {
            (startSnapshot as any).latitude = currentData.latitude
          }
          if ((startSnapshot as any).longitude == null && currentData.longitude != null) {
            (startSnapshot as any).longitude = currentData.longitude
          }
          if ((startSnapshot as any).altitude == null && currentData.altitude != null) {
            (startSnapshot as any).altitude = currentData.altitude
          }
          // Merge sensors from current data if not present
          const existingSensorKeys = new Set(((startSnapshot as any).sensors || []).map((s: any) => s.name || s.type))
          const mergedSensors = [...((startSnapshot as any).sensors || [])]
          if (Array.isArray(currentData.sensors)) {
            for (const s of currentData.sensors as any[]) {
              const key = s.name || s.type
              if (!existingSensorKeys.has(key)) {
                mergedSensors.push(s)
                existingSensorKeys.add(key)
              }
            }
          }
          (startSnapshot as any).sensors = mergedSensors
        }
        delete (startSnapshot as any)._source // Remove source flag after enrichment
      }

      // Parse end snapshot
      let endSnapshot: Record<string, unknown> | null = null
      if (trip.status === 'completed' && trip.trackerSnapshot) {
        try { endSnapshot = JSON.parse(trip.trackerSnapshot) } catch { /* ignore */ }
      }
      // Build end snapshot from trip fields if no snapshot exists for completed trip
      if (!endSnapshot && trip.status === 'completed') {
        const endSensors: Array<{ type: string; name: string; value: number | null; unit: string }> = []
        if (trip.fuelEnd != null) endSensors.push({ type: 'fuel', name: 'Топливо на финише', value: trip.fuelEnd, unit: 'л' })
        if (trip.mileageEnd != null) endSensors.push({ type: 'mileage', name: 'Пробег на финише', value: trip.mileageEnd, unit: 'км' })
        endSnapshot = {
          trackerName: tracker?.trackerName || null,
          capturedAt: trip.endDate?.toISOString() || null,
          fuelLevel: trip.fuelEnd ?? null,
          mileage: trip.mileageEnd ?? null,
          engineTemp: null,
          speed: null,
          ignition: null,
          latitude: null,
          longitude: null,
          address: null,
          sensors: endSensors,
          _source: 'trip_fields',
        }
      }
      // For in-progress trips: use current tracker data as "end" snapshot
      if (!endSnapshot && currentData && trip.status === 'in_progress') {
        endSnapshot = {
          trackerName: tracker?.trackerName,
          capturedAt: new Date().toISOString(),
          fuelLevel: currentData.fuelLevel,
          mileage: currentData.mileage,
          engineTemp: currentData.engineTemp,
          speed: currentData.speed,
          ignition: currentData.ignition,
          latitude: currentData.latitude,
          longitude: currentData.longitude,
          address: currentData.address,
          sensors: currentData.sensors,
        }
      }
      // For planned trips: use current tracker data as both start and end (for preview)
      if (!endSnapshot && currentData && trip.status === 'planned') {
        if (!startSnapshot) {
          startSnapshot = {
            trackerName: tracker?.trackerName,
            capturedAt: new Date().toISOString(),
            fuelLevel: currentData.fuelLevel,
            mileage: currentData.mileage,
            engineTemp: currentData.engineTemp,
            speed: currentData.speed,
            ignition: currentData.ignition,
            latitude: currentData.latitude,
            longitude: currentData.longitude,
            address: currentData.address,
            sensors: currentData.sensors,
            _source: 'current_tracker',
          }
        }
        endSnapshot = {
          trackerName: tracker?.trackerName,
          capturedAt: new Date().toISOString(),
          fuelLevel: currentData.fuelLevel,
          mileage: currentData.mileage,
          engineTemp: currentData.engineTemp,
          speed: currentData.speed,
          ignition: currentData.ignition,
          latitude: currentData.latitude,
          longitude: currentData.longitude,
          address: currentData.address,
          sensors: currentData.sensors,
          _source: 'current_tracker',
        }
      }

      // Main tracker fields comparison
      const mainFields = [
        { key: 'fuelLevel', label: 'Уровень топлива', unit: 'л' },
        { key: 'mileage', label: 'Пробег', unit: 'км' },
        { key: 'engineTemp', label: 'Температура двигателя', unit: '°C' },
        { key: 'speed', label: 'Скорость', unit: 'км/ч' },
        { key: 'ignition', label: 'Зажигание', unit: '' },
        { key: 'latitude', label: 'Широта', unit: '°' },
        { key: 'longitude', label: 'Долгота', unit: '°' },
        { key: 'altitude', label: 'Высота', unit: 'м' },
      ]

      const mainComparison = mainFields.map(f => {
        const startVal = startSnapshot ? (startSnapshot as any)[f.key] : null
        const endVal = endSnapshot ? (endSnapshot as any)[f.key] : null
        const diff = (startVal != null && endVal != null && typeof startVal === 'number' && typeof endVal === 'number')
          ? Math.round((endVal - startVal) * 100) / 100 : null
        return {
          key: f.key, label: f.label, unit: f.unit,
          start: startVal, end: endVal, diff,
          changed: diff !== null && diff !== 0,
        }
      })

      // Detailed sensor comparison (from sensors arrays in snapshots)
      const sensorComparison: Array<{
        name: string; type: string; unit: string;
        start: number | null; end: number | null; diff: number | null; changed: boolean;
      }> = []

      if (startSnapshot?.sensors && endSnapshot?.sensors) {
        const startMap = new Map<string, any>()
        const endMap = new Map<string, any>()

        for (const s of (startSnapshot.sensors as any[])) {
          const key = s.name || s.type
          startMap.set(key, s)
        }
        for (const s of (endSnapshot.sensors as any[])) {
          const key = s.name || s.type
          endMap.set(key, s)
        }

        // All sensor keys from both snapshots
        const allKeys = new Set([...startMap.keys(), ...endMap.keys()])
        for (const key of allKeys) {
          const ss = startMap.get(key)
          const es = endMap.get(key)
          const startVal = ss?.value != null ? Number(ss.value) : null
          const endVal = es?.value != null ? Number(es.value) : null
          const diff = (startVal != null && endVal != null)
            ? Math.round((endVal - startVal) * 100) / 100 : null
          sensorComparison.push({
            name: key,
            type: ss?.type || es?.type || '',
            unit: ss?.unit || es?.unit || '',
            start: startVal, end: endVal, diff,
            changed: diff !== null && diff !== 0,
          })
        }
      }

      // Trip stats from Axenta
      let tripStats: Record<string, unknown> | null = null
      if (tracker) {
        const settings = await db.axentaSettings.findFirst()
        if (settings?.isActive && settings.apiUrl && settings.apiKey) {
          const objectId = tracker.axentaCloudId || tracker.trackerId
          if (objectId) {
            try {
              const token = await getValidToken(settings)
              const startDate = trip.startDate.toISOString()
              const endDate = trip.endDate ? new Date(trip.endDate).toISOString() : new Date().toISOString()

              const statsResponse = await fetch(`${settings.apiUrl}/api/objects/stats/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ objectId: Number(objectId), startDate, endDate }),
                signal: AbortSignal.timeout(15000),
              })
              if (statsResponse.ok) {
                const stats = await statsResponse.json()
                tripStats = {
                  mileage: stats.mileage ?? null,
                  avgSpeed: stats.avgSpeed ?? null,
                  maxSpeed: stats.maxSpeed ?? null,
                  fuelConsumption: stats.fuelConsumption ?? null,
                  avgFuelConsumption: stats.avgFuelConsumption ?? null,
                  refuelVolume: stats.refuelVolume ?? null,
                  plumVolume: stats.plumVolume ?? null,
                  tripsDuration: stats.tripsDuration ?? null,
                  parkingsDuration: stats.parkingsDuration ?? null,
                  engineHours: stats.engineHours ?? null,
                  idleTime: stats.idleTime ?? null,
                }
              }
            } catch (statsErr) {
              console.error('[Sensor Compare] Stats fetch failed:', statsErr)
            }
          }
        }
      }

      return NextResponse.json({
        tripId: id,
        tripStatus: trip.status,
        startSnapshot,
        endSnapshot,
        currentData,
        mainComparison,
        sensorComparison,
        tripStats,
        fuelStart: trip.fuelStart,
        fuelEnd: trip.fuelEnd,
        mileageStart: trip.mileageStart,
        mileageEnd: trip.mileageEnd,
        fuelConsumed: trip.fuelConsumed,
        distance: trip.distance,
        avgSpeed: trip.avgSpeed,
        maxSpeed: trip.maxSpeed,
        tripDuration: trip.tripDuration,
        engineHours: trip.engineHours,
        avgFuelRate: trip.avgFuelRate,
        refuelVolume: trip.refuelVolume,
        plumVolume: trip.plumVolume,
        idleTime: trip.idleTime,
        parkingsDuration: trip.parkingsDuration,
      })
    }

    // ── Default: get trip detail ──
    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
        crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true, phone: true } } } },
      },
    })
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    return NextResponse.json(trip)
  } catch (error) {
    console.error('Error fetching trip:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/trips/[id] — Действия с рейсом
//   Body: { action: 'start' }   — Начать рейс с автозаполнением данных трекера
//   Body: { action: 'complete' } — Завершить рейс с захватом данных трекера
// PUT /api/trips/[id] — Обычное обновление рейса
// ═══════════════════════════════════════════════════════════════

async function handleStart(id: string) {
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
      crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Рейс не найден' }, { status: 404 })
  if (trip.status !== 'planned') return NextResponse.json({ error: 'Начать можно только запланированный рейс' }, { status: 400 })

  const now = new Date()
  const updateData: Record<string, unknown> = { status: 'in_progress', startDate: now }

  // Try to get tracker data for auto-fill
  const tracker = await db.glonassTracker.findFirst({
    where: { equipmentId: trip.equipmentId },
    include: { sensorData: true },
  })

  if (tracker) {
    // Auto-fill start values from tracker
    if (tracker.lastFuelLevel != null) updateData.fuelStart = tracker.lastFuelLevel
    if (tracker.lastMileage != null) updateData.mileageStart = Math.round(tracker.lastMileage)

    // Snapshot tracker data at start — save to trackerSnapshotStart
    const snapshot: Record<string, unknown> = {
      trackerId: tracker.id, trackerName: tracker.trackerName, imei: tracker.imei,
      capturedAt: now.toISOString(), fuelLevel: tracker.lastFuelLevel, mileage: tracker.lastMileage,
      engineTemp: tracker.lastEngineTemp, speed: tracker.lastSpeed, ignition: tracker.lastIgnition,
      latitude: tracker.lastLatitude, longitude: tracker.lastLongitude, address: tracker.lastAddress,
      sensors: tracker.sensorData.map(s => ({ type: s.sensorType, name: s.sensorName, value: s.value, unit: s.unit })),
    }
    updateData.trackerSnapshotStart = JSON.stringify(snapshot)
  }

  const updatedTrip = await db.trip.update({
    where: { id },
    data: updateData,
    include: {
      equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
      crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
    },
  })

  await db.equipmentHistory.create({
    data: { equipmentId: trip.equipmentId, event: 'trip_started', description: `Рейс начат: ${trip.route}`, date: now },
  })

  return NextResponse.json(updatedTrip)
}

async function handleComplete(id: string) {
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
      crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Рейс не найден' }, { status: 404 })
  if (trip.status === 'completed') return NextResponse.json({ error: 'Рейс уже завершён' }, { status: 400 })
  if (trip.status === 'cancelled') return NextResponse.json({ error: 'Отменённый рейс нельзя завершить' }, { status: 400 })

  const now = new Date()
  const updateData: Record<string, unknown> = { status: 'completed', endDate: now }

  // Try to get tracker data (any tracker, not just active)
  const tracker = await db.glonassTracker.findFirst({
    where: { equipmentId: trip.equipmentId },
    include: { sensorData: true },
  })

  if (tracker) {
    if (tracker.lastFuelLevel != null && !trip.fuelEnd) updateData.fuelEnd = tracker.lastFuelLevel
    if (tracker.lastMileage != null && !trip.mileageEnd) updateData.mileageEnd = Math.round(tracker.lastMileage)

    const fuelStart = trip.fuelStart ?? null
    const fuelEnd = (updateData.fuelEnd as number) ?? trip.fuelEnd ?? null
    if (fuelStart != null && fuelEnd != null) {
      updateData.fuelConsumed = Math.round((fuelStart - fuelEnd) * 100) / 100
      if (updateData.fuelConsumed < 0) updateData.fuelConsumed = 0
    }

    const mileageStart = trip.mileageStart ?? null
    const mileageEnd = (updateData.mileageEnd as number) ?? trip.mileageEnd ?? null
    if (mileageStart != null && mileageEnd != null && !trip.distance) updateData.distance = mileageEnd - mileageStart

    const startDate = new Date(trip.startDate)
    const durationSec = Math.round((now.getTime() - startDate.getTime()) / 1000)
    updateData.tripDuration = durationSec

    const dist = (updateData.distance as number) ?? trip.distance ?? null
    if (dist && durationSec > 0) updateData.avgSpeed = Math.round((dist / (durationSec / 3600)) * 10) / 10

    // Snapshot tracker data at end — save to trackerSnapshot (keeping trackerSnapshotStart intact)
    const snapshot: Record<string, unknown> = {
      trackerId: tracker.id, trackerName: tracker.trackerName, imei: tracker.imei,
      capturedAt: now.toISOString(), fuelLevel: tracker.lastFuelLevel, mileage: tracker.lastMileage,
      engineTemp: tracker.lastEngineTemp, speed: tracker.lastSpeed, ignition: tracker.lastIgnition,
      latitude: tracker.lastLatitude, longitude: tracker.lastLongitude, address: tracker.lastAddress,
      sensors: tracker.sensorData.map(s => ({ type: s.sensorType, name: s.sensorName, value: s.value, unit: s.unit })),
    }
    updateData.trackerSnapshot = JSON.stringify(snapshot)

    // Try to get stats from Axenta.cloud
    try {
      const settings = await db.axentaSettings.findFirst()
      if (settings?.isActive && settings.apiUrl && settings.apiKey) {
        const objectId = tracker.axentaCloudId || tracker.trackerId
        if (objectId) {
          const token = await getValidToken(settings)
          const statsUrl = `${settings.apiUrl}/api/objects/stats/`
          const statsResponse = await fetch(statsUrl, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ objectId: Number(objectId), startDate: startDate.toISOString(), endDate: now.toISOString() }),
            signal: AbortSignal.timeout(15000),
          })
          if (statsResponse.ok) {
            const stats = await statsResponse.json()
            if (stats.mileage) updateData.distance = Number(stats.mileage)
            if (stats.avgSpeed) updateData.avgSpeed = Number(stats.avgSpeed)
            if (stats.maxSpeed) updateData.maxSpeed = Number(stats.maxSpeed)
            if (stats.fuelConsumption) updateData.fuelConsumed = Number(stats.fuelConsumption)
            if (stats.avgFuelConsumption) updateData.avgFuelRate = Number(stats.avgFuelConsumption)
            if (stats.refuelVolume) updateData.refuelVolume = Number(stats.refuelVolume)
            if (stats.plumVolume) updateData.plumVolume = Number(stats.plumVolume)
            if (stats.tripsDuration) updateData.tripDuration = Number(stats.tripsDuration)
            if (stats.parkingsDuration) updateData.parkingsDuration = Number(stats.parkingsDuration)
            if (stats.engineHours) updateData.engineHours = Number(stats.engineHours)
            if (stats.idleTime) updateData.idleTime = Number(stats.idleTime)
          }
        }
      }
    } catch (statsError) {
      console.error('[Trip Complete] Stats fetch failed:', statsError)
    }
  }

  const updatedTrip = await db.trip.update({
    where: { id },
    data: updateData,
    include: {
      equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
      crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
    },
  })

  await db.equipmentHistory.create({
    data: { equipmentId: trip.equipmentId, event: 'trip_completed', description: `Рейс завершён: ${trip.route}`, date: now },
  })

  return NextResponse.json(updatedTrip)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (body?.action === 'start') return await handleStart(id)
    if (body?.action === 'complete') return await handleComplete(id)
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[Trip POST] Error:', error)
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {
      equipmentId: body.equipmentId || undefined,
      crewId: body.crewId !== undefined ? (body.crewId || null) : undefined,
      route: body.route?.trim() || undefined,
      startPoint: body.startPoint !== undefined ? (body.startPoint || null) : undefined,
      endPoint: body.endPoint !== undefined ? (body.endPoint || null) : undefined,
      cargo: body.cargo !== undefined ? (body.cargo || null) : undefined,
      cargoWeight: body.cargoWeight !== undefined ? (body.cargoWeight ? parseFloat(body.cargoWeight) : null) : undefined,
      distance: body.distance !== undefined ? (body.distance ? parseFloat(body.distance) : null) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      plannedEndDate: body.plannedEndDate !== undefined ? (body.plannedEndDate ? new Date(body.plannedEndDate) : null) : undefined,
      status: body.status || undefined,
      fuelStart: body.fuelStart !== undefined ? (body.fuelStart ? parseFloat(body.fuelStart) : null) : undefined,
      fuelEnd: body.fuelEnd !== undefined ? (body.fuelEnd ? parseFloat(body.fuelEnd) : null) : undefined,
      mileageStart: body.mileageStart !== undefined ? (body.mileageStart ? parseInt(body.mileageStart) : null) : undefined,
      mileageEnd: body.mileageEnd !== undefined ? (body.mileageEnd ? parseInt(body.mileageEnd) : null) : undefined,
      cost: body.cost !== undefined ? (body.cost ? parseFloat(body.cost) : null) : undefined,
      revenue: body.revenue !== undefined ? (body.revenue ? parseFloat(body.revenue) : null) : undefined,
      notes: body.notes !== undefined ? (body.notes || null) : undefined,
      // Allow saving analytics fields via PUT as well
      avgSpeed: body.avgSpeed !== undefined ? (body.avgSpeed ? parseFloat(body.avgSpeed) : null) : undefined,
      maxSpeed: body.maxSpeed !== undefined ? (body.maxSpeed ? parseFloat(body.maxSpeed) : null) : undefined,
      fuelConsumed: body.fuelConsumed !== undefined ? (body.fuelConsumed ? parseFloat(body.fuelConsumed) : null) : undefined,
      tripDuration: body.tripDuration !== undefined ? (body.tripDuration ? parseInt(body.tripDuration) : null) : undefined,
      engineHours: body.engineHours !== undefined ? (body.engineHours ? parseFloat(body.engineHours) : null) : undefined,
      avgFuelRate: body.avgFuelRate !== undefined ? (body.avgFuelRate ? parseFloat(body.avgFuelRate) : null) : undefined,
      refuelVolume: body.refuelVolume !== undefined ? (body.refuelVolume ? parseFloat(body.refuelVolume) : null) : undefined,
      plumVolume: body.plumVolume !== undefined ? (body.plumVolume ? parseFloat(body.plumVolume) : null) : undefined,
      idleTime: body.idleTime !== undefined ? (body.idleTime ? parseInt(body.idleTime) : null) : undefined,
      parkingsDuration: body.parkingsDuration !== undefined ? (body.parkingsDuration ? parseInt(body.parkingsDuration) : null) : undefined,
    }

    const trip = await db.trip.update({
      where: { id },
      data: updateData,
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
        crew: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(trip)
  } catch (error) {
    console.error('Error updating trip:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const trip = await db.trip.findUnique({ where: { id } })
    if (trip) {
      await db.trip.delete({ where: { id } })
      await db.equipmentHistory.create({
        data: { equipmentId: trip.equipmentId, event: 'trip_deleted', description: `Рейс удалён: ${trip.route}`, date: new Date() },
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trip:', error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
