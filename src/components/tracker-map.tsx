'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Fix default marker icons for webpack/next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Refresh interval options ─────────────────────────────────────
export const REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '1 мин' },
  { value: 120, label: '2 мин' },
  { value: 300, label: '5 мин' },
] as const

export type RefreshInterval = typeof REFRESH_OPTIONS[number]['value']

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
  equipmentId?: string | null
  sensorData?: SensorData[]
}

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
  duration: number
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

interface FocusPoint {
  lat: number
  lng: number
  type: 'parking' | 'stop' | 'refuel' | 'plum' | 'live'
  label?: string
}

interface TrackerMapProps {
  trackers: TrackerInfo[]
  trackPoints?: Array<{ lat: number; lng: number }>
  trackData?: TrackData | null
  focusPoint?: FocusPoint | null
  onMarkerClick?: (trackerId: string) => void
  onEquipmentClick?: (equipmentId: string) => void
  refreshInterval?: RefreshInterval  // selected refresh interval in seconds
  onRefresh?: () => void             // callback to trigger data refresh
  onRefreshIntervalChange?: (val: RefreshInterval) => void
}

// ─── Formatters ───────────────────────────────────────────────────

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

function formatSensorValue(s: SensorData): string {
  const isIgnition = s.sensorType === 'ignition' || /зажиган/i.test(s.sensorName || '')
  if (isIgnition && s.value != null) {
    return s.value > 0 ? 'On' : 'Off'
  }
  const isFuel = s.sensorType === 'fuel' || /топлив|бак/i.test(s.sensorName || '')
  if (isFuel && s.value != null) {
    return `${s.value} л`
  }
  const val = s.value != null ? s.value : (s.stringValue || '—')
  return `${val}${s.unit ? ' ' + s.unit : ''}`
}

// ─── Equipment type helpers ───────────────────────────────────────

function getEquipmentIcon(type?: string | null): string {
  if (!type) return '🚗'
  const t = type.toLowerCase()
  if (t === 'автомобиль') return '🚗'
  if (t === 'кроссовер') return '🚙'
  if (t === 'внедорожник') return '🚙'
  if (t === 'мототехника') return '🏍️'
  if (t === 'грузовик') return '🚛'
  if (t === 'фургон') return '🚐'
  if (t === 'прицеп') return '🏗️'
  if (t === 'полуприцеп') return '🏗️'
  if (t === 'рефрижератор') return '🚛'
  if (t === 'автобус') return '🚌'
  if (t === 'микроавтобус') return '🚐'
  if (t === 'спецтехника') return '⚙️'
  if (t === 'экскаватор') return '⛏️'
  if (t === 'бульдозер') return '🚜'
  if (t === 'кран') return '🏗️'
  if (t === 'погрузчик') return '🚜'
  if (t === 'самосвал') return '🚛'
  if (t === 'автовышка') return '🏗️'
  if (t === 'ямобур') return '⛏️'
  if (t === 'сельхозтехника') return '🌾'
  if (t === 'трактор') return '🚜'
  if (t === 'комбайн') return '🌾'
  if (t === 'строительная техника') return '🏗️'
  if (t === 'бетономешалка') return '🏗️'
  if (t === 'каток') return '🚜'
  if (t === 'водный транспорт') return '🚢'
  if (t === 'катер') return '🚤'
  if (t === 'баржа') return '🚢'
  return '🚗'
}

function getEquipmentColor(type?: string | null): string {
  if (!type) return '#3b82f6'
  const t = type.toLowerCase()
  if (['автомобиль', 'кроссовер', 'внедорожник', 'мототехника'].includes(t)) return '#3b82f6'
  if (['грузовик', 'фургон', 'прицеп', 'полуприцеп', 'рефрижератор'].includes(t)) return '#f97316'
  if (['автобус', 'микроавтобус'].includes(t)) return '#8b5cf6'
  if (['спецтехника', 'экскаватор', 'бульдозер', 'кран', 'погрузчик', 'самосвал', 'автовышка', 'ямобур'].includes(t)) return '#ef4444'
  if (['сельхозтехника', 'трактор', 'комбайн'].includes(t)) return '#22c55e'
  if (['строительная техника', 'бетономешалка', 'каток'].includes(t)) return '#6b7280'
  if (['водный транспорт', 'катер', 'баржа'].includes(t)) return '#06b6d4'
  return '#3b82f6'
}

