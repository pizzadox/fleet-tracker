'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Truck, Wrench, Plus, Search, Edit, Trash2,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity, Gauge,
  Navigation, Fuel, Cog, Copy, Cpu, FileDown, CheckCheck,
  ArrowUp, ArrowDown, LayoutGrid, List, Kanban,
  Users, Shield, WifiOff, ClipboardCheck, Eye, Phone, MapPin,
  BookmarkCheck, Camera, Droplets, Flame, Zap, Hash, StickyNote,
  FileBadge, Building2, Route, Weight, FileText, ChevronDown,
  Thermometer, MapPinned, Fuel as FuelIcon
} from 'lucide-react'
import type { Equipment, Company } from '@/lib/types'
import { EQUIPMENT_STATUS_MAP, EQUIPMENT_TYPE_MAP, EQUIPMENT_TYPE_GROUPS, EQUIPMENT_CONDITION_MAP, MAINTENANCE_WARN_DAYS, CREW_TYPE_MAP, EMPLOYEE_POSITION_MAP } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, statusBadge, downloadCSV, copyToClipboard, TypeBadge, PaginationControls, handleApiError, getTypeInfo } from '@/lib/utils'
import { PanelSection, PanelConfigContext, PanelManagerDialog, PanelManagerButton, useTabPanels } from '@/components/panels'

// ═══════════════════════════════════════════════════════════════
// STAT CARD (compact)
// ═══════════════════════════════════════════════════════════════

export const StatCard = React.memo(function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="py-2 gap-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="flex items-center gap-2 px-3 pt-0">
        <div className={`flex items-center justify-center size-7 rounded-md bg-muted ${color}`}>{icon}</div>
        <div>
          <p className="text-lg sm:text-xl font-bold leading-none animate-counter">{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
})

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT TAB
// ═══════════════════════════════════════════════════════════════

/** Resolve condition dot color from condition map color classes */
function condDotColor(color: string) {
  return color.includes('emerald') ? 'bg-emerald-500' : color.includes('sky') ? 'bg-sky-500' : color.includes('amber') ? 'bg-amber-500' : 'bg-red-500'
}

