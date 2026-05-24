'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Map as MapIcon, RefreshCw, Wifi, WifiOff, Satellite, Navigation, Fuel,
  Thermometer, Zap, Gauge, Cog, Activity, Clock, Truck,
  CheckCircle2, XCircle, AlertTriangle, Search, Eye, Download,
  Cpu, Copy, ExternalLink, Bell, Settings2, Plus, Save,
  ChevronDown, ChevronUp, ArrowRight, Info, MapPinned, Globe,
  Layers, BarChart3, Compass,
  FileText, Loader2, MapPin, Route, Trash2, X,
  Car, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2,
  Camera, Printer, Share2, Filter, SortAsc, SortDesc,
  CircleParking, CircleStop, Timer, TrendingUp, TrendingDown,
  Leaf, Droplets, CircleDot, Scan, ScanLine, LayoutGrid,
  LayoutList, ArrowUpDown, Crosshair, Move, ImageDown,
  ZoomIn, ZoomOut, PanelTopClose, PanelTopOpen, GripVertical,
  Keyboard, Tag, Radio, Signal, Battery, BatteryLow, BatteryMedium,
  BatteryCharging, Power, CircleCheck, CircleX, CircleAlert,
  Megaphone, TimerReset, Waypoints, FileDown, Link2, Palette,
  GitCompare, CircleGauge, ParkingCircle, Flag, Footprints,
  GaugeCircle, Package, HeartPulse, SunMoon, MoveRight,
  ListFilter, TableProperties
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { Equipment, GlonassTracker, GlonassSensorData } from '@/lib/types'
import { EQUIPMENT_STATUS_MAP, EQUIPMENT_TYPE_MAP, REFRESH_OPTIONS, API, EQUIPMENT_TYPES } from '@/lib/constants'
import { formatDate, formatDateTime, formatTime, formatPrice, statusBadge, TypeBadge, useAutoRefreshCountdown, handleApiError, copyToClipboard, fmtDuration, formatDurationShort, getTypeInfo, toLocalDatetime, useDebounce } from '@/lib/utils'
import { PanelSection, PanelConfigContext, PanelManagerDialog, PanelManagerButton, useTabPanels } from '@/components/panels'

const TrackerMap = dynamic(() => import('@/components/tracker-map'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30 rounded-lg">
      <Loader2 className="size-8 mb-2 animate-spin" />
      <p className="text-xs">Загрузка карты...</p>
    </div>
  ),
})

// ─── #100 Version indicator ──────────────────────────────────
const MAP_TAB_VERSION = '2.0.0'

