import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Haversine distance between two lat/lng points in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// POST /api/route-templates/[id]/optimize — Optimize route point order using nearest neighbor
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const template = await db.routeTemplate.findUnique({
      where: { id },
      include: { points: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!template) return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 })

    const pointsWithCoords = template.points.filter(p => p.latitude != null && p.longitude != null)
    if (pointsWithCoords.length < 2) {
      return NextResponse.json({ error: 'Недостаточно точек с координатами для оптимизации' }, { status: 400 })
    }

    // Nearest neighbor starting from first point
    const n = pointsWithCoords.length
    const visited = new Set<number>()
    const order: number[] = [0]
    visited.add(0)

    while (visited.size < n) {
      const current = order[order.length - 1]
      let nearest = -1, nearestDist = Infinity
      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue
        const dist = haversineDistance(
          pointsWithCoords[current].latitude!, pointsWithCoords[current].longitude!,
          pointsWithCoords[i].latitude!, pointsWithCoords[i].longitude!
        )
        if (dist < nearestDist) { nearestDist = dist; nearest = i }
      }
      if (nearest >= 0) { order.push(nearest); visited.add(nearest) }
    }

    // Reorder: points with coords in optimized order, points without coords at the end
    const optimizedPoints = order.map(i => pointsWithCoords[i])
    const noCoords = template.points.filter(p => p.latitude == null || p.longitude == null)
    const finalOrder = [...optimizedPoints, ...noCoords]

    // Calculate distances
    let totalDistance = 0
    for (let i = 0; i < finalOrder.length; i++) {
      const dist = i === 0 ? 0 : haversineDistance(
        finalOrder[i - 1].latitude!, finalOrder[i - 1].longitude!,
        finalOrder[i].latitude!, finalOrder[i].longitude!
      )
      totalDistance += dist
      await db.routeTemplatePoint.update({
        where: { id: finalOrder[i].id },
        data: { sortOrder: i, distanceFromPrev: i === 0 ? null : parseFloat(dist.toFixed(1)) },
      })
    }

    // Update total distance on template
    await db.routeTemplate.update({
      where: { id },
      data: { totalDistance: parseFloat(totalDistance.toFixed(1)) },
    })

    const updated = await db.routeTemplate.findUnique({
      where: { id },
      include: { points: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json({ template: updated, totalDistance: totalDistance.toFixed(1) })
  } catch (error) {
    console.error('Error optimizing route:', error)
    return NextResponse.json({ error: 'Ошибка оптимизации маршрута' }, { status: 500 })
  }
}
