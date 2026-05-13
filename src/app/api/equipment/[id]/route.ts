import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const equipment = await db.equipment.findUnique({
      where: { id },
      include: {
        owner: true,
        renter: true,
        photos: { orderBy: { createdAt: 'desc' } },
        repairs: {
          orderBy: { createdAt: 'desc' },
          include: {
            photos: true,
            stages: { orderBy: { sortOrder: 'asc' } },
          }
        },
        history: { orderBy: { date: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        trackers: {
          include: {
            sensorData: {
              orderBy: { timestamp: 'desc' },
              take: 50,
            }
          }
        },
      }
    })
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }
    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const oldEquipment = await db.equipment.findUnique({ where: { id } })

    const equipment = await db.equipment.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
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
        status: body.status,
        notes: body.notes || null,
        ownerId: body.ownerId || null,
        renterId: body.renterId || null,
      },
      include: {
        owner: true,
        renter: true,
      }
    })

    // Track status changes in history
    if (oldEquipment && oldEquipment.status !== body.status) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: id,
          event: 'status_change',
          description: `Статус изменён: ${getStatusName(oldEquipment.status)} → ${getStatusName(body.status)}`,
          date: new Date(),
          oldValue: oldEquipment.status,
          newValue: body.status,
        }
      })
    }

    // Track owner change
    if (oldEquipment && oldEquipment.ownerId !== body.ownerId) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: id,
          event: 'transfer',
          description: 'Изменён владелец',
          date: new Date(),
          oldValue: oldEquipment.ownerId || '—',
          newValue: body.ownerId || '—',
        }
      })
    }

    // Track renter change
    if (oldEquipment && oldEquipment.renterId !== body.renterId) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: id,
          event: 'rental',
          description: 'Изменён арендатор',
          date: new Date(),
          oldValue: oldEquipment.renterId || '—',
          newValue: body.renterId || '—',
        }
      })
    }

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.equipment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}

function getStatusName(status: string): string {
  const map: Record<string, string> = {
    active: 'В эксплуатации',
    repair: 'На ремонте',
    decommissioned: 'Списана',
    rented: 'В аренде',
  }
  return map[status] || status
}
