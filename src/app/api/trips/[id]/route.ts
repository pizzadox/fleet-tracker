import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/trips/[id] — Получить данные рейса
// GET /api/trips/[id]?action=track — Получить трек рейса из Axenta
// ═══════════════════════════════════════════════════════════════

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
      if (!trip.startDate || !trip.endDate) {
        return NextResponse.json({ error: 'У рейса нет дат начала/окончания' }, { status: 400 })
      }

      const tracker = await db.glonassTracker.findFirst({
        where: { equipmentId: trip.equipmentId, isActive: true },
      })
      if (!tracker) return NextResponse.json({ error: 'У техники нет активного трекера' }, { status: 404 })

      const settings = await db.axentaSettings.findFirst()
      if (!settings?.isActive || !settings.apiUrl || !settings.apiKey) {
        return NextResponse.json({ error: 'Интеграция с Axenta.cloud не настроена' }, { status: 400 })
      }

      const objectId = tracker.axentaCloudId || tracker.trackerId
      if (!objectId) return NextResponse.json({ error: 'У трекера нет ID объекта в Axenta' }, { status: 400 })

      const tracksUrl = `${settings.apiUrl}/api/tracks/create/`
      const tracksResponse = await fetch(tracksUrl, {
        method: 'POST',
        headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: Number(objectId),
          startDate: new Date(trip.startDate).toISOString(),
          endDate: new Date(trip.endDate).toISOString(),
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
        result.trips = trackData.trips.map((trip: Record<string, unknown>) => ({
          distance: trip.distance || 0, startDate: trip.startDate, endDate: trip.endDate,
          points: (trip.messagesCoordinates || []).map((pt: Record<string, unknown>) => ({
            lat: pt.latitude || pt.lat, lng: pt.longitude || pt.lng, speed: pt.speed || 0, time: pt.date || pt.time,
          })),
        }))
      }
      if (trackData.parkings && Array.isArray(trackData.parkings)) {
        result.parkings = trackData.parkings.map((p: Record<string, unknown>) => ({
          startDate: p.startDate, endDate: p.endDate, lat: p.latitude || p.lat, lng: p.longitude || p.lng,
          duration: p.duration || 0, ignitionTime: p.ignitionTime || 0,
        }))
      }
      if (trackData.stops && Array.isArray(trackData.stops)) {
        result.stops = trackData.stops.map((s: Record<string, unknown>) => ({
          startDate: s.startDate, endDate: s.endDate, lat: s.latitude || s.lat, lng: s.longitude || s.lng, duration: s.duration || 0,
        }))
      }
      if (trackData.refuels && Array.isArray(trackData.refuels)) {
        result.refuels = trackData.refuels.map((r: Record<string, unknown>) => ({
          startDate: r.startDate, endDate: r.endDate, volume: r.volume || r.fuelDiff, lat: r.latitude || r.lat, lng: r.longitude || r.lng,
        }))
      }
      if (trackData.plums && Array.isArray(trackData.plums)) {
        result.plums = trackData.plums.map((p: Record<string, unknown>) => ({
          startDate: p.startDate, endDate: p.endDate, volume: p.volume || p.fuelDiff, lat: p.latitude || p.lat, lng: p.longitude || p.lng,
        }))
      }
      return NextResponse.json(result)
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
// POST /api/trips/[id] — Завершение рейса с захватом данных трекера
//   Body: { action: 'complete' }
// PUT /api/trips/[id] — Обычное обновление рейса
// ═══════════════════════════════════════════════════════════════

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

  // Try to get tracker data
  const tracker = await db.glonassTracker.findFirst({
    where: { equipmentId: trip.equipmentId, isActive: true },
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

    // Snapshot tracker data
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
          const statsUrl = `${settings.apiUrl}/api/objects/stats/`
          const statsResponse = await fetch(statsUrl, {
            method: 'POST',
            headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
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

    const trip = await db.trip.update({
      where: { id },
      data: {
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
      },
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
