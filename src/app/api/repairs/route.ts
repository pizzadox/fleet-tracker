import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (equipmentId) where.equipmentId = equipmentId
    if (status) where.status = status

    const repairs = await db.repair.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: {
          select: { id: true, name: true, registrationNum: true, brand: true, model: true }
        },
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
    return NextResponse.json(repairs)
  } catch (error) {
    console.error('Error fetching repairs:', error)
    return NextResponse.json({ error: 'Failed to fetch repairs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const repair = await db.repair.create({
      data: {
        equipmentId: body.equipmentId,
        description: body.description,
        reason: body.reason || null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || 'in_progress',
        cost: body.cost ? parseFloat(String(body.cost)) : null,
        contractor: body.contractor || null,
        contractorPhone: body.contractorPhone || null,
        workPerformed: body.workPerformed || null,
        spareParts: body.spareParts || null,
        nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
        notes: body.notes || null,
      },
      include: {
        equipment: true,
        stages: true,
        masters: {
          include: {
            employee: {
              select: { id: true, fullName: true, position: true, phone: true, status: true, licenseCat: true }
            }
          }
        },
      }
    })

    // Update equipment status to "repair"
    await db.equipment.update({
      where: { id: body.equipmentId },
      data: { status: 'repair' }
    })

    // Add to history
    await db.equipmentHistory.create({
      data: {
        equipmentId: body.equipmentId,
        event: 'repair',
        description: `Постановка на ремонт: ${body.description}`,
        date: new Date(),
        newValue: 'repair',
      }
    })

    // Create default stages if provided
    if (body.stages && Array.isArray(body.stages)) {
      for (let i = 0; i < body.stages.length; i++) {
        await db.repairStage.create({
          data: {
            repairId: repair.id,
            name: body.stages[i].name,
            description: body.stages[i].description || null,
            status: 'pending',
            sortOrder: i,
          }
        })
      }
    }

    // Assign masters if provided
    if (body.masters && Array.isArray(body.masters)) {
      for (const master of body.masters) {
        if (master.employeeId) {
          await db.repairEmployee.create({
            data: {
              repairId: repair.id,
              employeeId: master.employeeId,
              role: master.role || 'master',
              notes: master.notes || null,
            }
          })
        }
      }
    }

    // Re-fetch with all relations
    const fullRepair = await db.repair.findUnique({
      where: { id: repair.id },
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

    return NextResponse.json(fullRepair || repair, { status: 201 })
  } catch (error) {
    console.error('Error creating repair:', error)
    return NextResponse.json({ error: 'Failed to create repair' }, { status: 500 })
  }
}
