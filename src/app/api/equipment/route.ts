import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { registrationNum: { contains: search } },
        { vin: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

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
          select: { id: true, fullName: true, position: true, phone: true, status: true },
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
