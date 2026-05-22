import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')
    const crewId = searchParams.get('crewId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (crewId) where.crewId = crewId
    if (status) where.status = status

    const trips = await db.trip.findMany({
      where,
      select: {
        id: true, equipmentId: true, crewId: true, route: true, startPoint: true, endPoint: true,
        cargo: true, cargoWeight: true, distance: true, startDate: true, endDate: true,
        plannedEndDate: true, status: true, fuelStart: true, fuelEnd: true,
        mileageStart: true, mileageEnd: true, cost: true, revenue: true, notes: true,
        avgSpeed: true, maxSpeed: true, fuelConsumed: true, tripDuration: true,
        engineHours: true, avgFuelRate: true, refuelVolume: true, plumVolume: true,
        idleTime: true, parkingsDuration: true, trackerSnapshot: true, trackerSnapshotStart: true,
        routeTemplateId: true, createdAt: true, updatedAt: true,
        equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
        crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
        routePoints: { orderBy: { sortOrder: 'asc' } },
        routeTemplate: { select: { id: true, name: true, points: { select: { id: true, name: true, address: true, latitude: true, longitude: true, sortOrder: true, distanceFromPrev: true, plannedArrival: true, plannedDeparture: true, notes: true }, orderBy: { sortOrder: 'asc' } } } },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(trips)
  } catch (error) {
    console.error('Error fetching trips:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      equipmentId, crewId, route, startPoint, endPoint,
      cargo, cargoWeight, distance, startDate, endDate,
      plannedEndDate, status, fuelStart, fuelEnd,
      mileageStart, mileageEnd, cost, revenue, notes,
      routePoints: inputRoutePoints,
      routeTemplateId,
    } = body

    if (!equipmentId) return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 })
    if (!route?.trim()) return NextResponse.json({ error: 'Route is required' }, { status: 400 })
    if (!startDate) return NextResponse.json({ error: 'Start date is required' }, { status: 400 })

    // Calculate total distance from route points if not provided
    let totalDistance = distance ? parseFloat(distance) : null
    if (!totalDistance && Array.isArray(inputRoutePoints) && inputRoutePoints.length > 1) {
      const sumDist = inputRoutePoints.reduce((s: number, p: Record<string, unknown>) => s + (Number(p.distanceFromPrev) || 0), 0)
      if (sumDist > 0) totalDistance = sumDist
    }

    const trip = await db.trip.create({
      data: {
        equipmentId,
        crewId: crewId || null,
        routeTemplateId: routeTemplateId || null,
        route: route.trim(),
        startPoint: startPoint || null,
        endPoint: endPoint || null,
        cargo: cargo || null,
        cargoWeight: cargoWeight ? parseFloat(cargoWeight) : null,
        distance: totalDistance,
        startDate: startDate,
        endDate: endDate || null,
        plannedEndDate: plannedEndDate || null,
        status: status || 'planned',
        fuelStart: fuelStart ? parseFloat(fuelStart) : null,
        fuelEnd: fuelEnd ? parseFloat(fuelEnd) : null,
        mileageStart: mileageStart ? parseInt(mileageStart) : null,
        mileageEnd: mileageEnd ? parseInt(mileageEnd) : null,
        cost: cost ? parseFloat(cost) : null,
        revenue: revenue ? parseFloat(revenue) : null,
        notes: notes || null,
        routePoints: Array.isArray(inputRoutePoints) && inputRoutePoints.length > 0 ? {
          create: inputRoutePoints.map((p: Record<string, unknown>, i: number) => ({
            name: String(p.name || `Точка ${i + 1}`),
            address: p.address ? String(p.address) : null,
            latitude: p.latitude ? Number(p.latitude) : null,
            longitude: p.longitude ? Number(p.longitude) : null,
            sortOrder: i,
            plannedArrival: p.plannedArrival ? String(p.plannedArrival) : null,
            plannedDeparture: p.plannedDeparture ? String(p.plannedDeparture) : null,
            distanceFromPrev: p.distanceFromPrev ? Number(p.distanceFromPrev) : null,
            notes: p.notes ? String(p.notes) : null,
          }))
        } : undefined,
      },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
        crew: { select: { id: true, name: true } },
        routePoints: { orderBy: { sortOrder: 'asc' } },
        routeTemplate: { select: { id: true, name: true } },
      },
    })

    // Add to equipment history
    await db.equipmentHistory.create({
      data: {
        equipmentId,
        event: 'trip_created',
        description: `Новый рейс: ${route}`,
        date: new Date(),
      },
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('Error creating trip:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
