'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Route, Plus, Search, Truck, Clock, XCircle, CheckCircle2, AlertTriangle,
  Users, Wrench, Edit, Trash2, Navigation, Map, Calendar, Package, Weight,
  ChevronDown, ChevronUp, Filter, ListFilter, ArrowUp, ArrowDown, ClipboardList,
  ArrowDownToLine, ArrowRight, ArrowUpFromLine, Fuel, Gauge, Loader2, MapPin,
  MapPinned, Timer, UserCheck, UserCircle, X, SlidersHorizontal, ArrowUpDown,
  Play, MoreVertical, Copy, Share2, LayoutGrid, LayoutList, Sparkles, Eye,
  FileText, CalendarDays, Clock4
} from 'lucide-react'
import type { Trip, Equipment, Crew, RouteTemplate } from '@/lib/types'
import { TRIP_STATUS_MAP, CREW_TYPE_MAP, EQUIPMENT_STATUS_MAP, MEMBER_ROLE_MAP, EQUIPMENT_TYPE_MAP } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, statusBadge, fmtDuration, handleApiError, downloadCSV, copyToClipboard, PaginationControls, formatDurationShort, useDebounce, getTypeInfo } from '@/lib/utils'
import { PanelSection, PanelConfigContext, PanelManagerDialog, PanelManagerButton, useTabPanels } from '@/components/panels'
import dynamic from 'next/dynamic'
const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Format seconds to short "Xч Yмин" or "X мин" */
const fmtDurShort = (sec: number | null | undefined): string | null => {
  if (sec == null || sec <= 0) return null
  return formatDurationShort(sec)
}

/** Format "time ago" in Russian */
const timeAgo = (d: string | null | undefined): string | null => {
  if (!d) return null
  const now = Date.now()
  const then = new Date(d).getTime()
  if (isNaN(then)) return null
  const diff = now - then
  if (diff < 0) return null
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч назад`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} дн. назад`
  return null
}

/** Is trip starting today? */
const isToday = (d: string | null | undefined): boolean => {
  if (!d) return false
  const dt = new Date(d)
  const now = new Date()
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate()
}

/** Is trip overdue? (in_progress with plannedEndDate < now) */
const isOverdue = (t: Trip): boolean => {
  return t.status === 'in_progress' && !!t.plannedEndDate && new Date(t.plannedEndDate).getTime() < Date.now()
}

/** Progress for in-progress trip: elapsed vs planned */
const tripProgress = (t: Trip): number | null => {
  if (t.status !== 'in_progress' || !t.startDate || !t.plannedEndDate) return null
  const start = new Date(t.startDate).getTime()
  const end = new Date(t.plannedEndDate).getTime()
  const now = Date.now()
  if (end <= start) return null
  return Math.min(Math.round(((now - start) / (end - start)) * 100), 100)
}

/** Trip score (0-100) based on fuel economy, speed, idle time */
const calcTripScore = (t: Trip): number | null => {
  let score = 0
  let factors = 0
  // Fuel economy factor (0-25)
  if (t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000) {
    const rate = (t.fuelConsumed / t.distance) * 100
    score += rate < 15 ? 25 : rate < 20 ? 20 : rate < 25 ? 15 : rate < 35 ? 8 : 0
    factors++
  }
  // Speed factor (0-25)
  if (t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200) {
    score += t.avgSpeed >= 40 && t.avgSpeed <= 70 ? 25 : t.avgSpeed >= 30 && t.avgSpeed <= 90 ? 15 : 5
    factors++
  }
  // Idle time factor (0-25)
  if (t.idleTime != null && t.tripDuration != null && t.tripDuration > 0) {
    const idlePct = (t.idleTime / t.tripDuration) * 100
    score += idlePct < 5 ? 25 : idlePct < 15 ? 18 : idlePct < 30 ? 10 : 0
    factors++
  }
  // Max speed factor (0-25) — penalize excessive speed
  if (t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300) {
    score += t.maxSpeed <= 70 ? 25 : t.maxSpeed <= 90 ? 18 : t.maxSpeed <= 110 ? 8 : 0
    factors++
  }
  return factors >= 2 ? Math.round(score) : null
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Дата (новые)' },
  { value: 'date_asc', label: 'Дата (старые)' },
  { value: 'status_asc', label: 'Статус (А→Я)' },
  { value: 'status_desc', label: 'Статус (Я→А)' },
  { value: 'route_asc', label: 'Маршрут (А→Я)' },
  { value: 'route_desc', label: 'Маршрут (Я→А)' },
  { value: 'equipment_asc', label: 'Техника (А→Я)' },
  { value: 'equipment_desc', label: 'Техника (Я→А)' },
  { value: 'distance_desc', label: 'Расстояние ↓' },
  { value: 'distance_asc', label: 'Расстояние ↑' },
  { value: 'fuel_desc', label: 'Расход топлива ↓' },
  { value: 'fuel_asc', label: 'Расход топлива ↑' },
  { value: 'idle_desc', label: 'Простой ↓' },
  { value: 'idle_asc', label: 'Простой ↑' },
  { value: 'cost_desc', label: 'Стоимость ↓' },
  { value: 'cost_asc', label: 'Стоимость ↑' },
] as const

