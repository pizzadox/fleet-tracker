'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import dynamic from 'next/dynamic'
const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Truck, Wrench, Edit, Trash2,
  ChevronRight, ChevronLeft, ImagePlus, Camera, FileText,
  History, ClipboardList, Eye, Calendar, Phone, Mail, MapPin,
  Info, DollarSign, Shield, Users, ArrowRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity, Gauge,
  Navigation, Fuel, Thermometer, Zap, Cog, RefreshCw, Wifi, WifiOff,
  Satellite, ChevronDown, ChevronUp, Route, Package, Weight, UserCircle,
  IdCard, ClipboardCheck, Map, Car, Bus, Bike, Tractor, Ship,
  UserPlus, Download, BarChart3, Compass, Mountain,
  ArrowDownToLine, ArrowUpFromLine, Save, Printer,
  TrendingUp, TrendingDown, Copy, Timer, Droplets,
  Hash, Calculator, StickyNote, CircleDot, FileBadge, Fuel as FuelIcon,
  Anchor, Tag, BadgeCheck, ScanLine, Receipt, Truck as TruckIcon, Flame,
  ArrowUp, ArrowDown, MapPinned, Globe, Cpu,
  Layers, ExternalLink, ImageOff, Plus, Search, HeartPulse,
  ArrowLeft, Building2, CheckCheck, Send, Settings2, Terminal, Upload, User, Loader2, X
} from 'lucide-react'
import type { Equipment, Company, EquipmentPhoto, Repair, RepairStage, GlonassTracker, GlonassSensorData, EquipmentHistory, EquipmentDocument, Employee, Trip } from '@/lib/types'
import { EQUIPMENT_STATUS_MAP, REPAIR_STATUS_MAP, STAGE_STATUS_MAP, EQUIPMENT_TYPE_MAP, EQUIPMENT_CONDITION_MAP, FUEL_TYPE_MAP, ENGINE_TYPE_MAP, PHOTO_CATEGORIES, MAINTENANCE_WARN_DAYS, COMPANY_TYPES, CREW_TYPE_MAP, MEMBER_ROLE_MAP, TRIP_STATUS_MAP, EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP, REPAIR_MASTER_ROLE_MAP, hasPermission, getInitials } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, formatTime, statusBadge, getEventIcon, getStageProgress, formatDaysUntil, SectionDivider, TypeBadge, getTypeInfo, toLocalDatetime, localDatetimeToISO, toLocalDate, copyToClipboard, handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT DETAIL SHEET
// ═══════════════════════════════════════════════════════════════

