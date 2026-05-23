import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const condition = searchParams.get('condition') || ''
    const ownerId = searchParams.get('ownerId') || ''
    const renterId = searchParams.get('renterId') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { registrationNum: { contains: search } },
        { vin: { contains: search } },
        { garageNumber: { contains: search } },
        { unitNumber: { contains: search } },
        { assignedDriver: { contains: search } },
      ]
    }

    if (status) where.status = status
    if (type) where.type = type
    if (condition) where.condition = condition
    if (ownerId) where.ownerId = ownerId
    if (renterId) where.renterId = renterId

    const equipment = await db.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        renter: true,
        _count: {
          select: { repairs: true, photos: true }
        },
        trackers: {
          include: {
            sensorData: {
              orderBy: { timestamp: 'desc' },
              take: 20,
            }
          }
        },
        employees: {
          select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true },
        },
      }
    })
    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const equipment = await db.equipment.create({
      data: {
        name: body.name,
        type: body.type || 'автомобиль',
        brand: body.brand || null,
        model: body.model || null,
        year: body.year ? parseInt(String(body.year)) : null,
        vin: body.vin || null,
        serialNumber: body.serialNumber || null,
        registrationNum: body.registrationNum || null,
        stsNumber: body.stsNumber || null,
        ptsNumber: body.ptsNumber || null,
        category: body.category || null,
        color: body.color || null,
        engineType: body.engineType || null,
        engineVolume: body.engineVolume || null,
        enginePower: body.enginePower || null,
        mileage: body.mileage ? parseInt(String(body.mileage)) : null,
        fuelType: body.fuelType || null,
        loadCapacity: body.loadCapacity || null,
        passengerSeats: body.passengerSeats ? parseInt(String(body.passengerSeats)) : null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchasePrice: body.purchasePrice ? parseFloat(String(body.purchasePrice)) : null,
        currentPrice: body.currentPrice ? parseFloat(String(body.currentPrice)) : null,
        insuranceNumber: body.insuranceNumber || null,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
        inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : null,
        inspectionExpiry: body.inspectionExpiry ? new Date(body.inspectionExpiry) : null,
        status: body.status || 'active',
        condition: body.condition || 'good',
        location: body.location || null,
        depot: body.depot || null,
        lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : null,
        nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : null,
        maintenanceInterval: body.maintenanceInterval ? parseInt(String(body.maintenanceInterval)) : null,
        fuelConsumptionNorm: body.fuelConsumptionNorm ? parseFloat(String(body.fuelConsumptionNorm)) : null,
        tireSize: body.tireSize || null,
        tireReplacementDate: body.tireReplacementDate ? new Date(body.tireReplacementDate) : null,
        oilChangeDate: body.oilChangeDate ? new Date(body.oilChangeDate) : null,
        oilChangeMileage: body.oilChangeMileage ? parseInt(String(body.oilChangeMileage)) : null,
        oilChangeInterval: body.oilChangeInterval ? parseInt(String(body.oilChangeInterval)) : null,
        assignedDriver: body.assignedDriver || null,
        garageNumber: body.garageNumber || null,
        unitNumber: body.unitNumber || null,
        rentalStartDate: body.rentalStartDate ? new Date(body.rentalStartDate) : null,
        rentalEndDate: body.rentalEndDate ? new Date(body.rentalEndDate) : null,
        rentalCost: body.rentalCost ? parseFloat(String(body.rentalCost)) : null,
        decommissionDate: body.decommissionDate ? new Date(body.decommissionDate) : null,
        decommissionReason: body.decommissionReason || null,
        notes: body.notes || null,
        ownerId: body.ownerId || null,
        renterId: body.renterId || null,
      },
      include: {
        owner: true,
        renter: true,
      }
    })

    // Create history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: equipment.id,
        event: 'registration',
        description: 'Техника зарегистрирована в системе',
        date: new Date(),
        newValue: equipment.name,
      }
    })

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
  }
}
