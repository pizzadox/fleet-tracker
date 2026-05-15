import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function resolveMemberData(crewId: string, m: { employeeId?: string; fullName?: string; role?: string; phone?: string; licenseNum?: string; licenseCat?: string; notes?: string }) {
  // If employeeId provided, auto-fill from employee profile
  if (m.employeeId) {
    const emp = await db.employee.findUnique({ where: { id: m.employeeId } })
    if (emp) {
      return {
        crewId,
        employeeId: emp.id,
        fullName: emp.fullName,
        role: m.role || emp.position || 'driver',
        phone: m.phone || emp.phone || null,
        licenseNum: m.licenseNum || emp.licenseNum || null,
        licenseCat: m.licenseCat || emp.licenseCat || null,
        notes: m.notes || null,
      }
    }
  }
  // Fallback: manual entry
  return {
    crewId,
    employeeId: null as string | null,
    fullName: m.fullName?.trim() || '',
    role: m.role || 'driver',
    phone: m.phone || null,
    licenseNum: m.licenseNum || null,
    licenseCat: m.licenseCat || null,
    notes: m.notes || null,
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const crew = await db.crew.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { employee: true },
        },
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
        // Resolve member data (auto-fill from employee profiles)
        const resolvedMembers = await Promise.all(
          members
            .filter((m: { fullName?: string; employeeId?: string }) => m.fullName?.trim() || m.employeeId)
            .map((m: Record<string, unknown>) => resolveMemberData(id, m as Parameters<typeof resolveMemberData>[1]))
        )
        const validMembers = resolvedMembers.filter(m => m.fullName.trim())

        if (validMembers.length > 0) {
          await db.crewMember.createMany({ data: validMembers })
        }
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
      include: { members: { include: { employee: true } } },
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
