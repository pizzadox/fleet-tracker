import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const trackers = await db.glonassTracker.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
        sensorData: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      }
    })
    return NextResponse.json(trackers)
  } catch (error) {
    console.error('Error fetching trackers:', error)
    return NextResponse.json({ error: 'Failed to fetch trackers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tracker = await db.glonassTracker.create({
      data: {
        equipmentId: body.equipmentId,
        trackerId: body.trackerId,
        trackerName: body.trackerName || null,
        imei: body.imei || null,
        phoneNumber: body.phoneNumber || null,
        axentaCloudId: body.axentaCloudId || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: {
        equipment: { select: { id: true, name: true } }
      }
    })

    await db.equipmentHistory.create({
      data: {
        equipmentId: body.equipmentId,
        event: 'glonass_connected',
        description: `Подключён ГЛОНАСС трекер: ${body.trackerName || body.trackerId}`,
        date: new Date(),
        newValue: body.trackerId,
      }
    })

    return NextResponse.json(tracker, { status: 201 })
  } catch (error) {
    console.error('Error creating tracker:', error)
    return NextResponse.json({ error: 'Failed to create tracker' }, { status: 500 })
  }
}
