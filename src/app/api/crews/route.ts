import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const crews = await db.crew.findMany({
      include: {
        members: { orderBy: { createdAt: 'asc' } },
        _count: { select: { trips: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(crews)
  } catch (error) {
    console.error('Error fetching crews:', error)
    return NextResponse.json({ error: 'Failed to fetch crews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, status, notes, members } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const crew = await db.crew.create({
      data: {
        name: name.trim(),
        description: description || null,
        type: type || 'driver',
        status: status || 'active',
        notes: notes || null,
        members: members?.length ? {
          create: members.filter((m: { fullName: string }) => m.fullName?.trim()).map((m: { fullName: string; role: string; phone: string; licenseNum: string; licenseCat: string; notes: string }) => ({
            fullName: m.fullName.trim(),
            role: m.role || 'driver',
            phone: m.phone || null,
            licenseNum: m.licenseNum || null,
            licenseCat: m.licenseCat || null,
            notes: m.notes || null,
          }))
        } : undefined,
      },
      include: { members: true },
    })

    return NextResponse.json(crew, { status: 201 })
  } catch (error) {
    console.error('Error creating crew:', error)
    return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 })
  }
}
