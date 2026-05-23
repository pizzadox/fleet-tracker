import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const FULL_INCLUDE = {
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
  comments: { orderBy: { createdAt: 'desc' } },
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const repair = await db.repair.findUnique({
      where: { id },
      include: FULL_INCLUDE,
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
        priority: body.priority || undefined,
        repairType: body.repairType || undefined,
        estimatedEndDate: body.estimatedEndDate ? new Date(body.estimatedEndDate) : null,
        estimatedCost: body.estimatedCost !== undefined ? (body.estimatedCost ? parseFloat(String(body.estimatedCost)) : null) : undefined,
        cost: body.cost !== undefined ? (body.cost ? parseFloat(String(body.cost)) : null) : undefined,
        contractor: body.contractor || null,
        contractorPhone: body.contractorPhone || null,
        contractorEmail: body.contractorEmail || null,
        workPerformed: body.workPerformed || null,
        spareParts: body.spareParts || null,
        nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
        location: body.location || null,
        mileageStart: body.mileageStart !== undefined ? (body.mileageStart ? parseInt(String(body.mileageStart)) : null) : undefined,
        mileageEnd: body.mileageEnd !== undefined ? (body.mileageEnd ? parseInt(String(body.mileageEnd)) : null) : undefined,
        downtimeHours: body.downtimeHours !== undefined ? (body.downtimeHours ? parseFloat(String(body.downtimeHours)) : null) : undefined,
        warrantyRepair: body.warrantyRepair !== undefined ? body.warrantyRepair : undefined,
        insuranceClaim: body.insuranceClaim !== undefined ? body.insuranceClaim : undefined,
        insuranceNumber: body.insuranceNumber || null,
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
      await db.repairEmployee.deleteMany({ where: { repairId: id } })
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

    // If repair is completed or cancelled, update equipment status back to active
    if ((body.status === 'completed' || body.status === 'cancelled') && repair.equipmentId) {
      // Check if there are other active repairs for this equipment
      const otherActiveRepairs = await db.repair.count({
        where: {
          equipmentId: repair.equipmentId,
          status: 'in_progress',
          id: { not: id },
        }
      })

      if (otherActiveRepairs === 0) {
        await db.equipment.update({
          where: { id: repair.equipmentId },
          data: { status: 'active' }
        })
      }

      if (body.status === 'completed') {
        await db.equipmentHistory.create({
          data: {
            equipmentId: repair.equipmentId,
            event: 'repair',
            description: `Ремонт завершён: ${repair.description}${repair.cost ? ` (${repair.cost} ₽)` : ''}`,
            date: new Date(),
            oldValue: 'repair',
            newValue: 'active',
          }
        })
      }
    }

    // If repair is paused, log to history
    if (body.status === 'paused' && repair.equipmentId) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: repair.equipmentId,
          event: 'repair',
          description: `Ремонт приостановлен: ${repair.description}`,
          date: new Date(),
          newValue: 'paused',
        }
      })
    }

    // Re-fetch with all relations
    const fullRepair = await db.repair.findUnique({
      where: { id },
      include: FULL_INCLUDE,
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
      // Check if there are other active repairs for this equipment
      const otherActiveRepairs = await db.repair.count({
        where: {
          equipmentId: repair.equipmentId,
          status: 'in_progress',
        }
      })
      if (otherActiveRepairs === 0) {
        await db.equipment.update({
          where: { id: repair.equipmentId },
          data: { status: 'active' }
        })
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repair:', error)
    return NextResponse.json({ error: 'Failed to delete repair' }, { status: 500 })
  }
}