// ─── #5 Relative time helper ────────────────────────────────
function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    if (diffMs < 0) return 'только что'
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'только что'
    if (diffMin < 60) return `${diffMin} мин назад`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH} ч назад`
    const diffD = Math.floor(diffH / 24)
    return `${diffD} дн. назад`
  } catch {
    return '—'
  }
}

// ─── #66 Data freshness indicator ────────────────────────────
function getFreshnessInfo(dateStr?: string | null): { color: string; label: string; className: string } {
  if (!dateStr) return { color: 'gray', label: 'Нет данных', className: 'bg-gray-400' }
  try {
    const diffMin = (Date.now() - new Date(dateStr).getTime()) / 60000
    if (diffMin < 5) return { color: 'green', label: 'Свежие (<5 мин)', className: 'bg-emerald-500' }
    if (diffMin < 30) return { color: 'yellow', label: 'Устаревшие (<30 мин)', className: 'bg-yellow-500' }
    return { color: 'red', label: 'Старые (>30 мин)', className: 'bg-red-500' }
  } catch {
    return { color: 'gray', label: 'Нет данных', className: 'bg-gray-400' }
  }
}

// ─── #3 Speed badge color ────────────────────────────────────
function getSpeedBadge(speed: number | null | undefined): { className: string; label: string } {
  if (speed == null) return { className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: '—' }
  if (speed <= 0) return { className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Стоит' }
  if (speed <= 40) return { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Медленно' }
  if (speed <= 80) return { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', label: 'Средне' }
  return { className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', label: 'Быстро' }
}

// ─── #57 Movement status ─────────────────────────────────────
function getMovementStatus(t: { isActive?: boolean; lastSpeed?: number | null; lastIgnition?: boolean | null }): { label: string; icon: React.ReactNode; color: string } {
  if (!t.isActive) return { label: 'Оффлайн', icon: <WifiOff className="size-3" />, color: 'text-red-500' }
  if (t.lastSpeed && t.lastSpeed > 2) return { label: 'Движется', icon: <MoveRight className="size-3" />, color: 'text-emerald-500' }
  if (t.lastIgnition) return { label: 'Холостой ход', icon: <Power className="size-3" />, color: 'text-yellow-500' }
  return { label: 'Стоит', icon: <CircleParking className="size-3" />, color: 'text-gray-500' }
}

// ─── #65 Health score ────────────────────────────────────────
function getHealthScore(t: { isActive?: boolean; lastSeenAt?: string | null }): number {
  let score = 0
  if (t.isActive) score += 50
  if (t.lastSeenAt) {
    const diffMin = (Date.now() - new Date(t.lastSeenAt).getTime()) / 60000
    if (diffMin < 5) score += 40
    else if (diffMin < 30) score += 25
    else if (diffMin < 60) score += 10
  }
  return Math.min(100, score)
}

// ─── #91 URL state sync helpers ──────────────────────────────
function getUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  params.forEach((v, k) => { result[k] = v })
  return result
}

function setUrlParam(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (value) url.searchParams.set(key, value)
  else url.searchParams.delete(key)
  window.history.replaceState({}, '', url.toString())
}

// ─── #90 LocalStorage persistence ────────────────────────────
function loadPrefs<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(`map-tab-${key}`)
    return stored ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

function savePrefs(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(`map-tab-${key}`, JSON.stringify(value)) } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// MAP TAB — Карта всей техники (v2.0 — 100 улучшений)
// ═══════════════════════════════════════════════════════════════

export const MapTab = React.memo(function MapTab({ equipment, onSync, onOpenDetail }: {
  equipment: Equipment[]
  onSync: () => void
  onOpenDetail?: (equipmentId: string) => void
}) {
  // ─── Panel management ──────────────────────────────────────
  const { panelConfig, panelManagerOpen, setPanelManagerOpen, contextValue } = useTabPanels('map')

  // ─── Core state (existing) ────────────────────────────────
  const [syncing, setSyncing] = useState(false)
  const [quickSyncingIds, setQuickSyncingIds] = useState<Set<string>>(new Set())
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof REFRESH_OPTIONS[number]['value']>>(60)
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

  // ─── Track viewing state (existing) ───────────────────────
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

  // ─── Report export state (existing) ───────────────────────
  const [reportOpen, setReportOpen] = useState(false)
  const [reportEqIds, setReportEqIds] = useState<string[]>([])
  const [reportDateFrom, setReportDateFrom] = useState<string>('')
  const [reportDateTo, setReportDateTo] = useState<string>('')
  const [reportSensorTypes, setReportSensorTypes] = useState<string[]>([])
  const [reportIncludeStats, setReportIncludeStats] = useState(true)
  const [reportIncludeTracks, setReportIncludeTracks] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // ─── NEW: Search & filter state (#9, #26, #76) ────────────
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300) // #76 debounced search

  // ─── NEW: Equipment type filter (#27) ─────────────────────
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // ─── NEW: Sort state (#28) ────────────────────────────────
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'speed' | 'lastSeen'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // ─── NEW: View mode (#10, #17) ────────────────────────────
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded')
  const [showEquipmentList, setShowEquipmentList] = useState(true)

  // ─── NEW: Map options (#18, #34, #35, #96) ───────────────
  const [mapHeight, setMapHeight] = useState<'small' | 'medium' | 'large' | 'fullscreen'>('medium')
  const [isFullscreen, setIsFullscreen] = useState(false) // #96

  // ─── NEW: Track playback (#36) ────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)

  // ─── NEW: Selected equipment overlay (#53) ────────────────
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null)

  // ─── NEW: Cluster toggle (#34) ────────────────────────────
  const [clusterEnabled, setClusterEnabled] = useState(true)

  // ─── NEW: Track panel minimize (#97) ──────────────────────
  const [trackPanelMinimized, setTrackPanelMinimized] = useState(false)

  // ─── NEW: Loading skeleton (#2) ───────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (equipment.length > 0) setIsLoading(false)
    else { const t = setTimeout(() => setIsLoading(false), 1500); return () => clearTimeout(t) }
  }, [equipment])

  // ─── #88 Track loading progress ───────────────────────────
  const [trackLoadProgress, setTrackLoadProgress] = useState(0)
  const [trackLoadCancelRef, setTrackLoadCancelRef] = useState<AbortController | null>(null) // #87

  // ─── #89 Auto-refresh toast ───────────────────────────────
  const lastAutoRefreshRef = useRef<Date | null>(null)

  // ─── Equipment card scroll ref (#93) ──────────────────────
  const equipmentListRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // ─── Load preferences from localStorage after mount (#90) ──
  // Track whether initial load has happened to avoid overwriting localStorage with defaults
  const prefsLoadedRef = useRef(false)
  useEffect(() => {
    setRefreshInterval(loadPrefs('refreshInterval', 60) as any)
    setFilter(loadPrefs('filter', 'all') as any)
    setSortBy(loadPrefs('sortBy', 'name') as any)
    setSortDir(loadPrefs('sortDir', 'asc') as any)
    setViewMode(loadPrefs('viewMode', 'expanded') as any)
    setShowEquipmentList(loadPrefs('showList', true))
    setMapHeight(loadPrefs('mapHeight', 'medium') as any)
    setClusterEnabled(loadPrefs('clusterEnabled', true))
    prefsLoadedRef.current = true
  }, [])

  // ─── Persist preferences to localStorage (#90) ────────────
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('filter', filter) }, [filter])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('sortBy', sortBy) }, [sortBy])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('sortDir', sortDir) }, [sortDir])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('viewMode', viewMode) }, [viewMode])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('showList', showEquipmentList) }, [showEquipmentList])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('mapHeight', mapHeight) }, [mapHeight])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('clusterEnabled', clusterEnabled) }, [clusterEnabled])
  useEffect(() => { if (prefsLoadedRef.current) savePrefs('refreshInterval', refreshInterval) }, [refreshInterval])

  // ─── #91 URL state sync ───────────────────────────────────
  useEffect(() => {
    const params = getUrlParams()
    if (params.filter && ['all', 'online', 'offline', 'notracker'].includes(params.filter)) setFilter(params.filter as any)
    if (params.trackEqId) setTrackEqId(params.trackEqId)
    if (params.trackFrom) setTrackDateFrom(params.trackFrom)
    if (params.trackTo) setTrackDateTo(params.trackTo)
  }, [])

  useEffect(() => { setUrlParam('filter', filter !== 'all' ? filter : null) }, [filter])
  useEffect(() => { setUrlParam('trackEqId', trackEqId || null) }, [trackEqId])

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

  // ─── Fetch track with cancel & progress (#86, #87, #88) ──
  const fetchTrack = async () => {
    if (!trackEqId || !trackDateFrom || !trackDateTo) return
    const eq = equipment.find(e => e.id === trackEqId)
    if (!eq || !eq.trackers || eq.trackers.length === 0) return

    const tracker = eq.trackers[0]
    const axentaId = tracker.axentaCloudId || tracker.trackerId

    // #87 Cancel previous request if any
    if (trackLoadCancelRef) trackLoadCancelRef.abort()
    const abortController = new AbortController()
    setTrackLoadCancelRef(abortController)

    setTrackLoading(true)
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setSelectedTripIndex(null)
    setTrackLoadProgress(10)

    try {
      setTrackLoadProgress(20)
      const [tracksRes, statsRes] = await Promise.all([
        fetch('/api/glonass/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          }),
          signal: abortController.signal,
        }),
        fetch('/api/glonass/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          }),
          signal: abortController.signal,
        })
      ])

      setTrackLoadProgress(60)

      if (statsRes.ok) {
        setTrackStats(await statsRes.json())
      }

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()
        setTrackLoadProgress(80)

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

        const parsedParkings = (tracksData.parkings || []).map((p: Record<string, unknown>) => ({
          startDate: p.startDate as string,
          endDate: p.endDate as string,
          lat: p.lat as number,
          lng: p.lng as number,
          duration: p.duration as number,
          ignitionTime: p.ignitionTime as number | undefined,
        }))

        const parsedStops = (tracksData.stops || []).map((s: Record<string, unknown>) => ({
          startDate: s.startDate as string,
          endDate: s.endDate as string,
          lat: s.lat as number,
          lng: s.lng as number,
          duration: s.duration as number,
        }))

        const simplePoints: Array<{ lat: number; lng: number }> = []
        for (const trip of parsedTrips) {
          for (const p of trip.points) {
            simplePoints.push({ lat: p.lat, lng: p.lng })
          }
        }
        setTrackPoints(simplePoints)

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

        setTrackLoadProgress(100)
        const totalPoints = simplePoints.length
        const tripCount = parsedTrips.length
        const parkingCount = parsedParkings.length
        toast.success(`Трек загружен: ${tripCount} поездок, ${totalPoints} точек, ${parkingCount} стоянок`)
      } else {
        toast.error('Ошибка загрузки трека')
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.info('Загрузка трека отменена') // #87
      } else {
        toast.error('Ошибка загрузки трека')
      }
    }
    setTrackLoading(false)
    setTrackLoadProgress(0)
    setTrackLoadCancelRef(null)
  }

  const clearTrack = () => {
    if (trackLoadCancelRef) trackLoadCancelRef.abort() // #87 cancel on clear
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setTrackEqId('')
    setTrackDateFrom('')
    setTrackDateTo('')
    setSelectedTripIndex(null)
    setIsPlaying(false)
    setPlaybackIndex(0)
  }

  // ─── Report export (existing) ─────────────────────────────
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

  // ─── #56 Fleet summary computed values ────────────────────
  const fleetSummary = useMemo(() => {
    const totalOnline = onlineCount
    const totalOffline = offlineCount
    const avgSpeed = trackersForMap.length > 0
      ? trackersForMap.reduce((sum, t) => sum + (t.lastSpeed || 0), 0) / trackersForMap.length
      : 0
    const totalFuel = trackersForMap.reduce((sum, t) => sum + (t.lastFuelLevel || 0), 0)
    const totalMileage = trackersForMap.reduce((sum, t) => sum + (t.lastMileage || 0), 0)
    const maxSpeed = trackersForMap.reduce((max, t) => Math.max(max, t.lastSpeed || 0), 0)
    const movingCount = trackersForMap.filter(t => t.isActive && (t.lastSpeed || 0) > 2).length
    const idleCount = trackersForMap.filter(t => t.isActive && (!t.lastSpeed || t.lastSpeed <= 2) && t.lastIgnition).length
    const parkedCount = trackersForMap.filter(t => t.isActive && (!t.lastSpeed || t.lastSpeed <= 2) && !t.lastIgnition).length
    const fleetUtilization = trackersForMap.length > 0
      ? Math.round((movingCount / trackersForMap.length) * 100)
      : 0
    // #67 distance traveled today (approx from mileage)
    // #70 fuel consumed today
    // #71 engine hours today
    const ignitionOnCount = trackersForMap.filter(t => t.lastIgnition).length
    // #73 speed violation counter
    const speedViolations = trackersForMap.filter(t => (t.lastSpeed || 0) > 80).length
    // #59 fuel efficiency ranking
    const fuelEfficiencyRank = trackersForMap
      .filter(t => t.lastFuelLevel != null && t.lastMileage != null && t.lastMileage! > 0)
      .sort((a, b) => ((a.lastFuelLevel || 0) / (a.lastMileage || 1)) - ((b.lastFuelLevel || 0) / (b.lastMileage || 1)))

    return {
      totalOnline, totalOffline, avgSpeed, totalFuel, totalMileage, maxSpeed,
      movingCount, idleCount, parkedCount, fleetUtilization, ignitionOnCount,
      speedViolations, fuelEfficiencyRank,
    }
  }, [trackersForMap, onlineCount, offlineCount])

  // ─── Filtered & sorted trackers (#26, #27, #28) ──────────
  const filteredTrackers = useMemo(() => {
    let result = trackersForMap

    // Status filter
    switch (filter) {
      case 'online': result = result.filter(t => t.isActive); break
      case 'offline': result = result.filter(t => !t.isActive); break
    }

    // #26/#76 Search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(t =>
        (t.equipmentName || '').toLowerCase().includes(q) ||
        (t.registrationNum || '').toLowerCase().includes(q) ||
        (t.trackerName || '').toLowerCase().includes(q)
      )
    }

    // #27 Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.equipmentType === typeFilter)
    }

    // #28 Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = (a.equipmentName || '').localeCompare(b.equipmentName || ''); break
        case 'status': cmp = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1; break
        case 'speed': cmp = (a.lastSpeed || 0) - (b.lastSpeed || 0); break
        case 'lastSeen': {
          const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
          const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
          cmp = aTime - bTime; break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [filter, trackersForMap, debouncedSearch, typeFilter, sortBy, sortDir])

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
          parkings: [],
          stops: [],
        }
      }
    }
    return trackData
  }, [trackData, selectedTripIndex])

  // ─── #39-41 Track analytics computed ──────────────────────
  const trackAnalytics = useMemo(() => {
    if (!trackStats) return null
    const mileage = Number(trackStats.mileage) || 0
    const fuelConsumption = Number(trackStats.fuelConsumption) || 0
    const tripsDuration = Number(trackStats.tripsDuration) || 0
    const parkingsDuration = Number(trackStats.parkingsDuration) || 0
    const totalDuration = tripsDuration + parkingsDuration

    // #39 Fuel consumption rate L/100km
    const fuelRate = mileage > 0 ? (fuelConsumption / mileage) * 100 : null
    // #40 Idle time percentage
    const idlePercent = totalDuration > 0 ? (parkingsDuration / totalDuration) * 100 : null
    // #41 CO2 estimate (approx 2.31 kg CO2 per liter of gasoline)
    const co2Estimate = fuelConsumption * 2.31

    return { fuelRate, idlePercent, co2Estimate }
  }, [trackStats])

  // ─── #32/#33 Click to center on equipment ─────────────────
  const handleCenterOnEquipment = useCallback((eqId: string) => {
    setSelectedEqId(eqId)
    // Scroll to card #93
    const card = cardRefs.current.get(eqId)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  // ─── Quick sync: refresh sensors for a single tracker ────
  const quickSyncTracker = useCallback(async (trackerId: string) => {
    setQuickSyncingIds(prev => new Set(prev).add(trackerId))
    try {
      const res = await fetch('/api/glonass/quick-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.synced > 0) {
          // Refresh equipment data to reflect updated sensors
          await onSync()
        }
      }
    } catch {
      // Silent fail for quick sync
    } finally {
      setQuickSyncingIds(prev => {
        const next = new Set(prev)
        next.delete(trackerId)
        return next
      })
    }
  }, [onSync])

  // ─── #36 Track playback animation ─────────────────────────
  useEffect(() => {
    if (!isPlaying || !trackPoints.length) return
    const interval = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= trackPoints.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 200)
    return () => clearInterval(interval)
  }, [isPlaying, trackPoints.length])

  // ─── #38 Track sharing ────────────────────────────────────
  const shareTrack = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('trackEqId', trackEqId)
    url.searchParams.set('trackFrom', trackDateFrom)
    url.searchParams.set('trackTo', trackDateTo)
    copyToClipboard(url.toString())
    toast.success('Ссылка скопирована в буфер обмена')
  }, [trackEqId, trackDateFrom, trackDateTo])

  // ─── #37 GPX export placeholder ───────────────────────────
  const exportGPX = useCallback(() => {
    if (!trackPoints.length) return
    // Build simple GPX
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FleetTracker">
  <trk><name>Track ${trackEqId}</name><trkseg>
${trackPoints.map(p => `    <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join('\n')}
  </trkseg></trk>
