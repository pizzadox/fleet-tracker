import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const crew = await db.crew.findUnique({
      where: { id },
      include: {
        members: { orderBy: { createdAt: 'asc' } },
        trips: {
          include: { equipment: { select: { id: true, name: true, registrationNum: true } } },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
      },
    })
    if (!crew) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })
    return NextResponse.json(crew)
  } catch (error) {
    console.error('Error fetching crew:', error)
    return NextResponse.json({ error: 'Failed to fetch crew' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, type, status, notes, members } = body

    // If members provided, replace all members
    if (members !== undefined) {
      await db.crewMember.deleteMany({ where: { crewId: id } })
      if (members.length > 0) {
        await db.crewMember.createMany({
          data: members.filter((m: { fullName: string }) => m.fullName?.trim()).map((m: { fullName: string; role: string; phone: string; licenseNum: string; licenseCat: string; notes: string }) => ({
            crewId: id,
            fullName: m.fullName.trim(),
            role: m.role || 'driver',
            phone: m.phone || null,
            licenseNum: m.licenseNum || null,
            licenseCat: m.licenseCat || null,
            notes: m.notes || null,
          })),
        })
      }
    }

    const crew = await db.crew.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description !== undefined ? description || null : undefined,
        type: type || undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: { members: true },
    })

    return NextResponse.json(crew)
  } catch (error) {
    console.error('Error updating crew:', error)
    return NextResponse.json({ error: 'Failed to update crew' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.crew.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting crew:', error)
    return NextResponse.json({ error: 'Failed to delete crew' }, { status: 500 })
  }
}
