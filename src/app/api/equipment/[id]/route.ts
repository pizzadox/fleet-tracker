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

    // Helper: only include field if explicitly provided in body
    const data: Record<string, unknown> = {}
    const setOrNull = (key: string, val: unknown) => { if (val !== undefined) data[key] = val || null }
    const setOrKeep = (key: string, val: unknown) => { if (val !== undefined) data[key] = val }
    const setIntOrNull = (key: string, val: unknown) => { if (val !== undefined) data[key] = val ? parseInt(String(val)) : null }
    const setFloatOrNull = (key: string, val: unknown) => { if (val !== undefined) data[key] = val ? parseFloat(String(val)) : null }
    const setDateOrNull = (key: string, val: unknown) => { if (val !== undefined) data[key] = val ? new Date(val as string) : null }

    setOrKeep('name', body.name)
    setOrKeep('type', body.type)
    setOrNull('brand', body.brand)
    setOrNull('model', body.model)
    setIntOrNull('year', body.year)
    setOrNull('vin', body.vin)
    setOrNull('serialNumber', body.serialNumber)
    setOrNull('registrationNum', body.registrationNum)
    setOrNull('stsNumber', body.stsNumber)
    setOrNull('ptsNumber', body.ptsNumber)
    setOrNull('category', body.category)
    setOrNull('color', body.color)
    setOrNull('engineType', body.engineType)
    setOrNull('engineVolume', body.engineVolume)
    setOrNull('enginePower', body.enginePower)
    setIntOrNull('mileage', body.mileage)
    setOrNull('fuelType', body.fuelType)
    setOrNull('loadCapacity', body.loadCapacity)
    setIntOrNull('passengerSeats', body.passengerSeats)
    setDateOrNull('purchaseDate', body.purchaseDate)
    setFloatOrNull('purchasePrice', body.purchasePrice)
    setFloatOrNull('currentPrice', body.currentPrice)
    setOrNull('insuranceNumber', body.insuranceNumber)
    setDateOrNull('insuranceExpiry', body.insuranceExpiry)
    setDateOrNull('inspectionDate', body.inspectionDate)
    setDateOrNull('inspectionExpiry', body.inspectionExpiry)
    setOrKeep('status', body.status)
    setOrNull('notes', body.notes)
    setOrNull('ownerId', body.ownerId)
    setOrNull('renterId', body.renterId)

    const equipment = await db.equipment.update({
      where: { id },
      data,
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