/** Rich tooltip for status badge */
function StatusTooltip({ status, info, children }: { status: string; info: { label: string; color: string; description?: string } | undefined; children: React.ReactNode }) {
  if (!info?.description) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-balance">
        <p className="font-semibold">{info.label}</p>
        <p className="text-[11px] opacity-80 mt-0.5">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/** Rich tooltip for condition dot */
function CondTooltip({ info, children }: { info: { label: string; description?: string } | undefined; children: React.ReactNode }) {
  if (!info?.description) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-balance">
        <p className="font-semibold">Состояние: {info.label}</p>
        <p className="text-[11px] opacity-80 mt-0.5">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

/** Simple tooltip for small indicators */
function SimpleTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export const EquipmentTab = React.memo(function EquipmentTab({ equipment, companies, eqSearch, setEqSearch, eqStatusFilter, setEqStatusFilter, eqTypeFilter, setEqTypeFilter, onOpenDetail, onAdd, onEdit, onDelete, onGoToMap, onCreateTrip, readOnly }: {
  equipment: Equipment[]; companies: Company[];
  eqSearch: string; setEqSearch: (v: string) => void;
  eqStatusFilter: string; setEqStatusFilter: (v: string) => void;
  eqTypeFilter: string; setEqTypeFilter: (v: string) => void;
  onOpenDetail: (eq: Equipment) => void;
  onAdd: () => void; onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
  onGoToMap: (eq: Equipment) => void;
  onCreateTrip: (eq: Equipment) => void;
  readOnly?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>('cards')
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [conditionFilter, setConditionFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [renterFilter, setRenterFilter] = useState('all')
  const [quickFilter, setQuickFilter] = useState<'all' | 'needs_maintenance' | 'insurance_expired' | 'to_expired' | 'poor_condition' | 'no_tracker' | 'rented'>('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [batchStatusDialog, setBatchStatusDialog] = useState(false)
  const [batchNewStatus, setBatchNewStatus] = useState('active')
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; onConfirm: () => void }>({ open: false, title: '', desc: '', onConfirm: () => {} })
  const PAGE_SIZE = 20
  const { panelConfig, panelManagerOpen, setPanelManagerOpen, contextValue } = useTabPanels('equipment')

  const daysUntil = (d?: string | null) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const fmtKm = (km?: number | null) => {
    if (km == null) return '—'
    if (km >= 1000) return `${(km / 1000).toFixed(1)} тыс.км`
    return `${km.toLocaleString('ru-RU')} км`
  }

  const getEngineIcon = (type?: string | null) => {
    if (!type) return null
    const t = type.toLowerCase()
    if (t.includes('дизел') || t.includes('diesel')) return <Droplets className="size-3 text-amber-600 dark:text-amber-400" />
    if (t.includes('бензин') || t.includes('gas') || t.includes('petrol')) return <Flame className="size-3 text-red-500" />
    if (t.includes('электр') || t.includes('electric')) return <Zap className="size-3 text-blue-500" />
    if (t.includes('газ') || t.includes('lpg') || t.includes('cng')) return <Flame className="size-3 text-green-500" />
    return <Cog className="size-3 text-muted-foreground" />
  }

  const getFuelColor = (type?: string | null) => {
    if (!type) return ''
    const t = type.toLowerCase()
    if (t.includes('дизел') || t.includes('diesel')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    if (t.includes('бензин') || t.includes('gas') || t.includes('petrol')) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    if (t.includes('электр') || t.includes('electric')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    if (t.includes('газ') || t.includes('lpg') || t.includes('cng')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const copyRegNum = (regNum: string, eqId: string) => {
    copyToClipboard(regNum).then(ok => {
      if (ok) { setCopiedId(eqId); setTimeout(() => setCopiedId(null), 1500) }
    })
  }

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortIcon = (field: string) => {
    if (sortField !== field) return <ArrowDown className="size-3 text-muted-foreground/40" />
    return sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
  }

  // ── Statistics ──
  const stats = useMemo(() => {
    const total = equipment.length
    const active = equipment.filter(e => e.status === 'active').length
    const repair = equipment.filter(e => e.status === 'repair').length
    const rented = equipment.filter(e => e.status === 'rented').length
    const decommissioned = equipment.filter(e => e.status === 'decommissioned').length
    const reserved = equipment.filter(e => e.status === 'reserved').length
    const totalPurchase = equipment.reduce((s, e) => s + (e.purchasePrice || 0), 0)
    const totalCurrent = equipment.reduce((s, e) => s + (e.currentPrice || 0), 0)
    const conditions: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 }
    for (const eq of equipment) {
      if (eq.condition && conditions[eq.condition] !== undefined) conditions[eq.condition]++
    }
    const activeDays = equipment.filter(e => e.purchaseDate).reduce((s, e) => s + Math.max(1, Math.floor((Date.now() - new Date(e.purchaseDate!).getTime()) / (1000*60*60*24))), 0)
    const repairDays = equipment.reduce((s, e) => s + (e.repairs || []).filter(r => r.status === 'completed' && r.startDate && r.endDate).reduce((rs, r) => rs + Math.max(1, Math.ceil((new Date(r.endDate!).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24))), 0), 0)
    const utilization = activeDays > 0 ? Math.round(((activeDays - repairDays) / activeDays) * 100) : null
    const eqRepairCount: Record<string, number> = {}
    for (const eq of equipment) { if (eq._count?.repairs) eqRepairCount[eq.id] = eq._count.repairs }
    const topRepaired = Object.entries(eqRepairCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => equipment.find(e => e.id === id)).filter(Boolean) as Equipment[]
    return { total, active, repair, rented, decommissioned, reserved, totalPurchase, totalCurrent, conditions, utilization, topRepaired }
  }, [equipment])

  // ── Filtering & Sorting ──
  const filteredEquipment = useMemo(() => {
    let result = equipment.filter(eq => {
      if (conditionFilter !== 'all' && eq.condition !== conditionFilter) return false
      if (ownerFilter !== 'all' && eq.ownerId !== ownerFilter) return false
      if (renterFilter !== 'all' && eq.renterId !== renterFilter) return false
      const insDays = daysUntil(eq.insuranceExpiry)
      const inspDays = daysUntil(eq.inspectionExpiry)
      const maintDays = daysUntil(eq.nextMaintenanceDate)
      if (quickFilter === 'needs_maintenance' && !(maintDays != null && maintDays < MAINTENANCE_WARN_DAYS)) return false
      if (quickFilter === 'insurance_expired' && !(insDays != null && insDays < 0)) return false
      if (quickFilter === 'to_expired' && !(inspDays != null && inspDays < 0)) return false
      if (quickFilter === 'poor_condition' && eq.condition !== 'poor' && eq.condition !== 'fair') return false
      if (quickFilter === 'no_tracker' && eq.trackers && eq.trackers.length > 0) return false
      if (quickFilter === 'rented' && eq.status !== 'rented') return false
      return true
    })
    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break
        case 'status': { const so: Record<string, number> = { active: 1, repair: 2, rented: 3, reserved: 4, decommissioned: 5 }; aVal = so[a.status] || 0; bVal = so[b.status] || 0; break }
        case 'year': aVal = a.year || 0; bVal = b.year || 0; break
        case 'mileage': aVal = a.mileage || 0; bVal = b.mileage || 0; break
        case 'condition': { const co: Record<string, number> = { excellent: 1, good: 2, fair: 3, poor: 4 }; aVal = co[a.condition || ''] || 5; bVal = co[b.condition || ''] || 5; break }
        default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [equipment, conditionFilter, ownerFilter, renterFilter, quickFilter, sortField, sortDir])

  // Группировка по статусу для визуальной организации
  const statusOrder = ['active', 'repair', 'rented', 'reserved', 'decommissioned']
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Equipment[]> = {}
    for (const eq of filteredEquipment) {
      const s = eq.status || 'active'
      if (!groups[s]) groups[s] = []
      groups[s].push(eq)
    }
    return groups
  }, [filteredEquipment])

  const paginatedEquipment = filteredEquipment.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <PanelConfigContext.Provider value={contextValue}>
    <div className="flex flex-col gap-3" ref={containerRef}>
      {/* ── Statistics Dashboard ── */}
      <PanelSection panelKey="eq_stats">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Truck className="size-4 text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-lg font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Всего</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-lg font-bold">{stats.active}</p><p className="text-[10px] text-muted-foreground">В эксплуатации</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Wrench className="size-4 text-amber-600 dark:text-amber-400" /></div><div><p className="text-lg font-bold">{stats.repair}</p><p className="text-[10px] text-muted-foreground">На ремонте</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center"><Users className="size-4 text-sky-600 dark:text-sky-400" /></div><div><p className="text-lg font-bold">{stats.rented}</p><p className="text-[10px] text-muted-foreground">В аренде</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><BookmarkCheck className="size-4 text-violet-600 dark:text-violet-400" /></div><div><p className="text-lg font-bold">{stats.reserved}</p><p className="text-[10px] text-muted-foreground">Зарезервирована</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center"><XCircle className="size-4 text-red-600 dark:text-red-400" /></div><div><p className="text-lg font-bold">{stats.decommissioned}</p><p className="text-[10px] text-muted-foreground">Списана</p></div></div></Card>
      </div>
      </PanelSection>

      {/* ── Fleet Value + Condition + Utilization ── */}
      <PanelSection panelKey="eq_fleet_value">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Стоимость парка</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold">{stats.totalPurchase.toLocaleString('ru-RU')} ₽</span>
            <span className="text-[10px] text-muted-foreground">покупка</span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-sm font-medium text-muted-foreground">{stats.totalCurrent.toLocaleString('ru-RU')} ₽</span>
            <span className="text-[10px] text-muted-foreground">текущая</span>
            {stats.totalPurchase > 0 && (
              <span className={`text-[10px] font-medium ${((1 - stats.totalCurrent / stats.totalPurchase) * 100) > 50 ? 'text-red-500' : ((1 - stats.totalCurrent / stats.totalPurchase) * 100) > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                износ {Math.round((1 - stats.totalCurrent / stats.totalPurchase) * 100)}%
              </span>
            )}
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Состояние парка</p>
          <div className="flex items-center gap-1.5">
            {Object.entries(EQUIPMENT_CONDITION_MAP).map(([key, info]) => (
              <div key={key} className="flex-1 text-center">
                <div className={`rounded px-1.5 py-1 text-[10px] font-medium ${info.color}`}>{stats.conditions[key] || 0}</div>
                <p className="text-[8px] text-muted-foreground mt-0.5">{info.label}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Использование парка</p>
          <div className="flex items-center gap-2">
            {stats.utilization != null ? (
              <>
                <Progress value={Math.min(100, stats.utilization)} className="flex-1 h-2" />
                <span className={`text-sm font-bold ${stats.utilization > 80 ? 'text-emerald-600 dark:text-emerald-400' : stats.utilization > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{stats.utilization}%</span>
              </>
            ) : <span className="text-xs text-muted-foreground">Нет данных</span>}
          </div>
          {stats.topRepaired.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Wrench className="size-3" />Чаще в ремонте: {stats.topRepaired.map(e => e.name).join(', ')}
            </div>
          )}
        </Card>
      </div>
      </PanelSection>

      {/* ── Filters ── */}
      <PanelSection panelKey="eq_filters" noCollapse>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию, номеру, VIN, гаражный №, водитель..." value={eqSearch} onChange={e => { setEqSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={eqStatusFilter} onValueChange={v => { setEqStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eqTypeFilter} onValueChange={v => { setEqTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (
                <React.Fragment key={category}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</div>
                  {types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={v => { setConditionFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Состояние" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любое состояние</SelectItem>
              {Object.entries(EQUIPMENT_CONDITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={v => { setOwnerFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Владелец" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все владельцы</SelectItem>
              {companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={renterFilter} onValueChange={v => { setRenterFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Арендатор" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все арендаторы</SelectItem>
              {companies.filter(c => c.type === 'renter' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      </PanelSection>

      {/* ── Quick Filters ── */}
      <PanelSection panelKey="eq_quick_filters">
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'all' as const, label: 'Все', icon: <List className="size-3" /> },
          { key: 'needs_maintenance' as const, label: 'Требует ТО', icon: <Wrench className="size-3" /> },
          { key: 'insurance_expired' as const, label: 'Просрочена страховка', icon: <Shield className="size-3" /> },
          { key: 'to_expired' as const, label: 'Просрочен ТО', icon: <ClipboardCheck className="size-3" /> },
          { key: 'poor_condition' as const, label: 'Слабое состояние', icon: <AlertTriangle className="size-3" /> },
          { key: 'no_tracker' as const, label: 'Без трекера', icon: <WifiOff className="size-3" /> },
          { key: 'rented' as const, label: 'В аренде', icon: <Users className="size-3" /> },
        ].map(f => (
          <Button key={f.key} variant={quickFilter === f.key ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setQuickFilter(f.key); setPage(1) }}>
            {f.icon}{f.label}
          </Button>
        ))}
      </div>
      </PanelSection>

      {/* ── Action buttons ── */}
      <PanelSection panelKey="eq_actions" noCollapse>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить</Button>
        <div className="flex gap-0.5">
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('cards')} title="Карточки"><LayoutGrid className="size-3.5" /></Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('table')} title="Таблица"><List className="size-3.5" /></Button>
          <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('kanban')} title="Канбан"><Kanban className="size-3.5" /></Button>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-2" onClick={() => downloadCSV(filteredEquipment.map(eq => ({
          Название: eq.name, Тип: eq.type, Госномер: eq.registrationNum || '', VIN: eq.vin || '', Бренд: eq.brand || '', Модель: eq.model || '',
          Год: eq.year?.toString() || '', Статус: EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status, Состояние: EQUIPMENT_CONDITION_MAP[eq.condition || '']?.label || '',
          Пробег: eq.mileage?.toString() || '', Гаражный_номер: eq.garageNumber || '', Сменный_номер: eq.unitNumber || '',
          Водитель: eq.assignedDriver || '', Владелец: eq.owner?.name || '', Арендатор: eq.renter?.name || '',
          Покупка_руб: eq.purchasePrice?.toString() || '', Текущая_руб: eq.currentPrice?.toString() || '',
          ОСАГО_до: eq.insuranceExpiry ? formatDate(eq.insuranceExpiry) : '', ТО_до: eq.inspectionExpiry ? formatDate(eq.inspectionExpiry) : '',
          След_ТО: eq.nextMaintenanceDate ? formatDate(eq.nextMaintenanceDate) : '', Расход_топлива: eq.fuelConsumptionNorm?.toString() || '',
          Аренда_от: eq.rentalStartDate ? formatDate(eq.rentalStartDate) : '', Аренда_до: eq.rentalEndDate ? formatDate(eq.rentalEndDate) : '',
          Аренда_руб_мес: eq.rentalCost?.toString() || '', Местоположение: eq.location || '', Депо: eq.depot || '',
        })), 'equipment')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
        {!readOnly && (
          <Button variant={bulkMode ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }} title="Выделение" aria-label="Выделение">
            <CheckCheck className="size-3.5" />
          </Button>
        )}
        <PanelManagerButton panelConfig={panelConfig} onClick={() => setPanelManagerOpen(true)} />
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">Найдено: {filteredEquipment.length}</p>
      </div>
      </PanelSection>

      {/* ── Bulk actions bar ── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted animate-in fade-in duration-200">
          <span className="text-xs font-medium">Выбрано: {selectedIds.size}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBatchStatusDialog(true)}>
            <Activity className="size-3" />Изменить статус
          </Button>
          <Button variant="destructive" size="sm" className="h-7 text-xs gap-1 active:scale-95 transition-transform" onClick={() => setConfirmDialog({ open: true, title: 'Удалить выбранное', desc: `Удалить ${selectedIds.size} единиц техники? Это действие необратимо.`, onConfirm: async () => {
            for (const id of selectedIds) { try { await fetch(`/api/equipment/${id}`, { method: 'DELETE' }) } catch {} }
            toast.success(`Удалено: ${selectedIds.size}`)
            setSelectedIds(new Set()); setBulkMode(false)
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }})}>
            <Trash2 className="size-3" />Удалить
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedIds(new Set()); setBulkMode(false) }}>Отмена</Button>
        </div>
      )}

      {/* Batch status change dialog */}
      <Dialog open={batchStatusDialog} onOpenChange={setBatchStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Изменить статус</DialogTitle><DialogDescription>Выберите новый статус для {selectedIds.size} единиц техники</DialogDescription></DialogHeader>
          <Select value={batchNewStatus} onValueChange={setBatchNewStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBatchStatusDialog(false)}>Отмена</Button>
            <Button size="sm" onClick={async () => {
              for (const id of selectedIds) { try { await fetch(`/api/equipment/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: batchNewStatus }) }) } catch {} }
              toast.success(`Статус изменён для ${selectedIds.size} единиц`)
              setSelectedIds(new Set()); setBulkMode(false); setBatchStatusDialog(false)
            }}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(v) => setConfirmDialog(prev => ({ ...prev, open: v }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmDialog.desc}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={confirmDialog.onConfirm}>Подтвердить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Status quick filter chips ── */}
      <PanelSection panelKey="eq_status_chips">
      <div className="flex gap-1">
        {statusOrder.map(s => {
          const cnt = groupedByStatus[s]?.length || 0
          if (cnt === 0) return null
          const info = EQUIPMENT_STATUS_MAP[s]
          return (
            <button key={s} onClick={() => setEqStatusFilter(eqStatusFilter === s ? 'all' : s)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${eqStatusFilter === s ? 'ring-1 ring-primary' : ''} ${info?.color || 'bg-muted'}`}>
              <StatusTooltip status={s} info={info}>
                <span>{cnt} {info?.label || s}</span>
              </StatusTooltip>
            </button>
          )
        })}
      </div>
      </PanelSection>

      <PanelSection panelKey="eq_list" noCollapse>
      {filteredEquipment.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Truck className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Техника не найдена</p>
            <p className="text-xs text-muted-foreground mt-1">Измените фильтры или добавьте новую технику</p>
            {!readOnly && <Button variant="outline" size="sm" className="mt-3 gap-1.5 active:scale-95 transition-transform" onClick={onAdd}><Plus className="size-3.5" />Добавить технику</Button>}
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* ── Kanban View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {(['active', 'repair', 'rented', 'reserved', 'decommissioned'] as const).map(status => {
            const info = EQUIPMENT_STATUS_MAP[status]
            const items = groupedByStatus[status] || []
            return (
              <div key={status} className="space-y-2">
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${info?.color || 'bg-muted'}`}>
                  <span className="text-xs font-semibold">{info?.label || status}</span>
                  <span className="ml-auto text-[10px] font-medium">{items.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[60dvh] overflow-y-auto">
                  {items.map(eq => {
                    const typeInfo = getTypeInfo(eq.type)
                    const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
                    const tracker = eq.trackers?.[0]
                    const trackerOnline = eq.trackers?.some(t => t.isActive)
                    return (
                      <Card key={eq.id} className="cursor-pointer hover:shadow-sm transition-shadow p-2.5" onClick={() => onOpenDetail(eq)}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {condInfo && <CondTooltip info={condInfo}><span className={`size-2 rounded-full shrink-0 ${condDotColor(condInfo.color)}`} /></CondTooltip>}
                          <span className="text-xs font-medium truncate flex-1">{eq.name}</span>
                          {tracker && <SimpleTooltip label={trackerOnline ? 'Трекер: онлайн' : 'Трекер: офлайн'}><span className={`size-1.5 rounded-full ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} /></SimpleTooltip>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{eq.registrationNum || '—'}{eq.garageNumber ? ` • Г${eq.garageNumber}` : ''}</p>
                        {(eq.brand || eq.model) && <p className="text-[10px] text-muted-foreground">{[eq.brand, eq.model].filter(Boolean).join(' ')}{eq.year ? ` ${eq.year}` : ''}</p>}
                        {eq.assignedDriver && <p className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</p>}
                      </Card>
                    )
                  })}
                  {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Пусто</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {bulkMode && <TableHead className="w-10 text-xs"></TableHead>}
                  <TableHead className="text-xs">Сост.</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort('status')}>Статус {sortIcon('status')}</TableHead>
                  <TableHead className="text-xs">Тип</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none min-w-[140px]" onClick={() => toggleSort('name')}>Название {sortIcon('name')}</TableHead>
                  <TableHead className="text-xs">Госномер</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Бренд / Модель</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('year')}>Год {sortIcon('year')}</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('mileage')}>Пробег {sortIcon('mileage')}</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden xl:table-cell" onClick={() => toggleSort('condition')}>Сост. {sortIcon('condition')}</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Владелец</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Арендатор</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">ОСАГО</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">ТО</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Трекер</TableHead>
                  <TableHead className="text-xs text-right w-[120px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEquipment.map((eq) => {
                  const typeInfo = getTypeInfo(eq.type)
                  const statusInfo = EQUIPMENT_STATUS_MAP[eq.status]
                  const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
                  const insDays = daysUntil(eq.insuranceExpiry)
                  const inspDays = daysUntil(eq.inspectionExpiry)
                  const maintDays = daysUntil(eq.nextMaintenanceDate)
                  const tracker = eq.trackers?.[0]
                  const trackerOnline = eq.trackers?.some(t => t.isActive)
                  const brandModel = [eq.brand, eq.model].filter(Boolean).join(' ')
                  const depreciation = eq.purchasePrice && eq.currentPrice ? Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100) : null
                  const age = eq.year ? new Date().getFullYear() - eq.year : null
                  return (
                    <TableRow key={eq.id} className={`cursor-pointer group ${eq.status === 'repair' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`} onClick={() => onOpenDetail(eq)}>
                      {bulkMode && (
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(eq.id)} onCheckedChange={() => {
                            const next = new Set(selectedIds)
                            if (next.has(eq.id)) next.delete(eq.id); else next.add(eq.id)
                            setSelectedIds(next)
                          }} aria-label={`Выбрать ${eq.name}`} />
                        </TableCell>
                      )}
                      <TableCell>
                        {condInfo && <CondTooltip info={condInfo}><span className={`size-2.5 rounded-full inline-block ${condDotColor(condInfo.color)}`} /></CondTooltip>}
                      </TableCell>
                      <TableCell>
                        <StatusTooltip status={eq.status} info={statusInfo}>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${statusInfo?.color || ''} ${eq.status === 'repair' ? 'animate-status-pulse' : ''}`}>
                            {statusInfo?.label || eq.status}
                          </Badge>
                        </StatusTooltip>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center justify-center size-7 rounded-md shrink-0 ${typeInfo.color} ${typeInfo.darkColor}`}>
                          {React.cloneElement(typeInfo.icon as React.ReactElement, { className: 'size-3.5' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {tracker && (
                            <SimpleTooltip label={trackerOnline ? 'Трекер: онлайн' : 'Трекер: офлайн'}><span className={`size-2 rounded-full shrink-0 ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} /></SimpleTooltip>
                          )}
                          <span className="font-medium text-sm truncate">{eq.name}</span>
                          {(insDays != null && insDays < 0) || (inspDays != null && inspDays < 0) || (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS) ? (
                            <SimpleTooltip label={[
                              insDays != null && insDays < 0 ? 'Страховка просрочена' : '',
                              inspDays != null && inspDays < 0 ? 'ТО просрочено' : '',
                              maintDays != null && maintDays < MAINTENANCE_WARN_DAYS ? `ТО через ${maintDays}д` : '',
                            ].filter(Boolean).join(' • ')}><AlertTriangle className="size-3 text-amber-500 shrink-0" /></SimpleTooltip>
                          ) : null}
                          {depreciation != null && <span className={`text-[9px] font-medium shrink-0 ${depreciation > 50 ? 'text-red-500' : depreciation > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>{depreciation}%</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {eq.registrationNum ? (
                          <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary inline-flex items-center gap-0.5"
                            onClick={(e) => { e.stopPropagation(); copyRegNum(eq.registrationNum!, eq.id) }}
                            title={copiedId === eq.id ? 'Скопировано!' : 'Копировать госномер'}>
                            {eq.registrationNum}
                            <Copy className="size-3" />
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{brandModel || '—'}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{eq.year || '—'}{age != null && age > 0 ? <span className="text-[9px] text-muted-foreground/60 ml-0.5">({age}л)</span> : null}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{fmtKm(eq.mileage)}</span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {condInfo ? (
                          <CondTooltip info={condInfo}><span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${condInfo.color}`}>{condInfo.icon} {condInfo.label}</span></CondTooltip>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {eq.owner ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={eq.owner.name}>{eq.owner.name}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {eq.renter ? (
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium truncate max-w-[120px] block" title={eq.renter.name}>{eq.renter.name}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {insDays != null ? (
                          <SimpleTooltip label={insDays < 0 ? `Страховка просрочена на ${Math.abs(insDays)} дн.` : insDays < 30 ? `Страховка истекает через ${insDays} дн.` : `Страховка действительна ещё ${insDays} дн.`}>
                            <span className={`text-xs font-medium ${insDays < 0 ? 'text-red-600 dark:text-red-400' : insDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {insDays < 0 ? `${Math.abs(insDays)}д` : `${insDays}д`}
                            </span>
                          </SimpleTooltip>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {inspDays != null ? (
                          <SimpleTooltip label={inspDays < 0 ? `ТО просрочено на ${Math.abs(inspDays)} дн.` : inspDays < 30 ? `ТО истекает через ${inspDays} дн.` : `ТО действительн ещё ${inspDays} дн.`}>
                            <span className={`text-xs font-medium ${inspDays < 0 ? 'text-red-600 dark:text-red-400' : inspDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {inspDays < 0 ? `${Math.abs(inspDays)}д` : `${inspDays}д`}
                            </span>
                          </SimpleTooltip>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {tracker ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {tracker.lastSpeed != null && tracker.lastSpeed > 0 ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{tracker.lastSpeed} км/ч</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{trackerOnline ? 'Стоит' : 'Офлайн'}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onOpenDetail(eq)} title="Подробнее"><Eye className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onGoToMap(eq)} title="Карта"><MapPin className="size-3.5" /></Button>
                          {!readOnly && (<>
                            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(eq)} title="Редактировать"><Edit className="size-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(eq)} title="Удалить"><Trash2 className="size-3.5" /></Button>
                          </>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={page} totalPages={Math.ceil(filteredEquipment.length / PAGE_SIZE)} total={filteredEquipment.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      ) : (
        /* ── Cards View ── */
        <div className="space-y-1">
          {paginatedEquipment.map((eq, idx) => {
            const typeInfo = getTypeInfo(eq.type)
            const statusInfo = EQUIPMENT_STATUS_MAP[eq.status]
            const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
            const insDays = daysUntil(eq.insuranceExpiry)
            const inspDays = daysUntil(eq.inspectionExpiry)
            const maintDays = daysUntil(eq.nextMaintenanceDate)
            const tracker = eq.trackers?.[0]
            const trackerOnline = eq.trackers?.some(t => t.isActive)
            const age = eq.year ? new Date().getFullYear() - eq.year : (eq.purchaseDate ? Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
            const depreciation = eq.purchasePrice && eq.currentPrice ? Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100) : null
            const hasWarnings = (insDays != null && insDays < 30) || (inspDays != null && inspDays < 30) || (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS)
            const brandModel = [eq.brand, eq.model].filter(Boolean).join(' ')
            const isExpanded = expandedId === eq.id

            return (
              <Card
                key={eq.id}
                className={`group relative transition-all duration-200 overflow-hidden border-l-[3px] animate-card-in ${statusInfo?.border || ''} ${isExpanded ? 'shadow-md border-primary/30' : 'hover:shadow-sm hover:border-primary/20'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {bulkMode && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center z-10">
                    <Checkbox checked={selectedIds.has(eq.id)} onCheckedChange={() => {
                      const next = new Set(selectedIds)
                      if (next.has(eq.id)) next.delete(eq.id); else next.add(eq.id)
                      setSelectedIds(next)
                    }} aria-label={`Выбрать ${eq.name}`} />
                  </div>
                )}
                <div
                  className={`flex items-center gap-2.5 px-3 pt-2 pb-0.5 cursor-pointer select-none ${bulkMode ? 'pl-10' : ''}`}
                  onClick={() => { if (!bulkMode) setExpandedId(isExpanded ? null : eq.id) }}
                >
                  <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${typeInfo.color} ${typeInfo.darkColor}`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {condInfo && <CondTooltip info={condInfo}><span className={`size-2.5 rounded-full shrink-0 ${condDotColor(condInfo.color)}`} /></CondTooltip>}
                        {tracker && (
                          <SimpleTooltip label={trackerOnline ? 'Трекер: онлайн' : 'Трекер: офлайн'}><span className={`size-3 rounded-full shrink-0 ${trackerOnline ? 'bg-emerald-500 animate-pulse animate-online-ring' : 'bg-red-400'}`} /></SimpleTooltip>
                        )}
                        <span className="font-semibold text-sm truncate">{eq.name}</span>
                        {hasWarnings && <SimpleTooltip label={[
                          insDays != null && insDays < 0 ? 'Страховка просрочена' : '',
                          inspDays != null && inspDays < 0 ? 'ТО просрочено' : '',
                          maintDays != null && maintDays < MAINTENANCE_WARN_DAYS ? `ТО через ${maintDays}д` : '',
                        ].filter(Boolean).join(' • ')}><AlertTriangle className="size-3.5 text-amber-500 shrink-0" /></SimpleTooltip>}
                        {maintDays != null && maintDays < MAINTENANCE_WARN_DAYS && <SimpleTooltip label={`ТО через ${maintDays}д`}><Wrench className="size-3 text-orange-500 shrink-0" /></SimpleTooltip>}
                      </div>
                      <StatusTooltip status={eq.status} info={statusInfo}>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${statusInfo?.color || ''} ${eq.status === 'repair' ? 'animate-status-pulse' : ''}`}>
                          {statusInfo?.label || eq.status}
                        </Badge>
                      </StatusTooltip>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {eq.registrationNum && (
                        <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary shrink-0 inline-flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); copyRegNum(eq.registrationNum!, eq.id) }}
                          title={copiedId === eq.id ? 'Скопировано!' : 'Копировать госномер'}>
                          {eq.registrationNum}
                          <Copy className="size-3" />
                        </span>
                      )}
                      {eq.garageNumber && <span className="text-[10px] text-muted-foreground">Г#{eq.garageNumber}</span>}
                      {eq.unitNumber && <span className="text-[10px] text-muted-foreground">С#{eq.unitNumber}</span>}
                      {eq.assignedDriver && <span className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</span>}
                      {tracker?.lastSpeed != null && tracker.lastSpeed > 0 && (
                        <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                          <Navigation className="size-3" />{tracker.lastSpeed} км/ч
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {brandModel && <span className="text-xs text-muted-foreground truncate">{brandModel}</span>}
                      {eq.year && <span className="text-xs text-muted-foreground">{eq.year} г.{age != null ? ` (${age}л)` : ''}</span>}
                      {eq.category && <span className="text-xs text-muted-foreground font-medium">кат. {eq.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {eq.owner && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" />{eq.owner.name}</span>}
                      {eq.renter && <span className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium"><Users className="size-3" />{eq.renter.name}</span>}
                    </div>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-3 pt-0 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
                      {eq.engineType && <span className="inline-flex items-center gap-0.5">{getEngineIcon(eq.engineType)}</span>}
                      {eq.fuelType && <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getFuelColor(eq.fuelType)}`}>{eq.fuelType}</span>}
                      {eq.fuelConsumptionNorm && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><FuelIcon className="size-3" />{eq.fuelConsumptionNorm} л/100км</span>}
                      {eq.engineVolume && <span className="text-xs text-muted-foreground">{eq.engineVolume} л</span>}
                      {eq.enginePower && <span className="text-xs text-muted-foreground">{eq.enginePower} л.с.</span>}
                      {eq.mileage != null && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Gauge className="size-3" />{fmtKm(eq.mileage)}</span>}
                      {eq.loadCapacity && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Weight className="size-3.5" />{eq.loadCapacity} т</span>}
                      {eq.passengerSeats && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{eq.passengerSeats} мест</span>}
                      {eq.color && <span className="text-xs text-muted-foreground">Цвет: {eq.color}</span>}
                      {eq.location && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPinned className="size-3" />{eq.location}</span>}
                      {eq.depot && <span className="text-xs text-muted-foreground">Депо: {eq.depot}</span>}
                    </div>

                    {tracker && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 px-3 py-2 rounded bg-muted/50 text-xs">
                        {tracker.lastSpeed != null && (<span className="inline-flex items-center gap-1"><Navigation className="size-3.5" /><span className={tracker.lastSpeed > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{tracker.lastSpeed} км/ч</span></span>)}
                        {tracker.lastFuelLevel != null && (<span className="inline-flex items-center gap-1"><Fuel className="size-3.5 text-amber-600 dark:text-amber-400" />{tracker.lastFuelLevel} л</span>)}
                        {tracker.lastMileage != null && (<span className="inline-flex items-center gap-1 text-muted-foreground"><Gauge className="size-3.5" />{(tracker.lastMileage / 1000).toFixed(1)} тыс.км</span>)}
                        {tracker.lastIgnition != null && (<span className={`inline-flex items-center gap-1 ${tracker.lastIgnition ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}><Zap className="size-3.5" />{tracker.lastIgnition ? 'Зажигание ВКЛ' : 'Зажигание ВЫКЛ'}</span>)}
                        {tracker.lastEngineTemp != null && (<span className="inline-flex items-center gap-1 text-muted-foreground"><Thermometer className="size-3.5" />{tracker.lastEngineTemp}°C</span>)}
                      </div>
                    )}

                    {tracker && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                        {tracker.trackerName && <span className="inline-flex items-center gap-1"><Cpu className="size-3" />{tracker.trackerName}</span>}
                        {tracker.imei && <span className="font-mono" title="IMEI">IMEI: {tracker.imei}</span>}
                        {tracker.phoneNumber && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{tracker.phoneNumber}</span>}
                        {tracker.lastAddress && <span className="inline-flex items-center gap-1 truncate max-w-[300px]" title={tracker.lastAddress}><MapPin className="size-3 shrink-0" />{tracker.lastAddress}</span>}
                        {tracker.lastSeenAt && (<span className="inline-flex items-center gap-1" title={`Последняя активность: ${formatDateTime(tracker.lastSeenAt)}`}><Clock className="size-3" />{new Date(tracker.lastSeenAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(tracker.lastSeenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>)}
                      </div>
                    )}

                    {(eq.vin || eq.stsNumber || eq.ptsNumber || eq.serialNumber) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                        {eq.vin && <span className="font-mono cursor-pointer hover:text-primary" title={`VIN: ${eq.vin} (нажмите чтобы скопировать)`} onClick={(e) => { e.stopPropagation(); copyToClipboard(eq.vin!) }}><span className="font-medium text-foreground">VIN:</span> {eq.vin}</span>}
                        {eq.stsNumber && <span className="inline-flex items-center gap-1" title={`СТС: ${eq.stsNumber}`}><FileBadge className="size-3" />СТС: {eq.stsNumber}</span>}
                        {eq.ptsNumber && <span className="inline-flex items-center gap-1" title={`ПТС: ${eq.ptsNumber}`}><FileBadge className="size-3" />ПТС: {eq.ptsNumber}</span>}
                        {eq.serialNumber && <span className="inline-flex items-center gap-1" title={`Сер. №: ${eq.serialNumber}`}><Hash className="size-3" />С/Н: {eq.serialNumber}</span>}
                      </div>
                    )}

                    {(eq.insuranceNumber || eq.insuranceExpiry || eq.inspectionExpiry) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.insuranceNumber && (<span className="inline-flex items-center gap-1 text-muted-foreground" title={`Полис: ${eq.insuranceNumber}`}><Shield className="size-3" />Полис: {eq.insuranceNumber}</span>)}
                        {insDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${insDays < 0 ? 'text-red-600 dark:text-red-400' : insDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><Shield className="size-3" />ОСАГО {insDays < 0 ? `истекло ${Math.abs(insDays)}д` : `${insDays}д`}</span>)}
                        {inspDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${inspDays < 0 ? 'text-red-600 dark:text-red-400' : inspDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><ClipboardCheck className="size-3" />ТО {inspDays < 0 ? `истекло ${Math.abs(inspDays)}д` : `${inspDays}д`}</span>)}
                        {maintDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${maintDays < 0 ? 'text-red-600 dark:text-red-400' : maintDays < MAINTENANCE_WARN_DAYS ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><Wrench className="size-3" />След. ТО {maintDays < 0 ? `просрочено ${Math.abs(maintDays)}д` : `через ${maintDays}д`}</span>)}
                      </div>
                    )}

                    {(eq.owner || eq.renter) && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {eq.owner && (<span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-muted" title={`Владелец: ${eq.owner.name}${eq.owner.inn ? ` (ИНН: ${eq.owner.inn})` : ''}`}><Building2 className="size-3.5 shrink-0" />{eq.owner.name}</span>)}
                        {eq.renter && (<span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400" title={`Арендатор: ${eq.renter.name}`}><Users className="size-3.5 shrink-0" />{eq.renter.name}</span>)}
                      </div>
                    )}

                    {(eq.purchasePrice || eq.currentPrice || age != null || depreciation != null) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.purchasePrice != null && (<span className="text-muted-foreground">Покупка: {eq.purchasePrice.toLocaleString('ru-RU')} ₽</span>)}
                        {eq.currentPrice != null && (<span className="text-muted-foreground">Текущая: {eq.currentPrice.toLocaleString('ru-RU')} ₽</span>)}
                        {depreciation != null && (<span className={`font-medium ${depreciation > 50 ? 'text-red-500' : depreciation > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>Износ {depreciation}%</span>)}
                        {age != null && (<span className="text-muted-foreground">Возраст {age} л.</span>)}
                      </div>
                    )}

                    {/* Rental info */}
                    {(eq.rentalStartDate || eq.rentalEndDate || eq.rentalCost) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.rentalStartDate && <span className="text-muted-foreground">Аренда с: {formatDate(eq.rentalStartDate)}</span>}
                        {eq.rentalEndDate && <span className="text-muted-foreground">по: {formatDate(eq.rentalEndDate)}</span>}
                        {eq.rentalCost != null && <span className="text-muted-foreground">{eq.rentalCost.toLocaleString('ru-RU')} ₽/мес</span>}
                        {eq.rentalEndDate && (() => { const rd = daysUntil(eq.rentalEndDate); return rd != null ? <span className={`font-medium ${rd < 0 ? 'text-red-500' : rd < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>{rd < 0 ? `Истекла ${Math.abs(rd)}д назад` : `Осталось ${rd}д`}</span> : null })()}
                      </div>
                    )}

                    {/* Maintenance info */}
                    {(eq.lastMaintenanceDate || eq.nextMaintenanceDate || eq.maintenanceInterval) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.lastMaintenanceDate && <span className="text-muted-foreground">Последнее ТО: {formatDate(eq.lastMaintenanceDate)}</span>}
                        {eq.nextMaintenanceDate && <span className="text-muted-foreground">Следующее ТО: {formatDate(eq.nextMaintenanceDate)}</span>}
                        {eq.maintenanceInterval && <span className="text-muted-foreground">Интервал: {eq.maintenanceInterval.toLocaleString('ru-RU')} км</span>}
                      </div>
                    )}

                    {/* Oil / Tires */}
                    {(eq.oilChangeDate || eq.oilChangeMileage || eq.oilChangeInterval || eq.tireSize || eq.tireReplacementDate) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.oilChangeDate && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Droplets className="size-3" />Масло: {formatDate(eq.oilChangeDate)}</span>}
                        {eq.oilChangeMileage && <span className="text-muted-foreground">Замена масла на: {fmtKm(eq.oilChangeMileage)}</span>}
                        {eq.oilChangeInterval && <span className="text-muted-foreground">Интервал масла: {fmtKm(eq.oilChangeInterval)}</span>}
                        {eq.tireSize && <span className="text-muted-foreground">Шины: {eq.tireSize}</span>}
                        {eq.tireReplacementDate && <span className="text-muted-foreground">Замена шин: {formatDate(eq.tireReplacementDate)}</span>}
                      </div>
                    )}

                    {eq.notes && (<div className="mb-2 text-xs text-muted-foreground italic" title={eq.notes}><StickyNote className="inline size-3 mr-0.5" />{eq.notes}</div>)}

                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                      {eq.employees && eq.employees.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title="Водители"><Users className="size-3.5" />{eq.employees.length}</button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[280px]" align="start">
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Водители ({eq.employees.length})</p>
                              {eq.employees.map(emp => (
                                <div key={emp.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent">
                                  <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || ''}`}>
                                    {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{emp.fullName}</p>
                                    <p className="text-[10px] text-muted-foreground">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position || ''}{emp.phone ? ` • ${emp.phone}` : ''}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      {eq._count?.repairs != null && eq._count.repairs > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Ремонтов"><Wrench className="size-3.5" />{eq._count.repairs}</span>)}
                      {eq._count?.photos != null && eq._count.photos > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Фотографий"><Camera className="size-3.5" />{eq._count.photos}</span>)}
                      {eq.documents && eq.documents.length > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Документов"><FileText className="size-3.5" />{eq.documents.length}</span>)}
                      {eq.trackers && eq.trackers.length > 1 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={`Трекеров: ${eq.trackers.length}`}><Cpu className="size-3.5" />{eq.trackers.length}</span>)}
                      <div className="ml-auto flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onOpenDetail(eq)} title="Подробнее"><Eye className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onGoToMap(eq)} title="Карта"><MapPin className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onCreateTrip(eq)} title="Создать рейс"><Route className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(eq)} title="Редактировать"><Edit className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(eq)} title="Удалить"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          <PaginationControls page={page} totalPages={Math.ceil(filteredEquipment.length / PAGE_SIZE)} total={filteredEquipment.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
      </PanelSection>
    </div>
    <PanelManagerDialog
      open={panelManagerOpen}
      onOpenChange={setPanelManagerOpen}
      tabKey="equipment"
      tabLabel="Техника"
      panelConfig={panelConfig}
    />
    </PanelConfigContext.Provider>
  )
})

