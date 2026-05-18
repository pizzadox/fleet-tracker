import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/trips/[id]/print — Print-friendly trip report (HTML A4)
// Includes: trip info, crew, fuel/mileage, track data (trips,
// parkings, stops, refuels, plums), sensor comparison, finances
// ═══════════════════════════════════════════════════════════════

const TRIP_STATUS_MAP: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В пути',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

const TRIP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#dcfce7', text: '#166534' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  planned: { bg: '#fef3c7', text: '#92400e' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
}

function fmtDate(d: Date | string | null | undefined, short?: boolean): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (short) return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин`
  return `${Math.floor(sec)} сек`
}

function fmtPrice(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val)
}

function fmtNum(val: number | null | undefined, decimals: number = 1): string {
  if (val == null) return '—'
  return val.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Helper: get valid Axenta token
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
          if (settings.id) await db.axentaSettings.update({ where: { id: settings.id }, data: { apiKey: token } })
        }
      }
    }
  } catch { /* ignore */ }
  return token
}

// Reverse geocode
async function reverseGeocode(apiUrl: string, token: string, lat: number, lng: number): Promise<string | null> {
  const endpoints = [
    `${apiUrl}/api/geocode/reverse/?lat=${lat}&lng=${lng}`,
    `${apiUrl}/api/geocoding/reverse/?lat=${lat}&lng=${lng}`,
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
    } catch { /* try next */ }
  }
  // Try POST method
  try {
    const geoRes = await fetch(`${apiUrl}/api/geocode/reverse/`, {
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
  // Fallback: Nominatim (OpenStreetMap)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'FleetTracker/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (nomRes.ok) {
      const nomData = await nomRes.json()
      if (nomData.display_name) return nomData.display_name
    }
  } catch { /* ignore */ }
  return null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true, name: true, registrationNum: true, brand: true, model: true,
            year: true, vin: true, category: true, type: true,
            ownerId: true, renterId: true,
            owner: { select: { name: true, inn: true, phone: true } },
            renter: { select: { name: true, inn: true, phone: true } },
          }
        },
        crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true, phone: true } } } },
        routeTemplate: { select: { id: true, name: true, points: { select: { name: true, address: true, latitude: true, longitude: true, sortOrder: true, distanceFromPrev: true, plannedArrival: true, plannedDeparture: true, notes: true }, orderBy: { sortOrder: 'asc' as const } } } },
      },
    })
    if (!trip) return new Response('Рейс не найден', { status: 404 })

    const eq = trip.equipment
    const crew = trip.crew
    const status = TRIP_STATUS_MAP[trip.status] || trip.status
    const statusColor = TRIP_STATUS_COLORS[trip.status] || { bg: '#f1f5f9', text: '#475569' }
    const isInProgress = trip.status === 'in_progress'

    // For in-progress trips: unknown end-of-trip data should be marked explicitly
    const unknownLabel = 'неизвестно'

    // Parse snapshots
    let startSnap: Record<string, any> | null = null
    let endSnap: Record<string, any> | null = null
    try { if (trip.trackerSnapshotStart) startSnap = JSON.parse(trip.trackerSnapshotStart) } catch {}
    try { if (trip.trackerSnapshot) endSnap = JSON.parse(trip.trackerSnapshot) } catch {}

    const calcDist = (trip.mileageStart != null && trip.mileageEnd != null) ? trip.mileageEnd - trip.mileageStart : null
    const displayDist = trip.distance ?? calcDist
    const fuelDiff = (trip.fuelStart != null && trip.fuelEnd != null) ? trip.fuelEnd - trip.fuelStart : null

    // ═══ Fetch track data from Axenta ═══
    let trackData: {
      trips: Array<{ distance: number; startDate: string; endDate: string; points: Array<{ lat: number; lng: number; speed: number; time: string | null }> }>;
      parkings: Array<{ startDate: string; endDate: string; lat: number | null; lng: number | null; duration: number }>;
      stops: Array<{ startDate: string; endDate: string; lat: number | null; lng: number | null; duration: number }>;
      refuels: Array<{ startDate: string; endDate: string; volume: number | null; lat: number | null; lng: number | null }>;
      plums: Array<{ startDate: string; endDate: string; volume: number | null; lat: number | null; lng: number | null }>;
    } | null = null

    const tracker = await db.glonassTracker.findFirst({ where: { equipmentId: trip.equipmentId } })
    const settings = await db.axentaSettings.findFirst()

    if (tracker && settings?.isActive && settings.apiUrl && settings.apiKey && trip.startDate) {
      try {
        const token = await getValidToken(settings as any)
        const objectId = tracker.axentaCloudId || tracker.trackerId
        if (objectId) {
          const trackStartDate = trip.startDate
          const trackEndDate = trip.endDate || new Date()

          const tracksRes = await fetch(`${settings.apiUrl}/api/tracks/create/`, {
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

          if (tracksRes.ok) {
            const raw = await tracksRes.json()
            const tripsArr = raw.trips || raw.track || []

            // Transform trips
            const transformedTrips: typeof trackData extends null ? never : NonNullable<typeof trackData>['trips'] = []
            if (Array.isArray(tripsArr)) {
              for (const t of tripsArr) {
                const coords = t.messagesCoordinates || t.points || t.route || t.coordinates
                const points: Array<{ lat: number; lng: number; speed: number; time: string | null }> = []
                if (Array.isArray(coords) && coords.length > 0) {
                  const first = coords[0]
                  if (Array.isArray(first)) {
                    for (const pt of coords) {
                      if (Array.isArray(pt) && pt.length >= 2) {
                        const lat = Number(pt[0]), lng = Number(pt[1])
                        if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0)
                          points.push({ lat, lng, speed: Number(pt[2]) || 0, time: String(pt[5] || pt[3] || '') })
                      }
                    }
                  } else if (typeof first === 'object' && first !== null) {
                    for (const pt of coords) {
                      const lat = Number(pt.latitude ?? pt.lat ?? 0), lng = Number(pt.longitude ?? pt.lng ?? 0)
                      if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0)
                        points.push({ lat, lng, speed: Number(pt.speed ?? 0), time: String(pt.date || pt.time || '') })
                    }
                  }
                }
                if (points.length >= 2) {
                  transformedTrips.push({
                    distance: t.distance || 0,
                    startDate: t.startDate || t.startTime || '',
                    endDate: t.endDate || t.endTime || '',
                    points,
                  })
                }
              }
            }

            // Transform parkings
            const transformedParkings = (raw.parkings || []).map((p: any) => ({
              startDate: p.startDate || '', endDate: p.endDate || '',
              lat: p.latitude ?? p.lat ?? null, lng: p.longitude ?? p.lng ?? null,
              duration: p.duration || 0,
            })).filter((p: any) => p.lat != null && p.lng != null)

            // Transform stops
            const transformedStops = (raw.stops || []).map((s: any) => ({
              startDate: s.startDate || '', endDate: s.endDate || '',
              lat: s.latitude ?? s.lat ?? null, lng: s.longitude ?? s.lng ?? null,
              duration: s.duration || 0,
            })).filter((s: any) => s.lat != null && s.lng != null)

            // Transform refuels
            const transformedRefuels = (raw.refuels || []).map((r: any) => ({
              startDate: r.startDate || '', endDate: r.endDate || '',
              volume: r.volume || r.fuelDiff || null,
              lat: r.latitude ?? r.lat ?? null, lng: r.longitude ?? r.lng ?? null,
            })).filter((r: any) => r.lat != null && r.lng != null)

            // Transform plums
            const transformedPlums = (raw.plums || []).map((p: any) => ({
              startDate: p.startDate || '', endDate: p.endDate || '',
              volume: p.volume || p.fuelDiff || null,
              lat: p.latitude ?? p.lat ?? null, lng: p.longitude ?? p.lng ?? null,
            })).filter((p: any) => p.lat != null && p.lng != null)

            trackData = {
              trips: transformedTrips,
              parkings: transformedParkings,
              stops: transformedStops,
              refuels: transformedRefuels,
              plums: transformedPlums,
            }
          }
        }
      } catch (trackErr) {
        console.error('[Print] Track fetch error:', trackErr)
      }
    }

    // ═══ Reverse geocode start/end points ═══
    let startAddress = trip.startPoint || ''
    let endAddress = trip.endPoint || ''
    const needGeocodeStart = !startAddress && (trip.status === 'completed' || !trip.startPoint)
    const needGeocodeEnd = !endAddress && (trip.status === 'completed' || !trip.endPoint)

    if ((needGeocodeStart || needGeocodeEnd) && settings?.apiUrl && settings?.apiKey && tracker) {
      const token = await getValidToken(settings as any)

      // Get start coordinates from snapshot or track data
      let startLat: number | null = startSnap?.latitude ? Number(startSnap.latitude) : null
      let startLng: number | null = startSnap?.longitude ? Number(startSnap.longitude) : null
      let endLat: number | null = endSnap?.latitude ? Number(endSnap.latitude) : null
      let endLng: number | null = endSnap?.longitude ? Number(endSnap.longitude) : null

      // Fallback: get coordinates from track data (first/last point of first/last trip)
      if (trackData && trackData.trips.length > 0) {
        const firstTrip = trackData.trips[0]
        const lastTrip = trackData.trips[trackData.trips.length - 1]
        if (firstTrip.points.length > 0 && (startLat == null || startLng == null)) {
          startLat = firstTrip.points[0].lat
          startLng = firstTrip.points[0].lng
        }
        if (lastTrip.points.length > 0 && (endLat == null || endLng == null)) {
          endLat = lastTrip.points[lastTrip.points.length - 1].lat
          endLng = lastTrip.points[lastTrip.points.length - 1].lng
        }
      }

      // Fallback: get from tracker last known position
      if (startLat == null || startLng == null) {
        startLat = tracker.lastLatitude
        startLng = tracker.lastLongitude
      }
      if (endLat == null || endLng == null) {
        endLat = tracker.lastLatitude
        endLng = tracker.lastLongitude
      }

      // Geocode start
      if (needGeocodeStart && startLat && startLng && !startAddress) {
        startAddress = await reverseGeocode(settings.apiUrl, token, startLat, startLng) || ''
        // Also try via geocode API (includes Nominatim fallback)
        if (!startAddress) {
          try {
            const geoRes = await fetch(`http://localhost:3000/api/glonass/geocode?lat=${startLat}&lng=${startLng}`, {
              signal: AbortSignal.timeout(10000),
            })
            if (geoRes.ok) {
              const geoData = await geoRes.json()
              if (geoData.address) startAddress = geoData.address
            }
          } catch { /* ignore */ }
        }
      }

      // Geocode end
      if (needGeocodeEnd && endLat && endLng && !endAddress) {
        endAddress = await reverseGeocode(settings.apiUrl, token, endLat, endLng) || ''
        if (!endAddress) {
          try {
            const geoRes = await fetch(`http://localhost:3000/api/glonass/geocode?lat=${endLat}&lng=${endLng}`, {
              signal: AbortSignal.timeout(10000),
            })
            if (geoRes.ok) {
              const geoData = await geoRes.json()
              if (geoData.address) endAddress = geoData.address
            }
          } catch { /* ignore */ }
        }
      }

      // Save resolved addresses back to the trip (so they are available next time)
      if (startAddress && !trip.startPoint) {
        try { await db.trip.update({ where: { id: trip.id }, data: { startPoint: startAddress } }) } catch {}
      }
      if (endAddress && !trip.endPoint) {
        try { await db.trip.update({ where: { id: trip.id }, data: { endPoint: endAddress } }) } catch {}
      }
    }

    // ═══ Build sensor comparison rows ═══
    const mainFields = [
      { key: 'fuelLevel', label: 'Уровень топлива', unit: 'л' },
      { key: 'mileage', label: 'Пробег', unit: 'км' },
      { key: 'engineTemp', label: 'Температура двигателя', unit: '\u00B0C' },
      { key: 'speed', label: 'Скорость', unit: 'км/ч' },
      { key: 'ignition', label: 'Зажигание', unit: '' },
    ]

    function sensorVal(v: any, unit: string): string {
      if (v == null) return '—'
      if (typeof v === 'boolean') return v ? 'Вкл' : 'Выкл'
      const n = Number(v)
      if (unit === 'км') return n.toFixed(0) + ' км'
      if (unit === 'л') return n.toFixed(1) + ' л'
      return n.toFixed(1) + (unit ? ' ' + unit : '')
    }

    let mainCompRows = ''
    for (const f of mainFields) {
      const sv = startSnap?.[f.key]
      const ev = endSnap?.[f.key]
      if (sv != null || ev != null) {
        const diff = (typeof sv === 'number' && typeof ev === 'number') ? ev - sv : null
        const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(f.unit === 'км' ? 0 : 1)}${f.unit ? ' ' + f.unit : ''}` : '—'
        const changed = diff !== null && diff !== 0
        mainCompRows += `<tr${changed ? ' class="changed"' : ''}><td>${f.label}</td><td>${sensorVal(sv, f.unit)}</td><td>${sensorVal(ev, f.unit)}</td><td>${diffStr}</td></tr>`
      }
    }

    // Extra sensor rows from sensor arrays
    let sensorCompRows = ''
    if (startSnap?.sensors && endSnap?.sensors) {
      const startMap = new Map<string, any>()
      const endMap = new Map<string, any>()
      for (const s of startSnap.sensors) startMap.set(s.name || s.type, s)
      for (const s of endSnap.sensors) endMap.set(s.name || s.type, s)
      for (const key of new Set([...startMap.keys(), ...endMap.keys()])) {
        if (mainFields.some(f => key.toLowerCase().includes(f.key.toLowerCase()))) continue
        const ss = startMap.get(key), es = endMap.get(key)
        const sv = ss?.value != null ? Number(ss.value) : null
        const ev = es?.value != null ? Number(es.value) : null
        if (sv == null && ev == null) continue
        const unit = ss?.unit || es?.unit || ''
        const diff = (sv != null && ev != null) ? ev - sv : null
        const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}${unit ? ' ' + unit : ''}` : '—'
        const changed = diff !== null && diff !== 0
        sensorCompRows += `<tr${changed ? ' class="changed"' : ''}><td>${key}</td><td>${sensorVal(sv, unit)}</td><td>${sensorVal(ev, unit)}</td><td>${diffStr}</td></tr>`
      }
    }

    // ═══ Crew ═══
    let crewHtml = '—'
    if (crew?.members && crew.members.length > 0) {
      crewHtml = crew.members.map(m =>
        `<div class="crew-member"><strong>${m.fullName}</strong> <span class="role">(${m.role || '—'})</span>${m.phone ? ' <span class="phone">' + m.phone + '</span>' : ''}</div>`
      ).join('')
    }

    // ═══ Track table rows ═══
    let trackTripsHtml = ''
    let totalTrackDist = 0
    if (trackData && trackData.trips.length > 0) {
      for (let i = 0; i < trackData.trips.length; i++) {
        const t = trackData.trips[i]
        totalTrackDist += Number(t.distance) || 0
        const pts = t.points
        const firstPt = pts[0]
        const lastPt = pts[pts.length - 1]
        trackTripsHtml += `<tr>
          <td>${i + 1}</td>
          <td>${fmtDate(t.startDate)}</td>
          <td>${fmtDate(t.endDate)}</td>
          <td class="num">${Number(t.distance).toFixed(1)} км</td>
          <td class="num">${pts.length}</td>
          <td class="coords">${firstPt ? firstPt.lat.toFixed(5) + ', ' + firstPt.lng.toFixed(5) : '—'}</td>
          <td class="coords">${lastPt ? lastPt.lat.toFixed(5) + ', ' + lastPt.lng.toFixed(5) : '—'}</td>
        </tr>`
      }
    }

    let parkingsHtml = ''
    if (trackData && trackData.parkings.length > 0) {
      for (const p of trackData.parkings) {
        parkingsHtml += `<tr>
          <td>${fmtDate(p.startDate)}</td>
          <td>${fmtDate(p.endDate)}</td>
          <td class="num">${fmtDur(p.duration)}</td>
          <td class="coords">${p.lat?.toFixed(5)}, ${p.lng?.toFixed(5)}</td>
        </tr>`
      }
    }

    let refuelsHtml = ''
    if (trackData && trackData.refuels.length > 0) {
      for (const r of trackData.refuels) {
        refuelsHtml += `<tr>
          <td>${fmtDate(r.startDate)}</td>
          <td class="num">${r.volume != null ? r.volume.toFixed(1) + ' л' : '—'}</td>
          <td class="coords">${r.lat?.toFixed(5)}, ${r.lng?.toFixed(5)}</td>
        </tr>`
      }
    }

    let plumsHtml = ''
    if (trackData && trackData.plums.length > 0) {
      for (const p of trackData.plums) {
        plumsHtml += `<tr>
          <td>${fmtDate(p.startDate)}</td>
          <td class="num">${p.volume != null ? p.volume.toFixed(1) + ' л' : '—'}</td>
          <td class="coords">${p.lat?.toFixed(5)}, ${p.lng?.toFixed(5)}</td>
        </tr>`
      }
    }

    // ═══ SVG Track Map ═══
    let trackSvg = ''
    if (trackData && trackData.trips.length > 0) {
      const allPoints = trackData.trips.flatMap(t => t.points)
      if (allPoints.length >= 2) {
        const lats = allPoints.map(p => p.lat)
        const lngs = allPoints.map(p => p.lng)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        const pad = 0.005
        const rangeLat = (maxLat - minLat) + pad * 2 || 0.01
        const rangeLng = (maxLng - minLng) + pad * 2 || 0.01
        const svgW = 700, svgH = 300
        const scale = Math.min(svgW / rangeLng, svgH / rangeLat)
        const offsetX = (svgW - rangeLng * scale) / 2
        const offsetY = (svgH - rangeLat * scale) / 2

        const toX = (lng: number) => offsetX + (lng - minLng + pad) * scale
        const toY = (lat: number) => svgH - offsetY - (lat - minLat + pad) * scale

        // Build polyline
        let pathD = ''
        for (const t of trackData.trips) {
          for (let i = 0; i < t.points.length; i++) {
            const p = t.points[i]
            const cmd = (i === 0 && !pathD) ? 'M' : 'L'
            pathD += `${cmd}${toX(p.lng).toFixed(2)},${toY(p.lat).toFixed(2)} `
          }
        }

        // Parking markers
        let parkingMarkers = ''
        for (const p of trackData.parkings) {
          if (p.lat != null && p.lng != null) {
            parkingMarkers += `<rect x="${toX(p.lng) - 4}" y="${toY(p.lat) - 4}" width="8" height="8" fill="#f59e0b" stroke="#fff" stroke-width="1" rx="2"/>`
          }
        }

        // Refuel markers
        let refuelMarkers = ''
        for (const r of trackData.refuels) {
          if (r.lat != null && r.lng != null) {
            refuelMarkers += `<circle cx="${toX(r.lng)}" cy="${toY(r.lat)}" r="5" fill="#10b981" stroke="#fff" stroke-width="1"/>`
          }
        }

        // Plum markers
        let plumMarkers = ''
        for (const p of trackData.plums) {
          if (p.lat != null && p.lng != null) {
            plumMarkers += `<circle cx="${toX(p.lng)}" cy="${toY(p.lat)}" r="5" fill="#ef4444" stroke="#fff" stroke-width="1"/>`
          }
        }

        // Start/End markers
        const startPt = trackData.trips[0].points[0]
        const lastTrip = trackData.trips[trackData.trips.length - 1]
        const endPt = lastTrip.points[lastTrip.points.length - 1]

        trackSvg = `
        <div class="track-map">
          <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${svgW}px;height:auto;">
            <rect width="100%" height="100%" fill="#f8fafc" rx="4"/>
            <!-- Grid -->
            <line x1="0" y1="${svgH / 2}" x2="${svgW}" y2="${svgH / 2}" stroke="#e2e8f0" stroke-width="0.5"/>
            <line x1="${svgW / 2}" y1="0" x2="${svgW / 2}" y2="${svgH}" stroke="#e2e8f0" stroke-width="0.5"/>
            <!-- Track path -->
            <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Markers -->
            ${parkingMarkers}
            ${refuelMarkers}
            ${plumMarkers}
            <!-- Start marker -->
            <circle cx="${toX(startPt.lng)}" cy="${toY(startPt.lat)}" r="7" fill="#22c55e" stroke="#fff" stroke-width="2"/>
            <text x="${toX(startPt.lng)}" y="${toY(startPt.lat) - 12}" text-anchor="middle" font-size="10" fill="#166534" font-weight="bold">Старт</text>
            <!-- End marker -->
            <circle cx="${toX(endPt.lng)}" cy="${toY(endPt.lat)}" r="7" fill="#ef4444" stroke="#fff" stroke-width="2"/>
            <text x="${toX(endPt.lng)}" y="${toY(endPt.lat) - 12}" text-anchor="middle" font-size="10" fill="#991b1b" font-weight="bold">Финиш</text>
          </svg>
          <div class="map-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#22c55e"></span> Старт</span>
            <span class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> Финиш</span>
            <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span> Трек</span>
            <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span> Стоянка</span>
            <span class="legend-item"><span class="legend-dot" style="background:#10b981"></span> Заправка</span>
            <span class="legend-item"><span class="legend-dot" style="background:#ef4444;border-radius:50%"></span> Слив</span>
          </div>
        </div>`
      }
    }

    // ═══ Build HTML ═══
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Путевой лист — ${trip.route}</title>
  <style>
    @page { size: A4; margin: 15mm 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 9.5pt; color: #1a1a1a; line-height: 1.45;
      background: #e5e7eb;
      padding: 20px 0;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      padding: 15mm 18mm;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      min-height: 297mm;
    }

    /* Header */
    .doc-header { border-bottom: 2.5px solid #1e40af; padding-bottom: 10px; margin-bottom: 14px; }
    .doc-title-row { display: flex; justify-content: space-between; align-items: center; }
    .doc-title { font-size: 16pt; font-weight: 700; color: #1e40af; letter-spacing: -0.3px; }
    .doc-subtitle { font-size: 10pt; color: #475569; margin-top: 2px; }
    .status-badge { padding: 3px 10px; border-radius: 4px; font-size: 8.5pt; font-weight: 600; }
    .doc-meta { font-size: 8pt; color: #94a3b8; margin-top: 6px; }

    /* Sections */
    .section { margin-bottom: 12px; page-break-inside: avoid; }
    .section-title { font-size: 10.5pt; font-weight: 700; color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; }

    /* Grid layouts */
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 20px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 20px; }
    .field { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 9pt; border-bottom: 1px dotted #f1f5f9; }
    .field .label { color: #6b7280; min-width: 120px; }
    .field .value { font-weight: 500; text-align: right; }
    .val-green { color: #059669; font-weight: 600; }
    .val-red { color: #dc2626; font-weight: 600; }
    .val-orange { color: #d97706; font-weight: 600; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th { background: #f1f5f9; text-align: left; padding: 4px 6px; border-bottom: 1.5px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 8pt; }
    td { padding: 3px 6px; border-bottom: 1px solid #f8fafc; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.coords { font-family: 'Consolas', monospace; font-size: 7.5pt; color: #6b7280; }
    tr.changed { background: #fffbeb; }
    tr.changed td:last-child { color: #d97706; font-weight: 600; }

    /* Track map */
    .track-map { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; page-break-inside: avoid; }
    .map-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; font-size: 7.5pt; color: #6b7280; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

    /* Crew */
    .crew-member { margin-bottom: 2px; }
    .crew-member .role { color: #6b7280; font-size: 8.5pt; }
    .crew-member .phone { color: #6b7280; font-size: 8.5pt; }

    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 30px; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 3px; font-size: 8pt; color: #6b7280; margin-top: 50px; }

    /* Footer */
    .footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 7pt; color: #9ca3af; text-align: center; }

    /* Print */
    @media print {
      body { background: #fff; padding: 0; font-size: 9pt; }
      .page { max-width: none; padding: 0; box-shadow: none; margin: 0; min-height: auto; }
      .no-print { display: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div class="doc-header">
    <div class="doc-title-row">
      <div>
        <div class="doc-title">ПУТЕВОЙ ЛИСТ</div>
        <div class="doc-subtitle">${trip.route}</div>
      </div>
      <div style="text-align:right">
        <span class="status-badge" style="background:${statusColor.bg};color:${statusColor.text}">${status}</span>
        <div class="doc-meta">№ ${trip.id.slice(0, 8).toUpperCase()}</div>
      </div>
    </div>
    <div class="doc-meta" style="margin-top:4px">
      Дата формирования: ${fmtDate(new Date())}
    </div>
    ${isInProgress ? '<div style="margin-top:6px;padding:6px 10px;background:#fef3c7;border:1px solid #fbbf24;border-radius:4px;font-size:8.5pt;color:#92400e;">Рейс находится в пути. Данные о завершении рейса (расстояние, топливо на финише, пробег и т.д.) будут доступны после окончания рейса. Неизвестные данные помечены как «неизвестно».</div>' : ''}
  </div>

  <!-- ═══ TRANSPORT INFO ═══ -->
  <div class="section">
    <div class="section-title">Транспортное средство</div>
    <div class="grid2">
      <div class="field"><span class="label">Наименование</span><span class="value">${eq?.name || '—'}</span></div>
      <div class="field"><span class="label">Гос. номер</span><span class="value">${eq?.registrationNum || '—'}</span></div>
      <div class="field"><span class="label">Марка / Модель</span><span class="value">${[eq?.brand, eq?.model].filter(Boolean).join(' ') || '—'}</span></div>
      <div class="field"><span class="label">Год выпуска</span><span class="value">${eq?.year || '—'}</span></div>
      <div class="field"><span class="label">Тип</span><span class="value">${eq?.type || '—'}</span></div>
      <div class="field"><span class="label">Категория</span><span class="value">${eq?.category || '—'}</span></div>
      <div class="field"><span class="label">VIN</span><span class="value">${eq?.vin || '—'}</span></div>
      <div class="field"><span class="label">Владелец</span><span class="value">${eq?.owner?.name || '—'}</span></div>
      ${eq?.renter ? `<div class="field"><span class="label">Арендатор</span><span class="value">${eq.renter.name}</span></div>` : ''}
    </div>
  </div>

  <!-- ═══ ROUTE ═══ -->
  <div class="section">
    <div class="section-title">Маршрут</div>
    <div class="grid2">
      <div class="field"><span class="label">Пункт отправления</span><span class="value">${trip.startPoint || startAddress || '—'}</span></div>
      <div class="field"><span class="label">Пункт назначения</span><span class="value">${trip.endPoint || endAddress || (isInProgress ? unknownLabel : '—')}</span></div>
      <div class="field"><span class="label">Груз</span><span class="value">${trip.cargo || '—'}</span></div>
      <div class="field"><span class="label">Вес груза</span><span class="value">${trip.cargoWeight != null ? trip.cargoWeight + ' т' : '—'}</span></div>
      <div class="field"><span class="label">Расстояние</span><span class="value val-green">${displayDist != null ? fmtNum(displayDist, 1) + ' км' : (isInProgress ? unknownLabel : '—')}</span></div>
    </div>
  </div>

  <!-- ═══ TIME ═══ -->
  <div class="section">
    <div class="section-title">Время</div>
    <div class="grid2">
      <div class="field"><span class="label">Начало рейса</span><span class="value">${fmtDate(trip.startDate)}</span></div>
      <div class="field"><span class="label">Окончание рейса</span><span class="value">${fmtDate(trip.endDate) || (isInProgress ? unknownLabel : '—')}</span></div>
      <div class="field"><span class="label">Планируемое окончание</span><span class="value">${fmtDate(trip.plannedEndDate)}</span></div>
      <div class="field"><span class="label">Длительность</span><span class="value">${fmtDur(trip.tripDuration) || (isInProgress ? unknownLabel : '—')}</span></div>
      <div class="field"><span class="label">Время стоянок</span><span class="value">${fmtDur(trip.parkingsDuration) || (isInProgress ? unknownLabel : '—')}</span></div>
      <div class="field"><span class="label">Моточасы</span><span class="value">${fmtDur(trip.engineHours) || (isInProgress ? unknownLabel : '—')}</span></div>
    </div>
  </div>

  <!-- ═══ CREW ═══ -->
  <div class="section">
    <div class="section-title">Экипаж</div>
    <div class="field"><span class="label">Экипаж</span><span class="value">${crew?.name || '—'}</span></div>
    <div style="margin-top:4px">${crewHtml}</div>
  </div>

  <!-- ═══ FUEL & MILEAGE ═══ -->
  <div class="section">
    <div class="section-title">Топливо и пробег</div>
    <div class="grid2">
      <div class="field"><span class="label">Топливо на старте</span><span class="value">${trip.fuelStart != null ? trip.fuelStart + ' л' : '—'}</span></div>
      <div class="field"><span class="label">Топливо на финише</span><span class="value">${trip.fuelEnd != null ? trip.fuelEnd + ' л' : (isInProgress ? unknownLabel : '—')}</span></div>
      ${fuelDiff != null ? `<div class="field"><span class="label">Расход топлива</span><span class="value ${fuelDiff < 0 ? 'val-orange' : 'val-green'}">${fuelDiff.toFixed(1)} л</span></div>` : ''}
      ${trip.fuelConsumed != null ? `<div class="field"><span class="label">Расход (по трекеру)</span><span class="value val-orange">${trip.fuelConsumed.toFixed(1)} л</span></div>` : ''}
      ${trip.avgFuelRate != null ? `<div class="field"><span class="label">Средний расход</span><span class="value">${trip.avgFuelRate.toFixed(1)} л/100км</span></div>` : ''}
      <div class="field"><span class="label"></span><span class="value"></span></div>
      <div class="field"><span class="label">Пробег на старте</span><span class="value">${trip.mileageStart != null ? trip.mileageStart.toLocaleString('ru-RU') + ' км' : '—'}</span></div>
      <div class="field"><span class="label">Пробег на финише</span><span class="value">${trip.mileageEnd != null ? trip.mileageEnd.toLocaleString('ru-RU') + ' км' : (isInProgress ? unknownLabel : '—')}</span></div>
      ${trip.refuelVolume != null && trip.refuelVolume > 0 ? `<div class="field"><span class="label">Заправки</span><span class="value val-green">+${trip.refuelVolume.toFixed(1)} л</span></div>` : ''}
      ${trip.plumVolume != null && trip.plumVolume > 0 ? `<div class="field"><span class="label">Сливы</span><span class="value val-red">-${trip.plumVolume.toFixed(1)} л</span></div>` : ''}
    </div>
  </div>

  <!-- ═══ SPEED STATS ═══ -->
  ${(trip.avgSpeed != null || trip.maxSpeed != null || trip.idleTime != null) ? `
  <div class="section">
    <div class="section-title">Скоростные показатели</div>
    <div class="grid3">
      ${trip.avgSpeed != null ? `<div class="field"><span class="label">Средняя скорость</span><span class="value">${trip.avgSpeed.toFixed(0)} км/ч</span></div>` : ''}
      ${trip.maxSpeed != null ? `<div class="field"><span class="label">Макс. скорость</span><span class="value">${trip.maxSpeed.toFixed(0)} км/ч</span></div>` : ''}
      ${trip.idleTime != null ? `<div class="field"><span class="label">Холостой ход</span><span class="value">${fmtDur(trip.idleTime)}</span></div>` : ''}
    </div>
  </div>` : ''}

  <!-- ═══ SENSOR COMPARISON ═══ -->
  ${mainCompRows ? `
  <div class="section">
    <div class="section-title">Показания датчиков (старт / финиш)</div>
    <table>
      <thead><tr><th>Показатель</th><th>Старт</th><th>Финиш</th><th>Разница</th></tr></thead>
      <tbody>${mainCompRows}</tbody>
    </table>
  </div>` : ''}

  ${sensorCompRows ? `
  <div class="section">
    <div class="section-title">Датчики</div>
    <table>
      <thead><tr><th>Датчик</th><th>Старт</th><th>Финиш</th><th>Разница</th></tr></thead>
      <tbody>${sensorCompRows}</tbody>
    </table>
  </div>` : ''}

  <!-- ═══ TRACK MAP ═══ -->
  ${trackSvg ? `
  <div class="section">
    <div class="section-title">Трек на карте</div>
    ${trackSvg}
  </div>` : ''}

  <!-- ═══ TRACK TABLE: TRIPS ═══ -->
  ${trackTripsHtml ? `
  <div class="section">
    <div class="section-title">Поездки по трекеру (${trackData!.trips.length} сегмент${trackData!.trips.length === 1 ? '' : trackData!.trips.length < 5 ? 'а' : 'ов'}, ${fmtNum(totalTrackDist, 1)} км)</div>
    <table>
      <thead><tr><th>#</th><th>Начало</th><th>Окончание</th><th>Расстояние</th><th>Точек</th><th>Старт (ш., д.)</th><th>Финиш (ш., д.)</th></tr></thead>
      <tbody>${trackTripsHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- ═══ TRACK TABLE: PARKINGS ═══ -->
  ${parkingsHtml ? `
  <div class="section">
    <div class="section-title">Стоянки (${trackData!.parkings.length})</div>
    <table>
      <thead><tr><th>Начало</th><th>Окончание</th><th>Длительность</th><th>Координаты</th></tr></thead>
      <tbody>${parkingsHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- ═══ TRACK TABLE: REFUELS ═══ -->
  ${refuelsHtml ? `
  <div class="section">
    <div class="section-title">Заправки</div>
    <table>
      <thead><tr><th>Время</th><th>Объём</th><th>Координаты</th></tr></thead>
      <tbody>${refuelsHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- ═══ TRACK TABLE: PLUMS ═══ -->
  ${plumsHtml ? `
  <div class="section">
    <div class="section-title">Сливы</div>
    <table>
      <thead><tr><th>Время</th><th>Объём</th><th>Координаты</th></tr></thead>
      <tbody>${plumsHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- ═══ FINANCES ═══ -->
  ${(trip.cost != null || trip.revenue != null) ? `
  <div class="section">
    <div class="section-title">Финансы</div>
    <div class="grid2">
      <div class="field"><span class="label">Стоимость</span><span class="value">${fmtPrice(trip.cost)}</span></div>
      <div class="field"><span class="label">Доход</span><span class="value">${fmtPrice(trip.revenue)}</span></div>
    </div>
  </div>` : ''}

  <!-- ═══ NOTES ═══ -->
  ${trip.notes ? `
  <div class="section">
    <div class="section-title">Примечания</div>
    <p style="font-size:9pt;white-space:pre-wrap;line-height:1.4;">${trip.notes}</p>
  </div>` : ''}

  <!-- ═══ SIGNATURES ═══ -->
  <div class="signatures">
    <div><div class="sig-line">Водитель / ________________ / ${crew?.members?.[0]?.fullName || ''}</div></div>
    <div><div class="sig-line">Диспетчер / ________________</div></div>
    <div><div class="sig-line">Механик / ________________</div></div>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    Путевой лист сформирован автоматически &bull; ${fmtDate(new Date())} &bull; Fleet Tracker
  </div>

  <!-- ═══ PRINT BUTTON (not printed) ═══ -->
  <div class="no-print" style="text-align:center;margin-top:16px;">
    <button onclick="window.print()" style="padding:8px 20px;font-size:10pt;cursor:pointer;background:#1e40af;color:white;border:none;border-radius:4px;">Печать</button>
  </div>
</div>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error generating trip print:', error)
    return new Response('Ошибка формирования отчёта', { status: 500 })
  }
}
