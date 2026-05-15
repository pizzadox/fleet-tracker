import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const crews = await db.crew.findMany({
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { employee: true },
        },
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

async function resolveMemberData(m: { employeeId?: string; fullName?: string; role?: string; phone?: string; licenseNum?: string; licenseCat?: string; notes?: string }) {
  // If employeeId provided, auto-fill from employee profile
  if (m.employeeId) {
    const emp = await db.employee.findUnique({ where: { id: m.employeeId } })
    if (emp) {
      return {
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
    employeeId: null as string | null,
    fullName: m.fullName?.trim() || '',
    role: m.role || 'driver',
    phone: m.phone || null,
    licenseNum: m.licenseNum || null,
    licenseCat: m.licenseCat || null,
    notes: m.notes || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, status, notes, members } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Resolve member data (auto-fill from employee profiles)
    const resolvedMembers = members?.length
      ? await Promise.all(
          members
            .filter((m: { fullName?: string; employeeId?: string }) => m.fullName?.trim() || m.employeeId)
            .map((m: Record<string, unknown>) => resolveMemberData(m as Parameters<typeof resolveMemberData>[0]))
        )
      : []

    // Filter out members with empty fullName after resolution
    const validMembers = resolvedMembers.filter(m => m.fullName.trim())

    const crew = await db.crew.create({
      data: {
        name: name.trim(),
        description: description || null,
        type: type || 'driver',
        status: status || 'active',
        notes: notes || null,
        members: validMembers.length ? {
          create: validMembers,
        } : undefined,
      },
      include: { members: { include: { employee: true } } },
    })

    return NextResponse.json(crew, { status: 201 })
  } catch (error) {
    console.error('Error creating crew:', error)
    return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 })
  }
}
