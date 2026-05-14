import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications/rules — list all rules (optionally filtered by equipmentId)
export async function GET(request: NextRequest) {
  try {
    const equipmentId = request.nextUrl.searchParams.get('equipmentId')
    const where = equipmentId ? { equipmentId } : {}

    const rules = await db.notificationRule.findMany({
      where,
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching notification rules:', error)
    return NextResponse.json({ error: 'Failed to fetch notification rules' }, { status: 500 })
  }
}

// POST /api/notifications/rules — create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { equipmentId, conditionType, thresholdValue, description, isActive } = body

    if (!equipmentId || !conditionType) {
      return NextResponse.json({ error: 'equipmentId и conditionType обязательны' }, { status: 400 })
    }

    const validTypes = ['offline', 'not_synced', 'not_moving', 'speed_exceeded', 'fuel_low', 'zone_exit']
    if (!validTypes.includes(conditionType)) {
      return NextResponse.json({ error: `conditionType должен быть одним из: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const rule = await db.notificationRule.create({
      data: {
        equipmentId,
        conditionType,
        thresholdValue: thresholdValue ?? null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating notification rule:', error)
    return NextResponse.json({ error: 'Failed to create notification rule' }, { status: 500 })
  }
}
