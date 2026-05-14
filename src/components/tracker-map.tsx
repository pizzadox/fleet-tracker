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

// Rich track data from Axenta API
interface TripPoint {
  lat: number
  lng: number
  speed: number
  time: string
}

interface TripSegment {
  distance: number
  startDate: string
  endDate: string
  points: TripPoint[]
}

interface ParkingStop {
  startDate: string
  endDate: string
  lat: number
  lng: number
  duration: number  // seconds
  ignitionTime?: number
}

interface TrackData {
  track?: {
    distance: number
    startDate: string
    endDate: string
    count: number
  }
  trips?: TripSegment[]
  parkings?: ParkingStop[]
  stops?: ParkingStop[]
  refuels?: Array<Record<string, unknown>>
  plums?: Array<Record<string, unknown>>
}

interface TrackerMapProps {
  trackers: TrackerInfo[]
  trackPoints?: Array<{ lat: number; lng: number }>
  trackData?: TrackData | null
  onMarkerClick?: (trackerId: string) => void
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

function formatTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}ч ${m}мин`
  return `${m}мин`
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

function formatSpeedKmh(speed: number): string {
  return `${Math.round(speed)} км/ч`
}

// Color scale for speed: green -> yellow -> orange -> red
function speedToColor(speed: number): string {
  if (speed <= 0) return '#9ca3af'     // grey for stationary
  if (speed <= 20) return '#22c55e'    // green
  if (speed <= 40) return '#84cc16'    // lime
  if (speed <= 60) return '#eab308'    // yellow
  if (speed <= 80) return '#f97316'    // orange
  if (speed <= 100) return '#ef4444'   // red
  return '#dc2626'                      // dark red
}

export default function TrackerMap({ trackers, trackPoints, trackData, onMarkerClick }: TrackerMapProps) {
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

    const allBounds: L.LatLngBounds[] = []

    // ── RICH TRACK RENDERING ──────────────────────────────────────
    if (trackData && trackData.trips && trackData.trips.length > 0) {
      // Render each trip segment with speed-colored segments
      for (const trip of trackData.trips) {
        if (!trip.points || trip.points.length < 2) continue

        // Draw colored segments based on speed
        for (let i = 1; i < trip.points.length; i++) {
          const prev = trip.points[i - 1]
          const curr = trip.points[i]
          const avgSpeed = (prev.speed + curr.speed) / 2
          const color = speedToColor(avgSpeed)

          L.polyline(
            [[prev.lat, prev.lng], [curr.lat, curr.lng]],
            { color, weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }
          ).addTo(map)
        }

        // Trip start marker (green circle with "A")
        const firstPoint = trip.points[0]
        const startIcon = L.divIcon({
          className: 'track-marker',
          html: `<div style="
            width: 30px; height: 30px;
            background: #22c55e;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 13px; font-weight: bold;
          ">A</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })
        L.marker([firstPoint.lat, firstPoint.lng], { icon: startIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: system-ui; font-size: 12px; min-width: 180px;">
              <div style="font-weight: 700; color: #22c55e; margin-bottom: 4px;">🟢 Начало поездки</div>
              <div>⏱ ${formatTime(trip.startDate)}</div>
              <div>📅 ${formatDateTime(trip.startDate)}</div>
              ${trip.distance ? `<div>📏 ${trip.distance.toFixed(1)} км</div>` : ''}
            </div>
          `, { className: 'track-popup' })

        // Trip end marker (red circle with "B")
        const lastPoint = trip.points[trip.points.length - 1]
        const endIcon = L.divIcon({
          className: 'track-marker',
          html: `<div style="
            width: 30px; height: 30px;
            background: #ef4444;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 13px; font-weight: bold;
          ">B</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })
        L.marker([lastPoint.lat, lastPoint.lng], { icon: endIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: system-ui; font-size: 12px; min-width: 180px;">
              <div style="font-weight: 700; color: #ef4444; margin-bottom: 4px;">🔴 Конец поездки</div>
              <div>⏱ ${formatTime(trip.endDate)}</div>
              <div>📅 ${formatDateTime(trip.endDate)}</div>
              <div>🏁 Скорость: ${lastPoint.speed} км/ч</div>
              ${trip.distance ? `<div>📏 ${trip.distance.toFixed(1)} км</div>` : ''}
            </div>
          `, { className: 'track-popup' })

        // Add direction arrows along the track every N points
        const arrowInterval = Math.max(1, Math.floor(trip.points.length / 8))
        for (let i = arrowInterval; i < trip.points.length - 1; i += arrowInterval) {
          const p = trip.points[i]
          const next = trip.points[Math.min(i + 1, trip.points.length - 1)]
          const angle = Math.atan2(next.lng - p.lng, next.lat - p.lat) * (180 / Math.PI)

          const arrowIcon = L.divIcon({
            className: 'track-arrow',
            html: `<div style="
              width: 16px; height: 16px;
              display: flex; align-items: center; justify-content: center;
              transform: rotate(${angle}deg);
              color: #3b82f6; font-size: 12px; opacity: 0.7;
            ">▶</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
          L.marker([p.lat, p.lng], { icon: arrowIcon, interactive: false }).addTo(map)
        }

        // Collect bounds
        const tripBounds = L.latLngBounds(trip.points.map(p => [p.lat, p.lng]))
        allBounds.push(tripBounds)
      }

      // Render parkings (blue P markers)
      if (trackData.parkings && trackData.parkings.length > 0) {
        for (const parking of trackData.parkings) {
          const parkingIcon = L.divIcon({
            className: 'parking-marker',
            html: `<div style="
              width: 28px; height: 28px;
              background: #3b82f6;
              border-radius: 6px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 13px; font-weight: bold;
            ">P</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          L.marker([parking.lat, parking.lng], { icon: parkingIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui; font-size: 12px; min-width: 180px;">
                <div style="font-weight: 700; color: #3b82f6; margin-bottom: 4px;">🅿️ Стоянка</div>
                <div>⏱ Длительность: ${formatDuration(parking.duration)}</div>
                <div>📅 С: ${formatDateTime(parking.startDate)}</div>
                <div>📅 По: ${formatDateTime(parking.endDate)}</div>
                ${parking.ignitionTime != null && parking.ignitionTime > 0 ? `<div>🔑 Моточасы: ${formatDuration(parking.ignitionTime)}</div>` : ''}
              </div>
            `, { className: 'track-popup' })

          allBounds.push(L.latLngBounds([[parking.lat, parking.lng], [parking.lat, parking.lng]]))
        }
      }

      // Render stops (orange markers)
      if (trackData.stops && trackData.stops.length > 0) {
        for (const stop of trackData.stops) {
          const stopIcon = L.divIcon({
            className: 'stop-marker',
            html: `<div style="
              width: 22px; height: 22px;
              background: #f97316;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              color: white; font-size: 10px; font-weight: bold;
            ">⏸</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })
          L.marker([stop.lat, stop.lng], { icon: stopIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui; font-size: 12px; min-width: 180px;">
                <div style="font-weight: 700; color: #f97316; margin-bottom: 4px;">⏸ Остановка</div>
                <div>⏱ Длительность: ${formatDuration(stop.duration)}</div>
                <div>📅 С: ${formatDateTime(stop.startDate)}</div>
                <div>📅 По: ${formatDateTime(stop.endDate)}</div>
              </div>
            `, { className: 'track-popup' })

          allBounds.push(L.latLngBounds([[stop.lat, stop.lng], [stop.lat, stop.lng]]))
        }
      }

      // Fit bounds to all track data
      if (allBounds.length > 0) {
        const combined = allBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(allBounds[0]))
        map.fitBounds(combined, { padding: [40, 40] })
      }

      // Add speed legend to map
      const legend = L.control({ position: 'bottomright' })
      legend.onAdd = () => {
        const div = L.DomUtil.create('div', '')
        div.style.cssText = 'background: rgba(255,255,255,0.92); padding: 8px 12px; border-radius: 8px; font-size: 11px; font-family: system-ui; box-shadow: 0 2px 8px rgba(0,0,0,0.15); line-height: 1.6;'
        div.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 4px; font-size: 10px; color: #6b7280;">СКОРОСТЬ</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#9ca3af;border-radius:2px;display:inline-block;"></span> 0</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#22c55e;border-radius:2px;display:inline-block;"></span> ≤20</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#84cc16;border-radius:2px;display:inline-block;"></span> ≤40</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#eab308;border-radius:2px;display:inline-block;"></span> ≤60</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#f97316;border-radius:2px;display:inline-block;"></span> ≤80</div>
          <div style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:4px;background:#ef4444;border-radius:2px;display:inline-block;"></span> &gt;80</div>
          <div style="font-size:9px;color:#9ca3af;margin-top:2px;">км/ч</div>
        `
        return div
      }
      legend.addTo(map)

    } else if (trackPoints && trackPoints.length > 1) {
      // ── SIMPLE TRACK FALLBACK ──────────────────────────────────────
      const polyline = L.polyline(
        trackPoints.map(p => [p.lat, p.lng]),
        { color: '#3b82f6', weight: 4, opacity: 0.8 }
      ).addTo(map)
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
    }

    // ── VEHICLE MARKERS ──────────────────────────────────────────
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
            ${tracker.lastEngineTemp != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🌡️ Темп. двигателя</span><strong>${tracker.lastEngineTemp}°C</strong></div>` : ''}
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

    // Fit bounds to markers if no track data
    if (markers.length > 0 && allBounds.length === 0 && (!trackPoints || trackPoints.length <= 1)) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds(), { padding: [30, 30] })
    }

    // Invalidate size after render
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      // Cleanup handled by re-running effect
    }
  }, [trackers, trackPoints, trackData, onMarkerClick])

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
