'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  Route, Edit, Trash2, MapPin, Navigation, Clock, XCircle, CheckCircle2,
  AlertTriangle, Fuel, Truck, Users, Package, Weight, Calendar, Play, Pause,
  ChevronDown, ChevronUp, Copy, Timer, Download, Save, Printer, FileText,
  ArrowRight, Activity, Gauge, Thermometer, Cpu, BarChart3, Compass,
  Droplets, Zap, RefreshCw, ExternalLink, Info,
  ArrowDownToLine, ArrowUpFromLine, ChevronRight, ClipboardList, Cog,
  DollarSign, Flame, Fuel as FuelIcon, Loader2, Map, MapPinned, StickyNote,
  UserCheck, UserCircle, Sofa, X, Share2, Star, CopyPlus, MessageSquare,
  Hash, Sparkles
} from 'lucide-react'
import type { Trip, Crew, RoutePoint, RouteTemplatePoint, GlonassTracker, GlonassSensorData } from '@/lib/types'
import { TRIP_STATUS_MAP, CREW_TYPE_MAP, MEMBER_ROLE_MAP, EQUIPMENT_TYPE_MAP, API, hasPermission, getInitials } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, formatTime, statusBadge, SectionDivider, fmtDuration, formatDurationShort, handleApiError, copyToClipboard, toLocalDatetime, localDatetimeToISO, getTypeInfo } from '@/lib/utils'
import { DetailSection, DetailRow } from '@/components/equipment/equipment-detail-sheet'
import dynamic from 'next/dynamic'
const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })

// ═══════════════════════════════════════════════════════════════
// TRIP DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════

