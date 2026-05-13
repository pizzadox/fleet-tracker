import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tracker = await db.glonassTracker.findUnique({
      where: { id },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
        sensorData: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      }
    })
    if (!tracker) {
      return NextResponse.json({ error: 'Tracker not found' }, { status: 404 })
    }
    return NextResponse.json(tracker)
  } catch (error) {
    console.error('Error fetching tracker:', error)
    return NextResponse.json({ error: 'Failed to fetch tracker' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const tracker = await db.glonassTracker.update({
      where: { id },
      data: {
        trackerId: body.trackerId,
        trackerName: body.trackerName || null,
        imei: body.imei || null,
        phoneNumber: body.phoneNumber || null,
        axentaCloudId: body.axentaCloudId || null,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        lastLatitude: body.lastLatitude,
        lastLongitude: body.lastLongitude,
        lastSpeed: body.lastSpeed,
        lastCourse: body.lastCourse,
        lastAltitude: body.lastAltitude,
        lastIgnition: body.lastIgnition,
        lastFuelLevel: body.lastFuelLevel,
        lastMileage: body.lastMileage,
        lastEngineTemp: body.lastEngineTemp,
        lastSeenAt: body.lastSeenAt ? new Date(body.lastSeenAt) : undefined,
        lastPositionAt: body.lastPositionAt ? new Date(body.lastPositionAt) : undefined,
      }
    })
    return NextResponse.json(tracker)
  } catch (error) {
    console.error('Error updating tracker:', error)
    return NextResponse.json({ error: 'Failed to update tracker' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tracker = await db.glonassTracker.findUnique({ where: { id } })
    if (tracker) {
      await db.glonassTracker.delete({ where: { id } })
      await db.equipmentHistory.create({
        data: {
          equipmentId: tracker.equipmentId,
          event: 'glonass_disconnected',
          description: `Отключён ГЛОНАСС трекер: ${tracker.trackerName || tracker.trackerId}`,
          date: new Date(),
          oldValue: tracker.trackerId,
        }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tracker:', error)
    return NextResponse.json({ error: 'Failed to delete tracker' }, { status: 500 })
  }
}