type SortOption = typeof SORT_OPTIONS[number]['value']

// Column sort key mapping — which sort values belong to which column
type ColumnSortKey = 'route' | 'equipment' | 'status' | 'date' | 'distance' | 'fuel' | 'extra'
const COLUMN_SORT_MAP: Record<ColumnSortKey, SortOption[]> = {
  route: ['route_asc', 'route_desc'],
  equipment: ['equipment_asc', 'equipment_desc'],
  status: ['status_asc', 'status_desc'],
  date: ['date_asc', 'date_desc'],
  distance: ['distance_asc', 'distance_desc'],
  fuel: ['fuel_asc', 'fuel_desc'],
  extra: ['idle_asc', 'idle_desc', 'cost_asc', 'cost_desc'],
}

function getColumnSortDirection(sort: SortOption, column: ColumnSortKey): 'asc' | 'desc' | null {
  const colSorts = COLUMN_SORT_MAP[column]
  const idx = colSorts.indexOf(sort)
  if (idx === -1) return null
  return sort.endsWith('_desc') ? 'desc' : 'asc'
}

function cycleColumnSort(sort: SortOption, column: ColumnSortKey): SortOption {
  const colSorts = COLUMN_SORT_MAP[column]
  const currentIdx = colSorts.indexOf(sort)
  if (currentIdx === -1) return colSorts[0] // first option for this column
  const nextIdx = currentIdx + 1
  if (nextIdx < colSorts.length) return colSorts[nextIdx]
  return colSorts[0] // cycle back
}

// ═══════════════════════════════════════════════════════════════
// TRIP CARD SKELETON
// ═══════════════════════════════════════════════════════════════

function TripCardSkeleton() {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <Skeleton className="size-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-5 w-16 rounded" />
      </div>
      <div className="flex gap-3 pl-[44px]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  )
}

function TripRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="py-1.5 px-2"><Skeleton className="size-6 rounded" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-20 mt-1" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-3 w-20" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-5 w-14 rounded" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-3 w-24" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-3 w-16" /></td>
      <td className="py-1.5 px-2"><Skeleton className="h-3 w-14" /></td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════

