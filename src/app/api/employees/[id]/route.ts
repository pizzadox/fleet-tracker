import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        crew: { select: { id: true, name: true, type: true, status: true } },
      },
    })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      fullName, position, phone, email,
      birthDate, hireDate, fireDate,
      licenseNum, licenseCat, licenseExpiry,
      passportSeries, passportNum, address,
      status, salary, notes, crewId,
    } = body

    const employee = await db.employee.update({
      where: { id },
      data: {
        fullName: fullName?.trim(),
        position: position || undefined,
        phone: phone !== undefined ? phone || null : undefined,
        email: email !== undefined ? email || null : undefined,
        birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
        hireDate: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : undefined,
        fireDate: fireDate !== undefined ? (fireDate ? new Date(fireDate) : null) : undefined,
        licenseNum: licenseNum !== undefined ? licenseNum || null : undefined,
        licenseCat: licenseCat !== undefined ? licenseCat || null : undefined,
        licenseExpiry: licenseExpiry !== undefined ? (licenseExpiry ? new Date(licenseExpiry) : null) : undefined,
        passportSeries: passportSeries !== undefined ? passportSeries || null : undefined,
        passportNum: passportNum !== undefined ? passportNum || null : undefined,
        address: address !== undefined ? address || null : undefined,
        status: status || undefined,
        salary: salary !== undefined ? (salary ? parseFloat(salary) : null) : undefined,
        notes: notes !== undefined ? notes || null : undefined,
        crewId: crewId !== undefined ? crewId || null : undefined,
      },
      include: { crew: true },
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