export function TripDetailDialog({ open, onOpenChange, trip, loading, crews, onEdit, onDelete, onStart, onComplete, onRefresh, focusTrack, onOpenEquipment }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  trip: Trip | null; loading: boolean; crews: Crew[];
  onEdit: (t: Trip) => void; onDelete: (t: Trip) => void;
  onStart: (t: Trip) => void; onComplete: (t: Trip) => void;
  onRefresh: () => void;
  focusTrack?: boolean;
  onOpenEquipment?: (equipmentId: string) => void;
}) {
  const [trackData, setTrackData] = useState<Record<string, unknown> | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [trackDateFrom, setTrackDateFrom] = useState<string>('')
  const [trackDateTo, setTrackDateTo] = useState<string>('')
  const [compareData, setCompareData] = useState<Record<string, unknown> | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [discrepancyDialog, setDiscrepancyDialog] = useState<{
    open: boolean;
    diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }>;
    autoFields: Record<string, unknown>;
  }>({ open: false, diffs: [], autoFields: {} })
  const [tripSaved, setTripSaved] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null) // track which trip's data is loaded
  const [showRouteMap, setShowRouteMap] = useState(false)
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null)
  const [routeMapLoading, setRouteMapLoading] = useState(false)
  const [routeMapTrackData, setRouteMapTrackData] = useState<any>(null)
  const [focusedPoint, setFocusedPoint] = useState<{ lat: number; lng: number; type: 'parking' | 'stop' | 'refuel' | 'plum'; label?: string } | null>(null)
  const [routePointsCollapsed, setRoutePointsCollapsed] = useState(true)
  const [routeAddressesOpen, setRouteAddressesOpen] = useState<'start' | 'end' | false>(false)

  // ─── Complete trip dialog with refuel detection ─────────────
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean
    loading: boolean
    fuelEnd: string
    mileageEnd: string
    refuelVolume: string
    refuelDetected: boolean
    sensorRefuelVolume: number | null
    fuelStart: number | null
    fuelConsumed: string
    notes: string
  }>({
    open: false, loading: false, fuelEnd: '', mileageEnd: '', refuelVolume: '',
    refuelDetected: false, sensorRefuelVolume: null, fuelStart: null,
    fuelConsumed: '', notes: '',
  })

  // Ref for scrolling to track section
  const trackSectionRef = useRef<HTMLDivElement>(null)

  // Reset all data when trip changes — must be before any early return (Rules of Hooks)
  // Keep trackData if same trip is reopened (avoid re-fetching)
  useEffect(() => {
    if (trip?.id !== loadedTripId) {
      setTrackData(null)
      setTrackError(null)
      setTrackDateFrom('')
      setTrackDateTo('')
      setTripSaved(false)
    }
    setCompareData(null)
    setCompareError(null)
    setApplySuccess(null)
    setShowRouteMap(false)
    setRouteMapTrackData(null)
    setSelectedTripIndex(null)
    setFocusedPoint(null)
    setRouteAddressesOpen(false)
    setStatsApplied(null)
  }, [trip?.id])

  // ─── Auto-populate trip card fields from statistics when loaded ───
  // When tripStats is loaded/refreshed, compare with existing trip fields.
  // Null fields → auto-fill. Different values → show discrepancy dialog.
  const [statsApplied, setStatsApplied] = useState<string | null>(null) // track which stats version was applied
  useEffect(() => {
    if (!compareData?.tripStats || !trip) return
    const stats = compareData.tripStats as Record<string, unknown>
    // Use a version key to avoid re-triggering on same data
    const versionKey = `${stats.mileage}_${stats.fuelConsumption}_${stats.tripsDuration}_${stats.parkingsDuration}_${stats.engineHours}_${stats.refuelVolume}_${stats.avgFuelConsumption}`
    if (versionKey === statsApplied) return

    const t = trip
    const autoFields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Map stats fields to trip fields with comparison logic
    const fieldMappings: Array<{
      statKey: string; tripKey: keyof Trip; label: string;
      formatVal: (v: unknown) => string; transform: (v: unknown) => unknown;
      tolerance?: number
    }> = [
      { statKey: 'tripsDuration', tripKey: 'tripDuration', label: 'Длительность поездок', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'fuelConsumption', tripKey: 'fuelConsumed', label: 'Расход топлива', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'avgFuelConsumption', tripKey: 'avgFuelRate', label: 'Ср. расход', formatVal: v => `${Number(v).toFixed(1)} л/100км`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'refuelVolume', tripKey: 'refuelVolume', label: 'Заправки', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'engineHours', tripKey: 'engineHours', label: 'Моточасы', formatVal: v => fmtDuration(Number(v)) || `${Number(v).toFixed(1)}`, transform: v => Number(v) },
      { statKey: 'parkingsDuration', tripKey: 'parkingsDuration', label: 'Время стоянок', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'mileage', tripKey: 'distance', label: 'Пробег', formatVal: v => `${Number(v).toFixed(1)} км`, transform: v => Number(v) },
      { statKey: 'avgSpeed', tripKey: 'avgSpeed', label: 'Ср. скорость', formatVal: v => `${Number(v).toFixed(1)} км/ч`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'maxSpeed', tripKey: 'maxSpeed', label: 'Макс. скорость', formatVal: v => `${Number(v).toFixed(0)} км/ч`, transform: v => Math.round(Number(v)) },
      { statKey: 'idleTime', tripKey: 'idleTime', label: 'Холостой ход', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'plumVolume', tripKey: 'plumVolume', label: 'Сливы', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
    ]

    for (const fm of fieldMappings) {
      const statVal = stats[fm.statKey]
      if (statVal == null || Number(statVal) === 0 && fm.statKey !== 'idleTime' && fm.statKey !== 'parkingsDuration' && fm.statKey !== 'tripsDuration') continue

      const transformedVal = fm.transform(statVal)
      const currentVal = t[fm.tripKey]

      if (currentVal == null) {
        // Auto-fill null fields
        autoFields[fm.tripKey] = transformedVal
      } else {
        // Check if values differ (with tolerance for floating point)
        const numCurrent = Number(currentVal)
        const numNew = Number(transformedVal)
        if (Math.abs(numCurrent - numNew) > 0.1) {
          diffs.push({
            field: fm.label,
            fieldKey: fm.tripKey as string,
            current: fm.formatVal(currentVal),
            tracker: fm.formatVal(statVal),
            selected: true, // default: replace with tracker value
          })
        }
      }
    }

    // Apply auto-fill fields immediately
    if (Object.keys(autoFields).length > 0) {
      fetch(`/api/trips/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoFields),
      }).then(res => {
        if (res.ok) {
          onRefresh()
          const fieldNames = Object.keys(autoFields).map(k => {
            const fm = fieldMappings.find(m => m.tripKey === k)
            return fm?.label || k
          })
          toast.success(`Заполнено: ${fieldNames.join(', ')}`)
        }
      }).catch(() => {})
    }

    // Show discrepancy dialog if there are differences
    if (diffs.length > 0) {
      setDiscrepancyDialog({
        open: true,
        diffs,
        autoFields,
      })
    }

    setStatsApplied(versionKey)
  }, [compareData?.tripStats, trip?.id])

  // Auto-load track data when focusTrack is set and dialog opens with a trip
  useEffect(() => {
    if (open && focusTrack && trip?.id && trip.startDate) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        reloadTrack()
        reloadSensors()
        // Scroll to track section after data loads
        setTimeout(() => {
          trackSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 800)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, focusTrack, trip?.id])

  // Filtered track data: when a specific trip segment is selected, show only that segment on the map
  const mapTrackData = useMemo(() => {
    if (!trackData) return null
    const trips = (trackData as any).trips
    if (selectedTripIndex != null && trips && trips[selectedTripIndex]) {
      return {
        track: (trackData as any).track,
        trips: [trips[selectedTripIndex]],
        parkings: [],
        stops: [],
        refuels: [],
        plums: [],
      }
    }
    return trackData
  }, [trackData, selectedTripIndex])

  // ─── Handle trip completion: fetch sensor data, detect refuels ──
  const handleInitComplete = async () => {
    if (!trip) return
    setCompleteDialog(prev => ({ ...prev, open: true, loading: true }))

    try {
      // Get current tracker data from sensors API
      const trackerRes = await fetch(`/api/trips/${trip.id}?action=sensors`)
      const trackerData = trackerRes.ok ? await trackerRes.json() : null

      // Get Axenta stats for the trip period (need tracker's axentaCloudId)
      let axentaStats: Record<string, unknown> | null = null
      try {
        // Use the trip's own sensor-compare API to get refuel info
        const compareRes = await fetch(`/api/trips/${trip.id}?action=sensor-compare`)
        if (compareRes.ok) {
          const compareJson = await compareRes.json()
          // The sensor-compare response includes Axenta stats with refuelVolume
          if (compareJson.tripStats) axentaStats = compareJson.tripStats
        }
      } catch { /* ignore */ }

      // Current sensor values
      const currentFuel = trackerData?.fuelLevel ?? (trackerData?.sensors as any[])?.find((s: any) => /топлив|бак|fuel/i.test(s.name || s.type))?.value
      const currentMileage = trackerData?.mileage ?? (trackerData?.sensors as any[])?.find((s: any) => /пробег|odometer/i.test(s.name || s.type))?.value

      // Detect refuels from Axenta stats
      const sensorRefuelVolume = axentaStats?.refuelVolume != null ? Number(axentaStats.refuelVolume) : null
      const refuelDetected = (sensorRefuelVolume != null && sensorRefuelVolume > 0) as boolean

      // Calculate fuel consumed considering refuels
      const fuelStart = trip.fuelStart ?? null
      let calculatedConsumed: number | null = null
      if (fuelStart != null && currentFuel != null) {
        calculatedConsumed = Math.round((fuelStart - currentFuel + (sensorRefuelVolume || 0)) * 100) / 100
        if (calculatedConsumed < 0) calculatedConsumed = 0
      }

      setCompleteDialog({
        open: true,
        loading: false,
        fuelEnd: currentFuel != null ? String(Math.round(currentFuel * 10) / 10) : '',
        mileageEnd: currentMileage != null ? String(Math.round(currentMileage)) : '',
        refuelVolume: sensorRefuelVolume != null ? String(Math.round(sensorRefuelVolume * 10) / 10) : '',
        refuelDetected,
        sensorRefuelVolume,
        fuelStart,
        fuelConsumed: calculatedConsumed != null ? String(calculatedConsumed) : '',
        notes: '',
      })
    } catch (err) {
      console.error('[Complete] Init failed:', err)
      // Still show dialog with empty fields
      setCompleteDialog({
        open: true, loading: false,
        fuelEnd: '', mileageEnd: '', refuelVolume: '',
        refuelDetected: false, sensorRefuelVolume: null,
        fuelStart: trip.fuelStart ?? null, fuelConsumed: '', notes: '',
      })
    }
  }

  // Actually complete the trip with confirmed data
  const handleConfirmComplete = async () => {
    if (!trip) return
    setCompleteDialog(prev => ({ ...prev, loading: true }))
    try {
      const payload: Record<string, unknown> = { action: 'complete' }
      // Use existing endDate if already filled, otherwise let API set current time
      if (t.endDate) payload.endDate = new Date(t.endDate).toISOString()
      // Override sensor data with user-confirmed values
      if (completeDialog.fuelEnd) payload.fuelEnd = parseFloat(completeDialog.fuelEnd)
      if (completeDialog.mileageEnd) payload.mileageEnd = parseInt(completeDialog.mileageEnd)
      if (completeDialog.refuelVolume) payload.refuelVolume = parseFloat(completeDialog.refuelVolume)
      if (completeDialog.fuelConsumed) payload.fuelConsumed = parseFloat(completeDialog.fuelConsumed)
      if (completeDialog.notes) payload.completeNotes = completeDialog.notes

      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка')
      }
      toast.success('Рейс завершён')
      setCompleteDialog(prev => ({ ...prev, open: false }))
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка завершения рейса')
    }
    setCompleteDialog(prev => ({ ...prev, loading: false }))
  }

  // Auto-load track when dialog opens or trip changes
  // Skip if trackData already loaded for this trip (use cached data in state)
  useEffect(() => {
    if (!open || !trip?.id || !trip.startDate) return
    // Already loaded for this trip — no need to re-fetch
    if (loadedTripId === trip.id && trackData) return
    let cancelled = false

    const autoLoad = async () => {
      setTrackLoading(true)
      setTrackError(null)
      try {
        // Use default dates — the API will return cached data if available
        const params = new URLSearchParams({ action: 'track' })
        const res = await fetch(`/api/trips/${trip.id}?${params}`)
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json()
            setTrackData(data)
            setLoadedTripId(trip.id)
          } else {
            const errData = await res.json().catch(() => null)
            setTrackError(errData?.error || 'Не удалось загрузить трек')
          }
        }
      } catch (e: any) {
        if (!cancelled) setTrackError(e.message || 'Ошибка загрузки трека')
      }
      if (!cancelled) setTrackLoading(false)
    }

    autoLoad()
    return () => { cancelled = true }
  }, [trip?.id, open])

  // Reload track (force refresh from Axenta API)
  const reloadTrack = async () => {
    if (!trip) return
    setTrackLoading(true)
    setTrackError(null)
    try {
      const from = trackDateFrom || (trip.startDate ? toLocalDatetime(trip.startDate) : '')
      const to = trackDateTo || (trip.endDate ? toLocalDatetime(trip.endDate) : toLocalDatetime(new Date()))
      if (!from) throw new Error('Укажите дату начала')
      const params = new URLSearchParams({ action: 'track', force: '1' })
      params.set('from', new Date(from).toISOString())
      params.set('to', new Date(to).toISOString())
      const res = await fetch(`/api/trips/${trip.id}?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка загрузки трека')
      }
      const data = await res.json()
      setTrackData(data)
      setLoadedTripId(trip.id)
    } catch (e: any) {
      setTrackError(e.message || 'Ошибка загрузки трека')
    }
    setTrackLoading(false)
  }

  // Reload sensor comparison data
  const reloadSensors = async () => {
    if (!trip) return
    setCompareLoading(true)
    setCompareError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}?action=sensor-compare`)
      if (res.ok) {
        const data = await res.json()
        setCompareData(data)
      } else {
        const errData = await res.json().catch(() => null)
        setCompareError(errData?.error || 'Не удалось загрузить данные')
      }
    } catch (e: any) {
      setCompareError(e.message || 'Ошибка загрузки')
    }
    setCompareLoading(false)
  }

  // Save all trip data (sensor snapshots, fuel, mileage, stats) to DB
  const saveTripData = async () => {
    if (!trip || !compareData) return
    setSavingTrip(true)
    try {
      const startSnap = compareData.startSnapshot as Record<string, unknown> | null
      const endSnap = compareData.endSnapshot as Record<string, unknown> | null
      const stats = compareData.tripStats as Record<string, unknown> | null
      const fields: Record<string, unknown> = {}

      // Start snapshot data
      if (startSnap) {
        if (startSnap.fuelLevel != null && t.fuelStart == null) fields.fuelStart = Number(startSnap.fuelLevel)
        if (startSnap.mileage != null && t.mileageStart == null) fields.mileageStart = Math.round(Number(startSnap.mileage))
        fields.trackerSnapshotStart = JSON.stringify(startSnap)
      }
      // End snapshot data
      if (endSnap) {
        if (endSnap.fuelLevel != null && t.fuelEnd == null) fields.fuelEnd = Number(endSnap.fuelLevel)
        if (endSnap.mileage != null && t.mileageEnd == null) fields.mileageEnd = Math.round(Number(endSnap.mileage))
        if (t.status === 'completed') fields.trackerSnapshot = JSON.stringify(endSnap)
      }
      // Stats
      if (stats) {
        if (stats.mileage != null && t.distance == null) fields.distance = Number(stats.mileage)
        if (stats.avgSpeed != null && t.avgSpeed == null) fields.avgSpeed = Number(stats.avgSpeed)
        if (stats.maxSpeed != null && t.maxSpeed == null) fields.maxSpeed = Number(stats.maxSpeed)
        if (stats.fuelConsumption != null && t.fuelConsumed == null) fields.fuelConsumed = Number(stats.fuelConsumption)
        if (stats.avgFuelConsumption != null && t.avgFuelRate == null) fields.avgFuelRate = Number(stats.avgFuelConsumption)
        if (stats.refuelVolume != null && t.refuelVolume == null) fields.refuelVolume = Number(stats.refuelVolume)
        if (stats.plumVolume != null && t.plumVolume == null) fields.plumVolume = Number(stats.plumVolume)
        if (stats.tripsDuration != null && t.tripDuration == null) fields.tripDuration = Number(stats.tripsDuration)
        if (stats.parkingsDuration != null && t.parkingsDuration == null) fields.parkingsDuration = Number(stats.parkingsDuration)
        if (stats.engineHours != null && t.engineHours == null) fields.engineHours = Number(stats.engineHours)
        if (stats.idleTime != null && t.idleTime == null) fields.idleTime = Number(stats.idleTime)
      }
      // Derived calculations
      if (fields.fuelEnd != null && (fields.fuelStart != null || t.fuelStart != null)) {
        const fs = (fields.fuelStart as number) ?? t.fuelStart!
        fields.fuelConsumed = Math.round((fs - (fields.fuelEnd as number)) * 100) / 100
        if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
      }
      if (fields.mileageEnd != null && (fields.mileageStart != null || t.mileageStart != null)) {
        const ms = (fields.mileageStart as number) ?? t.mileageStart!
        fields.distance = (fields.mileageEnd as number) - ms
      }

      // Also save track data to cache so it doesn't need re-fetching
      if (trackData) {
        fields.trackDataJson = JSON.stringify(trackData)
        fields.trackDataLoadedAt = new Date().toISOString()
      }

      if (Object.keys(fields).length > 0) {
        const res = await fetch(`/api/trips/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) throw new Error()
      }

      setTripSaved(true)
      toast.success('Данные рейса сохранены')
      onRefresh()
    } catch {
      toast.error('Ошибка сохранения данных')
    }
    setSavingTrip(false)
  }

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return // default dialog close
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (trip) window.open(`/api/trips/${trip.id}/print`, '_blank')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault()
        if (trip) copyToClipboard(trip.route)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, trip?.id])

  // ─── Elapsed time for in-progress trips ───
  const [elapsedTime, setElapsedTime] = useState<string | null>(null)
  useEffect(() => {
    if (!trip || trip.status !== 'in_progress' || !trip.startDate) { setElapsedTime(null); return }
    const update = () => {
      const start = new Date(trip.startDate!).getTime()
      const now = Date.now()
      const diff = now - start
      if (diff < 0) { setElapsedTime(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsedTime(h > 0 ? `${h}ч ${m}мин ${s}сек` : m > 0 ? `${m}мин ${s}сек` : `${s}сек`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [trip?.id, trip?.status, trip?.startDate])

  if (!trip) return null
  const t = trip
  const crew = crews.find(c => c.id === t.crewId)
  const isCompleted = t.status === 'completed'

  // Duration formatter
  const fmtDur = (sec: number | null | undefined) => {
    if (sec == null) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    if (h > 0) return `${h} ч ${m} мин`
    if (m > 0) return `${m} мин ${s} сек`
    return `${s} сек`
  }

  // Calculated distance from mileage
  const calcDistKm = (t.mileageStart != null && t.mileageEnd != null) ? t.mileageEnd - t.mileageStart : null
  const displayDist = t.distance ?? calcDistKm

  // ─── Trip score (0-100) ───
  const calcTripScore = (): number | null => {
    let score = 0, factors = 0
    if (t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000) {
      const rate = (t.fuelConsumed / t.distance) * 100
      score += rate < 15 ? 25 : rate < 20 ? 20 : rate < 25 ? 15 : rate < 35 ? 8 : 0; factors++
    }
    if (t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200) {
      score += t.avgSpeed >= 40 && t.avgSpeed <= 70 ? 25 : t.avgSpeed >= 30 && t.avgSpeed <= 90 ? 15 : 5; factors++
    }
    if (t.idleTime != null && t.tripDuration != null && t.tripDuration > 0) {
      const idlePct = (t.idleTime / t.tripDuration) * 100
      score += idlePct < 5 ? 25 : idlePct < 15 ? 18 : idlePct < 30 ? 10 : 0; factors++
    }
    if (t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300) {
      score += t.maxSpeed <= 70 ? 25 : t.maxSpeed <= 90 ? 18 : t.maxSpeed <= 110 ? 8 : 0; factors++
    }
    return factors >= 2 ? Math.round(score) : null
  }
  const tripScore = calcTripScore()

  // ─── CO2 emissions estimate ───
  // ~2.68 kg CO2 per liter of diesel, ~2.31 for petrol
  const co2Estimate = t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000
    ? Math.round(t.fuelConsumed * 2.68 * 100) / 100
    : null

  // ─── Equipment type info ───
  const eqTypeInfo = t.equipment ? getTypeInfo(t.equipment.type) : null

  // ─── Auto-generated recommendations ───
  const recommendations: string[] = []
  if (t.fuelConsumed != null && t.distance != null && t.distance > 0) {
    const rate = (t.fuelConsumed / t.distance) * 100
    if (rate > 30) recommendations.push('Высокий расход топлива — проверить давление в шинах и фильтры')
    if (rate > 40) recommendations.push('Аномальный расход — возможна утечка или неисправность двигателя')
  }
  if (t.idleTime != null && t.tripDuration != null && t.tripDuration > 0) {
    const idlePct = (t.idleTime / t.tripDuration) * 100
    if (idlePct > 20) recommendations.push('Высокий процент холостого хода — оптимизировать стоянки')
  }
  if (t.maxSpeed != null && t.maxSpeed > 90) {
    recommendations.push('Превышение скорости — снизить макс. скорость для экономии топлива')
  }
  if (t.plumVolume != null && t.plumVolume > 0) {
    recommendations.push('Обнаружены сливы топлива — провести проверку')
  }

  // ─── Send report to clipboard ───
  const sendReport = () => {
    const lines: string[] = []
    lines.push(`📋 ОТЧЁТ ПО РЕЙСУ`)
    lines.push(`Маршрут: ${t.route}`)
    lines.push(`Статус: ${TRIP_STATUS_MAP[t.status]?.label || t.status}`)
    if (t.equipment) lines.push(`Техника: ${t.equipment.name} ${t.equipment.registrationNum || ''}`)
    if (crew) lines.push(`Экипаж: ${crew.name}`)
    if (t.startPoint) lines.push(`От: ${t.startPoint}`)
    if (t.endPoint) lines.push(`До: ${t.endPoint}`)
    if (displayDist != null) lines.push(`Расстояние: ${displayDist.toFixed(1)} км`)
    if (t.fuelConsumed != null) lines.push(`Расход: ${t.fuelConsumed.toFixed(1)} л`)
    if (t.avgFuelRate != null) lines.push(`Ср. расход: ${t.avgFuelRate.toFixed(1)} л/100км`)
    if (t.tripDuration != null) lines.push(`Длительность: ${fmtDur(t.tripDuration)}`)
    if (t.startDate) lines.push(`Начало: ${formatDateTime(t.startDate)}`)
    if (t.endDate) lines.push(`Окончание: ${formatDateTime(t.endDate)}`)
    if (t.cost != null) lines.push(`Расходы: ${formatPrice(t.cost)}`)
    if (t.revenue != null) lines.push(`Доход: ${formatPrice(t.revenue)}`)
    if (tripScore != null) lines.push(`Оценка рейса: ${tripScore}/100`)
    copyToClipboard(lines.join('\n'))
  }

  // ─── Duplicate trip handler ───
  const handleDuplicate = () => {
    if (!trip) return
    // Create a new trip with same data
    fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentId: trip.equipmentId,
        route: trip.route + ' (копия)',
        startPoint: trip.startPoint,
        endPoint: trip.endPoint,
        cargo: trip.cargo,
        cargoWeight: trip.cargoWeight,
        distance: trip.distance,
        crewId: trip.crewId,
        routeTemplateId: trip.routeTemplateId,
        status: 'planned',
        notes: trip.notes,
      }),
    }).then(res => {
      if (res.ok) {
        toast.success('Рейс скопирован')
        onRefresh()
      } else {
        toast.error('Ошибка копирования рейса')
      }
    }).catch(() => toast.error('Ошибка копирования рейса'))
  }

  // Apply sensor data to trip fields
  const applySensorFields = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/trips/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
      toast.success('Данные датчиков применены')
      setApplySuccess('Данные успешно заполнены из трекера')
      onRefresh()
    } catch {
      toast.error('Ошибка применения данных')
    }
  }

  // Apply start values — if fields already filled with different values, ask user
  const applyStartValues = () => {
    if (!compareData) return
    const startSnap = compareData.startSnapshot as Record<string, unknown> | null
    if (!startSnap) return
    const fields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Fuel start
    if (startSnap.fuelLevel != null) {
      const trackerVal = Number(startSnap.fuelLevel)
      if (t.fuelStart == null) {
        fields.fuelStart = trackerVal
      } else if (Math.abs(t.fuelStart - trackerVal) > 0.01) {
        diffs.push({ field: 'Топливо на старте', fieldKey: 'fuelStart', current: `${t.fuelStart} л`, tracker: `${trackerVal.toFixed(1)} л`, selected: true })
      }
    }
    // Mileage start
    if (startSnap.mileage != null) {
      const trackerVal = Math.round(Number(startSnap.mileage))
      if (t.mileageStart == null) {
        fields.mileageStart = trackerVal
      } else if (t.mileageStart !== trackerVal) {
        diffs.push({ field: 'Пробег на старте', fieldKey: 'mileageStart', current: `${t.mileageStart} км`, tracker: `${trackerVal} км`, selected: true })
      }
    }

    if (Object.keys(fields).length === 0 && diffs.length === 0) {
      toast.info('Данные совпадают или нет данных для заполнения')
      return
    }

    // If no conflicts, apply directly
    if (diffs.length === 0) {
      applySensorFields(fields)
      return
    }

    // Show conflict resolution
    setDiscrepancyDialog({
      open: true,
      diffs,
      autoFields: fields,
    })
  }

  // Apply end values — if fields already filled with different values, ask user
  const applyEndValues = () => {
    if (!compareData) return
    const endSnap = compareData.endSnapshot as Record<string, unknown> | null
    const stats = compareData.tripStats as Record<string, unknown> | null
    const fields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Fuel end
    if (endSnap?.fuelLevel != null) {
      const trackerVal = Number(endSnap.fuelLevel)
      if (t.fuelEnd == null) {
        fields.fuelEnd = trackerVal
      } else if (Math.abs(t.fuelEnd - trackerVal) > 0.01) {
        diffs.push({ field: 'Топливо на финише', fieldKey: 'fuelEnd', current: `${t.fuelEnd} л`, tracker: `${trackerVal.toFixed(1)} л`, selected: true })
      }
    }
    // Mileage end
    if (endSnap?.mileage != null) {
      const trackerVal = Math.round(Number(endSnap.mileage))
      if (t.mileageEnd == null) {
        fields.mileageEnd = trackerVal
      } else if (t.mileageEnd !== trackerVal) {
        diffs.push({ field: 'Пробег на финише', fieldKey: 'mileageEnd', current: `${t.mileageEnd} км`, tracker: `${trackerVal} км`, selected: true })
      }
    }

    // Stats (only fill if empty)
    if (stats) {
      if (stats.mileage != null && t.distance == null) fields.distance = Number(stats.mileage)
      if (stats.avgSpeed != null && t.avgSpeed == null) fields.avgSpeed = Number(stats.avgSpeed)
      if (stats.maxSpeed != null && t.maxSpeed == null) fields.maxSpeed = Number(stats.maxSpeed)
      if (stats.fuelConsumption != null && t.fuelConsumed == null) fields.fuelConsumed = Number(stats.fuelConsumption)
      if (stats.avgFuelConsumption != null && t.avgFuelRate == null) fields.avgFuelRate = Number(stats.avgFuelConsumption)
      if (stats.refuelVolume != null && t.refuelVolume == null) fields.refuelVolume = Number(stats.refuelVolume)
      if (stats.plumVolume != null && t.plumVolume == null) fields.plumVolume = Number(stats.plumVolume)
      if (stats.tripsDuration != null && t.tripDuration == null) fields.tripDuration = Number(stats.tripsDuration)
      if (stats.parkingsDuration != null && t.parkingsDuration == null) fields.parkingsDuration = Number(stats.parkingsDuration)
      if (stats.engineHours != null && t.engineHours == null) fields.engineHours = Number(stats.engineHours)
      if (stats.idleTime != null && t.idleTime == null) fields.idleTime = Number(stats.idleTime)
    }

    if (fields.fuelEnd != null && t.fuelStart != null && !fields.fuelConsumed) {
      fields.fuelConsumed = Math.round((t.fuelStart! - (fields.fuelEnd as number)) * 100) / 100
      if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
    }
    if (fields.mileageEnd != null && t.mileageStart != null && !fields.distance) {
      fields.distance = (fields.mileageEnd as number) - t.mileageStart!
    }

    if (Object.keys(fields).length === 0 && diffs.length === 0) {
      toast.info('Данные совпадают или нет данных для заполнения')
      return
    }

    // If no conflicts, apply directly
    if (diffs.length === 0) {
      applySensorFields(fields)
      return
    }

    // Show conflict resolution
    setDiscrepancyDialog({
      open: true,
      diffs,
      autoFields: fields,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[98dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Route className="size-4 shrink-0" />
            <span className="flex-1 min-w-0 truncate">{t.route}</span>
          </DialogTitle>
          <DialogDescription className="space-y-1.5">
            {/* First row: equipment, status, duration, crew */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy route name button */}
              <Button variant="ghost" size="sm" className="size-6 p-0 shrink-0" onClick={() => copyToClipboard(t.route)} title="Копировать маршрут">
                <Copy className="size-3" />
              </Button>
              {/* Share trip link button */}
              <Button variant="ghost" size="sm" className="size-6 p-0 shrink-0" onClick={() => copyToClipboard(`${window.location.origin}/?trip=${t.id}`)} title="Скопировать ссылку">
                <Share2 className="size-3" />
              </Button>
              {t.equipment && onOpenEquipment ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                  onClick={() => onOpenEquipment(t.equipment.id)}
                >
                  {eqTypeInfo ? React.cloneElement(eqTypeInfo.icon as React.ReactElement, { className: 'size-3.5 shrink-0' }) : <Truck className="size-3.5 shrink-0" />}
                  <span>{t.equipment.name}</span>
                  {t.equipment.registrationNum && <span>• {t.equipment.registrationNum}</span>}
                </button>
              ) : (
                <>{t.equipment?.name} {t.equipment?.registrationNum ? `• ${t.equipment.registrationNum}` : ''}</>
              )}
              <span className="ml-1">{statusBadge(t.status, TRIP_STATUS_MAP)}</span>
              {/* Duration in header */}
              {t.tripDuration != null && t.tripDuration > 0 && t.tripDuration < 8640000 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground ml-1"><Timer className="size-3" />{fmtDur(t.tripDuration)}</span>
              )}
              {/* Elapsed time for in-progress */}
              {elapsedTime && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 animate-pulse"><Clock className="size-3" />{elapsedTime}</span>
              )}
              {/* Crew name */}
              {crew && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Users className="size-3" />{crew.name}</span>}
              {/* Route template badge */}
              {t.routeTemplate && <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 px-1.5 py-0.5 rounded"><Route className="size-2.5" />{t.routeTemplate.name}</span>}
              {/* Trip ID short */}
              <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground/60 font-mono ml-auto"><Hash className="size-2.5" />{t.id.slice(0, 8)}</span>
            </div>
            {/* Route addresses — click to expand full address */}
            {(t.startPoint || t.endPoint) && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {t.startPoint && (
                  <button
                    className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    onClick={() => setRouteAddressesOpen(routeAddressesOpen === 'start' ? false : 'start')}
                    title={t.startPoint}
                  >
                    <MapPin className="size-2.5 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{t.startPoint}</span>
                  </button>
                )}
                {t.startPoint && t.endPoint && <ArrowRight className="size-2.5 text-muted-foreground/50 shrink-0" />}
                {t.endPoint && (
                  <button
                    className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    onClick={() => setRouteAddressesOpen(routeAddressesOpen === 'end' ? false : 'end')}
                    title={t.endPoint}
                  >
                    <MapPin className="size-2.5 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{t.endPoint}</span>
                  </button>
                )}
              </div>
            )}
            {/* Expanded full address */}
            {routeAddressesOpen && (
              <div className="ml-0.5 mt-0.5 p-2 rounded-md bg-muted/40 text-[11px]">
                {routeAddressesOpen === 'start' && t.startPoint && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-foreground">{t.startPoint}</span>
                  </div>
                )}
                {routeAddressesOpen === 'end' && t.endPoint && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="size-3 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-foreground">{t.endPoint}</span>
                  </div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Trip summary dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {t.tripDuration != null && t.tripDuration > 0 && t.tripDuration < 8640000 && <Card className="border-0 shadow-none bg-violet-50 dark:bg-violet-950/20 py-2"><CardContent className="p-2 text-center"><Timer className="size-4 text-violet-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-violet-700 dark:text-violet-400">{fmtDur(t.tripDuration)}</p><p className="text-[9px] text-muted-foreground">Длительность</p></CardContent></Card>}
                {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 && <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20 py-2"><CardContent className="p-2 text-center"><Fuel className="size-4 text-amber-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-amber-700 dark:text-amber-400">{t.fuelConsumed.toFixed(1)} л</p><p className="text-[9px] text-muted-foreground">Расход топлива</p></CardContent></Card>}
                {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && <Card className="border-0 shadow-none bg-orange-50 dark:bg-orange-950/20 py-2"><CardContent className="p-2 text-center"><Droplets className="size-4 text-orange-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-orange-700 dark:text-orange-400">{t.avgFuelRate.toFixed(1)} л/100км</p><p className="text-[9px] text-muted-foreground">Ср. расход</p></CardContent></Card>}
                {t.refuelVolume != null && t.refuelVolume > 0 && <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20 py-2"><CardContent className="p-2 text-center"><ArrowUpFromLine className="size-4 text-emerald-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+{t.refuelVolume.toFixed(1)} л</p><p className="text-[9px] text-muted-foreground">Заправки</p></CardContent></Card>}
                {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && <Card className="border-0 shadow-none bg-sky-50 dark:bg-sky-950/20 py-2"><CardContent className="p-2 text-center"><Cog className="size-4 text-sky-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-sky-700 dark:text-sky-400">{fmtDur(t.engineHours)}</p><p className="text-[9px] text-muted-foreground">Моточасы</p></CardContent></Card>}
                {t.parkingsDuration != null && t.parkingsDuration > 0 && t.parkingsDuration < 8640000 && <Card className="border-0 shadow-none bg-rose-50 dark:bg-rose-950/20 py-2"><CardContent className="p-2 text-center"><Sofa className="size-4 text-rose-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-rose-700 dark:text-rose-400">{fmtDur(t.parkingsDuration)}</p><p className="text-[9px] text-muted-foreground">Время стоянок</p></CardContent></Card>}
              </div>
              {/* Speed profile bar */}
              {t.avgSpeed != null && t.maxSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && t.maxSpeed > 0 && t.maxSpeed < 300 && (
                <div className="rounded-lg border p-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Профиль скорости</span>
                    <span>мин: {0} • ср: {t.avgSpeed.toFixed(1)} • макс: <span className={t.maxSpeed > 90 ? 'text-red-500 font-medium' : ''}>{t.maxSpeed}</span> км/ч</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${Math.min((t.avgSpeed / t.maxSpeed) * 100, 100)}%` }} />
                    <div className="h-full bg-amber-400 flex-1" />
                    <div className={`h-full w-1 rounded-r-full ${t.maxSpeed > 90 ? 'bg-red-500' : 'bg-sky-400'}`} />
                  </div>
                </div>
              )}
              {/* Fuel economy rating */}
              {t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000 && (
                <div className="rounded-lg border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Fuel className="size-3" />Экономичность</span>
                    <span className={`text-[10px] font-medium ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'text-emerald-600 dark:text-emerald-400' : rate < 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' })()}`}>
                      {((t.fuelConsumed! / t.distance!) * 100).toFixed(1)} л/100км — {(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? '✓ Отлично' : rate < 25 ? '• Норма' : '⚠ Высокий' })()}
                    </span>
                  </div>
                </div>
              )}
              <DetailSection title="Маршрут" icon={<Route className="size-3.5" />}>
                <DetailRow label="Маршрут" value={t.route} />
                {t.routeTemplate && (
                  <DetailRow label="Шаблон маршрута" value={t.routeTemplate.name} />
                )}
                <DetailRow label="Пункт отправления" value={t.startPoint} />
                <DetailRow label="Пункт назначения" value={t.endPoint} />
                <DetailRow label="Расстояние" value={displayDist != null ? `${displayDist.toFixed(1)} км` : undefined} />
                {trackData && (trackData as any).trips && (
                  <DetailRow label="По трекеру" value={
                    <span className="font-medium text-sky-600 dark:text-sky-400">
                      {(trackData as any).trips.reduce((s: number, trip: any) => s + (Number(trip.distance) || 0), 0).toFixed(1)} км
                      <span className="text-muted-foreground font-normal ml-1">({(trackData as any).trips.length} сегм.)</span>
                    </span> as any
                  } />
                )}
              </DetailSection>

              <DetailSection title="Груз" icon={<Package className="size-3.5" />}>
                <DetailRow label="Груз" value={t.cargo ? <span className="flex items-center gap-1"><Package className="size-3 text-muted-foreground" />{t.cargo}</span> as any : undefined} />
                <DetailRow label="Вес" value={t.cargoWeight != null ? <span className="flex items-center gap-1"><Weight className="size-3 text-muted-foreground" />{t.cargoWeight} т</span> as any : undefined} />
                {/* Cargo weight vs max capacity */}
                {t.cargoWeight != null && t.equipment?.loadCapacity && (
                  <div className="mt-1.5 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка</span>
                      <span className="font-medium">{t.cargoWeight} / {t.equipment.loadCapacity} т ({Math.round((t.cargoWeight / parseFloat(t.equipment.loadCapacity)) * 100)}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(() => { const pct = (t.cargoWeight! / parseFloat(t.equipment.loadCapacity)) * 100; return pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500' })()}`} style={{ width: `${Math.min((t.cargoWeight / parseFloat(t.equipment.loadCapacity)) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </DetailSection>
              <DetailSection title="Время" icon={<Calendar className="size-3.5" />}>
                <DetailRow label="Начало рейса" value={formatDateTime(t.startDate)} />
                <DetailRow label="Планируемое окончание" value={formatDateTime(t.plannedEndDate)} />
                <DetailRow label="Окончание рейса" value={formatDateTime(t.endDate)} />
                {isCompleted && t.tripDuration != null && (
                  <DetailRow label="Длительность" value={fmtDur(t.tripDuration)} />
                )}
                {isCompleted && t.parkingsDuration != null && (
                  <DetailRow label="Время стоянок" value={fmtDur(t.parkingsDuration)} />
                )}
              </DetailSection>
              <DetailSection title="Экипаж" icon={<Users className="size-3.5" />}>
                <DetailRow label="Экипаж" value={crew?.name || t.crew?.name} />
                {crew?.members && crew.members.length > 0 && (
                  <div className="col-span-2 space-y-0.5 pl-2">
                    {crew.members.map(m => (
                      <div key={m.id} className="flex items-center gap-1 text-[10px]">
                        {m.employeeId ? <UserCheck className="size-3 text-primary" /> : <UserCircle className="size-3 text-muted-foreground" />}
                        <span className={m.employeeId ? 'font-medium' : ''}>{m.fullName}</span>
                        <span className="text-muted-foreground">({MEMBER_ROLE_MAP[m.role] || m.role})</span>
                        {m.phone && <span className="text-muted-foreground">• {m.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
              {/* ── ПОДРОБНЫЕ ПОКАЗАНИЯ (collapsible) ── */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-xs font-semibold hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-muted/50">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <span>Подробные показания</span>
                  <ChevronRight className="size-3 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {/* ── ТОПЛИВО И ПРОБЕГ ── */}
                    <DetailSection title="Топливо и пробег" icon={<Fuel className="size-3.5" />}>
                      <DetailRow label="Топливо на старте (л)" value={t.fuelStart?.toString()} />
                      <DetailRow label="Топливо на финише (л)" value={t.fuelEnd?.toString()} />
                      <DetailRow label="Пробег на старте (км)" value={t.mileageStart?.toLocaleString('ru-RU')} />
                      <DetailRow label="Пробег на финише (км)" value={t.mileageEnd?.toLocaleString('ru-RU')} />
                      {(t.mileageStart != null && t.mileageEnd != null) && (
                        <DetailRow label="Пройдено (км)" value={
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{(t.mileageEnd! - t.mileageStart!).toLocaleString('ru-RU')} км</span> as any
                        } />
                      )}
                    </DetailSection>

                    {/* ── АНАЛИТИКА ТРЕКЕРА ── */}
                    <DetailSection title="Статистика рейса" icon={<Gauge className="size-3.5" />} extra={
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 px-1.5" onClick={async () => {
                        try {
                          const res = await fetch(`/api/trips/${t.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'recalculate' }) })
                          if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Ошибка') }
                          const data = await res.json()
                          toast.success(data.message || 'Аналитика пересчитана')
                          onRefresh()
                        } catch (e: any) { toast.error(e.message || 'Ошибка пересчёта') }
                      }} title="Пересчитать аналитику из Axenta">
                        <RefreshCw className="size-3" />Пересчитать
                      </Button>
                    }>
                      {/* Quick stats cards */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {t.distance != null && (
                          <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Route className="size-4 text-emerald-500 mx-auto mb-0.5" />
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{t.distance.toFixed(1)} км</p>
                              <p className="text-[9px] text-muted-foreground">Расстояние</p>
                            </CardContent>
                          </Card>
                        )}
                        {t.fuelConsumed != null && (
                          <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Fuel className="size-4 text-amber-500 mx-auto mb-0.5" />
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{Math.abs(t.fuelConsumed) < 10000 ? t.fuelConsumed.toFixed(1) : '—'} л</p>
                              <p className="text-[9px] text-muted-foreground">Расход</p>
                            </CardContent>
                          </Card>
                        )}
                        {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && (
                          <Card className="border-0 shadow-none bg-blue-50 dark:bg-blue-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Gauge className="size-4 text-blue-500 mx-auto mb-0.5" />
                              <p className={`text-xs font-bold ${t.avgFuelRate < 15 ? 'text-emerald-700 dark:text-emerald-400' : t.avgFuelRate < 30 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>{t.avgFuelRate.toFixed(1)}</p>
                              <p className="text-[9px] text-muted-foreground">л/100км</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      {/* Detail rows */}
                      {t.distance != null && <DetailRow label="Расстояние" value={<span className="font-semibold text-emerald-600 dark:text-emerald-400">{t.distance.toFixed(1)} км</span> as any} />}
                      {t.tripDuration != null && t.tripDuration > 0 && t.tripDuration < 8640000 && <DetailRow label="Время в пути" value={fmtDur(t.tripDuration)} />}
                      {t.parkingsDuration != null && t.parkingsDuration > 0 && t.parkingsDuration < 8640000 && <DetailRow label="Время стоянок" value={fmtDur(t.parkingsDuration)} />}
                      {t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && <DetailRow label="Средняя скорость" value={`${t.avgSpeed.toFixed(1)} км/ч`} />}
                      {t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300 && <DetailRow label="Макс. скорость" value={<span className={t.maxSpeed > 90 ? 'text-red-500 font-medium' : ''}>{t.maxSpeed} км/ч</span> as any} />}
                      {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && <DetailRow label="Моточасы" value={fmtDur(t.engineHours)} />}
                      {t.idleTime != null && t.idleTime > 0 && t.idleTime < 8640000 && <DetailRow label="Холостой ход" value={fmtDur(t.idleTime)} />}
                      {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 && <DetailRow label="Расход топлива" value={<span className="font-semibold text-amber-600 dark:text-amber-400">{t.fuelConsumed.toFixed(1)} л</span> as any} />}
                      {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && <DetailRow label="Средний расход" value={<span className={t.avgFuelRate < 15 ? 'text-emerald-600 dark:text-emerald-400' : t.avgFuelRate < 30 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>{t.avgFuelRate.toFixed(1)} л/100км</span> as any} />}
                      {t.refuelVolume != null && t.refuelVolume > 0 && <DetailRow label="Заправки" value={<span className="text-emerald-600 dark:text-emerald-400">+{t.refuelVolume.toFixed(1)} л</span> as any} />}
                      {t.plumVolume != null && t.plumVolume > 0 && <DetailRow label="Сливы" value={<span className="font-semibold text-red-600 dark:text-red-400">-{t.plumVolume.toFixed(1)} л</span> as any} />}
                      {/* Fuel efficiency indicator */}
                      {t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000 && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Эффективность расхода</span>
                            <span className={`font-medium ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'text-emerald-600 dark:text-emerald-400' : rate < 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' })()}`}>
                              {(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? '✓ Отлично' : rate < 25 ? '• Норма' : '⚠ Высокий' })()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'bg-emerald-500' : rate < 25 ? 'bg-amber-500' : 'bg-red-500' })()}`} style={{ width: `${Math.min((t.fuelConsumed! / t.distance!) * 100 / 40 * 100, 100)}%` }} />
                          </div>
                        </div>
                      )}
                      {/* Warning for invalid data */}
                      {(t.engineHours != null && (t.engineHours < 0 || t.engineHours > 50000)) && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-[10px] text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3 shrink-0" />Моточасы содержат некорректные данные ({t.engineHours.toFixed(1)} ч). Нажмите «Пересчитать».
                        </div>
                      )}
                      {(t.fuelConsumed != null && Math.abs(t.fuelConsumed) >= 10000) && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-[10px] text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3 shrink-0" />Расход топлива содержит некорректные данные ({t.fuelConsumed.toFixed(0)} л). Нажмите «Пересчитать».
                        </div>
                      )}
                    </DetailSection>

                    {/* ── ФИНАНСЫ ── */}
                    {(t.cost != null || t.revenue != null) && (
                      <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                        {t.cost != null && <DetailRow label="Расходы" value={<span className="text-red-600 dark:text-red-400">{formatPrice(t.cost)}</span> as any} />}
                        {t.revenue != null && <DetailRow label="Доходы" value={<span className="text-emerald-600 dark:text-emerald-400">{formatPrice(t.revenue)}</span> as any} />}
                        {t.cost != null && t.revenue != null && <DetailRow label="Прибыль" value={<span className={`font-bold ${t.revenue - t.cost >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatPrice(t.revenue - t.cost)}</span> as any} />}
                        {t.fuelConsumed != null && t.distance != null && t.distance > 0 && t.cost != null && <DetailRow label="Стоимость за км" value={`${(t.cost / t.distance).toFixed(2)} ₽/км`} />}
                      </DetailSection>
                    )}

                    {/* ── СРАВНЕНИЕ ДАТЧИКОВ СТАРТ/ФИНИШ ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Cpu className="size-3.5" />Датчики (старт / финиш)</h4>
                      </div>

                      {compareError && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3.5 shrink-0" />{compareError}
                        </div>
                      )}

                      {applySuccess && (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5 shrink-0" />{applySuccess}
                        </div>
                      )}

                      {compareData && !compareLoading && (
                        <div className="space-y-2">
                          {/* Apply buttons */}
                          <div className="flex flex-wrap gap-1.5">
                            {(t.status === 'planned' || t.status === 'in_progress') && compareData?.startSnapshot && (
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyStartValues}>
                                <ArrowDownToLine className="size-3" />Заполнить начало
                              </Button>
                            )}
                            {(t.status === 'in_progress' || t.status === 'completed') && compareData?.endSnapshot && (
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyEndValues}>
                                <ArrowUpFromLine className="size-3" />Заполнить финиш
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── ROUTE POINTS TIMELINE ── */}
              {t.routePoints && t.routePoints.length > 0 && (
                <div>
                  <div
                    className="flex items-center gap-1.5 mb-1.5 cursor-pointer select-none hover:bg-muted/40 -mx-1 px-1 py-0.5 rounded transition-colors"
                    onClick={() => setRoutePointsCollapsed(!routePointsCollapsed)}
                  >
                    <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${routePointsCollapsed ? '-rotate-90' : ''}`} />
                    <span className="text-muted-foreground"><MapPinned className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Точки маршрута</h3>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{t.routePoints.length}</Badge>
                    {(() => {
                      const totalDist = t.routePoints.reduce((s, p) => s + (p.distanceFromPrev || 0), 0)
                      return totalDist > 0 ? (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 ml-auto font-medium">
                          Итого: {totalDist.toFixed(1)} км
                        </span>
                      ) : null
                    })()}
                  </div>
                  <div className={`overflow-hidden transition-all duration-200 ${routePointsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                    <div className="pl-2 space-y-0">
                      {t.routePoints.map((rp, idx) => (
                        <div key={rp.id} className="flex gap-2">
                          {/* Timeline circle + line */}
                          <div className="flex flex-col items-center w-6 shrink-0 pt-1">
                            <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              idx === t.routePoints!.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {idx + 1}
                            </div>
                            {idx < t.routePoints!.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border/60 min-h-[16px]" />
                            )}
                          </div>
                          {/* Point content */}
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium">{rp.name}</span>
                              {rp.distanceFromPrev != null && rp.distanceFromPrev > 0 && (
                                <span className="text-[9px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 px-1 py-0 rounded">
                                  +{rp.distanceFromPrev.toFixed(1)} км
                                </span>
                              )}
                            </div>
                            {rp.address && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="size-2.5 shrink-0" />{rp.address}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0 text-[9px] text-muted-foreground">
                              {rp.plannedArrival && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="size-2.5" />Прибытие: {formatDateTime(rp.plannedArrival)}
                                </span>
                              )}
                              {rp.plannedDeparture && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="size-2.5" />Отправление: {formatDateTime(rp.plannedDeparture)}
                                </span>
                              )}
                              {rp.actualArrival && (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="size-2.5" />Факт: {formatDateTime(rp.actualArrival)}
                                </span>
                              )}
                            </div>
                            {rp.notes && (
                              <div className="text-[9px] text-muted-foreground italic mt-0.5">{rp.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                // Collect all points with coordinates from routePoints or routeTemplate
                const allPoints = [
                  ...(t.routePoints || []).filter(p => p.latitude && p.longitude),
                  ...(!t.routePoints?.length && t.routeTemplate?.points ? t.routeTemplate.points.filter(p => p.latitude && p.longitude) : [])
                ]
                return allPoints.length >= 2 ? (
                <div className="mt-1 space-y-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 w-full" onClick={async () => {
                    if (showRouteMap) { setShowRouteMap(false); setRouteMapTrackData(null); return }
                    const pts = allPoints
                    if (pts.length < 2) return
                    setShowRouteMap(true)
                    setRouteMapLoading(true)
                    try {
                      const coords = pts.map(p => `${p.longitude},${p.latitude}`).join(';')
                      // Use backend proxy to avoid CORS issues
                      const res = await fetch(`/api/osrm-route?coords=${encodeURIComponent(coords)}`)
                      const data = await res.json()
                      if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0]
                        const routeCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
                        const fakeTrip = {
                          distance: route.distance / 1000,
                          startDate: t.startDate || new Date().toISOString(),
                          endDate: t.endDate || new Date().toISOString(),
                          points: routeCoords.map((c: any, i: number) => ({
                            ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString()
                          }))
                        }
                        setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                      } else {
                        const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
                        const fakeTrip = {
                          distance: 0, startDate: t.startDate || new Date().toISOString(), endDate: t.endDate || new Date().toISOString(),
                          points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() }))
                        }
                        setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                      }
                    } catch (err) {
                      console.error('[Route Map] OSRM fetch failed:', err)
                      const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
                      const fakeTrip = {
                        distance: 0, startDate: t.startDate || new Date().toISOString(), endDate: t.endDate || new Date().toISOString(),
                        points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() }))
                      }
                      setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                    }
                    setRouteMapLoading(false)
                  }}>
                    <Map className="size-3" />{showRouteMap ? 'Скрыть карту маршрута' : 'Показать маршрут на карте'}
                  </Button>
                  {showRouteMap && (
                    <div className="h-64 rounded-lg overflow-hidden border isolate">
                      {routeMapLoading ? (
                        <div className="h-full flex items-center justify-center bg-muted/30">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-xs text-muted-foreground">Расчёт маршрута...</span>
                        </div>
                      ) : routeMapTrackData ? (
                        <TrackerMap trackers={[]} trackData={routeMapTrackData} />
                      ) : null}
                    </div>
                  )}
                </div>
                ) : null
              })()}

              {/* ── СТАТИСТИКА ЗА ПЕРИОД РЕЙСА (always visible) ── */}
              {compareData?.tripStats ? (
                <div className="rounded-lg border p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="size-3" />Статистика за период рейса
                    </h5>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading}>
                      <RefreshCw className={`size-3 ${compareLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(() => {
                      const st = compareData.tripStats as Record<string, unknown>
                      const items: { label: string; value: string | null }[] = [
                        { label: 'Пробег', value: st.mileage != null ? `${Number(st.mileage).toFixed(1)} км` : null },
                        { label: 'Ср. скорость', value: st.avgSpeed != null ? `${Number(st.avgSpeed).toFixed(1)} км/ч` : null },
                        { label: 'Макс. скорость', value: st.maxSpeed != null ? `${Number(st.maxSpeed).toFixed(0)} км/ч` : null },
                        { label: 'Расход топлива', value: st.fuelConsumption != null ? `${Number(st.fuelConsumption).toFixed(1)} л` : null },
                        { label: 'Ср. расход', value: st.avgFuelConsumption != null ? `${Number(st.avgFuelConsumption).toFixed(1)} л/100км` : null },
                        { label: 'Заправки', value: st.refuelVolume != null ? `${Number(st.refuelVolume).toFixed(1)} л` : null },
                        { label: 'Сливы', value: st.plumVolume != null ? `${Number(st.plumVolume).toFixed(1)} л` : null },
                        { label: 'Длительность поездок', value: st.tripsDuration != null ? fmtDur(Number(st.tripsDuration)) : null },
                        { label: 'Время стоянок', value: st.parkingsDuration != null ? fmtDur(Number(st.parkingsDuration)) : null },
                        { label: 'Моточасы', value: st.engineHours != null ? `${Number(st.engineHours).toFixed(1)}` : null },
                        { label: 'Холостой ход', value: st.idleTime != null ? fmtDur(Number(st.idleTime)) : null },
                      ]
                      return items.filter(it => it.value != null).map((it, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5 px-1.5 rounded bg-muted/50">
                          <span className="text-muted-foreground">{it.label}</span>
                          <span className="font-medium ml-auto">{it.value}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-3 bg-muted/30 rounded-lg">
                  {compareLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Загрузка статистики...</span>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading}>
                      <BarChart3 className="size-3" />Загрузить статистику за период
                    </Button>
                  )}
                </div>
              )}

              {/* ── ТРЕК НА КАРТЕ ── */}
              <div ref={trackSectionRef} />
              {t.startDate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><Map className="size-3.5" />Трек на карте</h4>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadTrack} disabled={trackLoading} title="Обновить трек из API">
                        <RefreshCw className={`size-3 ${trackLoading ? 'animate-spin' : ''}`} />
                        {trackData ? (trackLoading ? 'Обновление...' : 'Обновить') : 'Загрузить'}
                      </Button>
                      {trackData && !trackLoading && (
                        <span className="text-[9px] text-muted-foreground">
                          {(trackData as any)?._cached ? `Кэш ${(() => { try { return (trackData as any)._cachedAt ? new Date((trackData as any)._cachedAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : '' } catch { return '' } })()}` : 'Загружено'}
                        </span>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading} title="Загрузить показания датчиков">
                        <Cpu className="size-3" />
                        {compareLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                        Датчики
                      </Button>
                    </div>
                  </div>
                  {/* Date range for track */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">От</Label>
                      <Input
                        type="datetime-local"
                        className="h-7 text-[11px]"
                        value={trackDateFrom || (t.startDate ? toLocalDatetime(t.startDate) : '')}
                        onChange={e => setTrackDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">До {!t.endDate && <span className="text-amber-500">(сейчас)</span>}</Label>
                      <Input
                        type="datetime-local"
                        className="h-7 text-[11px]"
                        value={trackDateTo || (t.endDate ? toLocalDatetime(t.endDate) : toLocalDatetime(new Date()))}
                        onChange={e => setTrackDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  {trackLoading && (
                    <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Загрузка трека...</span>
                    </div>
                  )}
                  {trackError && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="size-3.5 shrink-0" />{trackError}
                    </div>
                  )}
                  {trackData && !trackLoading && (
                    <>
                      <div className="h-64 rounded-lg overflow-hidden border isolate">
                        <TrackerMap trackers={[]} trackData={mapTrackData as any} focusPoint={focusedPoint} />
                      </div>
                      {/* Track summary badges */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        {(trackData as any).trips && <span className="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">🚗 {(trackData as any).trips.length} поездок</span>}
                        {(trackData as any).parkings && <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">🅿️ {(trackData as any).parkings.length} стоянок</span>}
                        {(trackData as any).stops && <span className="inline-flex items-center gap-0.5 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">⏸ {(trackData as any).stops.length} остановок</span>}
                        {(trackData as any).refuels && (trackData as any).refuels.length > 0 && <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">⛽ {(trackData as any).refuels.length} заправок</span>}
                        {(trackData as any).plums && (trackData as any).plums.length > 0 && <span className="inline-flex items-center gap-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">🔻 {(trackData as any).plums.length} сливов</span>}
                        <span className="inline-flex items-center gap-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">
                          📏 {((trackData as any).trips?.reduce((s: number, trip: any) => s + (Number(trip.distance) || 0), 0) ?? 0).toFixed(1)} км
                        </span>
                      </div>
                      {/* Speed legend */}
                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="text-muted-foreground font-medium">Скорость:</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#9ca3af'}} />0</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#22c55e'}} />≤20</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#84cc16'}} />≤40</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#eab308'}} />≤60</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#f97316'}} />≤80</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#ef4444'}} />&gt;80</span>
                        <span className="text-muted-foreground">км/ч</span>
                      </div>
                      {/* Collapsible trip segments */}
                      {(trackData as any).trips && (trackData as any).trips.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Сегменты поездок ({(trackData as any).trips.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).trips.map((trip: any, i: number) => (
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
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible parkings */}
                      {(trackData as any).parkings && (trackData as any).parkings.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Стоянки ({(trackData as any).parkings.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).parkings.map((p: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${focusedPoint?.type === 'parking' && focusedPoint?.lat === p.lat && focusedPoint?.lng === p.lng ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-400' : 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20'}`} onClick={() => { if (p.lat != null && p.lng != null) setFocusedPoint(focusedPoint?.type === 'parking' && focusedPoint?.lat === p.lat && focusedPoint?.lng === p.lng ? null : { lat: p.lat, lng: p.lng, type: 'parking', label: `Стоянка ${formatTime(p.startDate)}` }) }}>
                                  <span>🅿️</span>
                                  <span>{formatTime(p.startDate)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span>{formatTime(p.endDate)}</span>
                                  <span className="text-muted-foreground ml-auto">{p.duration ? `${Math.floor(p.duration / 60)} мин` : '—'}</span>
                                  {p.lat != null && p.lng != null && <MapPin className="size-3 text-blue-400 shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible stops */}
                      {(trackData as any).stops && (trackData as any).stops.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Остановки ({(trackData as any).stops.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).stops.map((s: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${focusedPoint?.type === 'stop' && focusedPoint?.lat === s.lat && focusedPoint?.lng === s.lng ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-400' : 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20'}`} onClick={() => { if (s.lat != null && s.lng != null) setFocusedPoint(focusedPoint?.type === 'stop' && focusedPoint?.lat === s.lat && focusedPoint?.lng === s.lng ? null : { lat: s.lat, lng: s.lng, type: 'stop', label: `Остановка ${formatTime(s.startDate)}` }) }}>
                                  <span>⏸</span>
                                  <span>{formatTime(s.startDate)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span>{formatTime(s.endDate)}</span>
                                  <span className="text-muted-foreground ml-auto">{s.duration ? `${Math.floor(s.duration / 60)} мин` : '—'}</span>
                                  {s.lat != null && s.lng != null && <MapPin className="size-3 text-orange-400 shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible refuels */}
                      {(trackData as any).refuels && (trackData as any).refuels.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Заправки ({(trackData as any).refuels.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).refuels.map((r: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] rounded px-2 py-1.5 bg-emerald-50/50 dark:bg-emerald-900/10">
                                  <span>⛽</span>
                                  <span>{formatTime(r.startDate)}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 ml-auto font-medium">+{r.volume?.toFixed(1) || '?'} л</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible plums */}
                      {(trackData as any).plums && (trackData as any).plums.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Сливы ({(trackData as any).plums.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).plums.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] rounded px-2 py-1.5 bg-red-50/50 dark:bg-red-900/10">
                                  <span>🔻</span>
                                  <span>{formatTime(p.startDate)}</span>
                                  <span className="text-red-600 dark:text-red-400 ml-auto font-medium">-{p.volume?.toFixed(1) || '?'} л</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── CO2 EMISSIONS ESTIMATE ── */}
              {co2Estimate != null && (
                <div className="rounded-lg border p-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Flame className="size-3" />Выбросы CO₂</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">~{co2Estimate.toFixed(1)} кг CO₂</span>
                </div>
              )}

              {/* ── ENGINE HOURS BREAKDOWN ── */}
              {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && (
                <div className="rounded-lg border p-2">
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5"><Cog className="size-3" />Моточасы — по категориям</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span>В движении</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {fmtDur((t.tripDuration ?? 0) - (t.idleTime ?? 0)) || '—'}
                      </span>
                    </div>
                    {t.idleTime != null && t.idleTime > 0 && t.idleTime < 8640000 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span>Холостой ход</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">{fmtDur(t.idleTime) || '—'}</span>
                      </div>
                    )}
                    {t.parkingsDuration != null && t.parkingsDuration > 0 && t.parkingsDuration < 8640000 && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span>Стоянки</span>
                        <span className="font-medium text-rose-600 dark:text-rose-400">{fmtDur(t.parkingsDuration) || '—'}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] border-t pt-1 font-medium">
                      <span>Итого моточасы</span>
                      <span>{fmtDur(t.engineHours)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRIP SCORE ── */}
              {tripScore != null && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold flex items-center gap-1.5"><Star className="size-3.5 text-amber-500" />Оценка рейса</span>
                    <span className={`text-lg font-bold ${tripScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : tripScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{tripScore}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${tripScore >= 70 ? 'bg-emerald-500' : tripScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${tripScore}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {tripScore >= 80 ? 'Отличный рейс' : tripScore >= 60 ? 'Хороший рейс' : tripScore >= 40 ? 'Удовлетворительно' : 'Требует внимания'}
                  </p>
                </div>
              )}

              {/* ── RECOMMENDATIONS ── */}
              {recommendations.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><Sparkles className="size-3.5 text-amber-500" />Рекомендации</h4>
                  <ul className="space-y-1">
                    {recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                        <span className="shrink-0 mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {t.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{t.notes}</p></DetailSection>}
            </div>
          )}

          {/* Footer after content */}
        </div>
        <div className="shrink-0 border-t bg-card px-4 sm:px-5 py-3">
          <div className="flex flex-wrap justify-end gap-1.5">
            {t.status === 'planned' && (
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onStart(t)}><Navigation className="size-3.5" />Начать</Button>
            )}
            {t.status === 'in_progress' && (
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleInitComplete}><CheckCircle2 className="size-3.5" />Завершить</Button>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(t)}><Edit className="size-3.5" />Ред.</Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><Activity className="size-3.5" />Обновить</Button>
            {compareData && (
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={saveTripData} disabled={savingTrip || tripSaved}>
                {savingTrip ? <Loader2 className="size-3.5 animate-spin" /> : tripSaved ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Save className="size-3.5" />}
                {tripSaved ? 'Сохранено' : 'Сохранить'}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleDuplicate} title="Скопировать рейс"><CopyPlus className="size-3.5" />Копировать</Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={sendReport} title="Скопировать отчёт"><MessageSquare className="size-3.5" />Отчёт</Button>
            {(t.status === 'in_progress' || t.status === 'completed') && (
              <Button variant="default" size="sm" className="h-8 gap-1 text-xs" onClick={() => window.open(`/api/trips/${t.id}/print`, '_blank')}>
                <Printer className="size-3.5" />Печать
              </Button>
            )}
            <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDelete(t)}><Trash2 className="size-3.5" />Удалить</Button>
          </div>
        </div>
      </DialogContent>
      {/* Discrepancy resolution dialog */}
      <AlertDialog open={discrepancyDialog.open} onOpenChange={(v) => setDiscrepancyDialog(d => ({ ...d, open: v }))}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" />Расхождения с данными трекера</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-sm">Обнаружены расхождения между текущими значениями и данными трекера. Отметьте поля, которые нужно заменить:</p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-1.5 px-2 font-medium w-6"></th>
                        <th className="text-left py-1.5 px-2 font-medium">Показатель</th>
                        <th className="text-right py-1.5 px-2 font-medium">Сейчас</th>
                        <th className="text-right py-1.5 px-2 font-medium">Трекер</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancyDialog.diffs.map((d, i) => (
                        <tr key={i} className={`border-b last:border-0 transition-colors ${d.selected ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                          <td className="py-1.5 px-2">
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={() => setDiscrepancyDialog(prev => ({
                                ...prev,
                                diffs: prev.diffs.map((dd, ii) => ii === i ? { ...dd, selected: !dd.selected } : dd)
                              }))}
                              className="rounded border-muted-foreground/30"
                            />
                          </td>
                          <td className="py-1.5 px-2 font-medium">{d.field}</td>
                          <td className={`py-1.5 px-2 text-right ${d.selected ? 'text-muted-foreground line-through' : ''}`}>{d.current}</td>
                          <td className={`py-1.5 px-2 text-right font-semibold ${d.selected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{d.tracker}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setDiscrepancyDialog(prev => ({ ...prev, diffs: prev.diffs.map(d => ({ ...d, selected: true })) }))}>Выбрать все</Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setDiscrepancyDialog(prev => ({ ...prev, diffs: prev.diffs.map(d => ({ ...d, selected: false })) }))}>Снять все</Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDiscrepancyDialog(d => ({ ...d, open: false }))}>Оставить текущие</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              // Only apply selected fields
              const selectedDiffs = discrepancyDialog.diffs.filter(d => d.selected)
              if (selectedDiffs.length === 0 || !trip) { setDiscrepancyDialog(d => ({ ...d, open: false })); return }
              const stats = (compareData?.tripStats as Record<string, unknown>) || {}
              const startSnap = compareData?.startSnapshot as Record<string, unknown> | null
              const endSnap = compareData?.endSnapshot as Record<string, unknown> | null
              const fields: Record<string, unknown> = {}
              const keyToStatKey: Record<string, string> = {
                tripDuration: 'tripsDuration', fuelConsumed: 'fuelConsumption', avgFuelRate: 'avgFuelConsumption',
                refuelVolume: 'refuelVolume', engineHours: 'engineHours', parkingsDuration: 'parkingsDuration',
                distance: 'mileage', avgSpeed: 'avgSpeed', maxSpeed: 'maxSpeed', idleTime: 'idleTime', plumVolume: 'plumVolume',
              }
              for (const diff of selectedDiffs) {
                const key = diff.fieldKey
                // Check stat-based keys first
                const statKey = keyToStatKey[key]
                if (statKey && stats[statKey] != null) {
                  const val = Number(stats[statKey])
                  if (key === 'fuelConsumed' || key === 'avgFuelRate' || key === 'refuelVolume' || key === 'plumVolume') {
                    fields[key] = Math.round(val * 100) / 100
                  } else if (key === 'maxSpeed') {
                    fields[key] = Math.round(val)
                  } else {
                    fields[key] = val
                  }
                }
                // Handle snapshot-based keys
                else if (key === 'fuelStart' && startSnap?.fuelLevel != null) {
                  fields.fuelStart = Number(startSnap.fuelLevel)
                } else if (key === 'mileageStart' && startSnap?.mileage != null) {
                  fields.mileageStart = Math.round(Number(startSnap.mileage))
                } else if (key === 'fuelEnd' && endSnap?.fuelLevel != null) {
                  fields.fuelEnd = Number(endSnap.fuelLevel)
                } else if (key === 'mileageEnd' && endSnap?.mileage != null) {
                  fields.mileageEnd = Math.round(Number(endSnap.mileage))
                }
              }
              // Recalculate derived values if fuel or mileage changed
              if (fields.fuelEnd != null && (fields.fuelStart != null || trip.fuelStart != null)) {
                const fs = (fields.fuelStart as number) ?? trip.fuelStart!
                fields.fuelConsumed = Math.round((fs - (fields.fuelEnd as number)) * 100) / 100
                if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
              }
              if (fields.mileageEnd != null && (fields.mileageStart != null || trip.mileageStart != null)) {
                const ms = (fields.mileageStart as number) ?? trip.mileageStart!
                fields.distance = (fields.mileageEnd as number) - ms
              }
              if (Object.keys(fields).length > 0) {
                fetch(`/api/trips/${trip.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fields),
                }).then(res => {
                  if (res.ok) {
                    toast.success(`Заменено: ${selectedDiffs.map(d => d.field).join(', ')}`)
                    onRefresh()
                  } else {
                    toast.error('Ошибка сохранения')
                  }
                }).catch(() => toast.error('Ошибка сохранения'))
              }
              setDiscrepancyDialog(d => ({ ...d, open: false }))
            }} className="bg-amber-600 text-white hover:bg-amber-700">
              Заменить выбранные ({discrepancyDialog.diffs.filter(d => d.selected).length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Complete Trip Dialog with Refuel Detection ─── */}
      <Dialog open={completeDialog.open} onOpenChange={(v) => !completeDialog.loading && setCompleteDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="sm:max-w-lg max-h-[98dvh] flex flex-col">
          <DialogHeader className="border-l-4 border-l-emerald-500 pl-3">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              <span>Завершение рейса</span>
            </DialogTitle>
            <DialogDescription>Проверьте и подтвердите данные перед завершением</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
            {completeDialog.loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
                  <Loader2 className="size-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Получение данных с датчиков...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Запрос показаний трекера</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {completeDialog.refuelDetected && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 flex items-center gap-2">
                    <Fuel className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Обнаружены заправки!</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">По данным датчиков во время рейса была заправка</p>
                    </div>
                  </div>
                )}

                {/* Trip summary bar */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground">Маршрут</p>
                    <p className="text-xs font-semibold truncate">{t.route || '—'}</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Топливо начало</p>
                    <p className="text-xs font-semibold">{completeDialog.fuelStart != null ? `${completeDialog.fuelStart} л` : '—'}</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Старт</p>
                    <p className="text-xs font-semibold">{t.mileageStart != null ? `${t.mileageStart.toLocaleString('ru-RU')} км` : '—'}</p>
                  </div>
                </div>

                {/* Fuel data section */}
                <DetailSection title="Показания топлива" icon={<Fuel className="size-3.5" />}>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-sky-500" />Топливо начало (л)
                    </Label>
                    <div className="text-lg font-bold mt-1">{completeDialog.fuelStart != null ? completeDialog.fuelStart : '—'}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-emerald-500" />Топливо конец (л)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={completeDialog.fuelEnd}
                      onChange={e => {
                        const val = e.target.value
                        setCompleteDialog(prev => {
                          const fuelEnd = parseFloat(val) || 0
                          const refuel = parseFloat(prev.refuelVolume) || 0
                          const fuelStart = prev.fuelStart
                          let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                          if (consumed != null && consumed < 0) consumed = 0
                          return { ...prev, fuelEnd: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                        })
                      }}
                      placeholder="Показание датчика"
                      className="h-9 text-sm font-semibold mt-1"
                    />
                  </div>
                </DetailSection>

                {/* Refuel section */}
                {completeDialog.refuelDetected ? (
                  <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <div className="size-6 rounded-md bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center">
                        <FuelIcon className="size-3.5" />
                      </div>
                      Заправка обнаружена!
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 ml-8">
                      Подтвердите объём заправки или введите вручную.
                    </p>
                    <div className="ml-8">
                      <Label className="text-[10px] text-amber-700 dark:text-amber-400">Объём заправки (л)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          value={completeDialog.refuelVolume}
                          onChange={e => {
                            const val = e.target.value
                            setCompleteDialog(prev => {
                              const refuel = parseFloat(val) || 0
                              const fuelStart = prev.fuelStart
                              const fuelEnd = parseFloat(prev.fuelEnd) || 0
                              let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                              if (consumed != null && consumed < 0) consumed = 0
                              return { ...prev, refuelVolume: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                            })
                          }}
                          placeholder="0"
                          className="h-8 text-xs w-28"
                        />
                        {completeDialog.sensorRefuelVolume != null && (
                          <Badge variant="outline" className="text-[10px] h-6 bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                            Датчик: {completeDialog.sensorRefuelVolume.toFixed(1)} л
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <DetailSection title="Заправки" icon={<FuelIcon className="size-3.5" />}>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
                        Была ли заправка во время рейса?
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 text-[11px] flex-1 gap-1.5 ${completeDialog.refuelVolume ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' : ''}`}
                          onClick={() => setCompleteDialog(prev => ({ ...prev, refuelVolume: prev.refuelVolume || '0' }))}
                        >
                          <Fuel className="size-3" />Да, была
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 text-[11px] flex-1 gap-1.5 ${!completeDialog.refuelVolume && completeDialog.refuelVolume !== '' ? '' : 'bg-muted/50'}`}
                          onClick={() => setCompleteDialog(prev => ({ ...prev, refuelVolume: '', fuelConsumed: prev.fuelStart != null && prev.fuelEnd ? String(Math.round((prev.fuelStart - (parseFloat(prev.fuelEnd) || 0)) * 100) / 100) : '' }))}
                        >
                          <X className="size-3" />Нет заправок
                        </Button>
                      </div>
                      {completeDialog.refuelVolume !== '' && (
                        <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 mt-2">
                          <Label className="text-[10px] text-muted-foreground">Объём заправки (л)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={completeDialog.refuelVolume}
                            onChange={e => {
                              const val = e.target.value
                              setCompleteDialog(prev => {
                                const refuel = parseFloat(val) || 0
                                const fuelStart = prev.fuelStart
                                const fuelEnd = parseFloat(prev.fuelEnd) || 0
                                let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                                if (consumed != null && consumed < 0) consumed = 0
                                return { ...prev, refuelVolume: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                              })
                            }}
                            placeholder="0"
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </DetailSection>
                )}

                {/* Calculated section */}
                <DetailSection title="Итоговые показания" icon={<Gauge className="size-3.5" />}>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Flame className="size-2.5" />Расход топлива (л)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={completeDialog.fuelConsumed}
                      onChange={e => setCompleteDialog(prev => ({ ...prev, fuelConsumed: e.target.value }))}
                      className="h-8 text-xs font-bold mt-1"
                      placeholder="Авто-расчёт"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Gauge className="size-2.5" />Пробег конец (км)
                    </Label>
                    <Input
                      type="number"
                      value={completeDialog.mileageEnd}
                      onChange={e => setCompleteDialog(prev => ({ ...prev, mileageEnd: e.target.value }))}
                      className="h-8 text-xs font-bold mt-1"
                      placeholder="Показание одометра"
                    />
                  </div>
                </DetailSection>

                {/* Trip distance summary if available */}
                {(t.distance || (t.mileageStart != null && completeDialog.mileageEnd)) && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50">
                    <Navigation className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="text-[11px] text-sky-700 dark:text-sky-400">
                      {t.distance ? `Расстояние по маршруту: ${t.distance.toFixed(1)} км` : ''}
                      {t.distance && completeDialog.mileageEnd && t.mileageStart ? ' • ' : ''}
                      {completeDialog.mileageEnd && t.mileageStart ? `По одометру: ${(parseFloat(completeDialog.mileageEnd) - t.mileageStart).toLocaleString('ru-RU')} км` : ''}
                    </span>
                  </div>
                )}

                {/* Notes */}
                <DetailSection title="Примечание" icon={<StickyNote className="size-3.5" />}>
                  <Textarea
                    value={completeDialog.notes}
                    onChange={e => setCompleteDialog(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Комментарий о заправке, расходе, особенностях рейса..."
                    className="text-xs min-h-[60px]"
                  />
                </DetailSection>
              </div>
            )}

          </div>

          {/* Footer — outside scrollable area */}
          <div className="shrink-0 border-t bg-card px-4 sm:px-5 py-3">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCompleteDialog(prev => ({ ...prev, open: false }))}
                disabled={completeDialog.loading}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
                onClick={handleConfirmComplete}
                disabled={completeDialog.loading}
              >
                {completeDialog.loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Завершить рейс
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

