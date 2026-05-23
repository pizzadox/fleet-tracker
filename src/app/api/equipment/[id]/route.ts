import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function getStatusName(status: string): string {
  const map: Record<string, string> = {
    active: 'В эксплуатации', repair: 'На ремонте', decommissioned: 'Списана',
    rented: 'В аренде', reserved: 'Зарезервирована',
  }
  return map[status] || status
}

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
            masters: {
              include: {
                employee: {
                  select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true }
                }
              },
              orderBy: { assignedAt: 'asc' }
            },
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
        employees: {
          select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true },
          orderBy: { position: 'asc' },
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
    setOrKeep('condition', body.condition)
    setOrNull('location', body.location)
    setOrNull('depot', body.depot)
    setDateOrNull('lastMaintenanceDate', body.lastMaintenanceDate)
    setDateOrNull('nextMaintenanceDate', body.nextMaintenanceDate)
    setIntOrNull('maintenanceInterval', body.maintenanceInterval)
    setFloatOrNull('fuelConsumptionNorm', body.fuelConsumptionNorm)
    setOrNull('tireSize', body.tireSize)
    setDateOrNull('tireReplacementDate', body.tireReplacementDate)
    setDateOrNull('oilChangeDate', body.oilChangeDate)
    setIntOrNull('oilChangeMileage', body.oilChangeMileage)
    setIntOrNull('oilChangeInterval', body.oilChangeInterval)
    setOrNull('assignedDriver', body.assignedDriver)
    setOrNull('garageNumber', body.garageNumber)
    setOrNull('unitNumber', body.unitNumber)
    setDateOrNull('rentalStartDate', body.rentalStartDate)
    setDateOrNull('rentalEndDate', body.rentalEndDate)
    setFloatOrNull('rentalCost', body.rentalCost)
    setDateOrNull('decommissionDate', body.decommissionDate)
    setOrNull('decommissionReason', body.decommissionReason)
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

    // Track condition changes in history
    if (oldEquipment && body.condition !== undefined && oldEquipment.condition !== body.condition) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: id,
          event: 'inspection',
          description: `Состояние изменено: ${oldEquipment.condition || '—'} → ${body.condition}`,
          date: new Date(),
          oldValue: oldEquipment.condition,
          newValue: body.condition,
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
