import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/route-templates/[id] — Get single route template
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const template = await db.routeTemplate.findUnique({
      where: { id },
      include: { points: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!template) return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 })
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching route template:', error)
    return NextResponse.json({ error: 'Ошибка загрузки шаблона' }, { status: 500 })
  }
}

// PUT /api/route-templates/[id] — Update route template
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, startPoint, endPoint, totalDistance, estimatedDuration, notes, points } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Укажите название маршрута' }, { status: 400 })
    }

    // Delete existing points and recreate (simple approach for reordering)
    await db.routeTemplatePoint.deleteMany({ where: { routeTemplateId: id } })

    const template = await db.routeTemplate.update({
      where: { id },
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

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating route template:', error)
    return NextResponse.json({ error: 'Ошибка обновления шаблона' }, { status: 500 })
  }
}

// DELETE /api/route-templates/[id] — Delete route template
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Unlink trips that reference this template
    await db.trip.updateMany({ where: { routeTemplateId: id }, data: { routeTemplateId: null } })

    await db.routeTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting route template:', error)
    return NextResponse.json({ error: 'Ошибка удаления шаблона' }, { status: 500 })
  }
}
