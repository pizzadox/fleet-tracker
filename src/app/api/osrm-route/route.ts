import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const coords = searchParams.get('coords')
    if (!coords) {
      return NextResponse.json({ error: 'coords parameter is required' }, { status: 400 })
    }

    // Proxy OSRM route request through the backend to avoid CORS issues
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    const res = await fetch(osrmUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => `HTTP ${res.status}`)
      return NextResponse.json({ error: `OSRM API error: ${errorText}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[OSRM Route Proxy] Error:', err)
    return NextResponse.json({ error: err.message || 'OSRM route request failed' }, { status: 502 })
  }
}
