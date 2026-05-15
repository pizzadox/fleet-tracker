import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const repair = await db.repair.findUnique({
      where: { id },
      include: {
        equipment: true,
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
    })
    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 })
    }
    return NextResponse.json(repair)
  } catch (error) {
    console.error('Error fetching repair:', error)
    return NextResponse.json({ error: 'Failed to fetch repair' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const repair = await db.repair.update({
      where: { id },
      data: {
        description: body.description,
        reason: body.reason || null,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status,
        cost: body.cost !== undefined ? (body.cost ? parseFloat(String(body.cost)) : null) : undefined,
        contractor: body.contractor || null,
        contractorPhone: body.contractorPhone || null,
        workPerformed: body.workPerformed || null,
        spareParts: body.spareParts || null,
        nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
        notes: body.notes || null,
      },
      include: {
        equipment: true,
        stages: { orderBy: { sortOrder: 'asc' } },
        masters: {
          include: {
            employee: {
              select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true }
            }
          }
        },
      }
    })

    // Handle masters assignment if provided
    if (body.masters !== undefined) {
      // Remove existing masters
      await db.repairEmployee.deleteMany({ where: { repairId: id } })
      // Add new masters
      if (Array.isArray(body.masters)) {
        for (const master of body.masters) {
          if (master.employeeId) {
            await db.repairEmployee.create({
              data: {
                repairId: id,
                employeeId: master.employeeId,
                role: master.role || 'master',
                notes: master.notes || null,
              }
            })
          }
        }
      }
    }

    // If repair is completed, update equipment status back to active
    if (body.status === 'completed' && repair.equipmentId) {
      await db.equipment.update({
        where: { id: repair.equipmentId },
        data: { status: 'active' }
      })

      await db.equipmentHistory.create({
        data: {
          equipmentId: repair.equipmentId,
          event: 'repair',
          description: `Ремонт завершён: ${repair.description}`,
          date: new Date(),
          oldValue: 'repair',
          newValue: 'active',
        }
      })
    }

    // Re-fetch with all relations
    const fullRepair = await db.repair.findUnique({
      where: { id },
      include: {
        equipment: true,
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
    })

    return NextResponse.json(fullRepair || repair)
  } catch (error) {
    console.error('Error updating repair:', error)
    return NextResponse.json({ error: 'Failed to update repair' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const repair = await db.repair.findUnique({ where: { id } })
    if (repair) {
      await db.repair.delete({ where: { id } })
      // Update equipment status
      await db.equipment.update({
        where: { id: repair.equipmentId },
        data: { status: 'active' }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repair:', error)
    return NextResponse.json({ error: 'Failed to delete repair' }, { status: 500 })
  }
}