export function AssignEmployeeSelect({ eqId, assignedIds, onAssigned }: { eqId: string; assignedIds: string[]; onAssigned: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/employees?status=active&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then((data: Employee[]) => setResults(data.filter(e => !assignedIds.includes(e.id))))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [open, search, assignedIds])

  const handleAssign = async (empId: string) => {
    setAssigning(empId)
    try {
      await fetch(`/api/employees/${empId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipmentId: eqId }) })
      toast.success('Сотрудник назначен')
      onAssigned()
    } catch { toast.error('Ошибка назначения') }
    setAssigning(null)
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 gap-1.5 text-xs"><Plus className="size-3" />Назначить сотрудника</Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-[320px]" align="start">
          <div className="space-y-2">
            <Input placeholder="Поиск по ФИО..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {loading ? <div className="text-center py-2"><Loader2 className="size-4 animate-spin mx-auto text-muted-foreground" /></div> :
                results.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Нет доступных сотрудников</p> :
                results.map(emp => (
                  <button key={emp.id} className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent text-left" onClick={() => { handleAssign(emp.id); setOpen(false) }} disabled={assigning === emp.id}>
                    <div className={`size-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || ''}`}>
                      {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{emp.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position}{emp.equipment ? ` • ${emp.equipment.name}` : ''}</p>
                    </div>
                    {assigning === emp.id && <Loader2 className="size-3 animate-spin" />}
                  </button>
                ))
              }
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function EquipmentDetailSheet({ open, onOpenChange, equipment, loading, detailTab, setDetailTab, companies, photoCategoryFilter, setPhotoCategoryFilter, fullPhoto, setFullPhoto, onEdit, onDelete, onAddRepair, onUploadPhoto, onRefresh, onOpenRepairDetail, onAddTrip, onOpenTripDetail, allEquipment, onRefreshAll }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  equipment: Equipment | null; loading: boolean;
  detailTab: string; setDetailTab: (v: string) => void;
  companies: Company[];
  photoCategoryFilter: string; setPhotoCategoryFilter: (v: string) => void;
  fullPhoto: string | null; setFullPhoto: (v: string | null) => void;
  onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
  onAddRepair: (eqId: string) => void; onUploadPhoto: (eqId: string) => void;
  onRefresh: () => void; onOpenRepairDetail: (r: Repair) => void;
  onAddTrip: (eqId: string) => void; onOpenTripDetail: (t: Trip, focusTrack?: boolean) => void;
  allEquipment: Equipment[]; onRefreshAll: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [localTrips, setLocalTrips] = useState<Trip[]>([])
  const eq = equipment
  const filteredPhotos = eq?.photos?.filter(p => photoCategoryFilter === 'all' || p.category === photoCategoryFilter) || []

  // Tracker connection dialog
  const [trackerPickerOpen, setTrackerPickerOpen] = useState(false)
  const [trackerPickerLoading, setTrackerPickerLoading] = useState(false)
  const [availableObjects, setAvailableObjects] = useState<Array<{ id: number; name: string; uniqueId: string; connectedStatus: boolean; isLinked: boolean }>>([])
  const [trackerPickerEqId, setTrackerPickerEqId] = useState('')

  // Map & historical data
  const [mapTrackData, setMapTrackData] = useState<Array<{ lat: number; lng: number }>>([])
  const [trackerStats, setTrackerStats] = useState<Record<string, unknown> | null>(null)
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showAllTrackersMap, setShowAllTrackersMap] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)

  // Axenta live sensor data
  const [axentaSensors, setAxentaSensors] = useState<{
    sensors: Array<{ id: number | string; name: string; type: string; category: string; value: number | null; stringValue: string | null; unit: string | null; hasValue: boolean; description?: string }>;
    grouped: Array<{ key: string; label: string; sensors: Array<{ id: number | string; name: string; type: string; category: string; value: number | null; stringValue: string | null; unit: string | null; hasValue: boolean; description?: string }> }>;
    totalSensors: number;
    sensorsWithValues: number;
    trackerFields: Record<string, unknown>;
  } | null>(null)
  const [axentaSensorsLoading, setAxentaSensorsLoading] = useState(false)
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true)

  // Axenta tracker commands
  const [trackerCommands, setTrackerCommands] = useState<{
    commands: Array<{ id: number | string; name: string; type: string; params: string | null; isVisible: boolean }>;
    deviceCanSendCommands: boolean;
    connectedStatus: boolean;
    lastSeenAt: string | null;
    trackerName: string;
    axentaId: string;
    recentCommands: Array<{ id: string; description: string; date: string; performedBy: string | null }>;
  } | null>(null)
  const [commandsLoading, setCommandsLoading] = useState(false)
  const [commandSending, setCommandSending] = useState<string | null>(null)
  const [customCommandText, setCustomCommandText] = useState('')
  const [commandsPanelOpen, setCommandsPanelOpen] = useState(false)

  // Command execution log — tracks status of each sent command
  const [commandLog, setCommandLog] = useState<Array<{
    id: string;
    command: string;
    status: 'sending' | 'sent' | 'delivered' | 'confirmed' | 'error' | 'timeout';
    sentAt: Date;
    trackerOnline?: boolean;
    statusText: string;
  }>>([])

  const fetchTrackerCommands = async (trackerId: string) => {
    setCommandsLoading(true)
    try {
      const res = await fetch(`/api/glonass/commands?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setTrackerCommands(data)
      }
    } catch { /* ignore */ }
    setCommandsLoading(false)
  }

  const checkCommandStatus = async (trackerId: string, logEntryId: string, sentAt: Date) => {
    // Poll tracker status to see if it has responded since command was sent
    try {
      const res = await fetch(`/api/glonass/commands?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.lastSeenAt) {
          const lastSeen = new Date(data.lastSeenAt)
          if (lastSeen > sentAt || data.connectedStatus) {
            // Tracker has been seen since command was sent — confirmed delivery
            setCommandLog(prev => prev.map(l =>
              l.id === logEntryId && (l.status === 'sent' || l.status === 'delivered')
                ? { ...l, status: 'confirmed', statusText: 'Трекер подтвердил получение', trackerOnline: true }
                : l
            ))
            return true
          }
        }
        // Tracker hasn't responded yet
        setCommandLog(prev => prev.map(l =>
          l.id === logEntryId && l.status === 'sent'
            ? { ...l, status: 'delivered', statusText: 'Доставлено на сервер, ожидание трекера', trackerOnline: data.connectedStatus }
            : l
        ))
      }
    } catch { /* ignore */ }
    return false
  }

  const sendTrackerCommand = async (trackerId: string, params: string | null, customParams?: string) => {
    const cmdText = customParams || params || 'custom'
    const cmdKey = customParams || params || 'custom'
    const logId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Add to log with "sending" status
    setCommandLog(prev => [{
      id: logId,
      command: cmdText,
      status: 'sending',
      sentAt: new Date(),
      statusText: 'Отправка команды...',
    }, ...prev])

    setCommandSending(cmdKey)
    try {
      const res = await fetch('/api/glonass/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, params, customParams }),
      })
      const data = await res.json()

      if (data.success) {
        const apiStatus = data.status as string
        const trackerOnline = data.trackerOnline as boolean

        let status: 'sent' | 'delivered' | 'confirmed' | 'error'
        let statusText: string

        if (apiStatus === 'delivered' || trackerOnline) {
          status = 'confirmed'
          statusText = 'Трекер подтвердил получение'
        } else if (apiStatus === 'sent') {
          status = 'sent'
          statusText = 'Отправлено на сервер Axenta, ожидание трекера...'
        } else {
          status = 'delivered'
          statusText = 'Доставлено на сервер'
        }

        setCommandLog(prev => prev.map(l =>
          l.id === logId ? { ...l, status, statusText, trackerOnline } : l
        ))

        toast.success(data.message)

        // Start polling for status if not yet confirmed
        if (status !== 'confirmed') {
          let pollCount = 0
          const pollInterval = setInterval(async () => {
            pollCount++
            const confirmed = await checkCommandStatus(trackerId, logId, new Date(data.sentAt))
            if (confirmed || pollCount >= 6) {
              clearInterval(pollInterval)
              if (!confirmed && pollCount >= 6) {
                setCommandLog(prev => prev.map(l =>
                  l.id === logId && l.status !== 'confirmed' && l.status !== 'error'
                    ? { ...l, status: 'timeout', statusText: 'Таймаут — трекер не ответил (30с)' }
                    : l
                ))
              }
            }
          }, 5000)
        }
      } else {
        setCommandLog(prev => prev.map(l =>
          l.id === logId ? { ...l, status: 'error', statusText: data.error || 'Ошибка отправки' } : l
        ))
        toast.error(data.error || 'Ошибка отправки команды')
      }
    } catch {
      setCommandLog(prev => prev.map(l =>
        l.id === logId ? { ...l, status: 'error', statusText: 'Сетевая ошибка' } : l
      ))
      toast.error('Ошибка отправки команды')
    }
    setCommandSending(null)
  }

  const fetchAxentaSensors = async (trackerId: string) => {
    setAxentaSensorsLoading(true)
    try {
      const res = await fetch(`/api/glonass/sensors?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setAxentaSensors(data)
      }
    } catch { /* ignore */ }
    setAxentaSensorsLoading(false)
  }

  useEffect(() => {
    if (open && eq && detailTab === 'trips') {
      fetch(`/api/trips?equipmentId=${eq.id}`).then(r => r.json()).then(setLocalTrips).catch(() => {})
    }
  }, [open, eq, detailTab])

  // Reset Axenta sensor data when equipment changes or sheet closes
  useEffect(() => {
    if (!open) {
      setAxentaSensors(null)
      setShowOnlyWithValues(true)
      setTrackerCommands(null)
      setCommandsPanelOpen(false)
      setCustomCommandText('')
      setCommandLog([])
    }
  }, [open, eq?.id])

  if (!equipment) return null

  // Get unique sensors (latest value per sensor name)
  const getUniqueSensors = (sensors: GlonassSensorData[]) => {
    const seen = new Set<string>()
    return sensors.filter(s => {
      const key = `${s.sensorType}-${s.sensorName || 'unnamed'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Get course direction name
  const getCourseDirection = (course: number) => {
    const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
    const idx = Math.round(course / 45) % 8
    return `${course}° ${dirs[idx]}`
  }

  // Format duration from seconds
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}ч ${m}мин` : `${m}мин`
  }

  // Apply date preset
  const applyDatePreset = (preset: string) => {
    const now = new Date()
    let from: Date
    const to = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        to.setDate(to.getDate() - 1)
        to.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      default:
        return
    }
    setHistoryDateFrom(toLocalDatetime(from))
    setHistoryDateTo(toLocalDatetime(to))
  }

  // Fetch historical data for a tracker
  const fetchHistoricalData = async (tracker: GlonassTracker) => {
    if (!historyDateFrom || !historyDateTo) return
    setHistoryLoading(true)
    setTrackerStats(null)
    setMapTrackData([])

    const axentaId = tracker.axentaCloudId || tracker.trackerId

    try {
      // Fetch stats
      const statsRes = await fetch('/api/glonass/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: axentaId,
          startDate: new Date(historyDateFrom).toISOString(),
          endDate: new Date(historyDateTo).toISOString(),
        })
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setTrackerStats(statsData)
      }

      // Fetch track
      const tracksRes = await fetch('/api/glonass/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: axentaId,
          startDate: new Date(historyDateFrom).toISOString(),
          endDate: new Date(historyDateTo).toISOString(),
        })
      })
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()
        // Parse track points from Axenta response
        const points: Array<{ lat: number; lng: number }> = []
        if (Array.isArray(tracksData)) {
          for (const track of tracksData) {
            if (track.points && Array.isArray(track.points)) {
              for (const p of track.points) {
                if (p.pos) {
                  points.push({ lat: p.pos.y, lng: p.pos.x })
                } else if (p.lat != null && p.lng != null) {
                  points.push({ lat: p.lat, lng: p.lng })
                }
              }
            }
          }
        }
        setMapTrackData(points)
      }

      toast.success('Данные за период загружены')
    } catch {
      toast.error('Ошибка загрузки данных за период')
    }
    setHistoryLoading(false)
  }

  const handleTabChange = (v: string) => {
    setDetailTab(v)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 pr-8">
            <Button variant="ghost" size="icon" className="size-7 sm:hidden shrink-0" onClick={() => onOpenChange(false)} aria-label="Назад"><ArrowLeft className="size-4" /></Button>
            <SheetTitle className="flex items-center gap-2 text-base"><Truck className="size-4" />{eq.name}</SheetTitle>
          </div>
          <SheetDescription className="text-xs">{[eq.brand, eq.model, eq.year].filter(Boolean).join(' • ')} — {eq.registrationNum || 'без номера'}{eq.garageNumber ? ` • Г#${eq.garageNumber}` : ''}{eq.unitNumber ? ` • С#${eq.unitNumber}` : ''}</SheetDescription>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
            {eq.condition && EQUIPMENT_CONDITION_MAP[eq.condition] && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${EQUIPMENT_CONDITION_MAP[eq.condition].color}`}>{EQUIPMENT_CONDITION_MAP[eq.condition].icon} {EQUIPMENT_CONDITION_MAP[eq.condition].label}</span>
            )}
            {eq.assignedDriver && <span className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</span>}
            <span className="text-[10px] text-muted-foreground">создано {formatDate(eq.createdAt)}</span>
            {eq.trackers && eq.trackers.length > 0 && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium ${eq.trackers.some(t => t.isActive) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                {eq.trackers.some(t => t.isActive) ? <><Wifi className="size-2" />Онлайн</> : <><WifiOff className="size-2" />Офлайн</>}
              </span>
            )}
            {eq.documents && eq.documents.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><FileText className="size-2" />{eq.documents.length} док.</span>
            )}
          </div>
          {/* Document expiry warnings */}
          {(() => {
            const warnings: React.ReactNode[] = []
            const insDays = eq.insuranceExpiry ? Math.ceil((new Date(eq.insuranceExpiry).getTime() - Date.now()) / (1000*60*60*24)) : null
            const inspDays = eq.inspectionExpiry ? Math.ceil((new Date(eq.inspectionExpiry).getTime() - Date.now()) / (1000*60*60*24)) : null
            const maintDays = eq.nextMaintenanceDate ? Math.ceil((new Date(eq.nextMaintenanceDate).getTime() - Date.now()) / (1000*60*60*24)) : null
            if (insDays != null && insDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="ins" className="text-[9px] text-amber-600 dark:text-amber-400"><Shield className="inline size-2 mr-0.5" />ОСАГО {insDays < 0 ? 'истекло!' : `истекает через ${insDays} дн.`}</span>)
            if (inspDays != null && inspDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="insp" className="text-[9px] text-amber-600 dark:text-amber-400"><ClipboardCheck className="inline size-2 mr-0.5" />ТО {inspDays < 0 ? 'истекло!' : `истекает через ${inspDays} дн.`}</span>)
            if (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="maint" className="text-[9px] text-amber-600 dark:text-amber-400"><Wrench className="inline size-2 mr-0.5" />ТО оборудования {maintDays < 0 ? 'просрочено!' : `через ${maintDays} дн.`}</span>)
            if (warnings.length > 0) return <div className="flex flex-wrap gap-2 mt-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-1.5">{warnings}</div>
            return null
          })()}
          {/* Quick actions */}
          <div className="flex flex-wrap gap-1 pt-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onAddRepair(eq.id)}><Wrench className="size-2.5" />Ремонт</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onAddTrip(eq.id)}><Route className="size-2.5" />Рейс</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onUploadPhoto(eq.id)}><Camera className="size-2.5" />Фото</Button>
          </div>
        </SheetHeader>

        <Tabs value={detailTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="px-3 sm:px-5 border-b shrink-0 overflow-x-auto">
            <TabsList className="w-full min-w-max h-9">
              <TabsTrigger value="info" className="gap-1 text-xs"><Info className="size-3" /><span className="hidden sm:inline">Информация</span></TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-1 text-xs"><Wrench className="size-3" /><span className="hidden sm:inline">ТО</span></TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs"><FileText className="size-3" /><span className="hidden sm:inline">Документы</span></TabsTrigger>
              <TabsTrigger value="photos" className="gap-1 text-xs"><Camera className="size-3" /><span className="hidden sm:inline">Фото</span></TabsTrigger>
              <TabsTrigger value="repairs" className="gap-1 text-xs"><Wrench className="size-3" /><span className="hidden sm:inline">Ремонты</span></TabsTrigger>
              <TabsTrigger value="glonass" className="gap-1 text-xs"><MapPin className="size-3" /><span className="hidden sm:inline">ГЛОНАСС</span></TabsTrigger>
              <TabsTrigger value="trips" className="gap-1 text-xs"><Route className="size-3" /><span className="hidden sm:inline">Рейсы</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-1 text-xs"><History className="size-3" /><span className="hidden sm:inline">История</span></TabsTrigger>
              <TabsTrigger value="employees" className="gap-1 text-xs"><Users className="size-3" /><span className="hidden sm:inline">Сотрудники</span></TabsTrigger>
            </TabsList>
          </div>

          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {detailTab === 'info' && (
                  <div className="px-4 sm:px-5 py-3 space-y-4">
                    <DetailSection title="Основные данные" icon={<Settings2 className="size-3.5" />}>
                      <DetailRow label="Наименование" value={eq.name} />
                      <DetailRow label="Тип" value={<TypeBadge type={eq.type} />} />
                      <DetailRow label="Марка" value={eq.brand} />
                      <DetailRow label="Модель" value={eq.model} />
                      <DetailRow label="Год выпуска" value={eq.year?.toString()} />
                      <DetailRow label="Возраст" value={eq.year ? (() => { const age = new Date().getFullYear() - eq.year; return age <= 0 ? 'Новый' : `${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}` })() : undefined} />
                      <DetailRow label="Категория" value={eq.category} />
                      <DetailRow label="Цвет" value={eq.color} />
                      <DetailRow label="Гаражный номер" value={eq.garageNumber} />
                      <DetailRow label="Сменный номер" value={eq.unitNumber} />
                      <DetailRow label="Назначенный водитель" value={eq.assignedDriver} />
                    </DetailSection>
                    <DetailSection title="Состояние" icon={<HeartPulse className="size-3.5" />}>
                      <DetailRow label="Состояние" value={eq.condition && EQUIPMENT_CONDITION_MAP[eq.condition] ? <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${EQUIPMENT_CONDITION_MAP[eq.condition].color}`}>{EQUIPMENT_CONDITION_MAP[eq.condition].icon} {EQUIPMENT_CONDITION_MAP[eq.condition].label}</span> : undefined} />
                      <DetailRow label="Местоположение" value={eq.location} />
                      <DetailRow label="Депо" value={eq.depot} />
                    </DetailSection>
                    <DetailSection title="Регистрация" icon={<FileText className="size-3.5" />}>
                      <DetailRow label="VIN" value={eq.vin} />
                      <DetailRow label="Серийный номер" value={eq.serialNumber} />
                      <DetailRow label="Гос. номер" value={eq.registrationNum} />
                      <DetailRow label="СТС" value={eq.stsNumber} />
                      <DetailRow label="ПТС" value={eq.ptsNumber} />
                    </DetailSection>
                    <DetailSection title="Тех. характеристики" icon={<Gauge className="size-3.5" />}>
                      <DetailRow label="Двигатель" value={eq.engineType} />
                      <DetailRow label="Объём" value={eq.engineVolume} />
                      <DetailRow label="Мощность (л.с.)" value={eq.enginePower} />
                      <DetailRow label="Пробег (км)" value={eq.mileage?.toLocaleString('ru-RU')} />
                      {eq.trackers?.[0]?.lastMileage != null && <DetailRow label="Пробег трекера" value={`${eq.trackers[0].lastMileage?.toLocaleString('ru-RU')} км`} />}
                      <DetailRow label="Топливо" value={eq.fuelType} />
                      <DetailRow label="Расход топлива" value={eq.fuelConsumptionNorm ? `${eq.fuelConsumptionNorm} л/100км` : undefined} />
                      <DetailRow label="Грузоподъёмность" value={eq.loadCapacity} />
                      <DetailRow label="Мест" value={eq.passengerSeats?.toString()} />
                    </DetailSection>
                    <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                      <DetailRow label="Дата покупки" value={formatDate(eq.purchaseDate)} />
                      <DetailRow label="Цена покупки" value={formatPrice(eq.purchasePrice)} />
                      <DetailRow label="Текущая стоимость" value={formatPrice(eq.currentPrice)} />
                      {eq.purchasePrice && eq.currentPrice && (
                        <DetailRow label="Амортизация" value={<span className={`font-medium ${eq.currentPrice < eq.purchasePrice * 0.5 ? 'text-red-500' : eq.currentPrice < eq.purchasePrice * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100)}%</span>} />
                      )}
                      {eq.purchaseDate && (
                        <DetailRow label="Возраст" value={`${Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} лет`} />
                      )}
                    </DetailSection>
                    <DetailSection title="Страхование и ТО" icon={<Shield className="size-3.5" />}>
                      <DetailRow label="Полис" value={eq.insuranceNumber} />
                      <DetailRow label="Страховка до" value={(() => { const d = formatDaysUntil(eq.insuranceExpiry); return <span className={d?.className}>{d?.text || formatDate(eq.insuranceExpiry)}</span> })()} />
                      <DetailRow label="ТО дата" value={formatDate(eq.inspectionDate)} />
                      <DetailRow label="ТО до" value={(() => { const d = formatDaysUntil(eq.inspectionExpiry); return <span className={d?.className}>{d?.text || formatDate(eq.inspectionExpiry)}</span> })()} />
                    </DetailSection>
                    {/* Maintenance section */}
                    {(eq.lastMaintenanceDate || eq.nextMaintenanceDate || eq.maintenanceInterval) && (
                      <DetailSection title="Обслуживание" icon={<Wrench className="size-3.5" />}>
                        <DetailRow label="Последнее ТО" value={formatDate(eq.lastMaintenanceDate)} />
                        <DetailRow label="Следующее ТО" value={(() => { const d = formatDaysUntil(eq.nextMaintenanceDate); return d ? <span className={d.className}>{d.text}</span> : <span>{formatDate(eq.nextMaintenanceDate)}</span> })()} />
                        <DetailRow label="Интервал ТО" value={eq.maintenanceInterval ? `${eq.maintenanceInterval.toLocaleString('ru-RU')} км` : undefined} />
                      </DetailSection>
                    )}
                    {/* Oil & Tires section */}
                    {(eq.oilChangeDate || eq.oilChangeMileage || eq.oilChangeInterval || eq.tireSize || eq.tireReplacementDate) && (
                      <DetailSection title="Масло и шины" icon={<Droplets className="size-3.5" />}>
                        <DetailRow label="Замена масла" value={formatDate(eq.oilChangeDate)} />
                        <DetailRow label="Пробег при замене" value={eq.oilChangeMileage ? `${eq.oilChangeMileage.toLocaleString('ru-RU')} км` : undefined} />
                        <DetailRow label="Интервал замены" value={eq.oilChangeInterval ? `${eq.oilChangeInterval.toLocaleString('ru-RU')} км` : undefined} />
                        {eq.oilChangeInterval && eq.oilChangeMileage && eq.mileage && (
                          <DetailRow label="До замены масла" value={<span className={`font-medium ${(eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval ? 'text-red-500' : (eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.max(0, eq.oilChangeInterval - (eq.mileage - eq.oilChangeMileage)).toLocaleString('ru-RU')} км</span>} />
                        )}
                        <DetailRow label="Размер шин" value={eq.tireSize} />
                        <DetailRow label="Замена шин" value={formatDate(eq.tireReplacementDate)} />
                      </DetailSection>
                    )}
                    {/* Rental section */}
                    {(eq.rentalStartDate || eq.rentalEndDate || eq.rentalCost) && (
                      <DetailSection title="Аренда" icon={<Users className="size-3.5" />}>
                        <DetailRow label="Начало аренды" value={formatDate(eq.rentalStartDate)} />
                        <DetailRow label="Конец аренды" value={formatDate(eq.rentalEndDate)} />
                        <DetailRow label="Стоимость аренды" value={eq.rentalCost ? `${eq.rentalCost.toLocaleString('ru-RU')} ₽/мес` : undefined} />
                        {eq.rentalEndDate && (() => { const rd = Math.ceil((new Date(eq.rentalEndDate).getTime() - Date.now()) / (1000*60*60*24)); return rd >= 0 ? <DetailRow label="Дней до окончания" value={<span className={`font-medium ${rd < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{rd} дн.</span>} /> : <DetailRow label="Аренда истекла" value={<span className="text-red-600 dark:text-red-400 font-medium">{Math.abs(rd)} дн. назад</span>} /> })()}
                      </DetailSection>
                    )}
                    {/* Decommission section */}
                    {eq.status === 'decommissioned' && (eq.decommissionDate || eq.decommissionReason) && (
                      <DetailSection title="Списание" icon={<XCircle className="size-3.5" />}>
                        <DetailRow label="Дата списания" value={formatDate(eq.decommissionDate)} />
                        <DetailRow label="Причина списания" value={eq.decommissionReason} />
                      </DetailSection>
                    )}
                    <DetailSection title="Компания" icon={<Building2 className="size-3.5" />}>
                      <DetailRow label="Владелец" value={eq.owner?.name} />
                      <DetailRow label="Арендатор" value={eq.renter?.name} />
                    </DetailSection>
                    {eq.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{eq.notes}</p></DetailSection>}

                    {/* Utilization & stats */}
                    {(() => {
                      const lastRepair = eq.repairs && eq.repairs.length > 0
                        ? eq.repairs.reduce((latest, r) => { const d = new Date(r.startDate).getTime(); return d > latest ? d : latest }, 0)
                        : null
                      const daysSinceRepair = lastRepair ? Math.floor((Date.now() - lastRepair) / (1000*60*60*24)) : null
                      const totalRepairCost = eq.repairs ? eq.repairs.reduce((s, r) => s + (r.cost || 0), 0) : null
                      const avgRepairCost = eq.repairs && eq.repairs.length > 0 ? (totalRepairCost || 0) / eq.repairs.length : null
                      const activeDays = eq.purchaseDate ? Math.max(1, Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (1000*60*60*24))) : null
                      const repairDays = eq.repairs ? eq.repairs.reduce((s, r) => {
                        if (r.status !== 'completed' || !r.startDate || !r.endDate) return s
                        return s + Math.max(1, Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24)))
                      }, 0) : 0
                      const utilization = activeDays ? Math.round(((activeDays - repairDays) / activeDays) * 100) : null

                      if (daysSinceRepair == null && avgRepairCost == null && utilization == null && totalRepairCost == null) return null
                      return (
                        <DetailSection title="Эксплуатация" icon={<Activity className="size-3.5" />}>
                          {daysSinceRepair != null && <DetailRow label="Дней с последнего ремонта" value={<span className={daysSinceRepair > 90 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>{daysSinceRepair} дн.</span>} />}
                          {totalRepairCost != null && totalRepairCost > 0 && <DetailRow label="Общая стоимость ремонтов" value={formatPrice(totalRepairCost)} />}
                          {avgRepairCost != null && <DetailRow label="Средняя стоимость ремонта" value={formatPrice(avgRepairCost)} />}
                          <DetailRow label="Ремонтов" value={`${eq.repairs?.length || 0}`} />
                          <DetailRow label="Фотографий" value={`${eq._count?.photos || 0}`} />
                          {utilization != null && <DetailRow label="Коэффициент использования" value={<span className={`font-medium ${utilization > 80 ? 'text-emerald-600 dark:text-emerald-400' : utilization > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{utilization}%</span>} />}
                        </DetailSection>
                      )
                    })()}

                    {/* Quick ID reference */}
                    <div className="rounded-md border border-border/50 p-2.5 text-[10px] text-muted-foreground">
                      <p>ID: <span className="font-mono">{eq.id.slice(0, 8)}</span></p>
                    </div>
                  </div>
                )}

                {detailTab === 'maintenance' && (
                  <div className="px-4 sm:px-5 py-3 space-y-4">
                    <DetailSection title="Обслуживание" icon={<Wrench className="size-3.5" />}>
                      <DetailRow label="Последнее ТО" value={formatDate(eq.lastMaintenanceDate)} />
                      <DetailRow label="Следующее ТО" value={(() => { const d = formatDaysUntil(eq.nextMaintenanceDate); return d ? <span className={d.className}>{d.text}</span> : <span>{formatDate(eq.nextMaintenanceDate)}</span> })()} />
                      <DetailRow label="Интервал ТО" value={eq.maintenanceInterval ? `${eq.maintenanceInterval.toLocaleString('ru-RU')} км` : undefined} />
                      {eq.maintenanceInterval && eq.mileage && eq.lastMaintenanceDate && (() => {
                        const daysSince = Math.floor((Date.now() - new Date(eq.lastMaintenanceDate).getTime()) / (1000*60*60*24))
                        return <DetailRow label="Дней с последнего ТО" value={<span className={daysSince > 180 ? 'text-red-600 dark:text-red-400 font-medium' : daysSince > 90 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>{daysSince} дн.</span>} />
                      })()}
                    </DetailSection>
                    <DetailSection title="Масло" icon={<Droplets className="size-3.5" />}>
                      <DetailRow label="Дата замены" value={formatDate(eq.oilChangeDate)} />
                      <DetailRow label="Пробег при замене" value={eq.oilChangeMileage ? `${eq.oilChangeMileage.toLocaleString('ru-RU')} км` : undefined} />
                      <DetailRow label="Интервал замены" value={eq.oilChangeInterval ? `${eq.oilChangeInterval.toLocaleString('ru-RU')} км` : undefined} />
                      {eq.oilChangeInterval && eq.oilChangeMileage && eq.mileage && (
                        <DetailRow label="До замены масла" value={<span className={`font-medium ${(eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval ? 'text-red-500' : (eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.max(0, eq.oilChangeInterval - (eq.mileage - eq.oilChangeMileage)).toLocaleString('ru-RU')} км</span>} />
                      )}
                    </DetailSection>
                    <DetailSection title="Шины" icon={<Cog className="size-3.5" />}>
                      <DetailRow label="Размер шин" value={eq.tireSize} />
                      <DetailRow label="Дата замены" value={formatDate(eq.tireReplacementDate)} />
                    </DetailSection>
                    <DetailSection title="Расход топлива" icon={<FuelIcon className="size-3.5" />}>
                      <DetailRow label="Норма расхода" value={eq.fuelConsumptionNorm ? `${eq.fuelConsumptionNorm} л/100км` : undefined} />
                      <DetailRow label="Тип топлива" value={eq.fuelType} />
                    </DetailSection>
                    {(!eq.lastMaintenanceDate && !eq.nextMaintenanceDate && !eq.maintenanceInterval && !eq.oilChangeDate && !eq.tireSize && !eq.fuelConsumptionNorm) && (
                      <div className="text-center py-8 text-muted-foreground"><Wrench className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Данные об обслуживании не заполнены</p></div>
                    )}
                  </div>
                )}

                {detailTab === 'documents' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Документы ({eq.documents?.length || 0})</p>
                    </div>
                    {(!eq.documents || eq.documents.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><FileText className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет документов</p></div>
                    ) : (
                      <div className="space-y-2">
                        {eq.documents.map(doc => (
                          <Card key={doc.id} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0"><FileText className="size-4 text-muted-foreground" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{doc.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{doc.type}{doc.notes ? ` • ${doc.notes}` : ''}</p>
                                </div>
                              </div>
                              {doc.expiryDate && (() => { const d = formatDaysUntil(doc.expiryDate); return d ? <span className={`text-[10px] font-medium shrink-0 ${d.className}`}>{d.text.split('(')[0].trim()}</span> : null })()}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'photos' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Select value={photoCategoryFilter} onValueChange={setPhotoCategoryFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Категория" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          {Object.entries(PHOTO_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onUploadPhoto(eq.id)}><Upload className="size-3" />Загрузить</Button>
                    </div>
                    {filteredPhotos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><Camera className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет фотографий</p></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredPhotos.map(photo => (
                          <div key={photo.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => setFullPhoto(photo.url)}>
                            <img src={photo.url} alt={photo.description || ''} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[9px] text-white truncate">{PHOTO_CATEGORIES[photo.category] || photo.category}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'repairs' && (
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onAddRepair(eq.id)}><Plus className="size-3" />Новый ремонт</Button>
                      {eq.repairs && eq.repairs.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Всего: {eq.repairs.length}</span>
                          <span>Стоимость: {formatPrice(eq.repairs.reduce((s, r) => s + (r.cost || 0), 0))}</span>
                        </div>
                      )}
                    </div>
                    {(!eq.repairs || eq.repairs.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><Wrench className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет записей о ремонтах</p></div>
                    ) : eq.repairs.map(r => (
                      <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-shadow overflow-hidden" onClick={() => onOpenRepairDetail(r)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium break-words min-w-0 flex-1">{r.description}</p>
                            <span className="shrink-0">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                            <span>{formatDate(r.startDate)}</span>{r.cost != null && <span>{formatPrice(r.cost)}</span>}
                          </div>
                          {r.masters && r.masters.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.masters.map(m => (
                                <span key={m.id} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${REPAIR_MASTER_ROLE_MAP[m.role]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                  <User className="size-2.5" />{m.employee.fullName}
                                </span>
                              ))}
                            </div>
                          )}
                          {r.stages && r.stages.length > 0 && (() => {
                            const completed = r.stages.filter(s => s.status === 'completed').length
                            const inProgress = r.stages.filter(s => s.status === 'in_progress').length
                            return (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>Этапы: {completed}/{r.stages.length} {inProgress > 0 && <span className="text-amber-600 dark:text-amber-400">({inProgress} в работе)</span>}</span>
                                  <span className="font-medium">{getStageProgress(r.stages)}%</span>
                                </div>
                                <Progress value={getStageProgress(r.stages)} className="h-1.5" />
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {detailTab === 'glonass' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    {(!eq.trackers || eq.trackers.length === 0) ? (
                      <div className="text-center py-8">
                        <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground mb-1">ГЛОНАСС трекер не подключён</p>
                        <Button size="sm" className="h-8 gap-1 text-xs mt-2" onClick={async () => {
                          setTrackerPickerEqId(eq.id)
                          setTrackerPickerLoading(true)
                          setTrackerPickerOpen(true)
                          try {
                            const res = await fetch('/api/glonass/objects')
                            if (res.ok) {
                              const data = await res.json()
                              setAvailableObjects(data.objects || [])
                            } else {
                              toast.error('Ошибка получения объектов Axenta')
                            }
                          } catch { toast.error('Ошибка подключения к Axenta') }
                          setTrackerPickerLoading(false)
                        }}><Plus className="size-3" />Подключить из Axenta</Button>
                      </div>
                    ) : (
                      <>
                        {/* MAP */}
                        {eq.trackers.some(t => t.lastLatitude != null && t.lastLongitude != null) && (
                          <Card>
                            <CardHeader className="pb-1.5 pt-3 px-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="size-3.5" />Карта</CardTitle>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowAllTrackersMap(!showAllTrackersMap)}>
                                  {showAllTrackersMap ? 'Текущая техника' : 'Вся техника'}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 pt-0">
                              <div className="h-[300px] rounded-lg overflow-hidden border">
                                <TrackerMap
                                  trackers={showAllTrackersMap
                                    ? allEquipment.flatMap(e => (e.trackers || []).filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: e.name, registrationNum: e.registrationNum, equipmentId: e.id })))
                                    : eq.trackers!.filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: eq.name, registrationNum: eq.registrationNum, equipmentId: eq.id }))
                                  }
                                  trackPoints={mapTrackData}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Tracker cards */}
                        {eq.trackers?.map(tracker => (
                          <Card key={tracker.id}>
                            <CardHeader className="pb-1.5 pt-3 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`size-7 rounded-md flex items-center justify-center ${tracker.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                    {tracker.isActive ? <Wifi className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-3.5 text-red-600 dark:text-red-400" />}
                                  </div>
                                  <div>
                                    <CardTitle className="text-xs font-semibold">{tracker.trackerName || `Трекер ${tracker.trackerId}`}</CardTitle>
                                    <p className="text-[10px] text-muted-foreground">ID: {tracker.trackerId}{tracker.axentaCloudId ? ` • Axenta: ${tracker.axentaCloudId}` : ''}</p>
                                  </div>
                                </div>
                                {statusBadge(tracker.isActive ? 'active' : 'repair', { active: { label: 'Активен', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' }, repair: { label: 'Неактивен', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' } })}
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 pt-0 space-y-2">
                              <Separator />
                              <DetailSection title="Местоположение" icon={<MapPin className="size-3.5" />}>
                                <DetailRow label="Широта" value={tracker.lastLatitude?.toFixed(6)} />
                                <DetailRow label="Долгота" value={tracker.lastLongitude?.toFixed(6)} />
                                <DetailRow label="Скорость" value={tracker.lastSpeed != null ? `${tracker.lastSpeed} км/ч` : undefined} />
                                <DetailRow label="Курс" value={tracker.lastCourse != null ? getCourseDirection(tracker.lastCourse) : undefined} />
                                <DetailRow label="Высота" value={tracker.lastAltitude != null ? `${tracker.lastAltitude} м` : undefined} />
                                {tracker.lastAddress && <DetailRow label="Адрес" value={tracker.lastAddress} />}
                              </DetailSection>
                              {/* ── All sensors from Axenta ── */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Gauge className="size-3.5 text-muted-foreground" />
                                    <span className="text-xs font-semibold">Датчики</span>
                                    {axentaSensors && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({axentaSensors.sensorsWithValues}/{axentaSensors.totalSensors})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {axentaSensors && (
                                      <button
                                        onClick={() => setShowOnlyWithValues(!showOnlyWithValues)}
                                        className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 hover:bg-accent/50 transition-colors"
                                      >
                                        {showOnlyWithValues ? 'Все' : 'Только с данными'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => fetchAxentaSensors(tracker.id)}
                                      disabled={axentaSensorsLoading}
                                      className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      <RefreshCw className={`size-2.5 ${axentaSensorsLoading ? 'animate-spin' : ''}`} />
                                      {axentaSensors ? 'Обновить' : 'Загрузить из Axenta'}
                                    </button>
                                  </div>
                                </div>

                                {/* Before loading from Axenta: show basic cached data */}
                                {!axentaSensors && (
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                                    <DetailRow label="Зажигание" value={tracker.lastIgnition != null ? (tracker.lastIgnition ? 'Вкл' : 'Выкл') : undefined} />
                                    <DetailRow label="Топливо" value={tracker.lastFuelLevel != null ? `${tracker.lastFuelLevel} л` : undefined} />
                                    <DetailRow label="Пробег" value={tracker.lastMileage != null ? `${tracker.lastMileage?.toLocaleString('ru-RU')} км` : undefined} />
                                    {tracker.lastEngineTemp != null && <DetailRow label="Темп. двигателя" value={`${tracker.lastEngineTemp}°C`} />}
                                    {tracker.sensorData && (() => {
                                      const cached = getUniqueSensors(
                                        tracker.sensorData.filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
                                      )
                                      const shownTypes = new Set(['ignition', 'fuel', 'mileage', 'temperature'])
                                      const extra = cached.filter(s => {
                                        const t = (s.sensorType || '').toLowerCase()
                                        const n = (s.sensorName || '').toLowerCase()
                                        if (shownTypes.has('ignition') && (t.includes('ignition') || n.includes('зажиган'))) return false
                                        if (shownTypes.has('fuel') && (t.includes('fuel') || n.includes('топлив') || n.includes('бак'))) return false
                                        if (shownTypes.has('mileage') && (t.includes('odometer') || t.includes('mileage') || n.includes('пробег') || n.includes('одометр'))) return false
                                        if (shownTypes.has('temperature') && (t.includes('temp') || n.includes('темпер'))) return false
                                        return true
                                      })
                                      if (extra.length === 0) return null
                                      return extra.map((s, i) => {
                                        const displayVal = `${(s.value ?? s.stringValue) || '—'}${s.unit ? ` ${s.unit}` : ''}`
                                        return <DetailRow key={i} label={s.sensorName || s.sensorType} value={displayVal} />
                                      })
                                    })()}
                                    {(!tracker.sensorData || getUniqueSensors(
                                      tracker.sensorData.filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
                                    ).length === 0) && tracker.lastEngineTemp == null && tracker.lastFuelLevel == null && tracker.lastMileage == null && (
                                      <p className="text-[10px] text-muted-foreground col-span-2">Нажмите «Загрузить из Axenta» для просмотра всех датчиков</p>
                                    )}
                                  </div>
                                )}

                                {/* After loading: show grouped sensors from Axenta */}
                                {axentaSensors && (
                                  <div className="space-y-2">
                                    {axentaSensors.grouped.map(group => {
                                      const filteredSensors = showOnlyWithValues
                                        ? group.sensors.filter(s => s.hasValue)
                                        : group.sensors
                                      if (filteredSensors.length === 0) return null

                                      const categoryIcons: Record<string, string> = {
                                        position: '📍',
                                        ignition: '🔑',
                                        fuel: '⛽',
                                        temperature: '🌡',
                                        mileage: '🛣',
                                        voltage: '⚡',
                                        digital: '📡',
                                        custom: '🔧',
                                      }

                                      return (
                                        <div key={group.key} className="rounded-md border border-border/40 overflow-hidden">
                                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30">
                                            <span className="text-xs">{categoryIcons[group.key] || '📊'}</span>
                                            <span className="text-[11px] font-semibold">{group.label}</span>
                                            <span className="text-[9px] text-muted-foreground ml-auto">
                                              {group.sensors.filter(s => s.hasValue).length}/{group.sensors.length}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-2.5 py-1.5 text-[11px]">
                                            {filteredSensors.map(s => {
                                              const valueColor = s.hasValue
                                                ? (s.category === 'ignition'
                                                  ? (s.stringValue === 'Вкл' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400')
                                                  : 'text-foreground')
                                                : 'text-muted-foreground/50'

                                              const valueText = s.hasValue
                                                ? (s.stringValue || `${s.value}${s.unit ? ` ${s.unit}` : ''}`)
                                                : '—'

                                              return (
                                                <div key={s.id} className="contents">
                                                  <span className="text-muted-foreground truncate" title={s.name + (s.description ? ` — ${s.description}` : '')}>
                                                    {s.name}
                                                  </span>
                                                  <span className={`${valueColor} text-right font-mono truncate`}>
                                                    {valueText}
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Summary bar */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                      <span>
                                        Датчиков с данными: {axentaSensors.sensorsWithValues} из {axentaSensors.totalSensors}
                                      </span>
                                      <span>
                                        {!showOnlyWithValues
                                          ? `${axentaSensors.totalSensors - axentaSensors.sensorsWithValues} без данных`
                                          : `${axentaSensors.totalSensors - axentaSensors.sensorsWithValues} скрыто`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Tracker identification */}
                              <DetailSection title="Идентификация" icon={<Cpu className="size-3.5" />}>
                                {tracker.trackerName && <DetailRow label="Название" value={tracker.trackerName} />}
                                <DetailRow label="ID трекера" value={tracker.trackerId} />
                                {tracker.axentaCloudId && <DetailRow label="Axenta ID" value={tracker.axentaCloudId} />}
                                {tracker.imei && <DetailRow label="IMEI" value={<span className="font-mono cursor-pointer hover:text-primary" onClick={() => copyToClipboard(tracker.imei!)} title="Копировать">{tracker.imei}</span> as any} />}
                                {tracker.phoneNumber && <DetailRow label="Телефон" value={tracker.phoneNumber} />}
                              </DetailSection>
                              <DetailSection title="Связь" icon={<Clock className="size-3.5" />}>
                                <DetailRow label="Выход на связь" value={formatDateTime(tracker.lastSeenAt)} />
                                <DetailRow label="Позиция" value={formatDateTime(tracker.lastPositionAt)} />
                                {tracker.lastSeenAt && (() => {
                                  const diffMs = Date.now() - new Date(tracker.lastSeenAt).getTime()
                                  const diffMin = Math.floor(diffMs / 60000)
                                  const diffHrs = Math.floor(diffMin / 60)
                                  const diffDays = Math.floor(diffHrs / 24)
                                  let ago: string
                                  if (diffMin < 1) ago = 'только что'
                                  else if (diffMin < 60) ago = `${diffMin} мин назад`
                                  else if (diffHrs < 24) ago = `${diffHrs} ч назад`
                                  else ago = `${diffDays} дн назад`
                                  return <DetailRow label="Последняя активность" value={<span className={diffMin < 5 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : diffHrs > 24 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}>{ago}</span> as any} />
                                })()}
                              </DetailSection>

                              {/* ── Tracker Commands ── */}
                              <div className="space-y-2">
                                <button className="flex items-center gap-1.5 text-xs font-semibold w-full text-left" onClick={() => {
                                  if (!commandsPanelOpen && !trackerCommands) {
                                    fetchTrackerCommands(tracker.id)
                                  }
                                  setCommandsPanelOpen(prev => !prev)
                                }}>
                                  <Terminal className="size-3.5 text-muted-foreground" />
                                  <span>Команды трекера</span>
                                  {trackerCommands && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({trackerCommands.commands.length} команд)
                                    </span>
                                  )}
                                  {commandLog.length > 0 && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                      {commandLog.filter(l => l.status === 'sending' || l.status === 'sent' || l.status === 'delivered').length} в процессе
                                    </span>
                                  )}
                                  <ChevronDown className={`size-3 text-muted-foreground transition-transform ml-auto ${commandsPanelOpen ? '' : '-rotate-90'}`} />
                                </button>

                                {commandsPanelOpen && (
                                  <div className="space-y-2">
                                    {/* Device capability indicator */}
                                    {trackerCommands && (
                                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] ${trackerCommands.deviceCanSendCommands ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                                        {trackerCommands.deviceCanSendCommands
                                          ? <><Wifi className="size-3" /> Устройство поддерживает команды</>
                                          : <><WifiOff className="size-3" /> Устройство может не поддерживать команды</>
                                        }
                                      </div>
                                    )}

                                    {/* ── Command execution log ── */}
                                    {commandLog.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground font-medium">Журнал выполнения:</p>
                                        {commandLog.slice(0, 5).map(log => {
                                          const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
                                            sending: {
                                              icon: <Loader2 className="size-3 animate-spin" />,
                                              color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300',
                                              label: 'Отправка...',
                                            },
                                            sent: {
                                              icon: <RefreshCw className="size-3 animate-spin" />,
                                              color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-300',
                                              label: 'Отправлено',
                                            },
                                            delivered: {
                                              icon: <CheckCircle2 className="size-3" />,
                                              color: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
                                              label: 'На сервере',
                                            },
                                            confirmed: {
                                              icon: <CheckCheck className="size-3" />,
                                              color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
                                              label: 'Подтверждено',
                                            },
                                            timeout: {
                                              icon: <Clock className="size-3" />,
                                              color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
                                              label: 'Таймаут',
                                            },
                                            error: {
                                              icon: <XCircle className="size-3" />,
                                              color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300',
                                              label: 'Ошибка',
                                            },
                                          }
                                          const cfg = statusConfig[log.status] || statusConfig.error
                                          const timeAgo = Math.floor((Date.now() - log.sentAt.getTime()) / 1000)
                                          const timeStr = timeAgo < 5 ? 'только что' : timeAgo < 60 ? `${timeAgo}с назад` : `${Math.floor(timeAgo / 60)}м назад`

                                          return (
                                            <div key={log.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${cfg.color} transition-all`}>
                                              {cfg.icon}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[11px] font-medium truncate">{log.command}</span>
                                                  <span className="text-[9px] opacity-70">{timeStr}</span>
                                                </div>
                                                <p className="text-[10px] opacity-80 truncate">{log.statusText}</p>
                                              </div>
                                              <span className="text-[9px] font-semibold shrink-0">{cfg.label}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {/* Loading state */}
                                    {commandsLoading && (
                                      <div className="flex items-center justify-center py-3">
                                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                        <span className="text-[11px] text-muted-foreground ml-2">Загрузка команд...</span>
                                      </div>
                                    )}

                                    {/* Available commands list */}
                                    {trackerCommands && trackerCommands.commands.length > 0 && (
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Доступные команды:</p>
                                        {trackerCommands.commands.map((cmd) => (
                                          <div key={cmd.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/40 hover:bg-accent/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-medium truncate">{cmd.name}</p>
                                              {cmd.params && (
                                                <p className="text-[10px] text-muted-foreground truncate">Параметры: {cmd.params}</p>
                                              )}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-[10px] gap-1 shrink-0"
                                              disabled={commandSending !== null}
                                              onClick={() => sendTrackerCommand(tracker.id, cmd.params)}
                                            >
                                              {commandSending === (cmd.params || String(cmd.id))
                                                ? <Loader2 className="size-2.5 animate-spin" />
                                                : <Send className="size-2.5" />
                                              }
                                              Отправить
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* No predefined commands */}
                                    {trackerCommands && trackerCommands.commands.length === 0 && (
                                      <p className="text-[10px] text-muted-foreground">Нет предустановленных команд для этого трекера</p>
                                    )}

                                    {/* Custom command input */}
                                    <div className="space-y-1.5 pt-1 border-t border-border/30">
                                      <p className="text-[10px] text-muted-foreground font-medium">Произвольная команда:</p>
                                      <div className="flex gap-1.5">
                                        <Input
                                          className="h-7 text-[11px] flex-1"
                                          placeholder="Например: restart, position, output1:on"
                                          value={customCommandText}
                                          onChange={e => setCustomCommandText(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter' && customCommandText.trim()) {
                                              sendTrackerCommand(tracker.id, null, customCommandText.trim())
                                              setCustomCommandText('')
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-7 text-[10px] gap-1 shrink-0"
                                          disabled={!customCommandText.trim() || commandSending !== null}
                                          onClick={() => {
                                            sendTrackerCommand(tracker.id, null, customCommandText.trim())
                                            setCustomCommandText('')
                                          }}
                                        >
                                          {commandSending === customCommandText.trim()
                                            ? <Loader2 className="size-2.5 animate-spin" />
                                            : <Send className="size-2.5" />
                                          }
                                          Отправить
                                        </Button>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {[
                                          { label: 'Перезагрузка', cmd: 'restart' },
                                          { label: 'Запрос позиции', cmd: 'position' },
                                          { label: 'Запрос статуса', cmd: 'status' },
                                          { label: 'Блокировка', cmd: 'block_engine' },
                                          { label: 'Разблокировка', cmd: 'unblock_engine' },
                                        ].map(preset => (
                                          <button
                                            key={preset.cmd}
                                            className="text-[9px] px-1.5 py-0.5 rounded border border-border/60 hover:bg-accent/50 transition-colors"
                                            onClick={() => setCustomCommandText(preset.cmd)}
                                          >
                                            {preset.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Refresh commands button */}
                                    {trackerCommands && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[10px] w-full gap-1"
                                        disabled={commandsLoading}
                                        onClick={() => fetchTrackerCommands(tracker.id)}
                                      >
                                        <RefreshCw className={`size-2.5 ${commandsLoading ? 'animate-spin' : ''}`} />
                                        Обновить список команд
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Date range for historical data — collapsible */}
                              <div>
                                <button className="flex items-center gap-1.5 text-xs font-semibold w-full text-left" onClick={() => setHistoryPanelOpen(prev => !prev)}>
                                  <Calendar className="size-3.5 text-muted-foreground" />
                                  <span>Запрос данных за период</span>
                                  <ChevronDown className={`size-3 text-muted-foreground transition-transform ${historyPanelOpen ? '' : '-rotate-90'}`} />
                                </button>
                                {historyPanelOpen && (
                                  <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-[10px]">С</Label>
                                        <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">По</Label>
                                        <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} />
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                                        <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyDatePreset(preset)}>{preset}</Button>
                                      ))}
                                    </div>
                                    <Button size="sm" className="h-7 text-[11px] w-full gap-1" disabled={!historyDateFrom || !historyDateTo || historyLoading} onClick={() => fetchHistoricalData(tracker)}>
                                      {historyLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                                      Запросить данные
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Stats display */}
                              {trackerStats && (
                                <DetailSection title="Статистика за период" icon={<Activity className="size-3.5" />}>
                                  <DetailRow label="Пробег" value={trackerStats.mileage ? `${Number(trackerStats.mileage).toFixed(1)} км` : undefined} />
                                  <DetailRow label="Ср. скорость" value={trackerStats.avgSpeed ? `${Number(trackerStats.avgSpeed).toFixed(1)} км/ч` : undefined} />
                                  <DetailRow label="Макс. скорость" value={trackerStats.maxSpeed ? `${Number(trackerStats.maxSpeed).toFixed(1)} км/ч` : undefined} />
                                  <DetailRow label="Расход топлива" value={trackerStats.fuelConsumption ? `${Number(trackerStats.fuelConsumption).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Ср. расход" value={trackerStats.avgFuelConsumption ? `${Number(trackerStats.avgFuelConsumption).toFixed(1)} л/100км` : undefined} />
                                  <DetailRow label="Заправки" value={trackerStats.refuelVolume ? `${Number(trackerStats.refuelVolume).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Сливы" value={trackerStats.plumVolume ? `${Number(trackerStats.plumVolume).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Время поездок" value={trackerStats.tripsDuration ? formatDuration(Number(trackerStats.tripsDuration)) : undefined} />
                                  <DetailRow label="Время стоянок" value={trackerStats.parkingsDuration ? formatDuration(Number(trackerStats.parkingsDuration)) : undefined} />
                                  <DetailRow label="Моточасы" value={trackerStats.engineHours ? `${Number(trackerStats.engineHours).toFixed(1)} ч` : undefined} />
                                </DetailSection>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={async () => {
                                  try {
                                    const res = await fetch('/api/glonass/sync', { method: 'POST' })
                                    const data = await res.json()
                                    if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`)
                                    else toast.error(data.error || 'Ошибка')
                                    onRefresh()
                                    onRefreshAll()
                                  } catch { toast.error('Ошибка') }
                                }}><RefreshCw className="size-3" />Синхронизировать</Button>
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { onRefresh(); onRefreshAll() }}><Activity className="size-3" />Обновить</Button>
                                <div className="flex-1" />
                                <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => {
                                  if (confirm('Отключить трекер от этой техники?')) {
                                    fetch(`/api/glonass/${tracker.id}`, { method: 'DELETE' }).then(() => {
                                      toast.success('Трекер отключён')
                                      onRefresh()
                                      onRefreshAll()
                                    }).catch(() => toast.error('Ошибка'))
                                  }
                                }}><Trash2 className="size-3" /></Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}

                    {/* Tracker picker dialog */}
                    <Dialog open={trackerPickerOpen} onOpenChange={setTrackerPickerOpen}>
                      <DialogContent className="max-w-md max-h-[70dvh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2"><Satellite className="size-4" />Подключить трекер</DialogTitle>
                          <DialogDescription>Выберите объект из Axenta.cloud для привязки</DialogDescription>
                        </DialogHeader>
                        {trackerPickerLoading ? (
                          <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
                        ) : availableObjects.length === 0 ? (
                          <div className="text-center py-8">
                            <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Нет доступных объектов</p>
                            <p className="text-xs text-muted-foreground mt-1">Проверьте настройки Axenta и выполните синхронизацию</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 overflow-y-auto max-h-[50dvh]">
                            {availableObjects.map(obj => (
                              <div key={obj.id} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${obj.isLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={async () => {
                                  if (obj.isLinked) return
                                  try {
                                    const res = await fetch('/api/glonass', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        equipmentId: trackerPickerEqId,
                                        trackerId: String(obj.uniqueId || obj.id),
                                        trackerName: obj.name,
                                        axentaCloudId: String(obj.id),
                                      })
                                    })
                                    if (res.ok) {
                                      toast.success(`Трекер "${obj.name}" подключён`)
                                      setTrackerPickerOpen(false)
                                      onRefresh()
                                      onRefreshAll()
                                    } else {
                                      toast.error('Ошибка подключения трекера')
                                    }
                                  } catch { toast.error('Ошибка подключения') }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`size-6 rounded flex items-center justify-center ${obj.connectedStatus ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    {obj.connectedStatus ? <Wifi className="size-3 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-3 text-gray-400" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">{obj.name}</p>
                                    <p className="text-[10px] text-muted-foreground">ID: {obj.id} • {obj.uniqueId}</p>
                                  </div>
                                </div>
                                {obj.isLinked ? <Badge variant="secondary" className="text-[10px]">Привязан</Badge> : <Plus className="size-4 text-muted-foreground" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {detailTab === 'trips' && (
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onAddTrip(eq.id)}><Plus className="size-3" />Новый рейс</Button>
                      {localTrips.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Всего: {localTrips.length}</span>
                          <span>Расст.: {localTrips.reduce((s, t) => s + (t.distance || 0), 0).toLocaleString('ru-RU')} км</span>
                          <span>Топливо: {Math.round(localTrips.reduce((s, t) => s + (t.fuelConsumed || 0), 0) * 10) / 10} л</span>
                        </div>
                      )}
                    </div>
                    {localTrips.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><Route className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет рейсов</p></div>
                    ) : localTrips.map(t => (
                      <Card key={t.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onOpenTripDetail(t)}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium">{t.route}</p>
                            {statusBadge(t.status, TRIP_STATUS_MAP)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span>{formatDate(t.startDate)}</span>{t.cargo && <span> • {t.cargo}</span>}{t.distance != null && <span> • {t.distance} км</span>}
                          </div>
                          {t.crew && <p className="text-[10px] text-muted-foreground">Экипаж: {t.crew.name}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {detailTab === 'history' && (
                  <div className="px-4 sm:px-5 py-3">
                    {(!eq.history || eq.history.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><History className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет записей</p></div>
                    ) : (
                      <div className="space-y-0">
                        {eq.history.map((h, i) => (
                          <div key={h.id} className="flex gap-2.5 pb-3 relative">
                            {i < (eq.history?.length || 0) - 1 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />}
                            <div className="shrink-0 mt-0.5 z-10">{getEventIcon(h.event)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{h.description || h.event}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(h.date)}</p>
                              {h.oldValue && h.newValue && <p className="text-[10px] text-muted-foreground"><span className="line-through">{h.oldValue}</span> → {h.newValue}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'employees' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    {/* Assigned employees */}
                    {(!eq.employees || eq.employees.length === 0) ? (
                      <div className="text-center py-6 text-muted-foreground"><Users className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет назначенных сотрудников</p></div>
                    ) : (
                      <div className="space-y-2">
                        {eq.employees.map(emp => (
                          <div key={emp.id} className="flex items-center gap-2.5 p-2 rounded-lg border bg-card">
                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || 'dark:bg-gray-900/40 dark:text-gray-400'}`}>
                              {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{emp.fullName}</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] h-4 px-1">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position}</Badge>
                                {emp.licenseCat && <span className="text-[10px] text-muted-foreground">Кат. {emp.licenseCat}</span>}
                                <Badge className={`text-[10px] h-4 px-1 ${EMPLOYEE_STATUS_MAP[emp.status]?.color || ''}`}>{EMPLOYEE_STATUS_MAP[emp.status]?.label || emp.status}</Badge>
                              </div>
                            </div>
                            {emp.phone && <a href={`tel:${emp.phone}`} className="text-muted-foreground hover:text-foreground"><Phone className="size-3.5" /></a>}
                            <Button variant="ghost" size="sm" className="size-7 h-auto w-auto p-1 text-muted-foreground hover:text-destructive" onClick={async () => { await fetch(`/api/employees/${emp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipmentId: '' }) }); onRefresh(); toast.success('Сотрудник откреплён') }}><X className="size-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Assign employee */}
                    <AssignEmployeeSelect eqId={eq.id} assignedIds={(eq.employees || []).map(e => e.id)} onAssigned={onRefresh} />
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs>

        {/* Actions */}
        <div className="border-t px-3 sm:px-5 py-2 flex flex-wrap gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onEdit(eq)}><Edit className="size-3" />Редактировать</Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onUploadPhoto(eq.id)}><ImagePlus className="size-3" />Фото</Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={onRefresh}><Activity className="size-3" />Обновить</Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => { navigator.clipboard.writeText(eq.name).then(() => toast.success('Скопировано')).catch(() => {}) }}><Copy className="size-3" />Копировать</Button>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-muted-foreground self-center mr-1"><kbd className="rounded border bg-muted px-1 py-0.5">Esc</kbd> закрыть</span>
          <Button variant="destructive" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onDelete(eq)}><Trash2 className="size-3" />Удалить</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function DetailSection({ title, icon, children, extra }: { title: string; icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-xs font-semibold">{title}</h3>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">{children}</div>
    </div>
  )
}

export function DetailRow({ label, value }: { label: string; value?: React.ReactNode | string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-dashed border-border/40">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{value || '—'}</span>
    </div>
  )
}

