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

// Helper: fetch full track from Axenta for a period and extract start/end snapshots with sensor data
// Returns { startSnapshot, endSnapshot } built from first/last track points and sensors
async function fetchAxentaTrackSnapshots(
  settings: { apiUrl: string; apiKey: string; username?: string | null; password?: string | null },
  objectId: string,
  tracker: { id: string; trackerName: string | null; imei: string | null },
  startTime: Date,
  endTime: Date
): Promise<{ startSnapshot: Record<string, unknown> | null; endSnapshot: Record<string, unknown> | null }> {
  try {
    const token = await getValidToken(settings)
    const startISO = startTime.toISOString()
    const endISO = endTime.toISOString()

    const tracksRes = await fetch(`${settings.apiUrl}/api/tracks/create/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectId: Number(objectId), startDate: startISO, endDate: endISO,
        trackType: 'single', detectTrips: true, withStops: true, withParkings: true, withRefuels: true, withPlums: true,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!tracksRes.ok) return { startSnapshot: null, endSnapshot: null }

    const tracksData = await tracksRes.json()
    if (!tracksData.trips || !Array.isArray(tracksData.trips) || tracksData.length === 0) {
      return { startSnapshot: null, endSnapshot: null }
    }

    // Use the first trip (most relevant)
    const firstTrip = tracksData.trips[0]
    const raw = firstTrip.messagesCoordinates
    if (!Array.isArray(raw) || raw.length === 0) {
      return { startSnapshot: null, endSnapshot: null }
    }

    // Parse a track point into position data
    const parsePoint = (pt: any): { lat: number | null; lng: number | null; spd: number | null; alt: number | null; crs: number | null } => {
      let lat: number | null = null, lng: number | null = null, spd: number | null = null
      let alt: number | null = null, crs: number | null = null
      if (Array.isArray(pt) && pt.length >= 2) {
        lat = Number(pt[0]); lng = Number(pt[1]); spd = pt.length > 2 ? Number(pt[2]) || null : null
        alt = pt.length > 3 ? Number(pt[3]) || null : null
        crs = pt.length > 4 ? Number(pt[4]) || null : null
      } else if (typeof pt === 'object' && pt !== null) {
        lat = Number(pt.latitude ?? pt.lat ?? 0)
        lng = Number(pt.longitude ?? pt.lng ?? 0)
        spd = Number(pt.speed ?? 0) || null
        alt = Number(pt.altitude ?? pt.alt ?? 0) || null
        crs = Number(pt.course ?? pt.heading ?? 0) || null
      }
      return { lat, lng, spd, alt, crs }
    }

    // Extract sensors from a sensors array, finding fuel/mileage/engineTemp/ignition
    const parseSensors = (sensorsArr: any[]): {
      sensors: Array<{ type: string; name: string; value: number | null; unit: string }>;
      fuelLevel: number | null; mileage: number | null; engineTemp: number | null; ignition: boolean | null;
    } => {
      const sensors: Array<{ type: string; name: string; value: number | null; unit: string }> = []
      let fuelLevel: number | null = null
      let mileage: number | null = null
      let engineTemp: number | null = null
      let ignition: boolean | null = null

      for (const s of sensorsArr) {
        const val = s.value != null ? Number(s.value) : null
        sensors.push({ type: s.type || '', name: s.name || s.type || '', value: val, unit: s.unit || '' })

        // Detect fuel
        if ((s.type === 'fuel_level_sensor' || s.type === 'absolute_fuel_impulse_sensor' ||
             s.name?.toLowerCase().includes('бак') || s.name?.toLowerCase().includes('топлив')) && val != null) {
          if (fuelLevel == null) fuelLevel = val
        }
        // Detect mileage
        if ((s.type === 'odometer' || s.name?.toLowerCase().includes('пробег')) && val != null) {
          if (mileage == null) mileage = val
        }
        // Detect engine temp
        if ((s.type === 'temperature' || s.name?.toLowerCase().includes('температур') || s.name?.toLowerCase().includes('ож')) && val != null) {
          if (engineTemp == null) engineTemp = val
        }
        // Detect ignition
        if ((s.type === 'ignition_sensor' || s.name?.toLowerCase().includes('зажиган')) && val != null) {
          if (ignition == null) ignition = val > 0
        }
      }
      return { sensors, fuelLevel, mileage, engineTemp, ignition }
    }

    // Build snapshot from point + sensors data
    const buildSnapshot = (point: ReturnType<typeof parsePoint>, sensorData: ReturnType<typeof parseSensors>, capturedAt: string): Record<string, unknown> => ({
      trackerId: tracker.id,
      trackerName: tracker.trackerName,
      imei: tracker.imei,
      capturedAt,
      fuelLevel: sensorData.fuelLevel,
      mileage: sensorData.mileage,
      engineTemp: sensorData.engineTemp,
      speed: point.spd,
      ignition: sensorData.ignition,
      latitude: point.lat && point.lat !== 0 ? point.lat : null,
      longitude: point.lng && point.lng !== 0 ? point.lng : null,
      altitude: point.alt || null,
      course: point.crs || null,
      address: null,
      sensors: sensorData.sensors,
      _source: 'axenta_history',
    })

    // First and last points
    const firstPt = parsePoint(raw[0])
    const lastPt = parsePoint(raw[raw.length - 1])

    // Start sensors from track response
    let startSensorsArr: any[] = []
    if (firstTrip.startSensors && Array.isArray(firstTrip.startSensors)) {
      startSensorsArr = firstTrip.startSensors
    }
    // End sensors from track response
    let endSensorsArr: any[] = []
    if (firstTrip.endSensors && Array.isArray(firstTrip.endSensors)) {
      endSensorsArr = firstTrip.endSensors
    }
    // If no endSensors, use startSensors as fallback (some API versions don't return endSensors separately)
    if (endSensorsArr.length === 0 && startSensorsArr.length > 0) {
      endSensorsArr = startSensorsArr
    }

    const startSensorData = parseSensors(startSensorsArr)
    const endSensorData = parseSensors(endSensorsArr)

    // If there are multiple trips, also get data from the last trip
    let lastTripEndPt = lastPt
    let lastTripEndSensors = endSensorData
    if (tracksData.trips.length > 1) {
      const lastTrip = tracksData.trips[tracksData.trips.length - 1]
      const lastTripRaw = lastTrip.messagesCoordinates
      if (Array.isArray(lastTripRaw) && lastTripRaw.length > 0) {
        lastTripEndPt = parsePoint(lastTripRaw[lastTripRaw.length - 1])
        if (lastTrip.endSensors && Array.isArray(lastTrip.endSensors)) {
          lastTripEndSensors = parseSensors(lastTrip.endSensors)
        } else if (lastTrip.startSensors && Array.isArray(lastTrip.startSensors)) {
          lastTripEndSensors = parseSensors(lastTrip.startSensors)
        }
      }
    }

    const startSnapshot = buildSnapshot(firstPt, startSensorData, startISO)
    const endSnapshot = buildSnapshot(lastTripEndPt, lastTripEndSensors, endISO)

    return { startSnapshot, endSnapshot }
  } catch (err) {
    console.error('[fetchAxentaTrackSnapshots] Failed:', err)
    return { startSnapshot: null, endSnapshot: null }
  }
}

// Helper: fetch a single snapshot from Axenta at a specific time (for cases where we need just one point)
async function fetchAxentaSnapshot(
  settings: { apiUrl: string; apiKey: string; username?: string | null; password?: string | null },
  objectId: string,
  tracker: { id: string; trackerName: string | null; imei: string | null },
  targetTime: Date,
  windowMinutes: number = 15
): Promise<Record<string, unknown> | null> {
  const startTime = new Date(targetTime.getTime() - windowMinutes * 60 * 1000)
  const endTime = new Date(targetTime.getTime() + windowMinutes * 60 * 1000)
  const { startSnapshot } = await fetchAxentaTrackSnapshots(settings, objectId, tracker, startTime, endTime)
  return startSnapshot
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

      // Get tracker data (current state for fallback)
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

      // Determine effective start and end times from trip fields
      const effectiveStartTime = trip.startDate ? new Date(trip.startDate) : null
      const effectiveEndTime = trip.endDate ? new Date(trip.endDate) : null

      // ── Try to fetch start AND end snapshots from Axenta track in ONE request ──
      // This ensures data is from the actual trip period with DIFFERENT start/end values
      let axentaStartSnap: Record<string, unknown> | null = null
      let axentaEndSnap: Record<string, unknown> | null = null

      if (tracker && effectiveStartTime) {
        const settings = await db.axentaSettings.findFirst()
        if (settings?.isActive && settings.apiUrl && settings.apiKey) {
          const objectId = tracker.axentaCloudId || tracker.trackerId
          if (objectId) {
            const trackEnd = effectiveEndTime || new Date()
            const result = await fetchAxentaTrackSnapshots(settings, objectId, tracker, effectiveStartTime, trackEnd)
            axentaStartSnap = result.startSnapshot
            axentaEndSnap = result.endSnapshot
          }
        }
      }

      // ── Build START snapshot ──
      // Priority: 1) Saved snapshot (trackerSnapshotStart) → 2) Axenta track start point → 3) Trip fields → 4) Current tracker data
      let startSnapshot: Record<string, unknown> | null = null

      // 1. Use saved snapshot if available
      if (trip.trackerSnapshotStart) {
        try { startSnapshot = JSON.parse(trip.trackerSnapshotStart) } catch { /* ignore */ }
      }
      // Fallback for old trips that only have trackerSnapshot (was start snapshot before completion)
      if (!startSnapshot && trip.trackerSnapshot && trip.status !== 'completed') {
        try { startSnapshot = JSON.parse(trip.trackerSnapshot) } catch { /* ignore */ }
      }

      // 2. Use Axenta track start point
      if (!startSnapshot && axentaStartSnap) {
        startSnapshot = axentaStartSnap
      }

      // 3. Build from trip fields if still no snapshot
      if (!startSnapshot) {
        const startSensors: Array<{ type: string; name: string; value: number | null; unit: string }> = []
        if (trip.fuelStart != null) startSensors.push({ type: 'fuel', name: 'Топливо на старте', value: trip.fuelStart, unit: 'л' })
        if (trip.mileageStart != null) startSensors.push({ type: 'mileage', name: 'Пробег на старте', value: trip.mileageStart, unit: 'км' })
        startSnapshot = {
          trackerName: tracker?.trackerName || null,
          capturedAt: effectiveStartTime?.toISOString() || null,
          fuelLevel: trip.fuelStart ?? null,
          mileage: trip.mileageStart ?? null,
          engineTemp: null, speed: null, ignition: null,
          latitude: null, longitude: null, altitude: null, course: null, address: null,
          sensors: startSensors,
          _source: 'trip_fields',
        }
      }

      // Fill gaps in start snapshot from current tracker data (last resort fallback)
      if (currentData) {
        const fillFields = ['fuelLevel', 'mileage', 'engineTemp', 'speed', 'ignition', 'latitude', 'longitude', 'altitude', 'course']
        for (const f of fillFields) {
          if ((startSnapshot as any)[f] == null && (currentData as any)[f] != null) {
            (startSnapshot as any)[f] = (currentData as any)[f]
          }
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
      delete (startSnapshot as any)._source

      // ── Build END snapshot ──
      // Priority: 1) Saved snapshot (trackerSnapshot) → 2) Axenta track end point → 3) Trip fields → 4) Current tracker data
      let endSnapshot: Record<string, unknown> | null = null

      // 1. Use saved snapshot if available (for completed trips)
      if (trip.status === 'completed' && trip.trackerSnapshot) {
        try { endSnapshot = JSON.parse(trip.trackerSnapshot) } catch { /* ignore */ }
      }

      // 2. Use Axenta track end point (this will be DIFFERENT from start if vehicle moved)
      if (!endSnapshot && axentaEndSnap) {
        endSnapshot = axentaEndSnap
      }

      // 3. Build from trip fields if still no snapshot (for completed trips)
      if (!endSnapshot && trip.status === 'completed') {
        const endSensors: Array<{ type: string; name: string; value: number | null; unit: string }> = []
        if (trip.fuelEnd != null) endSensors.push({ type: 'fuel', name: 'Топливо на финише', value: trip.fuelEnd, unit: 'л' })
        if (trip.mileageEnd != null) endSensors.push({ type: 'mileage', name: 'Пробег на финише', value: trip.mileageEnd, unit: 'км' })
        endSnapshot = {
          trackerName: tracker?.trackerName || null,
          capturedAt: effectiveEndTime?.toISOString() || null,
          fuelLevel: trip.fuelEnd ?? null,
          mileage: trip.mileageEnd ?? null,
          engineTemp: null, speed: null, ignition: null,
          latitude: null, longitude: null, address: null,
          sensors: endSensors,
          _source: 'trip_fields',
        }
      }

      // 4. For in-progress trips: use current tracker data as "end" snapshot (real-time)
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

      // 5. For planned trips: if Axenta didn't return data, use current tracker as preview
      if (!endSnapshot && currentData && trip.status === 'planned') {
        if (!startSnapshot) {
          startSnapshot = {
            trackerName: tracker?.trackerName,
            capturedAt: effectiveStartTime?.toISOString() || new Date().toISOString(),
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
        endSnapshot = {
          trackerName: tracker?.trackerName,
          capturedAt: effectiveStartTime?.toISOString() || new Date().toISOString(),
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

      // Fill gaps in end snapshot from current tracker data (fallback)
      if (endSnapshot && currentData) {
        const fillFields = ['fuelLevel', 'mileage', 'engineTemp', 'speed', 'ignition', 'latitude', 'longitude', 'altitude', 'course']
        for (const f of fillFields) {
          if ((endSnapshot as any)[f] == null && (currentData as any)[f] != null) {
            (endSnapshot as any)[f] = (currentData as any)[f]
          }
        }
        // Merge sensors
        const existingSensorKeys = new Set(((endSnapshot as any).sensors || []).map((s: any) => s.name || s.type))
        const mergedSensors = [...((endSnapshot as any).sensors || [])]
        if (Array.isArray(currentData.sensors)) {
          for (const s of currentData.sensors as any[]) {
            const key = s.name || s.type
            if (!existingSensorKeys.has(key)) {
              mergedSensors.push(s)
              existingSensorKeys.add(key)
            }
          }
        }
        (endSnapshot as any).sensors = mergedSensors
      }
      delete (endSnapshot as any)?._source

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

      // Trip stats from Axenta — use trip's startDate/endDate, not current time
      let tripStats: Record<string, unknown> | null = null
      if (tracker && effectiveStartTime) {
        const settings = await db.axentaSettings.findFirst()
        if (settings?.isActive && settings.apiUrl && settings.apiKey) {
          const objectId = tracker.axentaCloudId || tracker.trackerId
          if (objectId) {
            try {
              const token = await getValidToken(settings)
              const startDate = effectiveStartTime.toISOString()
              const endDate = effectiveEndTime ? effectiveEndTime.toISOString() : new Date().toISOString()

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
  // Use existing startDate if already set (user-specified), otherwise use current time
  const effectiveStartDate = trip.startDate || now
  const updateData: Record<string, unknown> = { status: 'in_progress', startDate: effectiveStartDate }

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
      capturedAt: effectiveStartDate.toISOString(), fuelLevel: tracker.lastFuelLevel, mileage: tracker.lastMileage,
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
    data: { equipmentId: trip.equipmentId, event: 'trip_started', description: `Рейс начат: ${trip.route}`, date: effectiveStartDate },
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
