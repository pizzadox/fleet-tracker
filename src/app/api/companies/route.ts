import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const companies = await db.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { ownedEquipment: true, rentedEquipment: true }
        }
      }
    })
    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const company = await db.company.create({
      data: {
        name: body.name,
        inn: body.inn || null,
        kpp: body.kpp || null,
        ogrn: body.ogrn || null,
        address: body.address || null,
        factAddress: body.factAddress || null,
        phone: body.phone || null,
        email: body.email || null,
        director: body.director || null,
        type: body.type || 'owner',
      }
    })
    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
