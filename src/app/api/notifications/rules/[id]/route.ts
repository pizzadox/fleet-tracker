import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/notifications/rules/[id] — update a rule
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const rule = await db.notificationRule.update({
      where: { id },
      data: {
        conditionType: body.conditionType,
        thresholdValue: body.thresholdValue ?? null,
        description: body.description ?? undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        lastTriggeredAt: body.lastTriggeredAt ? new Date(body.lastTriggeredAt) : undefined,
      },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true } },
      },
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating notification rule:', error)
    return NextResponse.json({ error: 'Failed to update notification rule' }, { status: 500 })
  }
}

// DELETE /api/notifications/rules/[id] — delete a rule
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.notificationRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification rule:', error)
    return NextResponse.json({ error: 'Failed to delete notification rule' }, { status: 500 })
  }
}
