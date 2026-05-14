'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons for webpack/next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface TrackerInfo {
  id: string
  trackerName?: string | null
  lastLatitude?: number | null
  lastLongitude?: number | null
  lastSpeed?: number | null
  lastCourse?: number | null
  lastIgnition?: boolean | null
  lastAddress?: string | null
  isActive: boolean
  equipmentName?: string
  registrationNum?: string | null
}

interface TrackerMapProps {
  trackers: TrackerInfo[]
  trackPoints?: Array<{ lat: number; lng: number }>
}

export default function TrackerMap({ trackers, trackPoints }: TrackerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [55.7558, 37.6173], // Moscow default
        zoom: 10,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current

    // Clear existing layers (except tile layer)
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer)
      }
    })

    // Add track polyline
    if (trackPoints && trackPoints.length > 1) {
      const polyline = L.polyline(
        trackPoints.map(p => [p.lat, p.lng]),
        { color: '#3b82f6', weight: 4, opacity: 0.8 }
      ).addTo(map)
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
    }

    // Add markers
    const markers: L.Marker[] = []
    for (const tracker of trackers) {
      if (tracker.lastLatitude == null || tracker.lastLongitude == null) continue

      // Create custom icon with directional arrow
      const color = tracker.isActive ? '#22c55e' : '#ef4444'
      const icon = L.divIcon({
        className: 'custom-tracker-icon',
        html: `<div style="
          width: 32px; height: 32px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 14px; font-weight: bold;
          transform: rotate(${tracker.lastCourse || 0}deg);
        ">▲</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([tracker.lastLatitude, tracker.lastLongitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 180px; font-family: system-ui;">
            <strong>${tracker.equipmentName || tracker.trackerName || 'Трекер'}</strong><br/>
            ${tracker.registrationNum ? `<span style="color:#666">${tracker.registrationNum}</span><br/>` : ''}
            <hr style="margin: 4px 0; border-color: #eee;"/>
            ${tracker.lastSpeed != null ? `Скорость: <strong>${tracker.lastSpeed} км/ч</strong><br/>` : ''}
            ${tracker.lastIgnition != null ? `Зажигание: <strong>${tracker.lastIgnition ? 'Вкл' : 'Выкл'}</strong><br/>` : ''}
            ${tracker.lastAddress ? `Адрес: ${tracker.lastAddress}` : ''}
          </div>
        `)

      markers.push(marker)
    }

    // Fit bounds to markers if no track
    if (markers.length > 0 && (!trackPoints || trackPoints.length <= 1)) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [30, 30] })
    }

    // Invalidate size after render
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      // Cleanup handled by re-running effect
    }
  }, [trackers, trackPoints])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return <div ref={mapRef} className="w-full h-full" />
}
