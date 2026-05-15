import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST — assign an employee (master) to a repair
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 })
    }

    // Check if already assigned
    const existing = await db.repairEmployee.findUnique({
      where: {
        repairId_employeeId: {
          repairId: id,
          employeeId: body.employeeId,
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Сотрудник уже назначен на этот ремонт' }, { status: 409 })
    }

    const assignment = await db.repairEmployee.create({
      data: {
        repairId: id,
        employeeId: body.employeeId,
        role: body.role || 'master',
        notes: body.notes || null,
      },
      include: {
        employee: {
          select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true }
        }
      }
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error assigning master:', error)
    return NextResponse.json({ error: 'Failed to assign master' }, { status: 500 })
  }
}

// DELETE — unassign an employee from a repair
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId query parameter is required' }, { status: 400 })
    }

    await db.repairEmployee.deleteMany({
      where: { repairId: id, employeeId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing master:', error)
    return NextResponse.json({ error: 'Failed to remove master' }, { status: 500 })
  }
}
