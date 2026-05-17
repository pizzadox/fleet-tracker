import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/geocode?lat=...&lng=...
// Reverse geocode coordinates to address
// Tries: Axenta geocoding → Nominatim (OpenStreetMap)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat и lng обязательны' }, { status: 400 })
    }

    const numLat = Number(lat)
    const numLng = Number(lng)
    if (!isFinite(numLat) || !isFinite(numLng)) {
      return NextResponse.json({ error: 'Неверные координаты' }, { status: 400 })
    }

    // Try Axenta geocoding first if configured
    const settings = await db.axentaSettings.findFirst()
    if (settings?.isActive && settings.apiUrl && settings.apiKey) {
      const endpoints = [
        `${settings.apiUrl}/api/geocode/reverse/?lat=${numLat}&lng=${numLng}`,
        `${settings.apiUrl}/api/geocoding/reverse/?lat=${numLat}&lng=${numLng}`,
      ]
      for (const geoUrl of endpoints) {
        try {
          const geoRes = await fetch(geoUrl, {
            headers: { 'Authorization': `Token ${settings.apiKey}` },
            signal: AbortSignal.timeout(5000),
          })
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const addr = geoData.address || geoData.display_name || geoData.formatted || geoData.text || null
            if (addr) return NextResponse.json({ address: addr, source: 'axenta' })
          }
        } catch { /* try next */ }
      }
      // Try POST
      try {
        const geoRes = await fetch(`${settings.apiUrl}/api/geocode/reverse/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: numLat, lng: numLng }),
          signal: AbortSignal.timeout(5000),
        })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          const addr = geoData.address || geoData.display_name || geoData.formatted || geoData.text || null
          if (addr) return NextResponse.json({ address: addr, source: 'axenta' })
        }
      } catch { /* ignore */ }
    }

    // Fallback: Nominatim (OpenStreetMap)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${numLat}&lon=${numLng}&format=json&accept-language=ru`
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'FleetTracker/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (nomRes.ok) {
        const nomData = await nomRes.json()
        if (nomData.display_name) {
          return NextResponse.json({ address: nomData.display_name, source: 'nominatim' })
        }
      }
    } catch { /* ignore */ }

    return NextResponse.json({ address: null, source: 'none' })
  } catch (error) {
    console.error('[Geocode] Error:', error)
    return NextResponse.json({ error: 'Ошибка геокодирования' }, { status: 500 })
  }
}