export const TripsTab = React.memo(function TripsTab({ trips, equipment, crews, routeTemplates, onOpenDetail, onAdd, onDelete, onAddCrew, onEditCrew, onDeleteCrew, onAddRouteTemplate, onEditRouteTemplate, onDeleteRouteTemplate, readOnly, isLoading }: {
  trips: Trip[]; equipment: Equipment[]; crews: Crew[]; routeTemplates: RouteTemplate[];
  onOpenDetail: (t: Trip, focusTrack?: boolean) => void; onAdd: (eqId?: string) => void;
  onDelete: (t: Trip) => void;
  onAddCrew: () => void; onEditCrew: (c: Crew) => void; onDeleteCrew: (c: Crew) => void;
  onAddRouteTemplate: () => void; onEditRouteTemplate: (rt: RouteTemplate) => void; onDeleteRouteTemplate: (rt: RouteTemplate) => void;
  readOnly?: boolean; isLoading?: boolean;
}) {
  // ─── Filters ───
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [crewFilter, setCrewFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [sort, setSort] = useState<SortOption>('date_desc')
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'overdue'>('all')

  // ─── UI state ───
  const [showCrews, setShowCrews] = useState(false)
  const [showRoutes, setShowRoutes] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [compactView, setCompactView] = useState(false)
  const [page, setPage] = useState(1)
  const [mobileShowCount, setMobileShowCount] = useState(10)
  const pageSize = 20
  const { panelConfig, panelManagerOpen, setPanelManagerOpen, contextValue } = useTabPanels('trips')

  // ─── Route map state ───
  const [routeMapTemplate, setRouteMapTemplate] = useState<RouteTemplate | null>(null)
  const [routeMapData, setRouteMapData] = useState<any>(null)
  const [routeMapLoading, setRouteMapLoading] = useState(false)

  const showRouteOnMap = async (rt: RouteTemplate) => {
    if (routeMapTemplate?.id === rt.id) { setRouteMapTemplate(null); setRouteMapData(null); return }
    const pts = (rt.points || []).filter(p => p.latitude && p.longitude)
    if (pts.length < 2) { toast.error('Недостаточно точек с координатами'); return }
    setRouteMapTemplate(rt)
    setRouteMapLoading(true)
    try {
      const coords = pts.map(p => `${p.longitude},${p.latitude}`).join(';')
      const res = await fetch(`/api/osrm-route?coords=${encodeURIComponent(coords)}`)
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const routeCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
        setRouteMapData({ trips: [{ distance: route.distance / 1000, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
      } else {
        const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
        setRouteMapData({ trips: [{ distance: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
      }
    } catch (err) {
      console.error('[Route Map] OSRM fetch failed:', err)
      const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
      setRouteMapData({ trips: [{ distance: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
    }
    setRouteMapLoading(false)
  }

  // ─── Filtering + Sorting ───
  const filtered = useMemo(() => {
    let result = trips.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (eqFilter !== 'all' && t.equipmentId !== eqFilter) return false
      if (crewFilter !== 'all' && t.crewId !== crewFilter) return false
      if (routeFilter !== 'all' && t.routeTemplateId !== routeFilter) return false
      if (dateFrom && t.startDate && new Date(t.startDate) < new Date(dateFrom)) return false
      if (dateTo && t.startDate && new Date(t.startDate) > new Date(dateTo + 'T23:59:59')) return false
      if (debouncedSearch && !t.route.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(t.cargo || '').toLowerCase().includes(debouncedSearch.toLowerCase())) return false
      // Quick filters
      if (quickFilter === 'today' && !isToday(t.startDate)) return false
      if (quickFilter === 'overdue' && !isOverdue(t)) return false
      return true
    })

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case 'date_desc': return (new Date(b.startDate || 0).getTime()) - (new Date(a.startDate || 0).getTime())
        case 'date_asc': return (new Date(a.startDate || 0).getTime()) - (new Date(b.startDate || 0).getTime())
        case 'status_asc': {
          const order = ['in_progress', 'planned', 'completed', 'cancelled']
          return order.indexOf(a.status) - order.indexOf(b.status)
        }
        case 'status_desc': {
          const order = ['cancelled', 'completed', 'planned', 'in_progress']
          return order.indexOf(a.status) - order.indexOf(b.status)
        }
        case 'route_asc': return (a.route || '').localeCompare(b.route || '', 'ru')
        case 'route_desc': return (b.route || '').localeCompare(a.route || '', 'ru')
        case 'equipment_asc': return (a.equipment?.name || '').localeCompare(b.equipment?.name || '', 'ru')
        case 'equipment_desc': return (b.equipment?.name || '').localeCompare(a.equipment?.name || '', 'ru')
        case 'distance_desc': return (b.distance || 0) - (a.distance || 0)
        case 'distance_asc': return (a.distance || 0) - (b.distance || 0)
        case 'fuel_desc': return (b.fuelConsumed || 0) - (a.fuelConsumed || 0)
        case 'fuel_asc': return (a.fuelConsumed || 0) - (b.fuelConsumed || 0)
        case 'idle_desc': return (b.idleTime || 0) - (a.idleTime || 0)
        case 'idle_asc': return (a.idleTime || 0) - (b.idleTime || 0)
        case 'cost_desc': return (b.cost || 0) - (a.cost || 0)
        case 'cost_asc': return (a.cost || 0) - (b.cost || 0)
        default: return 0
      }
    })
    return result
  }, [trips, statusFilter, eqFilter, crewFilter, routeFilter, dateFrom, dateTo, debouncedSearch, sort, quickFilter])

  // ─── Active filter count ───
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter !== 'all') count++
    if (eqFilter !== 'all') count++
    if (crewFilter !== 'all') count++
    if (routeFilter !== 'all') count++
    if (dateFrom) count++
    if (dateTo) count++
    if (quickFilter !== 'all') count++
    return count
  }, [statusFilter, eqFilter, crewFilter, routeFilter, dateFrom, dateTo, quickFilter])

  // ─── Clear all filters ───
  const clearFilters = () => {
    setStatusFilter('all')
    setEqFilter('all')
    setCrewFilter('all')
    setRouteFilter('all')
    setDateFrom('')
    setDateTo('')
    setQuickFilter('all')
    setSearch('')
  }

  // ─── Pagination ───
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginatedTrips = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Track filter key to reset page on filter changes  
  const filterKey = `${statusFilter}-${eqFilter}-${crewFilter}-${routeFilter}-${dateFrom}-${dateTo}-${debouncedSearch}-${sort}-${quickFilter}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
    setMobileShowCount(10)
  }

  // ─── Status row background colors ───
  const statusRowBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50/50 dark:bg-emerald-950/10'
      case 'in_progress': return 'bg-amber-50/40 dark:bg-amber-950/10'
      case 'cancelled': return 'bg-red-50/30 dark:bg-red-950/10'
      case 'planned': return 'bg-sky-50/30 dark:bg-sky-950/10'
      default: return ''
    }
  }

  // ─── Status border-l color ───
  const statusBorderColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'in_progress': return '#3b82f6'
      case 'cancelled': return '#ef4444'
      case 'planned': return '#f59e0b'
      default: return '#94a3b8'
    }
  }

  return (
    <PanelConfigContext.Provider value={contextValue}>
    <div className="flex flex-col gap-3">
      {/* ─── SEARCH BAR + PRIMARY FILTERS ─── */}
      <PanelSection panelKey="trip_filters" noCollapse>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по маршруту, грузу..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(TRIP_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Sort */}
        <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Сортировка" /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Рейс</Button>
        <Button onClick={onAddCrew} variant="outline" size="sm" className="h-9 gap-1.5"><Users className="size-3.5" />Экипаж</Button>
      </div>
      </PanelSection>

      {/* ─── QUICK FILTERS + FILTER TOGGLE ─── */}
      <PanelSection panelKey="trip_quick_filters">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick filter chips */}
        <div className="flex items-center gap-1">
          <Button variant={quickFilter === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setQuickFilter('all')}>Все</Button>
          <Button variant={quickFilter === 'today' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2.5 gap-1" onClick={() => setQuickFilter(quickFilter === 'today' ? 'all' : 'today')}><CalendarDays className="size-3" />Сегодня</Button>
          <Button variant={quickFilter === 'overdue' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2.5 gap-1 text-red-600 dark:text-red-400" onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}><AlertTriangle className="size-3" />Просроченные</Button>
        </div>

        <div className="flex-1" />

        {/* Count of filtered vs total */}
        <p className="text-xs text-muted-foreground">
          {filtered.length !== trips.length ? (
            <>{filtered.length} из {trips.length} рейсов</>
          ) : (
            <>Рейсов: {filtered.length}</>
          )}
        </p>

        {/* View toggle */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCompactView(!compactView)} title={compactView ? 'Подробный вид' : 'Компактный вид'}>
          {compactView ? <LayoutList className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
        </Button>

        {/* Filters toggle */}
        <Button variant={filtersOpen ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[11px] gap-1" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal className="size-3" />
          Фильтры
          {activeFilterCount > 0 && (
            <Badge variant="default" className="size-4 p-0 text-[9px] flex items-center justify-center rounded-full">{activeFilterCount}</Badge>
          )}
          {filtersOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>

        {/* Crews / Routes toggles */}
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowCrews(!showCrews)}>
          <Users className="size-3" />{showCrews ? 'Скрыть экипажи' : 'Экипажи'}
          {showCrews ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowRoutes(!showRoutes)}>
          <Route className="size-3" />{showRoutes ? 'Скрыть маршруты' : 'Маршруты'}
          {showRoutes ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>
      </PanelSection>

      {/* ─── EXTENDED FILTERS (collapsible) ─── */}
      {filtersOpen && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Экипаж</label>
                <Select value={crewFilter} onValueChange={setCrewFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Все экипажи" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все экипажи</SelectItem>
                    {crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Шаблон маршрута</label>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Все маршруты" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все маршруты</SelectItem>
                    {routeTemplates.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Дата от</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Дата до</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={clearFilters}>
                    <X className="size-3" />Сбросить ({activeFilterCount})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crews section (toggleable) */}
      <PanelSection panelKey="trip_crews">
      {showCrews && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5"><Users className="size-3.5" />Экипажи ({crews.length})</h3>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onAddCrew}><Plus className="size-3" />Добавить</Button>
          </div>
          {crews.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Экипажи не созданы</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {crews.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0"><Users className="size-3.5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{CREW_TYPE_MAP[c.type] || c.type} • {c.members?.length || 0} чел.</p>
                      </div>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>{c.status === 'active' ? 'Активен' : 'Неактивен'}</span>
                    </div>
                    {c.members && c.members.length > 0 && (
                      <div className="space-y-0.5 pl-2">
                        {c.members.map(m => (
                          <div key={m.id} className="flex items-center gap-1 text-[10px]">
                            {m.employeeId ? <UserCheck className="size-3 text-primary" /> : <UserCircle className="size-3 text-muted-foreground" />}
                            <span className={m.employeeId ? 'font-medium' : ''}>{m.fullName}</span>
                            <span className="text-muted-foreground">({MEMBER_ROLE_MAP[m.role] || m.role})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEditCrew(c)}><Edit className="size-3" />Изменить</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDeleteCrew(c)}><Trash2 className="size-3" />Удалить</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Separator />
        </div>
      )}
      </PanelSection>

      {/* Route Templates section (toggleable) */}
      <PanelSection panelKey="trip_routes">
      {showRoutes && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5"><Route className="size-3.5" />Маршруты ({routeTemplates.length})</h3>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onAddRouteTemplate}><Plus className="size-3" />Создать</Button>
          </div>
          {routeTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Маршруты не созданы</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {routeTemplates.map(rt => (
                <Card key={rt.id}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0"><Route className="size-3.5 text-sky-600 dark:text-sky-400" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{rt.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rt.points?.length || 0} точек{rt.totalDistance ? ` • ${rt.totalDistance.toFixed(1)} км` : ''}</p>
                      </div>
                    </div>
                    {(rt.startPoint || rt.endPoint) && (
                      <div className="text-[10px] text-muted-foreground space-y-0.5 pl-2">
                        {rt.startPoint && <div className="flex items-center gap-0.5"><MapPin className="size-2 text-emerald-500" />{rt.startPoint}</div>}
                        {rt.endPoint && <div className="flex items-center gap-0.5"><MapPin className="size-2 text-red-500" />{rt.endPoint}</div>}
                      </div>
                    )}
                    {rt.points && rt.points.length > 0 && (
                      <div className="space-y-0 pl-2">
                        {rt.points.slice(0, 4).map((p, i) => (
                          <div key={p.id} className="flex items-center gap-1 text-[10px]">
                            <span className={`inline-flex items-center justify-center size-3.5 rounded-full text-[8px] font-bold ${
                              i === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              i === rt.points.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                              'bg-primary/10 text-primary'
                            }`}>{i + 1}</span>
                            <span className="truncate">{p.name}</span>
                            {p.plannedArrival && <span className="text-muted-foreground text-[9px] ml-auto shrink-0">{p.plannedArrival}</span>}
                            {p.distanceFromPrev != null && p.distanceFromPrev > 0 && <span className="text-sky-600 dark:text-sky-400 shrink-0">+{p.distanceFromPrev.toFixed(1)}км</span>}
                          </div>
                        ))}
                        {rt.points.length > 4 && <div className="text-[9px] text-muted-foreground pl-4">...ещё {rt.points.length - 4} точек</div>}
                      </div>
                    )}
                    {rt.estimatedDuration && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-2">
                        <Clock className="size-2.5" />
                        {rt.estimatedDuration >= 60 ? `${Math.floor(rt.estimatedDuration / 60)} ч ${rt.estimatedDuration % 60 > 0 ? (rt.estimatedDuration % 60) + ' мин' : ''}` : `${rt.estimatedDuration} мин`}
                      </div>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      {rt.points && rt.points.some(p => p.latitude && p.longitude) && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => showRouteOnMap(rt)}>
                          <Map className="size-3" />{routeMapTemplate?.id === rt.id ? 'Скрыть' : 'Карта'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEditRouteTemplate(rt)}><Edit className="size-3" />Изменить</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDeleteRouteTemplate(rt)}><Trash2 className="size-3" />Удалить</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Inline route map */}
          {routeMapTemplate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Map className="size-3.5 text-sky-500" />
                <span className="text-xs font-medium">Маршрут: {routeMapTemplate.name}</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={() => { setRouteMapTemplate(null); setRouteMapData(null) }}>
                  <X className="size-3" />Закрыть
                </Button>
              </div>
              <div className="h-72 rounded-lg overflow-hidden border">
                {routeMapLoading ? (
                  <div className="h-full flex items-center justify-center bg-muted/30">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">Расчёт маршрута...</span>
                  </div>
                ) : routeMapData ? (
                  <TrackerMap trackers={[]} trackData={routeMapData} />
                ) : null}
              </div>
            </div>
          )}
          <Separator />
        </div>
      )}
      </PanelSection>

      {/* ─── ACTIONS ─── */}
      <PanelSection panelKey="trip_actions" noCollapse>
      <PanelManagerButton panelConfig={panelConfig} onClick={() => setPanelManagerOpen(true)} />
      </PanelSection>

      {/* ─── TRIPS LIST ─── */}
      <PanelSection panelKey="trip_list" noCollapse>
      {isLoading ? (
        // Skeleton loading state
        <>
          <div className="sm:hidden space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <TripCardSkeleton key={i} />)}
          </div>
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-2 font-medium w-8">#</th>
                  <th className="text-left py-1.5 px-2 font-medium">Маршрут</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Техника</th>
                  <th className="text-left py-1.5 px-2 font-medium">Статус</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Начало</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Расст./Скор.</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Топливо</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden xl:table-cell">Доп.</th>
                  <th className="text-right py-1.5 px-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <TripRowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        </>
      ) : filtered.length === 0 ? (
        // Empty state with CTA
        <Card className="py-10 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Route className="size-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Рейсы не найдены</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {activeFilterCount > 0
                ? 'Попробуйте изменить фильтры или поисковый запрос'
                : 'Создайте первый рейс, чтобы начать отслеживание'
              }
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={clearFilters}>
                <X className="size-3.5" />Сбросить фильтры
              </Button>
            ) : (
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => onAdd()}>
                <Plus className="size-3.5" />Создать рейс
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ─── MOBILE: card layout ─── */}
          <div className="sm:hidden space-y-2">
            {filtered.slice(0, mobileShowCount).map((t, idx) => {
              const progress = tripProgress(t)
              const score = calcTripScore(t)
              const overdue = isOverdue(t)
              const today = isToday(t.startDate)
              const eqTypeInfo = t.equipment ? getTypeInfo(t.equipment.type) : null
              return (
                <div key={t.id}
                  className={`rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px] relative ${statusRowBg(t.status)}`}
                  style={{ borderLeftColor: statusBorderColor(t.status) }}
                  onClick={() => onOpenDetail(t)}>
                  {/* Today / overdue badges */}
                  <div className="flex items-center gap-1 mb-1">
                    {today && <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 px-1 py-0.5 rounded"><CalendarDays className="size-2.5" />Сегодня</span>}
                    {overdue && <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded"><AlertTriangle className="size-2.5" />Просрочен</span>}
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                      {eqTypeInfo ? React.cloneElement(eqTypeInfo.icon as React.ReactElement, { className: 'size-4' }) : <Route className="size-4 text-sky-600 dark:text-sky-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{t.route}</p>
                        {t.routeTemplate && <span className="shrink-0 inline-flex items-center text-[8px] text-sky-600 bg-sky-50 dark:bg-sky-950/30 px-1 py-0 rounded">{t.routeTemplate.name}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin className="size-2.5 text-emerald-500" />{t.startPoint}</span>}
                        {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2.5 text-red-500" />{t.endPoint}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge(t.status, TRIP_STATUS_MAP)}
                      {score != null && <span className={`text-[9px] font-bold ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{score}/100</span>}
                    </div>
                  </div>
                  {/* Progress bar for in-progress */}
                  {progress != null && (
                    <div className="mt-1.5 pl-[44px]">
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
                        <span>Прогресс</span>
                        <span>{progress}%{overdue && ' (просрочен)'}</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                  {/* Details line */}
                  {!compactView && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-[44px] text-[10px] text-muted-foreground">
                      {t.equipment?.name && <span className="flex items-center gap-1"><Truck className="size-3" />{t.equipment.name}</span>}
                      {t.startDate && <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(t.startDate)}</span>}
                      {t.distance != null && <span className="flex items-center gap-0.5 font-medium text-foreground"><Navigation className="size-3 text-sky-500" />{t.distance} км</span>}
                      {t.fuelConsumed != null && <span className="flex items-center gap-0.5"><Fuel className="size-3 text-amber-500" />{t.fuelConsumed.toFixed(1)} л</span>}
                      {t.cargo && <span className="flex items-center gap-1"><Package className="size-3" />{t.cargo}</span>}
                      {t.crew && <span className="flex items-center gap-1"><Users className="size-3" />{t.crew.name}<Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-0.5">{t.crew.members?.length || 0}</Badge></span>}
                      {t.tripDuration != null && t.tripDuration > 0 && <span className="flex items-center gap-0.5"><Timer className="size-3 text-violet-500" />{fmtDurShort(t.tripDuration)}</span>}
                      {t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && <span className="flex items-center gap-0.5"><Gauge className="size-3" />{t.avgSpeed.toFixed(0)} км/ч</span>}
                    </div>
                  )}
                  {/* Time ago */}
                  <div className="mt-1 pl-[44px]">
                    <span className="text-[9px] text-muted-foreground/60">{timeAgo(t.startDate || t.createdAt)}</span>
                  </div>
                </div>
              )
            })}
            {/* Load more button on mobile */}
            {filtered.length > mobileShowCount && (
              <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5" onClick={() => setMobileShowCount(prev => prev + 10)}>
                <ArrowDownToLine className="size-3" />Загрузить ещё ({filtered.length - mobileShowCount} осталось)
              </Button>
            )}
          </div>

          {/* ─── DESKTOP: table layout ─── */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium w-7">#</th>
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors group/th" onClick={() => setSort(prev => cycleColumnSort(prev, 'route'))}>
                      <span className="inline-flex items-center gap-1">Маршрут{getColumnSortDirection(sort, 'route') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'route') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'equipment'))}>
                      <span className="inline-flex items-center gap-1">Техника{getColumnSortDirection(sort, 'equipment') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'equipment') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'status'))}>
                      <span className="inline-flex items-center gap-1">Статус{getColumnSortDirection(sort, 'status') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'status') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'date'))}>
                      <span className="inline-flex items-center gap-1">Начало{getColumnSortDirection(sort, 'date') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'date') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'distance'))}>
                      <span className="inline-flex items-center gap-1">Расст./Скор.{getColumnSortDirection(sort, 'distance') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'distance') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'fuel'))}>
                      <span className="inline-flex items-center gap-1">Топливо{getColumnSortDirection(sort, 'fuel') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'fuel') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium hidden xl:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => setSort(prev => cycleColumnSort(prev, 'extra'))}>
                      <span className="inline-flex items-center gap-1">Доп.{getColumnSortDirection(sort, 'extra') === 'asc' ? <ArrowUp className="size-3" /> : getColumnSortDirection(sort, 'extra') === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}</span>
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrips.map((t, idx) => {
                    const progress = tripProgress(t)
                    const score = calcTripScore(t)
                    const overdue = isOverdue(t)
                    const today = isToday(t.startDate)
                    const eqTypeInfo = t.equipment ? getTypeInfo(t.equipment.type) : null
                    const globalIdx = (page - 1) * pageSize + idx + 1
                    return (
                      <tr key={t.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 group ${TRIP_STATUS_MAP[t.status]?.border || ''} ${statusRowBg(t.status)}`}
                        onClick={() => onOpenDetail(t)}>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-muted-foreground font-mono">{globalIdx}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-medium truncate max-w-[200px] flex items-center gap-1">
                            {t.route}
                            {today && <span className="shrink-0 inline-flex items-center text-[7px] font-medium text-sky-600 bg-sky-50 dark:bg-sky-950/30 px-1 py-0 rounded">СЕГОДНЯ</span>}
                            {overdue && <span className="shrink-0 inline-flex items-center text-[7px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-1 py-0 rounded">ПРОСРОЧЕН</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><MapPin className="size-2 text-emerald-500" />{t.startPoint}</span>}
                            {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2 text-red-500" />{t.endPoint}</span>}
                          </div>
                          {!compactView && (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {t.cargo && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Package className="size-2" />{t.cargo}{t.cargoWeight != null ? ` • ${t.cargoWeight} т` : ''}</span>}
                              {t.crew && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="size-2" />{t.crew.name}<Badge variant="secondary" className="text-[8px] h-3 px-0.5 ml-0.5">{t.crew.members?.length || 0}</Badge></span>}
                              {t.routeTemplate && <span className="inline-flex items-center gap-0.5 text-[9px] text-sky-600 dark:text-sky-400"><Route className="size-2" />{t.routeTemplate.name}</span>}
                            </div>
                          )}
                          {/* Progress bar for in-progress */}
                          {progress != null && (
                            <div className="mt-1 max-w-[180px]">
                              <div className="flex items-center justify-between text-[8px] text-muted-foreground mb-0.5">
                                <span>Прогресс</span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-1" />
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 hidden sm:table-cell text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {eqTypeInfo && <span className={`shrink-0 ${eqTypeInfo.color} ${eqTypeInfo.darkColor} rounded p-0.5`}>{React.cloneElement(eqTypeInfo.icon as React.ReactElement, { className: 'size-2.5' })}</span>}
                            <div className="truncate max-w-[120px]">{t.equipment?.name || '—'}</div>
                          </div>
                          {t.equipment?.registrationNum && <div className="text-[10px] font-mono">{t.equipment.registrationNum}</div>}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex flex-col items-start gap-0.5">
                            {statusBadge(t.status, TRIP_STATUS_MAP)}
                            {score != null && <span className={`text-[8px] font-bold ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>★ {score}</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <span className="cursor-pointer hover:text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onOpenDetail(t) }}>{formatDateTime(t.startDate)}</span>
                            {t.startDate && t.equipmentId && (
                              <Button size="sm" variant="ghost" className="size-5 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onOpenDetail(t, true) }} title="Показать трек">
                                <Map className="size-3 text-sky-500" />
                              </Button>
                            )}
                          </div>
                          {t.tripDuration != null && t.tripDuration > 0 && <div className="text-[9px] text-muted-foreground"><Timer className="inline size-2 mr-0.5" />{formatDurationShort(t.tripDuration)}</div>}
                          <div className="text-[8px] text-muted-foreground/60">{timeAgo(t.startDate)}</div>
                        </td>
                        <td className="py-1.5 px-2 hidden md:table-cell">
                          {t.distance != null ? <span className="inline-flex items-center gap-0.5 font-medium"><Navigation className="size-2 text-sky-500" />{t.distance} км</span> : <span className="text-muted-foreground">—</span>}
                          <div className="flex gap-1 mt-0.5">
                            {t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && <span className="text-[9px] text-muted-foreground"><Gauge className="inline size-2 mr-0.5" />{t.avgSpeed.toFixed(1)} км/ч</span>}
                            {t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300 && <span className={`text-[9px] ${t.maxSpeed > 90 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>макс: {t.maxSpeed}</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden lg:table-cell">
                          {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 ? (
                            <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400"><Fuel className="size-2" />{t.fuelConsumed.toFixed(1)} л</span>
                          ) : (t.fuelConsumed != null && Math.abs(t.fuelConsumed) >= 10000) ? <span className="text-[9px] text-yellow-500" title="Некорректные данные">⚠</span> : '—'}
                          <div className="flex gap-1 mt-0.5">
                            {t.refuelVolume != null && t.refuelVolume > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400"><ArrowUpFromLine className="size-2" />+{t.refuelVolume}л</span>}
                            {t.plumVolume != null && t.plumVolume > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400"><ArrowDownToLine className="size-2" />-{t.plumVolume}л</span>}
                          </div>
                          {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">{t.avgFuelRate.toFixed(1)} л/100км</div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 hidden xl:table-cell">
                          <div className="space-y-0.5">
                            {t.idleTime != null && t.idleTime > 0 && t.idleTime < 8640000 && <span className="text-[9px] text-muted-foreground"><Clock className="inline size-2 mr-0.5" />Простой: {formatDurationShort(t.idleTime)}</span>}
                            {(t.cost != null || t.revenue != null) && (
                              <div className="flex gap-1">
                                {t.cost != null && <span className="text-[9px] text-red-500">−{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(t.cost)}₽</span>}
                                {t.revenue != null && <span className="text-[9px] text-emerald-500">+{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(t.revenue)}₽</span>}
                              </div>
                            )}
                            {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && <span className="text-[9px] text-muted-foreground">М/ч: {formatDurationShort(t.engineHours)}</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {/* Quick action: start */}
                            {t.status === 'planned' && (
                              <Button size="sm" variant="ghost" className="size-6 p-0 text-emerald-500 hover:text-emerald-600" onClick={() => onOpenDetail(t)} title="Начать рейс">
                                <Play className="size-3" />
                              </Button>
                            )}
                            {/* Quick action: track */}
                            {t.startDate && t.equipmentId && (
                              <Button size="sm" variant="ghost" className="size-6 p-0 text-sky-500 hover:text-sky-600" onClick={() => onOpenDetail(t, true)} title="Трек на карте">
                                <MapPinned className="size-3" />
                              </Button>
                            )}
                            {/* Quick action: edit */}
                            <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onOpenDetail(t)} title="Редактировать">
                              <Edit className="size-3" />
                            </Button>
                            {/* More actions dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="size-6 p-0"><MoreVertical className="size-3" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyToClipboard(t.route)}><Copy className="size-3" />Копировать маршрут</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => onDelete(t)}><Trash2 className="size-3" />Удалить</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── PAGINATION ─── */}
          {filtered.length > pageSize && (
            <PaginationControls page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
          )}
        </>
      )}
      </PanelSection>
      <PanelManagerDialog open={panelManagerOpen} onOpenChange={setPanelManagerOpen} tabKey="trips" tabLabel="Рейсы" panelConfig={panelConfig} />
    </div>
    </PanelConfigContext.Provider>
  )
})
