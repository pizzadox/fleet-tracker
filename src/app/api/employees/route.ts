import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const position = searchParams.get('position') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { licenseNum: { contains: search } },
      ]
    }

    if (position) {
      where.position = position
    }

    if (status) {
      where.status = status
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        crew: { select: { id: true, name: true, type: true } },
        equipment: { select: { id: true, name: true, registrationNum: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fullName, position, phone, email,
      birthDate, hireDate, fireDate,
      licenseNum, licenseCat, licenseExpiry,
      passportSeries, passportNum, address,
      status, salary, notes, crewId, equipmentId,
    } = body

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        fullName: fullName.trim(),
        position: position || 'driver',
        phone: phone || null,
        email: email || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        hireDate: hireDate ? new Date(hireDate) : null,
        fireDate: fireDate ? new Date(fireDate) : null,
        licenseNum: licenseNum || null,
        licenseCat: licenseCat || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        passportSeries: passportSeries || null,
        passportNum: passportNum || null,
        address: address || null,
        status: status || 'active',
        salary: salary ? parseFloat(salary) : null,
        notes: notes || null,
        crewId: crewId || null,
        equipmentId: equipmentId || null,
      },
      include: { crew: true, equipment: { select: { id: true, name: true, registrationNum: true, type: true } } },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
