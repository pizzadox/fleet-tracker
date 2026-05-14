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

interface SensorData {
  id: string
  sensorType: string
  sensorName?: string | null
  value?: number | null
  stringValue?: string | null
  unit?: string | null
  timestamp: string
}

interface TrackerInfo {
  id: string
  trackerName?: string | null
  lastLatitude?: number | null
  lastLongitude?: number | null
  lastSpeed?: number | null
  lastCourse?: number | null
  lastAltitude?: number | null
  lastIgnition?: boolean | null
  lastFuelLevel?: number | null
  lastMileage?: number | null
  lastEngineTemp?: number | null
  lastAddress?: string | null
  lastSeenAt?: string | null
  lastPositionAt?: string | null
  isActive: boolean
  equipmentName?: string
  registrationNum?: string | null
  equipmentType?: string | null
  sensorData?: SensorData[]
}

interface TrackerMapProps {
  trackers: TrackerInfo[]
  trackPoints?: Array<{ lat: number; lng: number }>
  onMarkerClick?: (trackerId: string) => void
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

function getSensorIcon(type: string): string {
  switch (type) {
    case 'fuel': return '⛽'
    case 'temperature': case 'temp': return '🌡️'
    case 'ignition': return '🔑'
    case 'mileage': case 'odometer': return '📊'
    case 'speed': return '🏃'
    case 'door': return '🚪'
    default: return '📡'
  }
}

function getSensorLabel(type: string): string {
  switch (type) {
    case 'fuel': return 'Топливо'
    case 'temperature': case 'temp': return 'Температура'
    case 'ignition': return 'Зажигание'
    case 'mileage': case 'odometer': return 'Пробег'
    case 'speed': return 'Скорость'
    case 'door': return 'Двери'
    default: return type
  }
}

export default function TrackerMap({ trackers, trackPoints, onMarkerClick }: TrackerMapProps) {
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
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

      const color = tracker.isActive ? '#22c55e' : '#ef4444'
      const regNum = tracker.registrationNum || ''

      // Create custom icon with directional arrow + registration number label
      const icon = L.divIcon({
        className: 'custom-tracker-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 36px; height: 36px;
              background: ${color};
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 16px; font-weight: bold;
              transform: rotate(${tracker.lastCourse || 0}deg);
              transition: transform 0.3s;
            ">▲</div>
            ${regNum ? `<div style="
              margin-top: 2px;
              background: rgba(0,0,0,0.75);
              color: white;
              font-size: 10px;
              font-weight: 600;
              padding: 1px 6px;
              border-radius: 3px;
              white-space: nowrap;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              letter-spacing: 0.5px;
            ">${regNum}</div>` : ''}
          </div>
        `,
        iconSize: [36, regNum ? 52 : 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      })

      // Build sensor data HTML
      let sensorHtml = ''
      if (tracker.sensorData && tracker.sensorData.length > 0) {
        sensorHtml = `
          <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            <div style="font-size: 10px; font-weight: 600; color: #6b7280; margin-bottom: 4px; text-transform: uppercase;">ДАТЧИКИ</div>
            ${tracker.sensorData.map(s => `
              <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0;">
                <span style="font-size: 12px;">${getSensorIcon(s.sensorType)}</span>
                <span style="color: #6b7280; min-width: 70px;">${s.sensorName || getSensorLabel(s.sensorType)}</span>
                <strong>${s.value != null ? s.value : (s.stringValue || '—')}${s.unit ? ' ' + s.unit : ''}</strong>
              </div>
            `).join('')}
          </div>
        `
      }

      // Build full tracker info HTML
      const popupHtml = `
        <div style="min-width: 240px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.5;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="
              width: 28px; height: 28px; border-radius: 6px;
              background: ${color}20; display: flex; align-items: center; justify-content: center;
            ">
              <span style="font-size: 14px;">🚗</span>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13px;">${tracker.equipmentName || tracker.trackerName || 'Трекер'}</div>
              ${regNum ? `<div style="color: #6b7280; font-size: 11px;">${regNum}</div>` : ''}
            </div>
            <div style="margin-left: auto;">
              <span style="
                display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
                background: ${tracker.isActive ? '#dcfce7' : '#fee2e2'}; color: ${tracker.isActive ? '#166534' : '#991b1b'};
              ">${tracker.isActive ? 'Онлайн' : 'Оффлайн'}</span>
            </div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 6px;">
            ${tracker.lastSpeed != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🏃 Скорость</span><strong>${tracker.lastSpeed} км/ч</strong></div>` : ''}
            ${tracker.lastCourse != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🧭 Курс</span><strong>${tracker.lastCourse}°</strong></div>` : ''}
            ${tracker.lastAltitude != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">⛰️ Высота</span><strong>${tracker.lastAltitude} м</strong></div>` : ''}
            ${tracker.lastIgnition != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🔑 Зажигание</span><strong style="color: ${tracker.lastIgnition ? '#166534' : '#991b1b'};">${tracker.lastIgnition ? 'Вкл' : 'Выкл'}</strong></div>` : ''}
            ${tracker.lastFuelLevel != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">⛽ Топливо</span><strong>${tracker.lastFuelLevel}%</strong></div>` : ''}
            ${tracker.lastMileage != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">📊 Пробег</span><strong>${tracker.lastMileage} км</strong></div>` : ''}
            ${tracker.lastEngineTemp != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🌡️ Тemp. двигателя</span><strong>${tracker.lastEngineTemp}°C</strong></div>` : ''}
            ${tracker.lastAddress ? `<div style="padding: 4px 0 0;"><span style="color: #6b7280;">📍</span> ${tracker.lastAddress}</div>` : ''}
            ${tracker.lastSeenAt ? `<div style="color: #9ca3af; font-size: 10px; margin-top: 4px;">⏱ Последняя связь: ${formatDateTime(tracker.lastSeenAt)}</div>` : ''}
            ${tracker.lastPositionAt ? `<div style="color: #9ca3af; font-size: 10px;">📍 Последняя позиция: ${formatDateTime(tracker.lastPositionAt)}</div>` : ''}
          </div>

          ${sensorHtml}
        </div>
      `

      const marker = L.marker([tracker.lastLatitude, tracker.lastLongitude], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 350, minWidth: 240, className: 'tracker-popup' })

      // Handle marker click for external callback
      if (onMarkerClick) {
        marker.on('click', () => {
          onMarkerClick(tracker.id)
        })
      }

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
  }, [trackers, trackPoints, onMarkerClick])

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