function speedToColor(speed: number): string {
  if (speed <= 0) return '#9ca3af'
  if (speed <= 20) return '#22c55e'
  if (speed <= 40) return '#84cc16'
  if (speed <= 60) return '#eab308'
  if (speed <= 80) return '#f97316'
  if (speed <= 100) return '#ef4444'
  return '#dc2626'
}

// ─── Build a single vehicle marker icon ─────────────────────────────
function buildVehicleIcon(tracker: TrackerInfo): L.DivIcon {
  const typeColor = getEquipmentColor(tracker.equipmentType)
  const statusColor = tracker.isActive ? '#22c55e' : '#ef4444'
  const typeIcon = getEquipmentIcon(tracker.equipmentType)
  const regNum = tracker.registrationNum || ''

  return L.divIcon({
    className: 'custom-tracker-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          position: relative;
          width: 40px; height: 40px;
          background: ${typeColor};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          transition: background 0.3s;
        ">
          ${typeIcon}
          <div style="
            position: absolute; bottom: -2px; right: -2px;
            width: 14px; height: 14px;
            background: ${statusColor};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: background 0.3s;
          "></div>
          <div style="
            position: absolute; top: -4px; left: 50%;
            transform: translateX(-50%) rotate(${tracker.lastCourse || 0}deg);
            width: 0; height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 7px solid white;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
            transition: transform 0.3s;
          "></div>
        </div>
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
    iconSize: [40, regNum ? 56 : 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  })
}

// ─── Build popup HTML for a vehicle marker ──────────────────────────
function buildVehiclePopup(tracker: TrackerInfo): string {
  const typeColor = getEquipmentColor(tracker.equipmentType)
  const typeIcon = getEquipmentIcon(tracker.equipmentType)
  const regNum = tracker.registrationNum || ''

  const sensorsWithValues = (tracker.sensorData || []).filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
  let sensorHtml = ''
  if (sensorsWithValues.length > 0) {
    sensorHtml = `
      <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
        <div style="font-size: 10px; font-weight: 600; color: #6b7280; margin-bottom: 4px; text-transform: uppercase;">ДАТЧИКИ</div>
        ${sensorsWithValues.map(s => `
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0;">
            <span style="font-size: 12px;">${getSensorIcon(s.sensorType)}</span>
            <span style="color: #6b7280; min-width: 70px;">${s.sensorName || getSensorLabel(s.sensorType)}</span>
            <strong>${formatSensorValue(s)}</strong>
          </div>
        `).join('')}
      </div>
    `
  }

  return `
    <div style="min-width: 240px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.5;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 28px; height: 28px; border-radius: 6px; background: ${typeColor}20; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 14px;">${typeIcon}</span>
        </div>
        <div>
          <div style="font-weight: 700; font-size: 13px; ${tracker.equipmentId ? 'color: #3b82f6; cursor: pointer; text-decoration: underline; ' : ''}" ${tracker.equipmentId ? `data-equipment-id="${tracker.equipmentId}" title="Открыть карточку техники"` : ''}>${tracker.equipmentName || tracker.trackerName || 'Трекер'}</div>
          ${regNum ? `<div style="color: #6b7280; font-size: 11px;">${regNum}</div>` : ''}
        </div>
        <div style="margin-left: auto;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; background: ${tracker.isActive ? '#dcfce7' : '#fee2e2'}; color: ${tracker.isActive ? '#166534' : '#991b1b'};">${tracker.isActive ? 'Онлайн' : 'Оффлайн'}</span>
        </div>
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 6px;">
        ${tracker.lastSpeed != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🏃 Скорость</span><strong>${tracker.lastSpeed} км/ч</strong></div>` : ''}
        ${tracker.lastCourse != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🧭 Курс</span><strong>${tracker.lastCourse}°</strong></div>` : ''}
        ${tracker.lastAltitude != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">⛰️ Высота</span><strong>${tracker.lastAltitude} м</strong></div>` : ''}
        ${tracker.lastIgnition != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🔑 Зажигание</span><strong style="color: ${tracker.lastIgnition ? '#166534' : '#991b1b'};">${tracker.lastIgnition ? 'Вкл' : 'Выкл'}</strong></div>` : ''}
        ${tracker.lastFuelLevel != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">⛽ Топливо</span><strong>${tracker.lastFuelLevel} л</strong></div>` : ''}
        ${tracker.lastMileage != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">📊 Пробег</span><strong>${tracker.lastMileage} км</strong></div>` : ''}
        ${tracker.lastEngineTemp != null ? `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: #6b7280;">🌡️ Темп. двигателя</span><strong>${tracker.lastEngineTemp}°C</strong></div>` : ''}
        ${tracker.lastAddress ? `<div style="padding: 4px 0 0;"><span style="color: #6b7280;">📍</span> ${tracker.lastAddress}</div>` : ''}
        ${tracker.lastSeenAt ? `<div style="color: #9ca3af; font-size: 10px; margin-top: 4px;">⏱ Последняя связь: ${formatDateTime(tracker.lastSeenAt)}</div>` : ''}
        ${tracker.lastPositionAt ? `<div style="color: #9ca3af; font-size: 10px;">📍 Последняя позиция: ${formatDateTime(tracker.lastPositionAt)}</div>` : ''}
      </div>
      ${sensorHtml}
    </div>
  `
}

// ─── Build tooltip HTML ─────────────────────────────────────────────
function buildVehicleTooltip(tracker: TrackerInfo): string {
  const regNum = tracker.registrationNum || ''
  return `<div style="font-family:system-ui;font-size:11px;"><strong>${tracker.equipmentName || tracker.trackerName || 'Трекер'}</strong>${regNum ? `<br/><span style="color:#6b7280">${regNum}</span>` : ''}</div>`
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MAP COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function TrackerMap({
  trackers,
  trackPoints,
  trackData,
  focusPoint,
  onMarkerClick,
  onEquipmentClick,
  refreshInterval = 60,
  onRefresh,
  onRefreshIntervalChange,
}: TrackerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const legendRef = useRef<L.Control | null>(null)
  // Layer groups for efficient updates
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null)
  const tracksLayerRef = useRef<L.LayerGroup | null>(null)
  // Track marker objects by tracker ID for incremental updates
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map())
  // Auto-refresh timer ref
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track whether the map has been initially fit to bounds
  const hasFitBoundsRef = useRef(false)
  // Last track data signature to avoid re-rendering tracks unnecessarily
  const lastTrackSignatureRef = useRef<string>('')
  // ─── Popup preservation refs ────────────────────────────────────
  // Track which marker has an open popup (by tracker ID)
  const openPopupIdRef = useRef<string | null>(null)
  // Flag: marker updates were skipped because a popup was open
  const pendingUpdateRef = useRef(false)
  // Always-current reference to updateMarkers (so popupclose handler can call it)
  const updateMarkersFnRef = useRef<() => void>(() => {})
  // Keep a ref to latest trackers so deferred updateMarkers uses fresh data
  const trackersRef = useRef(trackers)
  trackersRef.current = trackers

  // ─── Initialize map once ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [55.7558, 37.6173],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Marker cluster group — groups nearby markers when zoomed out
    markersLayerRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      // Keep markers in the DOM even when off-screen → prevents cluster
      // recalculation from closing an open popup during pan/zoom
      removeOutsideVisibleBounds: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        let size = 'small'
        let dim = 40
        if (count > 100) { size = 'large'; dim = 56 }
        else if (count > 10) { size = 'medium'; dim = 48 }
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(dim, dim),
        })
      },
    }).addTo(map)
    tracksLayerRef.current = L.layerGroup().addTo(map)

    mapInstanceRef.current = map

    // Invalidate size after initial render
    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
      tracksLayerRef.current = null
      hasFitBoundsRef.current = false
    }
  }, [])

  // ─── Auto-refresh with selected interval ──────────────────────
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    const ms = refreshInterval * 1000
    if (ms > 0 && onRefresh) {
      refreshTimerRef.current = setInterval(() => {
        onRefresh()
      }, ms)
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [refreshInterval, onRefresh])

  // ─── Update vehicle markers without resetting view ────────────
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current
    const markersLayer = markersLayerRef.current
    if (!map || !markersLayer) return

    // ─── POPUP PRESERVATION ────────────────────────────────────
    // If ANY popup is currently open, skip ALL marker updates.
    // MarkerClusterGroup recalculates clusters on every marker change,
    // which closes open popups.  The only safe way to keep popups
    // alive is to not touch the cluster group at all while a popup
    // is shown.  We remember that we skipped so we can retry later.
    if (openPopupIdRef.current !== null) {
      pendingUpdateRef.current = true
      return
    }

    const currentTrackers = trackersRef.current

    // Create a new marker and add to cluster group
    const createMarker = (tracker: TrackerInfo, layer: L.MarkerClusterGroup): L.Marker | null => {
      if (tracker.lastLatitude == null || tracker.lastLongitude == null) return null
      try {
        const marker = L.marker([tracker.lastLatitude, tracker.lastLongitude], {
          icon: buildVehicleIcon(tracker),
        })
          .bindPopup(buildVehiclePopup(tracker), { className: 'tracker-popup', maxWidth: 340 })
          .bindTooltip(buildVehicleTooltip(tracker), { direction: 'top', offset: [0, -24], className: 'tracker-tooltip' })

        // ── Track popup open/close for preservation ─────────
        marker.on('popupopen', () => {
          openPopupIdRef.current = tracker.id
        })
        marker.on('popupclose', () => {
          // Only clear if this is still the active popup
          if (openPopupIdRef.current === tracker.id) {
            openPopupIdRef.current = null
          }
          // If updates were skipped while the popup was open, apply them now
          if (pendingUpdateRef.current) {
            pendingUpdateRef.current = false
            // Small delay so Leaflet finishes its internal cleanup first
            setTimeout(() => updateMarkersFnRef.current(), 150)
          }
        })

        // Handle equipment click via popup link instead of marker click
        if (onEquipmentClick && tracker.equipmentId) {
          marker.on('popupopen', () => {
            const popupEl = marker.getPopup()?.getElement()
            if (!popupEl) return
            const link = popupEl.querySelector('[data-equipment-id]')
            if (link && !link.dataset.bound) {
              link.dataset.bound = 'true'
              link.addEventListener('click', (e: Event) => {
                e.stopPropagation()
                onEquipmentClick(tracker.equipmentId!)
              })
            }
          })
        }

        layer.addLayer(marker)
        return marker
      } catch {
        return null
      }
    }

    const existingMarkers = markerByIdRef.current
    const newTrackerIds = new Set(currentTrackers.map(t => t.id))

    // Remove markers for trackers that no longer exist
    for (const [id, marker] of existingMarkers) {
      if (!newTrackerIds.has(id)) {
        markersLayer.removeLayer(marker)
        existingMarkers.delete(id)
      }
    }

    // Update or create markers
    for (const tracker of currentTrackers) {
      if (tracker.lastLatitude == null || tracker.lastLongitude == null) continue

      const existing = existingMarkers.get(tracker.id)

      if (existing) {
        try {
          existing.setLatLng([tracker.lastLatitude, tracker.lastLongitude])
          existing.setIcon(buildVehicleIcon(tracker))
          existing.setPopupContent(buildVehiclePopup(tracker))
          existing.setTooltipContent(buildVehicleTooltip(tracker))
        } catch {
          // If update fails, recreate
          markersLayer.removeLayer(existing)
          existingMarkers.delete(tracker.id)
          const newMarker = createMarker(tracker, markersLayer)
          if (newMarker) existingMarkers.set(tracker.id, newMarker)
        }
      } else {
        // Create new marker
        const newMarker = createMarker(tracker, markersLayer)
        if (newMarker) existingMarkers.set(tracker.id, newMarker)
      }
    }

    // Only fit bounds on first load (when no markers existed before)
    if (!hasFitBoundsRef.current) {
      const allMarkers = Array.from(existingMarkers.values())
      if (allMarkers.length > 0) {
        try {
          const group = L.featureGroup(allMarkers)
          map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 14 })
          hasFitBoundsRef.current = true
        } catch { /* skip if bounds invalid */ }
      }
    }
  }, [onEquipmentClick])

  // Keep fn ref in sync so the popupclose handler always calls the latest version
  updateMarkersFnRef.current = updateMarkers

  // ─── Update markers effect ────────────────────────────────────
  useEffect(() => {
    updateMarkers()
  }, [trackers, updateMarkers])

  // ─── Focus on a specific point (parking, stop, etc.) ────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !focusPoint) return
    try {
      map.flyTo([focusPoint.lat, focusPoint.lng], 16, { duration: 0.8 })
    } catch { /* skip */ }
  }, [focusPoint])

  // ─── Update tracks — only when trackData actually changes ─────
  useEffect(() => {
    const map = mapInstanceRef.current
    const tracksLayer = tracksLayerRef.current
    if (!map || !tracksLayer) return

    // Create a signature to avoid unnecessary re-renders
    const signature = JSON.stringify({ trackData, trackPoints })
    if (signature === lastTrackSignatureRef.current) return
    lastTrackSignatureRef.current = signature

    // Clear all existing track layers
    tracksLayer.clearLayers()

    // Remove legend
    if (legendRef.current) {
      try { map.removeControl(legendRef.current) } catch { /* ignore */ }
      legendRef.current = null
    }

    const allBounds: L.LatLngBounds[] = []

    // ── RICH TRACK RENDERING ──
    if (trackData && trackData.trips && trackData.trips.length > 0) {
      for (const trip of trackData.trips) {
        const validPoints = (trip.points || []).filter((p: TripPoint) => p.lat != null && p.lng != null && isFinite(p.lat) && isFinite(p.lng))
        if (validPoints.length < 2) continue

        // Draw colored segments based on speed
        for (let i = 1; i < validPoints.length; i++) {
          const prev = validPoints[i - 1]
          const curr = validPoints[i]
          const avgSpeed = (prev.speed + curr.speed) / 2
          const color = speedToColor(avgSpeed)

          try {
            L.polyline(
              [[prev.lat, prev.lng], [curr.lat, curr.lng]],
              { color, weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }
            ).addTo(tracksLayer)
          } catch { /* skip invalid segment */ }
        }

        // Trip start marker (green "A")
        const firstPoint = validPoints[0]
        const startIcon = L.divIcon({
          className: 'track-marker',
          html: `<div style="width:30px;height:30px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;">A</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        })
        try {
          L.marker([firstPoint.lat, firstPoint.lng], { icon: startIcon })
            .addTo(tracksLayer)
            .bindPopup(`<div style="font-family:system-ui;font-size:12px;min-width:180px;"><div style="font-weight:700;color:#22c55e;margin-bottom:4px;">🟢 Начало поездки</div><div>⏱ ${formatTime(trip.startDate)}</div><div>📅 ${formatDateTime(trip.startDate)}</div>${trip.distance ? `<div>📏 ${trip.distance.toFixed(1)} км</div>` : ''}</div>`, { className: 'track-popup' })
        } catch { /* skip */ }

        // Trip end marker (red "B")
        const lastPoint = validPoints[validPoints.length - 1]
        const endIcon = L.divIcon({
          className: 'track-marker',
          html: `<div style="width:30px;height:30px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;">B</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        })
        try {
          L.marker([lastPoint.lat, lastPoint.lng], { icon: endIcon })
            .addTo(tracksLayer)
            .bindPopup(`<div style="font-family:system-ui;font-size:12px;min-width:180px;"><div style="font-weight:700;color:#ef4444;margin-bottom:4px;">🔴 Конец поездки</div><div>⏱ ${formatTime(trip.endDate)}</div><div>📅 ${formatDateTime(trip.endDate)}</div><div>🏁 Скорость: ${lastPoint.speed} км/ч</div>${trip.distance ? `<div>📏 ${trip.distance.toFixed(1)} км</div>` : ''}</div>`, { className: 'track-popup' })
        } catch { /* skip */ }

        // Direction arrows
        const arrowInterval = Math.max(1, Math.floor(validPoints.length / 8))
        for (let i = arrowInterval; i < validPoints.length - 1; i += arrowInterval) {
          const p = validPoints[i]
          const next = validPoints[Math.min(i + 1, validPoints.length - 1)]
          const angle = Math.atan2(next.lng - p.lng, next.lat - p.lat) * (180 / Math.PI)
          const arrowIcon = L.divIcon({
            className: 'track-arrow',
            html: `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;transform:rotate(${angle}deg);color:#3b82f6;font-size:12px;opacity:0.7;">▶</div>`,
            iconSize: [16, 16], iconAnchor: [8, 8],
          })
          try { L.marker([p.lat, p.lng], { icon: arrowIcon, interactive: false }).addTo(tracksLayer) } catch { /* skip */ }
        }

        try {
          const tripBounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng] as [number, number]))
          allBounds.push(tripBounds)
        } catch { /* skip */ }
      }

      // Render parkings
      if (trackData.parkings && trackData.parkings.length > 0) {
        for (const parking of trackData.parkings) {
          if (parking.lat == null || parking.lng == null || !isFinite(parking.lat) || !isFinite(parking.lng)) continue
          const parkingIcon = L.divIcon({
            className: 'parking-marker',
            html: `<div style="width:28px;height:28px;background:#3b82f6;border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;">P</div>`,
            iconSize: [28, 28], iconAnchor: [14, 14],
          })
          try {
            L.marker([parking.lat, parking.lng], { icon: parkingIcon })
              .addTo(tracksLayer)
              .bindPopup(`<div style="font-family:system-ui;font-size:12px;min-width:180px;"><div style="font-weight:700;color:#3b82f6;margin-bottom:4px;">🅿️ Стоянка</div><div>⏱ Длительность: ${formatDuration(parking.duration)}</div><div>📅 С: ${formatDateTime(parking.startDate)}</div><div>📅 По: ${formatDateTime(parking.endDate)}</div>${parking.ignitionTime != null && parking.ignitionTime > 0 ? `<div>🔑 Моточасы: ${formatDuration(parking.ignitionTime)}</div>` : ''}</div>`, { className: 'track-popup' })
            allBounds.push(L.latLngBounds([[parking.lat, parking.lng], [parking.lat, parking.lng]]))
          } catch { /* skip */ }
        }
      }

      // Render stops
      if (trackData.stops && trackData.stops.length > 0) {
        for (const stop of trackData.stops) {
          if (stop.lat == null || stop.lng == null || !isFinite(stop.lat) || !isFinite(stop.lng)) continue
          const stopIcon = L.divIcon({
            className: 'stop-marker',
            html: `<div style="width:22px;height:22px;background:#f97316;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">⏸</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          })
          try {
            L.marker([stop.lat, stop.lng], { icon: stopIcon })
              .addTo(tracksLayer)
              .bindPopup(`<div style="font-family:system-ui;font-size:12px;min-width:180px;"><div style="font-weight:700;color:#f97316;margin-bottom:4px;">⏸ Остановка</div><div>⏱ Длительность: ${formatDuration(stop.duration)}</div><div>📅 С: ${formatDateTime(stop.startDate)}</div><div>📅 По: ${formatDateTime(stop.endDate)}</div></div>`, { className: 'track-popup' })
            allBounds.push(L.latLngBounds([[stop.lat, stop.lng], [stop.lat, stop.lng]]))
          } catch { /* skip */ }
        }
      }

      // Fit bounds to track data only (user explicitly loaded a track)
      if (allBounds.length > 0) {
        const combined = allBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(allBounds[0]))
        map.fitBounds(combined, { padding: [40, 40] })
      }

      // Add speed legend
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
      legendRef.current = legend

    } else if (trackPoints && trackPoints.length > 1) {
      // Simple track fallback
      const polyline = L.polyline(
        trackPoints.map(p => [p.lat, p.lng]),
        { color: '#3b82f6', weight: 4, opacity: 0.8 }
      ).addTo(tracksLayer)
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
    }

    // Invalidate size after render
    setTimeout(() => map.invalidateSize(), 100)

  }, [trackData, trackPoints])

  return <div ref={mapRef} className="w-full h-full" />
}
