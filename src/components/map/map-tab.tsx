'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Map, RefreshCw, Wifi, WifiOff, Satellite, Navigation, Fuel,
  Thermometer, Zap, Gauge, Cog, Activity, Clock, Truck,
  CheckCircle2, XCircle, AlertTriangle, Search, Eye, Download,
  Cpu, Copy, ExternalLink, Bell, Settings2, Plus, Save,
  ChevronDown, ChevronUp, ArrowRight, Info, MapPinned, Globe,
  Layers, BarChart3, Compass
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Equipment, GlonassTracker, GlonassSensorData } from '@/lib/types'
import { EQUIPMENT_STATUS_MAP, EQUIPMENT_TYPE_MAP, REFRESH_OPTIONS, API } from '@/lib/constants'
import { formatDate, formatDateTime, formatTime, formatPrice, statusBadge, TypeBadge, useAutoRefreshCountdown, handleApiError, copyToClipboard, fmtDuration, formatDurationShort } from '@/lib/utils'

const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })

// ═══════════════════════════════════════════════════════════════
// MAP TAB — Карта всей техники
// ═══════════════════════════════════════════════════════════════

export const MapTab = React.memo(function MapTab({ equipment, onSync, onOpenDetail }: {
  equipment: Equipment[]
  onSync: () => void
  onOpenDetail?: (equipmentId: string) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof REFRESH_OPTIONS[number]['value']>>(60) // seconds, default 1 min
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'notracker'>('all')
  const [subTab, setSubTab] = useState<'map' | 'notifications'>('map')
  const [notifRules, setNotifRules] = useState<Array<{
    id: string; equipmentId: string; conditionType: string; thresholdValue: number | null;
    isActive: boolean; lastTriggeredAt?: string | null; description?: string | null;
    equipment?: { id: string; name: string; registrationNum?: string | null };
  }>>([])
  const [addRuleOpen, setAddRuleOpen] = useState(false)
  const [newRuleEqId, setNewRuleEqId] = useState('')
  const [newRuleType, setNewRuleType] = useState('offline')
  const [newRuleThreshold, setNewRuleThreshold] = useState('')
  const [newRuleDesc, setNewRuleDesc] = useState('')
  const [savingRule, setSavingRule] = useState(false)

  // ─── Track viewing state ────────────────────────────────────
  const [trackEqId, setTrackEqId] = useState<string>('')
  const [trackDateFrom, setTrackDateFrom] = useState<string>('')
  const [trackDateTo, setTrackDateTo] = useState<string>('')
  const [trackPoints, setTrackPoints] = useState<Array<{ lat: number; lng: number }>>([])
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackStats, setTrackStats] = useState<Record<string, unknown> | null>(null)
  const [showTrackPanel, setShowTrackPanel] = useState(false)
  const [trackData, setTrackData] = useState<{
    track?: { distance: number; startDate: string; endDate: string; count: number };
    trips?: Array<{
      distance: number; startDate: string; endDate: string;
      points: Array<{ lat: number; lng: number; speed: number; time: string }>;
    }>;
    parkings?: Array<{ startDate: string; endDate: string; lat: number; lng: number; duration: number; ignitionTime?: number }>;
    stops?: Array<{ startDate: string; endDate: string; lat: number; lng: number; duration: number }>;
  } | null>(null)
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null)

  // ─── Report export state ───────────────────────────────────
  const [reportOpen, setReportOpen] = useState(false)
  const [reportEqIds, setReportEqIds] = useState<string[]>([])
  const [reportDateFrom, setReportDateFrom] = useState<string>('')
  const [reportDateTo, setReportDateTo] = useState<string>('')
  const [reportSensorTypes, setReportSensorTypes] = useState<string[]>([])
  const [reportIncludeStats, setReportIncludeStats] = useState(true)
  const [reportIncludeTracks, setReportIncludeTracks] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // Equipment that has trackers for track selection
  const trackedEquipment = useMemo(() =>
    equipment.filter(e => e.trackers && e.trackers.length > 0),
  [equipment])

  // Apply date preset for tracks
  const applyTrackDatePreset = (preset: string) => {
    const now = new Date()
    let from = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        now.setDate(now.getDate() - 1); now.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
    }
    setTrackDateFrom(toLocalDatetime(from))
    setTrackDateTo(toLocalDatetime(now))
  }

  // Fetch track for selected equipment
  const fetchTrack = async () => {
    if (!trackEqId || !trackDateFrom || !trackDateTo) return
    const eq = equipment.find(e => e.id === trackEqId)
    if (!eq || !eq.trackers || eq.trackers.length === 0) return

    const tracker = eq.trackers[0]
    const axentaId = tracker.axentaCloudId || tracker.trackerId

    setTrackLoading(true)
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setSelectedTripIndex(null)

    try {
      // Fetch track + stats in parallel
      const [tracksRes, statsRes] = await Promise.all([
        fetch('/api/glonass/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          })
        }),
        fetch('/api/glonass/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          })
        })
      ])

      // Parse stats
      if (statsRes.ok) {
        setTrackStats(await statsRes.json())
      }

      // Parse tracks
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()

        // Axenta returns: { track, trips, parkings, stops, ... }
        // trips[].messagesCoordinates = [[lat, lng, speed, time], ...]
        const parsedTrips: Array<{
          distance: number; startDate: string; endDate: string;
          points: Array<{ lat: number; lng: number; speed: number; time: string }>;
        }> = []

        if (tracksData.trips && Array.isArray(tracksData.trips)) {
          for (const trip of tracksData.trips) {
            const points: Array<{ lat: number; lng: number; speed: number; time: string }> = []
            if (trip.messagesCoordinates && Array.isArray(trip.messagesCoordinates)) {
              for (const mc of trip.messagesCoordinates) {
                if (Array.isArray(mc) && mc.length >= 2) {
                  points.push({
                    lat: mc[0],
                    lng: mc[1],
                    speed: mc[2] || 0,
                    time: mc[3] || '',
                  })
                }
              }
            }
            if (points.length > 0) {
              parsedTrips.push({
                distance: trip.distance || 0,
                startDate: trip.startDate,
                endDate: trip.endDate,
                points,
              })
            }
          }
        }

        // Parse parkings
        const parsedParkings = (tracksData.parkings || []).map((p: Record<string, unknown>) => ({
          startDate: p.startDate as string,
          endDate: p.endDate as string,
          lat: p.lat as number,
          lng: p.lng as number,
          duration: p.duration as number,
          ignitionTime: p.ignitionTime as number | undefined,
        }))

        // Parse stops
        const parsedStops = (tracksData.stops || []).map((s: Record<string, unknown>) => ({
          startDate: s.startDate as string,
          endDate: s.endDate as string,
          lat: s.lat as number,
          lng: s.lng as number,
          duration: s.duration as number,
        }))

        // Also build simple trackPoints for backwards compat
        const simplePoints: Array<{ lat: number; lng: number }> = []
        for (const trip of parsedTrips) {
          for (const p of trip.points) {
            simplePoints.push({ lat: p.lat, lng: p.lng })
          }
        }
        setTrackPoints(simplePoints)

        // Store enriched data
        setTrackData({
          track: tracksData.track ? {
            distance: tracksData.track.distance,
            startDate: tracksData.track.startDate,
            endDate: tracksData.track.endDate,
            count: tracksData.track.count,
          } : undefined,
          trips: parsedTrips,
          parkings: parsedParkings,
          stops: parsedStops,
        })

        const totalPoints = simplePoints.length
        const tripCount = parsedTrips.length
        const parkingCount = parsedParkings.length
        toast.success(`Трек загружен: ${tripCount} поездок, ${totalPoints} точек, ${parkingCount} стоянок`)
      } else {
        toast.error('Ошибка загрузки трека')
      }
    } catch {
      toast.error('Ошибка загрузки трека')
    }
    setTrackLoading(false)
  }

  const clearTrack = () => {
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setTrackEqId('')
    setTrackDateFrom('')
    setTrackDateTo('')
    setSelectedTripIndex(null)
  }

  // ─── Report export ──────────────────────────────────────────
  const applyReportDatePreset = (preset: string) => {
    const now = new Date()
    let from = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        now.setDate(now.getDate() - 1); now.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
    }
    setReportDateFrom(toLocalDatetime(from))
    setReportDateTo(toLocalDatetime(now))
  }

  const exportReport = async () => {
    if (reportEqIds.length === 0 || !reportDateFrom || !reportDateTo) {
      toast.error('Выберите технику и период')
      return
    }
    setReportLoading(true)
    try {
      const res = await fetch('/api/glonass/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentIds: reportEqIds,
          startDate: new Date(reportDateFrom).toISOString(),
          endDate: new Date(reportDateTo).toISOString(),
          sensorTypes: reportSensorTypes.length > 0 ? reportSensorTypes : undefined,
          includeStats: reportIncludeStats,
          includeTrackSummary: reportIncludeTracks,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Ошибка' }))
        throw new Error(errData.error || 'Ошибка генерации отчёта')
      }
      // Download the file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?(.+?)"?$/)
      a.download = match ? decodeURIComponent(match[1]) : 'report.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Отчёт скачан')
      setReportOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка экспорта отчёта')
    }
    setReportLoading(false)
  }

  // Collect all unique sensor types from equipment
  const allSensorTypes = useMemo(() => {
    const types = new Set<string>()
    for (const eq of equipment) {
      for (const tracker of eq.trackers || []) {
        for (const s of tracker.sensorData || []) {
          if (s.sensorType) types.add(s.sensorType)
        }
      }
    }
    return Array.from(types).sort()
  }, [equipment])

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h} ч ${m} мин` : `${m} мин`
  }

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/rules')
      if (res.ok) setNotifRules(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadRules() }, [loadRules])

  const addRule = async () => {
    if (!newRuleEqId || !newRuleType) return
    setSavingRule(true)
    try {
      const res = await fetch('/api/notifications/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: newRuleEqId,
          conditionType: newRuleType,
          thresholdValue: newRuleThreshold ? parseFloat(newRuleThreshold) : null,
          description: newRuleDesc || null,
          isActive: true,
        }),
      })
      if (res.ok) {
        toast.success('Правило добавлено')
        setAddRuleOpen(false)
        setNewRuleEqId('')
        setNewRuleType('offline')
        setNewRuleThreshold('')
        setNewRuleDesc('')
        loadRules()
      } else {
        toast.error('Ошибка добавления правила')
      }
    } catch { toast.error('Ошибка') }
    setSavingRule(false)
  }

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/notifications/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) loadRules()
    } catch { /* ignore */ }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/notifications/rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) { loadRules(); toast.success('Правило удалено') }
    } catch { toast.error('Ошибка удаления') }
  }

  const CONDITION_LABELS: Record<string, string> = {
    offline: 'Не в сети',
    not_synced: 'Нет синхронизации (ч)',
    not_moving: 'Не движется (ч)',
    speed_exceeded: 'Превышение скорости (км/ч)',
    fuel_low: 'Низкое топливо (%)',
    zone_exit: 'Выход из зоны',
  }

  // Prepare tracker data for map — include sensor data
  const trackersForMap = useMemo(() => {
    return equipment.flatMap(eq =>
      (eq.trackers || [])
        .filter(t => t.lastLatitude != null && t.lastLongitude != null)
        .map(t => ({
          ...t,
          equipmentName: eq.name,
          registrationNum: eq.registrationNum,
          equipmentType: eq.type,
          equipmentStatus: eq.status,
          equipmentId: eq.id,
          sensorData: (t.sensorData || []).filter(s => s.value != null || (s.stringValue != null && s.stringValue !== '')),
        }))
    )
  }, [equipment])

  const onlineCount = trackersForMap.filter(t => t.isActive).length
  const offlineCount = trackersForMap.filter(t => !t.isActive).length
  const noTrackerCount = equipment.filter(e => !e.trackers || e.trackers.length === 0).length

  const filteredTrackers = useMemo(() => {
    switch (filter) {
      case 'online': return trackersForMap.filter(t => t.isActive)
      case 'offline': return trackersForMap.filter(t => !t.isActive)
      default: return trackersForMap
    }
  }, [filter, trackersForMap])

  // When viewing a track, only show the tracked vehicle on the map
  const mapTrackers = useMemo(() => {
    if ((trackPoints.length > 0 || trackData) && trackEqId) {
      return filteredTrackers.filter(t => t.equipmentId === trackEqId)
    }
    return filteredTrackers
  }, [filteredTrackers, trackPoints, trackData, trackEqId])

  // When a specific trip is selected, only show that trip's data on the map
  const mapTrackData = useMemo(() => {
    if (!trackData) return null
    if (selectedTripIndex != null && trackData.trips) {
      const selectedTrip = trackData.trips[selectedTripIndex]
      if (selectedTrip) {
        return {
          track: trackData.track,
          trips: [selectedTrip],
          parkings: [],  // hide parkings when viewing specific trip
          stops: [],     // hide stops when viewing specific trip
        }
      }
    }
    return trackData
  }, [trackData, selectedTripIndex])

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Map / Notifications */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={subTab === 'map' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('map')}>
          <Map className="size-3" />Карта
        </Button>
        <Button size="sm" variant={subTab === 'notifications' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('notifications')}>
          <Bell className="size-3" />Уведомления
          {notifRules.filter(r => r.isActive).length > 0 && (
            <span className="ml-1 bg-primary/20 rounded-full px-1.5 text-[9px]">{notifRules.filter(r => r.isActive).length}</span>
          )}
        </Button>
      </div>

      {subTab === 'map' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('all')}>
                <MapPin className="size-3" />Все ({trackersForMap.length})
              </Button>
              <Button size="sm" variant={filter === 'online' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('online')}>
                <Wifi className="size-3" />Онлайн ({onlineCount})
              </Button>
              <Button size="sm" variant={filter === 'offline' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('offline')}>
                <WifiOff className="size-3" />Оффлайн ({offlineCount})
              </Button>
              <Button size="sm" variant={filter === 'notracker' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('notracker')}>
                <Satellite className="size-3" />Без трекера ({noTrackerCount})
              </Button>
            </div>
            <div className="flex-1" />
            <Button size="sm" variant={showTrackPanel ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setShowTrackPanel(!showTrackPanel)}>
              <Route className="size-3" />Трек
              {trackPoints.length > 0 && <span className="ml-0.5 bg-primary/20 rounded-full px-1.5 text-[9px]">{trackPoints.length}</span>}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { setReportEqIds(trackersForMap.map(t => t.equipmentId!).filter(Boolean)); setReportOpen(true) }}>
              <FileText className="size-3" />Отчёт XLSX
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={syncing} onClick={async () => { setSyncing(true); await onSync(); setSyncing(false) }}>
              {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Синхронизировать
            </Button>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${refreshInterval > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}></span>
              <Select value={String(refreshInterval)} onValueChange={v => setRefreshInterval(Number(v) as any)}>
                <SelectTrigger className="h-5 w-auto border-0 p-0 text-[9px] text-muted-foreground gap-0.5 shadow-none focus:ring-0" style={{ minWidth: 0 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[100px]">
                  {REFRESH_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-[11px]">
                      {refreshInterval > 0 && opt.value === refreshInterval ? '🔄 ' : ''}{opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          </div>

          {/* Track panel */}
          {showTrackPanel && (
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <Route className="size-3.5" />Просмотр трека за период
                  </h3>
                  {trackPoints.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={clearTrack}>
                      <X className="size-3" />Очистить
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    <Label className="text-[10px]">Техника</Label>
                    <Select value={trackEqId} onValueChange={setTrackEqId}>
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue placeholder="Выберите..." />
                      </SelectTrigger>
                      <SelectContent>
                        {trackedEquipment.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name} {eq.registrationNum ? `(${eq.registrationNum})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">С</Label>
                    <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateFrom} onChange={e => setTrackDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">По</Label>
                    <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateTo} onChange={e => setTrackDateTo(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" className="h-7 text-[11px] w-full gap-1" disabled={!trackEqId || !trackDateFrom || !trackDateTo || trackLoading} onClick={fetchTrack}>
                      {trackLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                      Загрузить
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                    <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTrackDatePreset(preset)}>{preset}</Button>
                  ))}
                </div>
                {/* Track stats */}
                {trackStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 border-t border-dashed">
                    {trackStats.mileage != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Пробег</p><p className="text-[11px] font-semibold">{Number(trackStats.mileage).toFixed(1)} км</p></div>}
                    {trackStats.avgSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Ср. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.avgSpeed).toFixed(1)} км/ч</p></div>}
                    {trackStats.maxSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Макс. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.maxSpeed).toFixed(1)} км/ч</p></div>}
                    {trackStats.fuelConsumption != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Расход топлива</p><p className="text-[11px] font-semibold">{Number(trackStats.fuelConsumption).toFixed(1)} л</p></div>}
                    {trackStats.tripsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Время поездок</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.tripsDuration))}</p></div>}
                    {trackStats.parkingsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Стоянки</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.parkingsDuration))}</p></div>}
                    {trackStats.refuelVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Заправки</p><p className="text-[11px] font-semibold">{Number(trackStats.refuelVolume).toFixed(1)} л</p></div>}
                    {trackStats.plumVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Сливы</p><p className="text-[11px] font-semibold">{Number(trackStats.plumVolume).toFixed(1)} л</p></div>}
                    {trackStats.engineHours != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Моточасы</p><p className="text-[11px] font-semibold">{Number(trackStats.engineHours).toFixed(1)} ч</p></div>}
                  </div>
                )}
                {trackPoints.length > 0 && trackData && (
                  <div className="space-y-2 pt-1 border-t border-dashed">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500 rounded" />{trackPoints.length} точек</span>
                      {trackData.trips && <span>🚗 {trackData.trips.length} поездок</span>}
                      {trackData.parkings && <span>🅿️ {trackData.parkings.length} стоянок</span>}
                      {trackData.stops && <span>⏸ {trackData.stops.length} остановок</span>}
                      {trackData.track?.distance != null && <span>📏 {trackData.track.distance.toFixed(1)} км</span>}
                    </div>
                    {/* Speed legend */}
                    <div className="flex flex-wrap items-center gap-2 text-[9px]">
                      <span className="text-muted-foreground font-medium">Скорость:</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#9ca3af'}} />0</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#22c55e'}} />≤20</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#eab308'}} />≤60</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#f97316'}} />≤80</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#ef4444'}} />&gt;80</span>
                      <span className="text-muted-foreground">км/ч</span>
                    </div>
                    {/* Trips summary */}
                    {trackData.trips && trackData.trips.length > 0 && (
                      <div className="space-y-1">
                        {trackData.trips.map((trip, i) => (
                          <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${selectedTripIndex === i ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setSelectedTripIndex(selectedTripIndex === i ? null : i)}>
                            <span className="font-semibold text-emerald-600">🟢 A</span>
                            <span>{formatTime(trip.startDate)}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-red-500">🔴 B</span>
                            <span>{formatTime(trip.endDate)}</span>
                            <span className="text-muted-foreground ml-auto">{trip.distance != null ? trip.distance.toFixed(1) : '—'} км • {trip.points?.length || 0} т.</span>
                            {selectedTripIndex === i && <X className="size-3 text-muted-foreground shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {filter === 'notracker' ? (
            <div className="space-y-2">
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Satellite className="size-4 text-muted-foreground" />
                    Техника без ГЛОНАСС трекера
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {equipment.filter(e => !e.trackers || e.trackers.length === 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Вся техника подключена к трекерам</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {equipment.filter(e => !e.trackers || e.trackers.length === 0).map(eq => (
                        <Card key={eq.id} className="border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenDetail?.(eq.id)}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`size-8 rounded-md flex items-center justify-center ${getTypeInfo(eq.type).color} ${getTypeInfo(eq.type).darkColor}`}>
                                {getTypeInfo(eq.type).icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate hover:text-primary hover:underline transition-colors">{eq.name}</p>
                                <p className="text-[10px] text-muted-foreground">{eq.registrationNum || '—'} • <TypeBadge type={eq.type} /></p>
                              </div>
                              {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-220px)] min-h-[400px] rounded-lg overflow-hidden relative z-0">
                  {trackersForMap.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Satellite className="size-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">Нет техники с трекерами</p>
                      <p className="text-xs mt-1">Подключите ГЛОНАСС трекеры к технике для отображения на карте</p>
                    </div>
                  ) : (
                    <TrackerMap trackers={mapTrackers} trackPoints={trackPoints} trackData={mapTrackData} onEquipmentClick={onOpenDetail} refreshInterval={refreshInterval} onRefresh={onSync} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment list below map */}
          {filter !== 'notracker' && mapTrackers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Техника на карте ({mapTrackers.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mapTrackers.map(t => (
                  <Card key={t.id} className={`border-l-4 ${t.isActive ? 'border-l-emerald-500' : 'border-l-red-400'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`size-8 rounded-md flex items-center justify-center ${t.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                          {t.isActive ? <Wifi className="size-4 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-4 text-red-600 dark:text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate cursor-pointer hover:text-primary hover:underline transition-colors" onClick={() => onOpenDetail?.(t.equipmentId!)}>{t.equipmentName}</p>
                          <p className="text-[10px] text-muted-foreground">{t.registrationNum || '—'} • <TypeBadge type={t.equipmentType || 'другое'} /></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        {t.lastSpeed != null && <div className="flex items-center gap-1"><Gauge className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastSpeed} км/ч</span></div>}
                        {t.lastIgnition != null && <div className="flex items-center gap-1"><Zap className="size-3 text-muted-foreground" /><span className={t.lastIgnition ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{t.lastIgnition ? 'Зажигание' : 'Выключено'}</span></div>}
                        {t.lastFuelLevel != null && <div className="flex items-center gap-1"><Fuel className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastFuelLevel} л</span></div>}
                        {t.lastMileage != null && <div className="flex items-center gap-1"><Navigation className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastMileage} км</span></div>}
                        {t.lastAddress && <div className="col-span-2 flex items-start gap-1"><MapPin className="size-3 text-muted-foreground mt-0.5 shrink-0" /><span className="truncate">{t.lastAddress}</span></div>}
                        {t.lastSeenAt && <div className="flex items-center gap-1"><Clock className="size-3 text-muted-foreground" /><span className="text-muted-foreground">{formatDateTime(t.lastSeenAt)}</span></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ─── NOTIFICATION RULES TAB ──────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="size-4" />Правила уведомлений</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Настройте условия для получения важных уведомлений о технике</p>
            </div>
            <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setAddRuleOpen(true)}>
              <Plus className="size-3" />Добавить правило
            </Button>
          </div>

          {notifRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Нет правил уведомлений</p>
                <p className="text-xs text-muted-foreground mt-1">Создайте правила для отслеживания состояния техники</p>
                <Button size="sm" className="mt-3 h-7 text-[11px] gap-1" onClick={() => setAddRuleOpen(true)}>
                  <Plus className="size-3" />Создать первое правило
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {notifRules.map(rule => (
                <Card key={rule.id} className={`border-l-4 ${rule.isActive ? 'border-l-sky-500' : 'border-l-gray-300'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{rule.equipment?.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{rule.equipment?.registrationNum || '—'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleRule(rule.id, rule.isActive)} className={`p-1 rounded transition-colors ${rule.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}>
                          {rule.isActive ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className={`size-3 ${rule.isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] font-medium">{CONDITION_LABELS[rule.conditionType] || rule.conditionType}</span>
                      {rule.thresholdValue != null && (
                        <span className="text-[11px] text-muted-foreground">: {rule.thresholdValue}</span>
                      )}
                    </div>
                    {rule.description && <p className="text-[10px] text-muted-foreground">{rule.description}</p>}
                    {rule.lastTriggeredAt && (
                      <p className="text-[9px] text-muted-foreground mt-1">Сработало: {formatDateTime(rule.lastTriggeredAt)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick add presets */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Быстрые шаблоны</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { type: 'offline', label: 'Не в сети', desc: 'Уведомление если трекер оффлайн', threshold: null },
                  { type: 'not_synced', label: 'Нет данных 1 час', desc: 'Нет синхронизации более 1 часа', threshold: 1 },
                  { type: 'not_synced', label: 'Нет данных 3 часа', desc: 'Нет синхронизации более 3 часов', threshold: 3 },
                  { type: 'not_moving', label: 'Не движется 2 часа', desc: 'Скорость 0 более 2 часов', threshold: 2 },
                  { type: 'speed_exceeded', label: 'Скорость > 90 км/ч', desc: 'Превышение лимита скорости', threshold: 90 },
                  { type: 'fuel_low', label: 'Топливо < 15%', desc: 'Низкий уровень топлива', threshold: 15 },
                ].map((preset, i) => (
                  <button key={i} onClick={async () => {
                    // Add rule for all equipment with trackers
                    const eqsWithTrackers = equipment.filter(e => e.trackers && e.trackers.length > 0)
                    if (eqsWithTrackers.length === 0) {
                      toast.error('Нет техники с трекерами')
                      return
                    }
                    setSavingRule(true)
                    let created = 0
                    for (const eq of eqsWithTrackers) {
                      try {
                        const res = await fetch('/api/notifications/rules', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            equipmentId: eq.id,
                            conditionType: preset.type,
                            thresholdValue: preset.threshold,
                            description: preset.desc,
                            isActive: true,
                          }),
                        })
                        if (res.ok) created++
                      } catch { /* ignore */ }
                    }
                    toast.success(`Добавлено ${created} правил`)
                    setSavingRule(false)
                    loadRules()
                  }} className="flex items-center gap-2 p-2 rounded-md border text-left hover:bg-muted/50 transition-colors" disabled={savingRule}>
                    <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium">{preset.label}</p>
                      <p className="text-[9px] text-muted-foreground">{preset.desc} • для всей техники</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add rule dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="size-4" />Новое правило уведомления</DialogTitle>
            <DialogDescription>Настройте условие, при котором вы получите важное уведомление</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Техника</Label>
              <Select value={newRuleEqId} onValueChange={setNewRuleEqId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выберите технику" /></SelectTrigger>
                <SelectContent>
                  {equipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.registrationNum || '—'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Условие</Label>
              <Select value={newRuleType} onValueChange={setNewRuleType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Не в сети</SelectItem>
                  <SelectItem value="not_synced">Нет синхронизации</SelectItem>
                  <SelectItem value="not_moving">Не движется</SelectItem>
                  <SelectItem value="speed_exceeded">Превышение скорости</SelectItem>
                  <SelectItem value="fuel_low">Низкое топливо</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newRuleType === 'not_synced' || newRuleType === 'not_moving' || newRuleType === 'speed_exceeded' || newRuleType === 'fuel_low') && (
              <div>
                <Label className="text-xs">
                  {newRuleType === 'not_synced' || newRuleType === 'not_moving' ? 'Порог (часы)' : newRuleType === 'speed_exceeded' ? 'Порог (км/ч)' : 'Порог (%)'}
                </Label>
                <Input type="number" value={newRuleThreshold} onChange={e => setNewRuleThreshold(e.target.value)} className="h-8 text-xs" placeholder={newRuleType === 'speed_exceeded' ? '90' : newRuleType === 'fuel_low' ? '15' : '1'} />
              </div>
            )}
            <div>
              <Label className="text-xs">Описание (необязательно)</Label>
              <Input value={newRuleDesc} onChange={e => setNewRuleDesc(e.target.value)} className="h-8 text-xs" placeholder="Описание правила" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddRuleOpen(false)}>Отмена</Button>
            <Button size="sm" className="h-7 text-xs" onClick={addRule} disabled={savingRule || !newRuleEqId}>
              {savingRule ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Export Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="size-4" />Экспорт отчёта XLSX</DialogTitle>
            <DialogDescription>Выгрузка отчёта по датчикам и статистике за указанный период</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Equipment selection */}
            <div>
              <Label className="text-xs font-medium">Техника</Label>
              <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {trackedEquipment.map(eq => (
                  <label key={eq.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                    <input
                      type="checkbox"
                      checked={reportEqIds.includes(eq.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setReportEqIds(prev => [...prev, eq.id])
                        } else {
                          setReportEqIds(prev => prev.filter(id => id !== eq.id))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="truncate">{eq.name}</span>
                    {eq.registrationNum && <span className="text-muted-foreground">({eq.registrationNum})</span>}
                  </label>
                ))}
                {trackedEquipment.length > 0 && (
                  <div className="flex gap-2 pt-1 border-t">
                    <button className="text-[10px] text-primary hover:underline" onClick={() => setReportEqIds(trackedEquipment.map(e => e.id))}>Выбрать все</button>
                    <button className="text-[10px] text-muted-foreground hover:underline" onClick={() => setReportEqIds([])}>Очистить</button>
                  </div>
                )}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">С</Label>
                <Input type="datetime-local" className="h-8 text-xs" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">По</Label>
                <Input type="datetime-local" className="h-8 text-xs" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyReportDatePreset(preset)}>{preset}</Button>
              ))}
            </div>

            {/* Sensor types filter */}
            {allSensorTypes.length > 0 && (
              <div>
                <Label className="text-xs font-medium">Типы датчиков (пусто = все)</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {allSensorTypes.map(type => (
                    <label key={type} className="flex items-center gap-1 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportSensorTypes.includes(type)}
                        onChange={e => {
                          if (e.target.checked) {
                            setReportSensorTypes(prev => [...prev, type])
                          } else {
                            setReportSensorTypes(prev => prev.filter(t => t !== type))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIncludeStats}
                  onChange={e => setReportIncludeStats(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Включить статистику (пробег, расход, скорости)
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIncludeTracks}
                  onChange={e => setReportIncludeTracks(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Включить данные треков (поездки, стоянки, заправки)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReportOpen(false)}>Отмена</Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={exportReport} disabled={reportLoading || reportEqIds.length === 0 || !reportDateFrom || !reportDateTo}>
              {reportLoading ? <Loader2 className="size-3 animate-spin" /> : <FileText className="size-3" />}
              Скачать XLSX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

