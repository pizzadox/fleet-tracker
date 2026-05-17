import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/geocode?lat=...&lng=...
// Reverse geocode coordinates to address
// GET /api/glonass/geocode?address=...
// Forward geocode address to coordinates
// Tries: Axenta geocoding → Nominatim (OpenStreetMap)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const address = searchParams.get('address')

    // ── Forward geocoding (address → coordinates) ──
    if (address && !lat && !lng) {
      if (!address.trim()) {
        return NextResponse.json({ error: 'Адрес не может быть пустым' }, { status: 400 })
      }

      // Try Axenta geocoding first if configured
      const settings = await db.axentaSettings.findFirst()
      if (settings?.isActive && settings.apiUrl && settings.apiKey) {
        const endpoints = [
          `${settings.apiUrl}/api/geocode/search/?q=${encodeURIComponent(address)}`,
          `${settings.apiUrl}/api/geocoding/search/?q=${encodeURIComponent(address)}`,
        ]
        for (const geoUrl of endpoints) {
          try {
            const geoRes = await fetch(geoUrl, {
              headers: { 'Authorization': `Token ${settings.apiKey}` },
              signal: AbortSignal.timeout(5000),
            })
            if (geoRes.ok) {
              const geoData = await geoRes.json()
              // Try various response formats
              const results = Array.isArray(geoData) ? geoData : (geoData.results || geoData.items || [])
              if (results.length > 0) {
                const first = results[0]
                const lat2 = first.lat || first.latitude || first.geometry?.lat
                const lng2 = first.lng || first.lon || first.longitude || first.geometry?.lng || first.geometry?.lon
                if (lat2 && lng2) {
                  return NextResponse.json({
                    latitude: Number(lat2),
                    longitude: Number(lng2),
                    address: first.address || first.display_name || first.formatted || first.text || address,
                    source: 'axenta',
                  })
                }
              }
              // Single result format
              const lat2 = geoData.lat || geoData.latitude
              const lng2 = geoData.lng || geoData.lon || geoData.longitude
              if (lat2 && lng2) {
                return NextResponse.json({
                  latitude: Number(lat2),
                  longitude: Number(lng2),
                  address: geoData.address || geoData.display_name || geoData.formatted || address,
                  source: 'axenta',
                })
              }
            }
          } catch { /* try next */ }
        }
        // Try POST
        try {
          const geoRes = await fetch(`${settings.apiUrl}/api/geocode/search/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: address, q: address }),
            signal: AbortSignal.timeout(5000),
          })
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const results = Array.isArray(geoData) ? geoData : (geoData.results || geoData.items || [])
            if (results.length > 0) {
              const first = results[0]
              const lat2 = first.lat || first.latitude || first.geometry?.lat
              const lng2 = first.lng || first.lon || first.longitude || first.geometry?.lng || first.geometry?.lon
              if (lat2 && lng2) {
                return NextResponse.json({
                  latitude: Number(lat2),
                  longitude: Number(lng2),
                  address: first.address || first.display_name || first.formatted || first.text || address,
                  source: 'axenta',
                })
              }
            }
          }
        } catch { /* ignore */ }
      }

      // Fallback: Nominatim (OpenStreetMap)
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&accept-language=ru&limit=1`
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'FleetTracker/1.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (nomRes.ok) {
          const nomData = await nomRes.json()
          if (Array.isArray(nomData) && nomData.length > 0) {
            const first = nomData[0]
            return NextResponse.json({
              latitude: Number(first.lat),
              longitude: Number(first.lon),
              address: first.display_name || address,
              source: 'nominatim',
            })
          }
        }
      } catch { /* ignore */ }

      return NextResponse.json({ latitude: null, longitude: null, address: null, source: 'none' })
    }

    // ── Reverse geocoding (coordinates → address) ──

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
