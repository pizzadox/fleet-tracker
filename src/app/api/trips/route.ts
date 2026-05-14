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
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
        crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true } } } },
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
    } = body

    if (!equipmentId) return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 })
    if (!route?.trim()) return NextResponse.json({ error: 'Route is required' }, { status: 400 })
    if (!startDate) return NextResponse.json({ error: 'Start date is required' }, { status: 400 })

    const trip = await db.trip.create({
      data: {
        equipmentId,
        crewId: crewId || null,
        route: route.trim(),
        startPoint: startPoint || null,
        endPoint: endPoint || null,
        cargo: cargo || null,
        cargoWeight: cargoWeight ? parseFloat(cargoWeight) : null,
        distance: distance ? parseFloat(distance) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        status: status || 'planned',
        fuelStart: fuelStart ? parseFloat(fuelStart) : null,
        fuelEnd: fuelEnd ? parseFloat(fuelEnd) : null,
        mileageStart: mileageStart ? parseInt(mileageStart) : null,
        mileageEnd: mileageEnd ? parseInt(mileageEnd) : null,
        cost: cost ? parseFloat(cost) : null,
        revenue: revenue ? parseFloat(revenue) : null,
        notes: notes || null,
      },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
        crew: { select: { id: true, name: true } },
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
