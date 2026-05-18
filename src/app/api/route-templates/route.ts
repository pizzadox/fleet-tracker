import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/route-templates — List all route templates with points
export async function GET() {
  try {
    const templates = await db.routeTemplate.findMany({
      include: { points: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching route templates:', error)
    return NextResponse.json({ error: 'Ошибка загрузки шаблонов маршрутов' }, { status: 500 })
  }
}

// POST /api/route-templates — Create a new route template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, startPoint, endPoint, totalDistance, estimatedDuration, notes, points } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Укажите название маршрута' }, { status: 400 })
    }

    const template = await db.routeTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        startPoint: startPoint || null,
        endPoint: endPoint || null,
        totalDistance: totalDistance ? parseFloat(totalDistance) : null,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        notes: notes || null,
        points: {
          create: (points || []).map((p: any, i: number) => ({
            name: p.name || `Точка ${i + 1}`,
            address: p.address || null,
            latitude: p.latitude ? parseFloat(p.latitude) : null,
            longitude: p.longitude ? parseFloat(p.longitude) : null,
            sortOrder: i,
            plannedArrival: p.plannedArrival || null,
            plannedDeparture: p.plannedDeparture || null,
            distanceFromPrev: p.distanceFromPrev ? parseFloat(p.distanceFromPrev) : null,
            notes: p.notes || null,
          })),
        },
      },
      include: { points: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating route template:', error)
    return NextResponse.json({ error: 'Ошибка создания шаблона маршрута' }, { status: 500 })
  }
}