</gpx>`
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `track-${trackEqId}.gpx`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast.success('GPX файл скачан')
  }, [trackPoints, trackEqId])

  // ─── #92 Responsive map height ────────────────────────────
  const mapHeightClass = useMemo(() => {
    if (isFullscreen) return 'h-[calc(100dvh-80px)]'
    switch (mapHeight) {
      case 'small': return 'h-[calc(50dvh)] min-h-[300px]'
      case 'large': return 'h-[calc(85dvh-120px)] min-h-[500px]'
      default: return 'h-[calc(100dvh-220px)] min-h-[400px]'
    }
  }, [mapHeight, isFullscreen])

  // ─── #29 Quick filter helpers ─────────────────────────────
  const selectAllOnline = useCallback(() => { setFilter('online') }, [])
  const selectAllOffline = useCallback(() => { setFilter('offline') }, [])

  // ─── #75 Group by status ──────────────────────────────────
  const groupedByStatus = useMemo(() => ({
    online: filteredTrackers.filter(t => t.isActive),
    offline: filteredTrackers.filter(t => !t.isActive),
  }), [filteredTrackers])

  // ─── #95 Context menu (placeholder state) ─────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eqId?: string } | null>(null)

  // ─── #98/#99 Print/Screenshot placeholders ────────────────
  const handlePrintMap = useCallback(() => { toast.info('Функция печати карты в разработке') }, [])
  const handleScreenshot = useCallback(() => { toast.info('Функция снимка карты в разработке') }, [])

  // ─── #44-45 Speed violation / refuel markers (computed) ───
  const speedViolationsOnTrack = useMemo(() => {
    if (!trackData?.trips) return []
    const violations: Array<{ lat: number; lng: number; speed: number; time: string }> = []
    for (const trip of trackData.trips) {
      for (const p of trip.points) {
        if (p.speed > 80) violations.push(p)
      }
    }
    return violations
  }, [trackData])

  // ─── #20 Breadcrumbs showing active filters ───────────────
  const activeFilterBreadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClear: () => void }> = []
    if (filter !== 'all') crumbs.push({ label: filter === 'online' ? 'Онлайн' : filter === 'offline' ? 'Оффлайн' : 'Без трекера', onClear: () => setFilter('all') })
    if (typeFilter !== 'all') crumbs.push({ label: typeFilter, onClear: () => setTypeFilter('all') })
    if (debouncedSearch) crumbs.push({ label: `"${debouncedSearch}"`, onClear: () => setSearchInput('') })
    if (sortBy !== 'name') crumbs.push({ label: `Сортировка: ${sortBy === 'status' ? 'Статус' : sortBy === 'speed' ? 'Скорость' : 'Последняя связь'}`, onClear: () => { setSortBy('name'); setSortDir('asc') } })
    return crumbs
  }, [filter, typeFilter, debouncedSearch, sortBy])

  // ─── #85 Error boundary ───────────────────────────────────
  const [hasError, setHasError] = useState(false)
  if (hasError) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="size-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-medium">Ошибка компонента карты</p>
          <p className="text-xs text-muted-foreground mt-1">Попробуйте обновить страницу</p>
          <Button size="sm" className="mt-3" onClick={() => setHasError(false)}>
            <RefreshCw className="size-3 mr-1" />Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <PanelConfigContext.Provider value={contextValue}>
    <TooltipProvider delayDuration={400}>
      <div className="space-y-3">
        {/* ─── #100 Version indicator ──────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={subTab === 'map' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('map')} data-testid="tab-map" aria-label="Вкладка карта">
            <MapIcon className="size-3" />Карта
          </Button>
          <Button size="sm" variant={subTab === 'notifications' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('notifications')} data-testid="tab-notifications" aria-label="Вкладка уведомления">
            <Bell className="size-3" />Уведомления
            {notifRules.filter(r => r.isActive).length > 0 && (
              <span className="ml-1 bg-primary/20 rounded-full px-1.5 text-[9px]">{notifRules.filter(r => r.isActive).length}</span>
            )}
          </Button>
          <span className="text-[8px] text-muted-foreground/40 ml-auto" data-testid="version-indicator">v{MAP_TAB_VERSION}</span>
        </div>

        {subTab === 'map' ? (
          <>
            {/* ═══════════════════════════════════════════════════════
                #56 Fleet Summary Dashboard Cards
            ═══════════════════════════════════════════════════════ */}
            <PanelSection panelKey="map_stats">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2" data-testid="fleet-summary">
              {/* #56a Total Online */}
              <Card className="border-l-4 border-l-emerald-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Wifi className="size-4 text-emerald-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Онлайн</p>
                      <p className="text-base font-bold text-emerald-600">{fleetSummary.totalOnline}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* #56b Avg Speed (#69) */}
              <Card className="border-l-4 border-l-sky-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-4 text-sky-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Ср. скорость</p>
                      <p className="text-base font-bold">{fleetSummary.avgSpeed.toFixed(1)}<span className="text-[9px] font-normal ml-0.5">км/ч</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* #56c Total Fuel (#70) */}
              <Card className="border-l-4 border-l-amber-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Fuel className="size-4 text-amber-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Топливо</p>
                      <p className="text-base font-bold">{fleetSummary.totalFuel.toFixed(0)}<span className="text-[9px] font-normal ml-0.5">л</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* #68 Total Mileage */}
              <Card className="border-l-4 border-l-purple-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Navigation className="size-4 text-purple-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Пробег</p>
                      <p className="text-base font-bold">{fleetSummary.totalMileage.toFixed(0)}<span className="text-[9px] font-normal ml-0.5">км</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* #63 Fleet Utilization */}
              <Card className="border-l-4 border-l-teal-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-teal-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Использование</p>
                      <p className="text-base font-bold">{fleetSummary.fleetUtilization}<span className="text-[9px] font-normal ml-0.5">%</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* #73 Speed Violations / #64 Alerts */}
              <Card className="border-l-4 border-l-red-500 overflow-hidden">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-red-500" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Нарушения</p>
                      <p className="text-base font-bold text-red-600">{fleetSummary.speedViolations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </PanelSection>

            {/* ═══════════════════════════════════════════════════════
                #12 Sticky Toolbar with #16 responsive collapse
            ═══════════════════════════════════════════════════════ */}
            <PanelSection panelKey="map_filters" noCollapse>
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b pb-2 -mx-0 px-0" data-testid="toolbar">
              {/* #9/#26 Search input + #76 debounce */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию/номеру..."
                    className="h-7 text-[11px] pl-7"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    data-testid="search-input"
                    aria-label="Поиск техники"
                  />
                  {searchInput && (
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchInput('')} aria-label="Очистить поиск">
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                {/* #27 Equipment type filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 w-auto text-[11px] min-w-[100px]" data-testid="type-filter" aria-label="Фильтр по типу">
                    <Filter className="size-3 mr-1" />
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {EQUIPMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* #28 Sort options */}
                <Select value={sortBy} onValueChange={v => { setSortBy(v as any); if (v === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc') }}>
                  <SelectTrigger className="h-7 w-auto text-[11px] min-w-[90px]" data-testid="sort-select" aria-label="Сортировка">
                    {sortDir === 'asc' ? <SortAsc className="size-3 mr-1" /> : <SortDesc className="size-3 mr-1" />}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">По названию</SelectItem>
                    <SelectItem value="status">По статусу</SelectItem>
                    <SelectItem value="speed">По скорости</SelectItem>
                    <SelectItem value="lastSeen">По связи</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter buttons (#8 improved visual states) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} className={`h-7 text-[11px] gap-1 transition-all ${filter === 'all' ? 'ring-2 ring-primary/30 shadow-sm' : 'hover:shadow-sm'}`} onClick={() => setFilter('all')} data-testid="filter-all" aria-label="Показать всю технику">
                        <MapPin className="size-3" /><span className="hidden sm:inline">Все</span> ({trackersForMap.length})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Показать всю технику</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant={filter === 'online' ? 'default' : 'outline'} className={`h-7 text-[11px] gap-1 transition-all ${filter === 'online' ? 'ring-2 ring-emerald-500/30 shadow-sm' : 'hover:shadow-sm'}`} onClick={() => setFilter('online')} data-testid="filter-online" aria-label="Онлайн техника">
                        <Wifi className="size-3" /><span className="hidden sm:inline">Онлайн</span> ({onlineCount})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Только онлайн техника</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant={filter === 'offline' ? 'default' : 'outline'} className={`h-7 text-[11px] gap-1 transition-all ${filter === 'offline' ? 'ring-2 ring-red-500/30 shadow-sm' : 'hover:shadow-sm'}`} onClick={() => setFilter('offline')} data-testid="filter-offline" aria-label="Оффлайн техника">
                        <WifiOff className="size-3" /><span className="hidden sm:inline">Оффлайн</span> ({offlineCount})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Только оффлайн техника</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant={filter === 'notracker' ? 'default' : 'outline'} className={`h-7 text-[11px] gap-1 transition-all ${filter === 'notracker' ? 'ring-2 ring-amber-500/30 shadow-sm' : 'hover:shadow-sm'}`} onClick={() => setFilter('notracker')} data-testid="filter-notracker" aria-label="Без трекера">
                        <Satellite className="size-3" /><span className="hidden sm:inline">Без трекера</span> ({noTrackerCount})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Техника без трекера</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex-1" />

                {/* #29 Quick select buttons */}
                <div className="hidden sm:flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 text-emerald-600" onClick={selectAllOnline} data-testid="select-online" aria-label="Выбрать все онлайн">
                        <CheckCircle2 className="size-2.5" />Онлайн
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Быстрый фильтр: все онлайн</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 text-red-500" onClick={selectAllOffline} data-testid="select-offline" aria-label="Выбрать все оффлайн">
                        <XCircle className="size-2.5" />Оффлайн
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Быстрый фильтр: все оффлайн</TooltipContent>
                  </Tooltip>
                </div>

                <Separator orientation="vertical" className="h-5" />

                {/* Action buttons with tooltips (#19 keyboard hints, #82) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant={showTrackPanel ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setShowTrackPanel(!showTrackPanel)} data-testid="toggle-track" aria-label="Панель треков">
                      <Route className="size-3" /><span className="hidden sm:inline">Трек</span>
                      {trackPoints.length > 0 && <span className="ml-0.5 bg-primary/20 rounded-full px-1.5 text-[9px]">{trackPoints.length}</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><kbd className="text-[9px] bg-muted px-1 rounded mr-1">T</kbd> Панель треков</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { setReportEqIds(trackersForMap.map(t => t.equipmentId!).filter(Boolean)); setReportOpen(true) }} data-testid="export-report" aria-label="Экспорт отчёта">
                      <FileText className="size-3" /><span className="hidden sm:inline">Отчёт</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Экспорт отчёта XLSX</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={syncing} onClick={async () => { setSyncing(true); await onSync(); setSyncing(false) }} data-testid="sync-btn" aria-label="Синхронизировать">
                      {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                      <span className="hidden sm:inline">Синхрон.</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><kbd className="text-[9px] bg-muted px-1 rounded mr-1">R</kbd> Синхронизировать</TooltipContent>
                </Tooltip>

                {/* #34 Cluster toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant={clusterEnabled ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setClusterEnabled(!clusterEnabled)} data-testid="cluster-toggle" aria-label="Кластеризация">
                      <Layers className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Кластеризация маркеров</TooltipContent>
                </Tooltip>

                {/* #96 Fullscreen toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setIsFullscreen(!isFullscreen)} data-testid="fullscreen-toggle" aria-label="Полноэкранный режим">
                      {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><kbd className="text-[9px] bg-muted px-1 rounded mr-1">F</kbd> Полный экран</TooltipContent>
                </Tooltip>

                {/* #18 Map height presets */}
                <Select value={mapHeight} onValueChange={v => setMapHeight(v as any)}>
                  <SelectTrigger className="h-7 w-auto text-[11px] border-0 p-0 shadow-none gap-0.5" data-testid="map-height" aria-label="Размер карты">
                    <ZoomIn className="size-3 text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Маленькая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="large">Большая</SelectItem>
                  </SelectContent>
                </Select>

                {/* Refresh interval (#1 emoji replaced) */}
                <span className="text-[9px] text-muted-foreground flex items-center gap-1" data-testid="refresh-indicator">
                  <span className={`size-1.5 rounded-full ${refreshInterval > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}></span>
                  <Select value={String(refreshInterval)} onValueChange={v => setRefreshInterval(Number(v) as any)}>
                    <SelectTrigger className="h-5 w-auto border-0 p-0 text-[9px] text-muted-foreground gap-0.5 shadow-none focus:ring-0" style={{ minWidth: 0 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[100px]">
                      {REFRESH_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-[11px]">
                          {refreshInterval > 0 && opt.value === refreshInterval ? <RefreshCw className="size-2.5 inline mr-1 animate-spin" /> : null}{opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>

                {/* Panel management button */}
                <PanelManagerButton panelConfig={panelConfig} onClick={() => setPanelManagerOpen(true)} />
              </div>

              {/* #20 Breadcrumbs showing active filters */}
              {activeFilterBreadcrumbs.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" data-testid="filter-breadcrumbs">
                  <Tag className="size-2.5 text-muted-foreground" />
                  {activeFilterBreadcrumbs.map((crumb, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] gap-1 h-5 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={crumb.onClear}>
                      {crumb.label}
                      <X className="size-2.5" />
                    </Badge>
                  ))}
                  <button className="text-[9px] text-muted-foreground hover:text-foreground underline" onClick={() => { setFilter('all'); setTypeFilter('all'); setSearchInput(''); setSortBy('name'); setSortDir('asc') }}>
                    Сбросить все
                  </button>
                </div>
              )}
            </div>
            </PanelSection>

            {/* ═══════════════════════════════════════════════════════
                Track Panel (#21 collapsible, #97 minimize/maximize)
            ═══════════════════════════════════════════════════════ */}
            {showTrackPanel && (
              <Card className={`border-dashed transition-all ${trackPanelMinimized ? 'py-0' : ''}`} data-testid="track-panel">
                <CardContent className={`p-3 space-y-3 ${trackPanelMinimized ? 'hidden' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5" aria-label="Просмотр трека">
                      <Route className="size-3.5" />Просмотр трека за период
                    </h3>
                    <div className="flex items-center gap-1">
                      {trackPoints.length > 0 && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={clearTrack} data-testid="clear-track">
                          <X className="size-3" />Очистить
                        </Button>
                      )}
                      {/* #97 Minimize/Maximize */}
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setTrackPanelMinimized(!trackPanelMinimized)} aria-label={trackPanelMinimized ? 'Развернуть панель' : 'Свернуть панель'}>
                        {trackPanelMinimized ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-1">
                      <Label className="text-[10px]">Техника</Label>
                      <Select value={trackEqId} onValueChange={setTrackEqId}>
                        <SelectTrigger className="h-7 text-[11px]" data-testid="track-equipment-select">
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
                      <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateFrom} onChange={e => setTrackDateFrom(e.target.value)} data-testid="track-date-from" />
                    </div>
                    <div>
                      <Label className="text-[10px]">По</Label>
                      <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateTo} onChange={e => setTrackDateTo(e.target.value)} data-testid="track-date-to" />
                    </div>
                    <div className="flex items-end gap-1">
                      <Button size="sm" className="h-7 text-[11px] flex-1 gap-1" disabled={!trackEqId || !trackDateFrom || !trackDateTo || trackLoading} onClick={fetchTrack} data-testid="load-track">
                        {trackLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                        Загрузить
                      </Button>
                      {/* #87 Cancel button */}
                      {trackLoading && trackLoadCancelRef && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => trackLoadCancelRef.abort()} aria-label="Отменить загрузку">
                              <X className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Отменить загрузку</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  {/* #88 Progress bar for track loading */}
                  {trackLoading && trackLoadProgress > 0 && (
                    <div className="space-y-1">
                      <Progress value={trackLoadProgress} className="h-1.5" data-testid="track-progress" />
                      <p className="text-[9px] text-muted-foreground text-center">Загрузка... {trackLoadProgress}%</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                      <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTrackDatePreset(preset)}>{preset}</Button>
                    ))}
                  </div>

                  {/* #22 Color gradient header track stats */}
                  {trackStats && (
                    <div className="rounded-lg overflow-hidden border" data-testid="track-stats">
                      <div className="bg-gradient-to-r from-sky-500/20 via-emerald-500/20 to-amber-500/20 dark:from-sky-500/10 dark:via-emerald-500/10 dark:to-amber-500/10 px-3 py-1.5">
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Статистика трека</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
                        {trackStats.mileage != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Пробег</p><p className="text-[11px] font-semibold">{Number(trackStats.mileage).toFixed(1)} км</p></div>}
                        {trackStats.avgSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Ср. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.avgSpeed).toFixed(1)} км/ч</p></div>}
                        {trackStats.maxSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Макс. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.maxSpeed).toFixed(1)} км/ч</p></div>}
                        {trackStats.fuelConsumption != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Расход топлива</p><p className="text-[11px] font-semibold">{Number(trackStats.fuelConsumption).toFixed(1)} л</p></div>}
                        {trackStats.tripsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Время поездок</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.tripsDuration))}</p></div>}
                        {trackStats.parkingsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Стоянки</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.parkingsDuration))}</p></div>}
                        {trackStats.refuelVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Заправки</p><p className="text-[11px] font-semibold">{Number(trackStats.refuelVolume).toFixed(1)} л</p></div>}
                        {trackStats.plumVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Сливы</p><p className="text-[11px] font-semibold">{Number(trackStats.plumVolume).toFixed(1)} л</p></div>}
                        {trackStats.engineHours != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Моточасы</p><p className="text-[11px] font-semibold">{Number(trackStats.engineHours).toFixed(1)} ч</p></div>}
                        {/* #39 Fuel consumption rate L/100km */}
                        {trackAnalytics?.fuelRate != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Расход л/100км</p><p className="text-[11px] font-semibold">{trackAnalytics.fuelRate.toFixed(1)} л</p></div>}
                        {/* #40 Idle time percentage */}
                        {trackAnalytics?.idlePercent != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Простой</p><p className="text-[11px] font-semibold">{trackAnalytics.idlePercent.toFixed(0)}%</p></div>}
                        {/* #41 CO2 estimate */}
                        {trackAnalytics?.co2Estimate != null && trackAnalytics.co2Estimate > 0 && <div className="text-center"><p className="text-[9px] text-muted-foreground"><Leaf className="size-2.5 inline" /> CO₂</p><p className="text-[11px] font-semibold">{trackAnalytics.co2Estimate.toFixed(1)} кг</p></div>}
                      </div>
                    </div>
                  )}

                  {trackPoints.length > 0 && trackData && (
                    <div className="space-y-2 pt-1 border-t border-dashed">
                      {/* #1 Replace all emoji with Lucide icons */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500 rounded" />{trackPoints.length} точек</span>
                        {trackData.trips && <span className="flex items-center gap-1"><Car className="size-3" />{trackData.trips.length} поездок</span>}
                        {trackData.parkings && <span className="flex items-center gap-1"><CircleParking className="size-3" />{trackData.parkings.length} стоянок</span>}
                        {trackData.stops && <span className="flex items-center gap-1"><CircleStop className="size-3" />{trackData.stops.length} остановок</span>}
                        {trackData.track?.distance != null && <span className="flex items-center gap-1"><Navigation className="size-3" />{trackData.track.distance.toFixed(1)} км</span>}
                      </div>

                      {/* #44 Speed violations on track */}
                      {speedViolationsOnTrack.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <AlertTriangle className="size-3 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium">{speedViolationsOnTrack.length} точек превышения скорости (&gt;80 км/ч)</span>
                        </div>
                      )}

                      {/* Speed legend (existing, with icons instead of emoji) */}
                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="text-muted-foreground font-medium">Скорость:</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#9ca3af'}} />0</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#22c55e'}} />≤20</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#eab308'}} />≤60</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#f97316'}} />≤80</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#ef4444'}} />&gt;80</span>
                        <span className="text-muted-foreground">км/ч</span>
                      </div>

                      {/* #36 Track playback controls */}
                      {trackPoints.length > 1 && (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setIsPlaying(false); setPlaybackIndex(0) }} aria-label="В начало">
                                <SkipBack className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>В начало</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant={isPlaying ? 'default' : 'outline'} className="h-6 w-6 p-0" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}>
                                {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isPlaying ? 'Пауза' : 'Воспроизвести'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPlaybackIndex(Math.min(playbackIndex + 10, trackPoints.length - 1))} aria-label="Вперёд">
                                <SkipForward className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Перемотка вперёд</TooltipContent>
                          </Tooltip>
                          <div className="flex-1">
                            <input type="range" min={0} max={trackPoints.length - 1} value={playbackIndex} onChange={e => { setPlaybackIndex(Number(e.target.value)); setIsPlaying(false) }} className="w-full h-1 accent-primary" data-testid="playback-slider" aria-label="Позиция воспроизведения" />
                          </div>
                          <span className="text-[9px] text-muted-foreground min-w-[50px]">{playbackIndex}/{trackPoints.length - 1}</span>
                        </div>
                      )}

                      {/* Track action buttons (#37 GPX, #38 Share, #42 Compare, #43 Geofence, #45 Refuel, #51 Snap, #52 Color) */}
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={exportGPX} disabled={!trackPoints.length} data-testid="export-gpx" aria-label="Скачать GPX">
                              <FileDown className="size-2.5" />GPX
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Скачать трек в формате GPX</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={shareTrack} disabled={!trackEqId} data-testid="share-track" aria-label="Поделиться треком">
                              <Share2 className="size-2.5" />Ссылка
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Копировать ссылку на трек</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Сравнение треков в разработке')} data-testid="compare-tracks" aria-label="Сравнить треки">
                              <GitCompare className="size-2.5" />Сравнить
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Сравнить два трека</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Геозоны в разработке')} data-testid="geofence-btn" aria-label="Геозоны">
                              <CircleDot className="size-2.5" />Геозоны
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Визуализация геозон</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Привязка к дороге в разработке')} data-testid="snap-road" aria-label="Привязка к дороге">
                              <Waypoints className="size-2.5" />Дороги
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Привязка трека к дорогам</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Настройка цвета в разработке')} data-testid="track-color" aria-label="Цвет трека">
                              <Palette className="size-2.5" />Цвет
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Настройка цвета трека</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Заправки/сливы на карте в разработке')} data-testid="refuel-markers" aria-label="Заправки/сливы">
                              <Droplets className="size-2.5" />Заправки
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Маркеры заправок и сливов</TooltipContent>
                        </Tooltip>
                        {/* #49 Track point density control */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => toast.info('Управление плотностью точек в разработке')} data-testid="point-density" aria-label="Плотность точек">
                              <Scan className="size-2.5" />Плотность
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Настройка плотности точек</TooltipContent>
                        </Tooltip>
                        {/* #98 Print & #99 Screenshot */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={handlePrintMap} aria-label="Печать карты">
                              <Printer className="size-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Печать карты</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={handleScreenshot} aria-label="Снимок карты">
                              <Camera className="size-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Снимок карты</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* #24 Distance badge / #25 Duration on trip segments + #1 emoji→icons */}
                      {trackData.trips && trackData.trips.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar" data-testid="trip-list">
                          {trackData.trips.map((trip, i) => {
                            // #25 Trip duration
                            const tripDurMs = new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()
                            const tripDurMin = Math.floor(tripDurMs / 60000)
                            const tripDurH = Math.floor(tripDurMin / 60)
                            const tripDurStr = tripDurH > 0 ? `${tripDurH} ч ${tripDurMin % 60} мин` : `${tripDurMin} мин`
                            return (
                              <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${selectedTripIndex === i ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setSelectedTripIndex(selectedTripIndex === i ? null : i)} data-testid={`trip-${i}`}>
                                {/* #1 Replace 🟢 with Lucide CircleCheck */}
                                <span className="font-semibold text-emerald-600 flex items-center gap-0.5"><CircleCheck className="size-2.5" />A</span>
                                <span>{formatTime(trip.startDate)}</span>
                                <span className="text-muted-foreground">→</span>
                                {/* #1 Replace 🔴 with Lucide CircleX */}
                                <span className="font-semibold text-red-500 flex items-center gap-0.5"><CircleX className="size-2.5" />B</span>
                                <span>{formatTime(trip.endDate)}</span>
                                {/* #24 Distance badge */}
                                <Badge variant="secondary" className="text-[8px] h-4 ml-1">
                                  <Navigation className="size-2 mr-0.5" />{trip.distance != null ? trip.distance.toFixed(1) : '—'} км
                                </Badge>
                                {/* #25 Duration display */}
                                <Badge variant="outline" className="text-[8px] h-4">
                                  <Timer className="size-2 mr-0.5" />{tripDurStr}
                                </Badge>
                                <span className="text-muted-foreground ml-auto text-[9px]">{trip.points?.length || 0} т.</span>
                                {selectedTripIndex === i && <X className="size-3 text-muted-foreground shrink-0" />}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                {/* Minimized header */}
                {trackPanelMinimized && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Route className="size-3" />Панель трека свернута
                      {trackPoints.length > 0 && <Badge variant="secondary" className="text-[8px] h-4">{trackPoints.length} т.</Badge>}
                    </span>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setTrackPanelMinimized(false)} aria-label="Развернуть панель трека">
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════
                Map Container (#isolate for z-index, #85 error boundary)
            ═══════════════════════════════════════════════════════ */}
            <PanelSection panelKey="map_main" noCollapse>
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
                          <Card key={eq.id} className="border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenDetail?.(eq.id)} data-testid={`eq-notracker-${eq.id}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                {/* #7 Equipment type icon on map cards */}
                                <div className={`size-8 rounded-md flex items-center justify-center ${getTypeInfo(eq.type).color} ${getTypeInfo(eq.type).darkColor}`}>
                                  {getTypeInfo(eq.type).icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate hover:text-primary hover:underline transition-colors">{eq.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{eq.registrationNum || '—'} • <TypeBadge type={eq.type} /></p>
                                </div>
                                {/* #15 Equipment status badge */}
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
              <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''} data-testid="map-card">
                <CardContent className="p-0 relative">
                  {/* #53 Selected equipment info overlay on map */}
                  {selectedEqId && !isFullscreen && (() => {
                    const eq = equipment.find(e => e.id === selectedEqId)
                    const tracker = eq?.trackers?.[0]
                    if (!eq) return null
                    const movement = tracker ? getMovementStatus(tracker) : null
                    return (
                      <div className="absolute top-2 right-2 z-20 w-64" data-testid="selected-eq-overlay">
                        <Card className="shadow-lg border-primary/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold truncate">{eq.name}</p>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSelectedEqId(null)} aria-label="Закрыть">
                                <X className="size-3" />
                              </Button>
                            </div>
                            <div className="space-y-1 text-[10px]">
                              <p className="text-muted-foreground">{eq.registrationNum || '—'} • <TypeBadge type={eq.type} /></p>
                              {movement && <p className={`flex items-center gap-1 ${movement.color}`}>{movement.icon}{movement.label}</p>}
                              {tracker?.lastSpeed != null && <p>Скорость: <span className="font-medium">{tracker.lastSpeed} км/ч</span></p>}
                              {tracker?.lastFuelLevel != null && <p>Топливо: <span className="font-medium">{tracker.lastFuelLevel} л</span></p>}
                              {tracker?.lastAddress && <p className="text-muted-foreground truncate"><MapPin className="size-2.5 inline mr-0.5" />{tracker.lastAddress}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })()}
                  <div className={`${mapHeightClass} rounded-lg overflow-hidden relative isolate`} data-testid="map-container">
                    {/* #2 Loading skeleton */}
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full bg-muted/30 space-y-3 p-4">
                        <Skeleton className="h-8 w-48" />
                        <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                          <Skeleton className="h-16" />
                          <Skeleton className="h-16" />
                          <Skeleton className="h-16" />
                        </div>
                        <Skeleton className="h-[200px] w-full rounded-lg" />
                      </div>
                    ) : trackersForMap.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Satellite className="size-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Нет техники с трекерами</p>
                        <p className="text-xs mt-1">Подключите ГЛОНАСС трекеры к технике для отображения на карте</p>
                      </div>
                    ) : (
                      <TrackerMap trackers={mapTrackers} trackPoints={trackPoints} trackData={mapTrackData} onEquipmentClick={onOpenDetail} refreshInterval={refreshInterval} onRefresh={onSync} />
                    )}
                  </div>
                  {/* #96 Fullscreen close button */}
                  {isFullscreen && (
                    <Button size="sm" variant="secondary" className="absolute bottom-4 right-4 z-20 gap-1 shadow-lg" onClick={() => setIsFullscreen(false)}>
                      <Minimize2 className="size-3" />Выйти из полного экрана
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            </PanelSection>

            {/* ═══════════════════════════════════════════════════════
                Equipment List Below Map
                #10 Compact/expanded toggle
                #17 Show/hide toggle
                #57 Movement status
                #5 Relative time
                #3 Speed badges
                #4 Fuel progress bar
                #6 Pulse animation on online
                #7 Equipment type icon
                #11 Speed indicator dot
                #14 Center on map button
                #15 Status badge
                #30 Last synced timestamp
                #31 Time since last update
                #32 Click-to-center
                #64 Alert count badge
                #65 Health score
                #66 Data freshness indicator
                #72 Geofence events (placeholder)
                #73 Speed violations count
                #74 Address resolve button
                #75 Group by status
                #84 data-testid
                #83 aria-label
            ═══════════════════════════════════════════════════════ */}
            <PanelSection panelKey="map_equipment_panel">
            {filter !== 'notracker' && mapTrackers.length > 0 && (
              <div className="space-y-2" ref={equipmentListRef}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2" data-testid="equipment-list-header">
                    Техника на карте ({mapTrackers.length})
                    {/* #75 Group by status indicator */}
                    <span className="flex items-center gap-1.5 text-[9px] font-normal">
                      <span className="flex items-center gap-0.5"><span className="size-1.5 rounded-full bg-emerald-500" />{groupedByStatus.online.length}</span>
                      <span className="flex items-center gap-0.5"><span className="size-1.5 rounded-full bg-red-400" />{groupedByStatus.offline.length}</span>
                    </span>
                  </h3>
                  <div className="flex items-center gap-1">
                    {/* #10 View mode toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant={viewMode === 'compact' ? 'default' : 'outline'} className="h-6 w-6 p-0" onClick={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')} data-testid="view-toggle" aria-label={viewMode === 'compact' ? 'Расширенный вид' : 'Компактный вид'}>
                          {viewMode === 'compact' ? <LayoutGrid className="size-3" /> : <LayoutList className="size-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{viewMode === 'compact' ? 'Расширенный вид' : 'Компактный вид'}</TooltipContent>
                    </Tooltip>
                    {/* #17 Toggle show/hide equipment list */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => setShowEquipmentList(!showEquipmentList)} data-testid="toggle-list" aria-label={showEquipmentList ? 'Скрыть список' : 'Показать список'}>
                          {showEquipmentList ? <Eye className="size-3" /> : <Eye className="size-3" />}
                          {showEquipmentList ? 'Скрыть' : 'Показать'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showEquipmentList ? 'Скрыть список техники' : 'Показать список техники'}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* #17 Collapsible equipment list */}
                {showEquipmentList && (
                  <div className={`grid gap-2 ${viewMode === 'compact' ? 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`} data-testid="equipment-list">
                    {mapTrackers.map(t => {
                      const speedBadge = getSpeedBadge(t.lastSpeed) // #3
                      const movement = getMovementStatus(t) // #57
                      const freshness = getFreshnessInfo(t.lastSeenAt) // #66
                      const health = getHealthScore(t) // #65
                      const typeInfo = getTypeInfo(t.equipmentType || '') // #7
                      // #31 Time since last update
                      const timeSinceUpdate = t.lastSeenAt ? formatRelativeTime(t.lastSeenAt) : null
                      // #73 Speed violations
                      const hasSpeedViolation = (t.lastSpeed || 0) > 80

                      return (
                        <Card
                          key={t.id}
                          ref={el => { if (el) cardRefs.current.set(t.equipmentId || t.id, el) }}
                          className={`border-l-4 transition-all duration-200 ${
                            t.isActive
                              ? 'border-l-emerald-500' + (t.isActive ? ' animate-pulse-subtle' : '')  // #6 pulse on online
                              : 'border-l-red-400'
                          } ${selectedEqId === t.equipmentId ? 'ring-2 ring-primary/40' : ''} ${viewMode === 'compact' ? 'py-0' : ''}`}
                          data-testid={`eq-card-${t.equipmentId || t.id}`}
                        >
                          <CardContent className={viewMode === 'compact' ? 'p-2' : 'p-3'}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {/* #7 Equipment type icon */}
                              <div className={`size-7 rounded-md flex items-center justify-center ${typeInfo.color} ${typeInfo.darkColor}`}>
                                {typeInfo.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-medium truncate cursor-pointer hover:text-primary hover:underline transition-colors" onClick={() => onOpenDetail?.(t.equipmentId!)}>{t.equipmentName}</p>
                                  {/* #11 Speed indicator dot */}
                                  <span className={`size-1.5 rounded-full ${t.isActive ? ((t.lastSpeed || 0) > 2 ? 'bg-emerald-500 animate-pulse' : (t.lastIgnition ? 'bg-yellow-500' : 'bg-gray-400')) : 'bg-red-400'}`} />
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-[10px] text-muted-foreground">{t.registrationNum || '—'}</p>
                                  {/* #15 Status badge */}
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">{t.equipmentType || '—'}</Badge>
                                </div>
                              </div>
                              {/* #66 Data freshness indicator */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`size-2 rounded-full ${freshness.className}`} />
                                </TooltipTrigger>
                                <TooltipContent>{freshness.label}</TooltipContent>
                              </Tooltip>
                              {/* #14 Center on map button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleCenterOnEquipment(t.equipmentId!)} aria-label="Центрировать на карте">
                                    <Crosshair className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Центрировать на карте</TooltipContent>
                              </Tooltip>
                              {/* Quick sensor refresh button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={quickSyncingIds.has(t.id)} onClick={() => quickSyncTracker(t.id)} aria-label="Обновить датчики">
                                    {quickSyncingIds.has(t.id) ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Обновить датчики</TooltipContent>
                              </Tooltip>
                            </div>

                            {viewMode === 'expanded' && (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                                {/* #57 Movement status */}
                                <div className="flex items-center gap-1 col-span-2">
                                  <span className={movement.color + ' flex items-center gap-0.5'}>{movement.icon}{movement.label}</span>
                                </div>
                                {/* #3 Speed badge with color */}
                                {t.lastSpeed != null && (
                                  <div className="flex items-center gap-1">
                                    <Gauge className="size-3 text-muted-foreground" />
                                    <Badge className={`text-[9px] h-4 ${speedBadge.className}`}>{t.lastSpeed} км/ч</Badge>
                                  </div>
                                )}
                                {/* #73 Speed violation indicator */}
                                {hasSpeedViolation && (
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="size-3 text-red-500" />
                                    <span className="text-red-500 text-[9px]">Превышение!</span>
                                  </div>
                                )}
                                {t.lastIgnition != null && <div className="flex items-center gap-1"><Zap className="size-3 text-muted-foreground" /><span className={t.lastIgnition ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{t.lastIgnition ? 'Зажигание' : 'Выключено'}</span></div>}
                                {/* #4 Fuel level progress bar */}
                                {t.lastFuelLevel != null && (
                                  <div className="flex items-center gap-1 col-span-2">
                                    <Fuel className="size-3 text-muted-foreground shrink-0" />
                                    <Progress value={Math.min(t.lastFuelLevel, 100)} className="h-1.5 flex-1" />
                                    <span className="font-medium text-[9px] min-w-[30px]">{t.lastFuelLevel} л</span>
                                  </div>
                                )}
                                {t.lastMileage != null && <div className="flex items-center gap-1"><Navigation className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastMileage} км</span></div>}
                                {/* #65 Health score */}
                                <div className="flex items-center gap-1">
                                  <HeartPulse className={`size-3 ${health >= 70 ? 'text-emerald-500' : health >= 40 ? 'text-yellow-500' : 'text-red-500'}`} />
                                  <span className="text-muted-foreground text-[9px]">{health}%</span>
                                </div>
                                {t.lastAddress && <div className="col-span-2 flex items-start gap-1"><MapPin className="size-3 text-muted-foreground mt-0.5 shrink-0" /><span className="truncate">{t.lastAddress}</span>
                                  {/* #74 Address resolve button */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => toast.info('Обновление адреса в разработке')} aria-label="Обновить адрес">
                                        <RefreshCw className="size-2.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Обновить адрес</TooltipContent>
                                  </Tooltip>
                                </div>}
                                {/* #5 Relative time instead of full datetime */}
                                {t.lastSeenAt && (
                                  <div className="flex items-center gap-1 col-span-2">
                                    <Clock className="size-3 text-muted-foreground" />
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-muted-foreground cursor-help">{timeSinceUpdate}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>{formatDateTime(t.lastSeenAt)}</TooltipContent>
                                    </Tooltip>
                                    {/* #30 Last synced timestamp */}
                                    {t.lastPositionAt && (
                                      <span className="text-muted-foreground/60 text-[8px] ml-auto">Поз: {formatRelativeTime(t.lastPositionAt)}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Compact view: minimal info */}
                            {viewMode === 'compact' && (
                              <div className="flex items-center gap-2 text-[9px]">
                                <span className={movement.color + ' flex items-center gap-0.5'}>{movement.icon}</span>
                                {t.lastSpeed != null && <span className="font-medium">{t.lastSpeed} км/ч</span>}
                                {t.lastFuelLevel != null && <span><Fuel className="size-2 inline" />{t.lastFuelLevel}л</span>}
                                {t.lastSeenAt && <span className="text-muted-foreground">{formatRelativeTime(t.lastSeenAt)}</span>}
                                <button className="text-muted-foreground hover:text-foreground ml-auto shrink-0 disabled:opacity-50" disabled={quickSyncingIds.has(t.id)} onClick={() => quickSyncTracker(t.id)} aria-label="Обновить датчики">
                                  {quickSyncingIds.has(t.id) ? <Loader2 className="size-2.5 animate-spin" /> : <RefreshCw className="size-2.5" />}
                                </button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* #60 Speed distribution mini chart */}
            {mapTrackers.length > 0 && (
              <Card data-testid="speed-distribution">
                <CardHeader className="pb-1 pt-2 px-4">
                  <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5">
                    <BarChart3 className="size-3" />Распределение скорости
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-2">
                  <div className="flex items-end gap-1 h-8">
                    {(() => {
                      const bins = [
                        { label: '0', min: 0, max: 0, color: 'bg-gray-400' },
                        { label: '1-20', min: 1, max: 20, color: 'bg-emerald-500' },
                        { label: '21-40', min: 21, max: 40, color: 'bg-lime-500' },
                        { label: '41-60', min: 41, max: 60, color: 'bg-yellow-500' },
                        { label: '61-80', min: 61, max: 80, color: 'bg-orange-500' },
                        { label: '>80', min: 81, max: Infinity, color: 'bg-red-500' },
                      ]
                      const counts = bins.map(bin => mapTrackers.filter(t => (t.lastSpeed || 0) >= bin.min && (t.lastSpeed || 0) <= bin.max).length)
                      const maxCount = Math.max(...counts, 1)
                      return bins.map((bin, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className={`w-full ${bin.color} rounded-sm transition-all`} style={{ height: `${Math.max((counts[i] / maxCount) * 100, 4)}%` }} />
                          <span className="text-[7px] text-muted-foreground">{bin.label}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            </PanelSection>

            {/* #72 Geofence event log placeholder */}
            <Card data-testid="geofence-events">
              <CardHeader className="pb-1 pt-2 px-4">
                <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5">
                  <CircleDot className="size-3" />События геозон
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-[10px] text-muted-foreground text-center py-2">Настройте геозоны для отслеживания входа/выхода техники</p>
              </CardContent>
            </Card>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════
             NOTIFICATION RULES TAB (existing with #84 data-testid)
          ═══════════════════════════════════════════════════════ */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="size-4" />Правила уведомлений</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Настройте условия для получения важных уведомлений о технике</p>
              </div>
              <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setAddRuleOpen(true)} data-testid="add-rule-btn">
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
                  <Card key={rule.id} className={`border-l-4 ${rule.isActive ? 'border-l-sky-500' : 'border-l-gray-300'}`} data-testid={`rule-${rule.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{rule.equipment?.name || '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{rule.equipment?.registrationNum || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleRule(rule.id, rule.isActive)} className={`p-1 rounded transition-colors ${rule.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`} aria-label={rule.isActive ? 'Отключить правило' : 'Включить правило'}>
                            {rule.isActive ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                          </button>
                          <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors" aria-label="Удалить правило">
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

        {/* ═══════════════════════════════════════════════════════
            Add rule dialog (existing, with #84 data-testid)
        ═══════════════════════════════════════════════════════ */}
        <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
          <DialogContent className="sm:max-w-md" data-testid="add-rule-dialog">
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

        {/* Report Export Dialog (existing with #84 data-testid) */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="sm:max-w-lg" data-testid="report-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="size-4" />Экспорт отчёта XLSX</DialogTitle>
              <DialogDescription>Выгрузка отчёта по датчикам и статистике за указанный период</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Техника</Label>
                <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {trackedEquipment.map(eq => (
                    <label key={eq.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                      <input
                        type="checkbox"
                        checked={reportEqIds.includes(eq.id)}
                        onChange={e => {
                          if (e.target.checked) setReportEqIds(prev => [...prev, eq.id])
                          else setReportEqIds(prev => prev.filter(id => id !== eq.id))
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
                            if (e.target.checked) setReportSensorTypes(prev => [...prev, type])
                            else setReportSensorTypes(prev => prev.filter(t => t !== type))
                          }}
                          className="rounded border-gray-300"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={reportIncludeStats} onChange={e => setReportIncludeStats(e.target.checked)} className="rounded border-gray-300" />
                  Включить статистику (пробег, расход, скорости)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={reportIncludeTracks} onChange={e => setReportIncludeTracks(e.target.checked)} className="rounded border-gray-300" />
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

        {/* #95 Context menu placeholder */}
        {contextMenu && (
          <div className="fixed z-50" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={() => setContextMenu(null)}>
            <Card className="shadow-lg min-w-[150px]">
              <CardContent className="p-1">
                <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2" onClick={() => { toast.info('Центрирование в разработке'); setContextMenu(null) }}>
                  <Crosshair className="size-3" />Центрировать
                </button>
                <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2" onClick={() => { toast.info('Геозона в разработке'); setContextMenu(null) }}>
                  <CircleDot className="size-3" />Добавить геозону
                </button>
                <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2" onClick={() => { toast.info('Измерение расстояния в разработке'); setContextMenu(null) }}>
                  <Navigation className="size-3" />Измерить расстояние
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* CSS for subtle pulse animation (#6) and custom scrollbar */}
      <style jsx global>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          50% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground));
        }
      `}</style>
    </TooltipProvider>
    <PanelManagerDialog
      open={panelManagerOpen}
      onOpenChange={setPanelManagerOpen}
      tabKey="map"
      tabLabel="Карта / ГЛОНАСС"
      panelConfig={panelConfig}
    />
    </PanelConfigContext.Provider>
  )
})
