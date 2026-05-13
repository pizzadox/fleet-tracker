import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const stage = await db.repairStage.create({
      data: {
        repairId: id,
        name: body.name,
        description: body.description || null,
        status: body.status || 'pending',
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        performer: body.performer || null,
        cost: body.cost ? parseFloat(String(body.cost)) : null,
        sortOrder: body.sortOrder || 0,
      }
    })

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const stageId = body.stageId

    if (!stageId) {
      return NextResponse.json({ error: 'Stage ID required' }, { status: 400 })
    }

    const stage = await db.repairStage.update({
      where: { id: stageId },
      data: {
        name: body.name,
        description: body.description || null,
        status: body.status,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        performer: body.performer || null,
        cost: body.cost !== undefined ? (body.cost ? parseFloat(String(body.cost)) : null) : undefined,
        sortOrder: body.sortOrder,
      }
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const stageId = searchParams.get('stageId')

    if (!stageId) {
      return NextResponse.json({ error: 'Stage ID required' }, { status: 400 })
    }

    await db.repairStage.delete({ where: { id: stageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json({ error: 'Failed to delete stage' }, { status: 500 })
  }
}
