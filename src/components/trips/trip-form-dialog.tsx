'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Route, Plus, Trash2, Save, Loader2, MapPin, GripVertical, Truck,
  Navigation, ArrowUp, ArrowDown, Calendar, Clock, Package, Weight,
  CheckCircle2, Edit, Fuel, MapPinned, ToggleRight
} from 'lucide-react'
import type { Trip, Equipment, Crew, RouteTemplate, RouteTemplatePoint } from '@/lib/types'
import { TRIP_STATUS_MAP, CREW_TYPE_MAP, API } from '@/lib/constants'
import { toLocalDatetime, localDatetimeToISO, toLocalDate, formatDate, formatPrice, handleApiError, fmtDuration } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// TRIP FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function TripFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, crews, routeTemplates, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Trip | null; equipmentId: string; equipmentList: Equipment[];
  crews: Crew[]; routeTemplates: RouteTemplate[]; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [fetchingStart, setFetchingStart] = useState(false)
  const [fetchingEnd, setFetchingEnd] = useState(false)
  const [routePoints, setRoutePoints] = useState<Array<{
    id?: string; name: string; address: string; latitude: string; longitude: string;
    plannedArrival: string; plannedDeparture: string; distanceFromPrev: string; notes: string;
  }>>([])
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({
        equipmentId: editData.equipmentId, route: editData.route || '', startPoint: editData.startPoint || '', endPoint: editData.endPoint || '',
        cargo: editData.cargo || '', cargoWeight: editData.cargoWeight?.toString() || '', distance: editData.distance?.toString() || '',
        startDate: editData.startDate ? toLocalDatetime(editData.startDate) : toLocalDatetime(new Date()),
        endDate: editData.endDate ? toLocalDatetime(editData.endDate) : '',
        plannedEndDate: editData.plannedEndDate ? toLocalDatetime(editData.plannedEndDate) : '',
        status: editData.status || 'planned', crewId: editData.crewId || '',
        fuelStart: editData.fuelStart?.toString() || '', fuelEnd: editData.fuelEnd?.toString() || '',
        mileageStart: editData.mileageStart?.toString() || '', mileageEnd: editData.mileageEnd?.toString() || '',
        cost: editData.cost?.toString() || '', revenue: editData.revenue?.toString() || '', notes: editData.notes || '',
        routeTemplateId: editData.routeTemplateId || '',
      })
      setRoutePoints(
        (editData.routePoints || []).map(p => ({
          id: p.id, name: p.name || '', address: p.address || '',
          latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
          plannedArrival: p.plannedArrival ? toLocalDatetime(p.plannedArrival) : '',
          plannedDeparture: p.plannedDeparture ? toLocalDatetime(p.plannedDeparture) : '',
          distanceFromPrev: p.distanceFromPrev?.toString() || '', notes: p.notes || '',
        }))
      )
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: toLocalDatetime(new Date()), status: 'planned' })
      setRoutePoints([])
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  // Haversine distance calculation
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Recalculate distances between consecutive points
  const recalcDistances = (points: typeof routePoints) => {
    return points.map((p, i) => {
      if (i === 0) return { ...p, distanceFromPrev: '' }
      const prev = points[i - 1]
      const lat1 = parseFloat(prev.latitude)
      const lng1 = parseFloat(prev.longitude)
      const lat2 = parseFloat(p.latitude)
      const lng2 = parseFloat(p.longitude)
      if (isFinite(lat1) && isFinite(lng1) && isFinite(lat2) && isFinite(lng2)) {
        return { ...p, distanceFromPrev: haversineDistance(lat1, lng1, lat2, lng2).toFixed(1) }
      }
      return p
    })
  }

  // Geocode a single address
  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
    try {
      const res = await fetch(`/api/glonass/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude, address: data.address || address }
      }
    } catch { /* ignore */ }
    return null
  }

  // Geocode a single route point
  const handleGeocodePoint = async (idx: number) => {
    const p = routePoints[idx]
    if (!p.address.trim()) { toast.error('Введите адрес для геокодирования'); return }
    setGeocodingIdx(idx)
    try {
      const result = await geocodeAddress(p.address)
      if (result) {
        const newPoints = [...routePoints]
        newPoints[idx] = { ...newPoints[idx], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        const withDist = recalcDistances(newPoints)
        setRoutePoints(withDist)
        toast.success(`Координаты получены: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`)
      } else {
        toast.error('Не удалось определить координаты по адресу')
      }
    } catch { toast.error('Ошибка геокодирования') }
    setGeocodingIdx(null)
  }

  // Auto-sort route points using nearest neighbor algorithm
  const handleAutoSort = async () => {
    if (routePoints.length < 2) { toast.info('Добавьте минимум 2 точки для оптимизации'); return }
    setOptimizingRoute(true)
    try {
      // Geocode all points without coordinates
      const geocoded = [...routePoints]
      for (let i = 0; i < geocoded.length; i++) {
        if (!geocoded[i].latitude && !geocoded[i].longitude && geocoded[i].address.trim()) {
          const result = await geocodeAddress(geocoded[i].address)
          if (result) {
            geocoded[i] = { ...geocoded[i], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
          }
        }
      }

      // Check we have enough points with coordinates
      const pointsWithCoords = geocoded.filter(p => p.latitude && p.longitude)
      if (pointsWithCoords.length < 2) {
        toast.error('Недостаточно точек с координатами для оптимизации. Используйте кнопку геокодирования.')
        setOptimizingRoute(false)
        return
      }

      // Build index mapping
      const coordIndices: number[] = []
      const coords: { lat: number; lng: number; origIdx: number }[] = []
      for (let i = 0; i < geocoded.length; i++) {
        if (geocoded[i].latitude && geocoded[i].longitude) {
          coordIndices.push(i)
          coords.push({ lat: parseFloat(geocoded[i].latitude), lng: parseFloat(geocoded[i].longitude), origIdx: i })
        }
      }

      // Nearest neighbor starting from first point with coords
      const n = coords.length
      const visited = new Set<number>()
      const order: number[] = [0] // Start from first point
      visited.add(0)
      while (visited.size < n) {
        const current = order[order.length - 1]
        let nearest = -1, nearestDist = Infinity
        for (let i = 0; i < n; i++) {
          if (visited.has(i)) continue
          const dist = haversineDistance(coords[current].lat, coords[current].lng, coords[i].lat, coords[i].lng)
          if (dist < nearestDist) { nearestDist = dist; nearest = i }
        }
        if (nearest >= 0) { order.push(nearest); visited.add(nearest) }
      }

      // Reorder: points with coords in optimized order, points without coords at the end
      const orderedCoords = order.map(i => geocoded[coordIndices[i]])
      const noCoords = geocoded.filter(p => !p.latitude && !p.longitude)
      const result = [...orderedCoords, ...noCoords]

      // Recalculate distances
      const withDist = recalcDistances(result)
      setRoutePoints(withDist)

      // Update startPoint/endPoint from first/last route point
      if (withDist.length > 0) {
        if (withDist[0].address) setF('startPoint', withDist[0].address)
        if (withDist[withDist.length - 1].address) setF('endPoint', withDist[withDist.length - 1].address)
      }

      const totalDist = withDist.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)
      if (totalDist > 0) setF('distance', totalDist.toFixed(1))

      toast.success(`Маршрут оптимизирован. Общее расстояние: ${totalDist.toFixed(1)} км`)
    } catch { toast.error('Ошибка оптимизации маршрута') }
    setOptimizingRoute(false)
  }

  // Route point operations
  const addRoutePoint = () => {
    setRoutePoints(prev => [...prev, { name: `Точка ${prev.length + 1}`, address: '', latitude: '', longitude: '', plannedArrival: '', plannedDeparture: '', distanceFromPrev: '', notes: '' }])
  }
  const removeRoutePoint = (idx: number) => {
    setRoutePoints(prev => recalcDistances(prev.filter((_, i) => i !== idx)))
  }
  const moveRoutePoint = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= routePoints.length) return
    const newPoints = [...routePoints]
    const temp = newPoints[idx]
    newPoints[idx] = newPoints[newIdx]
    newPoints[newIdx] = temp
    setRoutePoints(recalcDistances(newPoints))
  }
  const updateRoutePoint = (idx: number, field: string, value: string) => {
    setRoutePoints(prev => {
      const newPoints = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
      // If coordinates changed, recalculate distances
      if (field === 'latitude' || field === 'longitude') {
        return recalcDistances(newPoints)
      }
      return newPoints
    })
  }

  // Fetch snapshot from GLONASS at a specific time
  const fetchSnapshot = async (type: 'start' | 'end') => {
    const eqId = f('equipmentId')
    const dt = type === 'start' ? f('startDate') : f('endDate')
    if (!eqId) { toast.error('Выберите технику'); return }
    if (!dt) { toast.error(type === 'start' ? 'Укажите дату начала' : 'Укажите дату окончания'); return }

    if (type === 'start') setFetchingStart(true); else setFetchingEnd(true)
    try {
      const res = await fetch(`/api/glonass/snapshot?equipmentId=${eqId}&datetime=${encodeURIComponent(new Date(dt).toISOString())}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Ошибка запроса'); return }

      const updates: Record<string, string> = {}
      if (data.fuel != null) updates[type === 'start' ? 'fuelStart' : 'fuelEnd'] = String(Math.round(data.fuel))
      if (data.mileage != null) updates[type === 'start' ? 'mileageStart' : 'mileageEnd'] = String(Math.round(data.mileage))
      if (data.address) updates[type === 'start' ? 'startPoint' : 'endPoint'] = data.address

      // If no address but we have coordinates, try reverse geocoding
      if (!data.address && data.lat && data.lng) {
        try {
          const geoRes = await fetch(`/api/glonass/geocode?lat=${data.lat}&lng=${data.lng}`)
          const geoData = await geoRes.json()
          if (geoData.address) updates[type === 'start' ? 'startPoint' : 'endPoint'] = geoData.address
        } catch { /* ignore geocoding errors */ }
      }

      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }))
        const sourceLabel = data.source === 'cached' ? ' (последние известные)' : data.source === 'none' ? '' : ''
        toast.success(`Данные получены${sourceLabel}: ${Object.keys(updates).map(k => {
          if (k.includes('fuel')) return 'топливо'
          if (k.includes('mileage')) return 'пробег'
          if (k.includes('Point')) return 'адрес'
          return k
        }).join(', ')}`)
      } else {
        toast.info('Данные трекера не найдены на указанное время')
      }
    } catch { toast.error('Ошибка запроса к ГЛОНАСС') }
    if (type === 'start') setFetchingStart(false); else setFetchingEnd(false)
  }

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('route').trim()) { toast.error('Укажите маршрут'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/trips/${editData.id}` : '/api/trips'
      const method = editData ? 'PUT' : 'POST'
      const payload = {
        ...form,
        // Convert datetime-local strings to ISO (preserves local time via browser's Date)
        startDate: localDatetimeToISO(f('startDate')),
        endDate: localDatetimeToISO(f('endDate')),
        plannedEndDate: localDatetimeToISO(f('plannedEndDate')),
        routePoints: routePoints.map((p, i) => ({
          id: p.id || undefined,
          name: p.name || `Точка ${i + 1}`,
          address: p.address || null,
          latitude: p.latitude ? parseFloat(p.latitude) : null,
          longitude: p.longitude ? parseFloat(p.longitude) : null,
          sortOrder: i,
          plannedArrival: localDatetimeToISO(p.plannedArrival),
          plannedDeparture: localDatetimeToISO(p.plannedDeparture),
          distanceFromPrev: p.distanceFromPrev ? parseFloat(p.distanceFromPrev) : null,
          notes: p.notes || null,
        })),
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Рейс обновлён' : 'Рейс добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  // Calculate total route distance from points
  const totalRouteDistance = routePoints.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование рейса' : 'Новый рейс'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name} {e.registrationNum ? `(${e.registrationNum})` : ''}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Маршрут *</Label><Input value={f('route')} onChange={e => setF('route', e.target.value)} placeholder="Москва — Санкт-Петербург" autoFocus /></div>
            {routeTemplates.length > 0 && (
              <div className="sm:col-span-2">
                <Label className="text-xs">Шаблон маршрута</Label>
                <Select value={f('routeTemplateId') || 'none'} onValueChange={(val) => {
                  const effectiveVal = val === 'none' ? '' : val
                  setF('routeTemplateId', effectiveVal)
                  if (effectiveVal) {
                    const tmpl = routeTemplates.find(rt => rt.id === effectiveVal)
                    if (tmpl) {
                      if (tmpl.startPoint) setF('startPoint', tmpl.startPoint)
                      if (tmpl.endPoint) setF('endPoint', tmpl.endPoint)
                      if (tmpl.totalDistance) setF('distance', tmpl.totalDistance.toString())
                      if (tmpl.points.length > 0) {
                        // Convert HH:mm template times to datetime-local format using trip start date
                        const tripStart = f('startDate') || toLocalDatetime(new Date())
                        const tripDate = tripStart.split('T')[0] // "YYYY-MM-DD"
                        const toDatetime = (time: string | null | undefined) => {
                          if (!time) return ''
                          // If already in datetime-local format, return as-is
                          if (time.includes('T')) return time
                          // If HH:mm format, combine with trip date
                          if (/^\d{2}:\d{2}$/.test(time)) return `${tripDate}T${time}`
                          return time
                        }
                        setRoutePoints(tmpl.points.map(p => ({
                          name: p.name, address: p.address || '', latitude: p.latitude?.toString() || '',
                          longitude: p.longitude?.toString() || '',
                          plannedArrival: toDatetime(p.plannedArrival),
                          plannedDeparture: toDatetime(p.plannedDeparture),
                          distanceFromPrev: p.distanceFromPrev?.toString() || '',
                          notes: p.notes || '',
                        })))
                      }
                    }
                  }
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите шаблон маршрута" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без шаблона</SelectItem>
                    {routeTemplates.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name} ({rt.points?.length || 0} точек)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Пункт отправления</Label><div className="flex gap-1"><Input value={f('startPoint')} onChange={e => setF('startPoint', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2 gap-1" onClick={() => fetchSnapshot('start')} disabled={fetchingStart} title="Запросить из ГЛОНАСС на время начала">{fetchingStart ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}ГЛОНАСС</Button></div></div>
            <div><Label className="text-xs">Пункт назначения</Label><div className="flex gap-1"><Input value={f('endPoint')} onChange={e => setF('endPoint', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2 gap-1" onClick={() => fetchSnapshot('end')} disabled={fetchingEnd} title="Запросить из ГЛОНАСС на время окончания">{fetchingEnd ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}ГЛОНАСС</Button></div></div>
            <div><Label className="text-xs">Экипаж</Label><Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger><SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TRIP_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Груз</Label><Input value={f('cargo')} onChange={e => setF('cargo', e.target.value)} /></div>
            <div><Label className="text-xs">Вес груза (т)</Label><Input type="number" value={f('cargoWeight')} onChange={e => setF('cargoWeight', e.target.value)} /></div>
            <div><Label className="text-xs">Расстояние (км)</Label><Input type="number" value={f('distance')} onChange={e => setF('distance', e.target.value)} /></div>
            <div><Label className="text-xs">Дата и время начала</Label><Input type="datetime-local" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
            <div><Label className="text-xs">Планируемое окончание</Label><Input type="datetime-local" value={f('plannedEndDate')} onChange={e => setF('plannedEndDate', e.target.value)} /></div>
            <div><Label className="text-xs">Дата и время окончания</Label><Input type="datetime-local" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
            <div><Label className="text-xs">Топливо на старте (л)</Label><div className="flex gap-1"><Input type="number" value={f('fuelStart')} onChange={e => setF('fuelStart', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2" onClick={() => fetchSnapshot('start')} disabled={fetchingStart} title="Запросить из ГЛОНАСС">{fetchingStart ? <Loader2 className="size-3.5 animate-spin" /> : <Fuel className="size-3.5" />}</Button></div></div>
            <div><Label className="text-xs">Топливо на финише (л)</Label><div className="flex gap-1"><Input type="number" value={f('fuelEnd')} onChange={e => setF('fuelEnd', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2" onClick={() => fetchSnapshot('end')} disabled={fetchingEnd} title="Запросить из ГЛОНАСС">{fetchingEnd ? <Loader2 className="size-3.5 animate-spin" /> : <Fuel className="size-3.5" />}</Button></div></div>
            <div><Label className="text-xs">Пробег на старте</Label><Input type="number" value={f('mileageStart')} onChange={e => setF('mileageStart', e.target.value)} /></div>
            <div><Label className="text-xs">Пробег на финише</Label><Input type="number" value={f('mileageEnd')} onChange={e => setF('mileageEnd', e.target.value)} /></div>
            <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
            <div><Label className="text-xs">Доход (₽)</Label><Input type="number" value={f('revenue')} onChange={e => setF('revenue', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>

          {/* ── ROUTE POINTS (WAYPOINTS) SECTION ── */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPinned className="size-3.5 text-primary" />
                <Label className="text-xs font-semibold">Точки маршрута</Label>
                {routePoints.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{routePoints.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {routePoints.length >= 2 && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleAutoSort} disabled={optimizingRoute}>
                    {optimizingRoute ? <Loader2 className="size-3 animate-spin" /> : <ToggleRight className="size-3" />}
                    Оптимизировать
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={addRoutePoint}>
                  <Plus className="size-3" />Добавить точку
                </Button>
              </div>
            </div>
            {totalRouteDistance > 0 && (
              <div className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400">
                <Navigation className="size-3" />
                <span>Общее расстояние по точкам: <strong>{totalRouteDistance.toFixed(1)} км</strong></span>
              </div>
            )}
            {routePoints.length > 0 && (
              <div className="space-y-0">
                {routePoints.map((p, idx) => (
                  <div key={idx} className="flex gap-2 group">
                    {/* Timeline visualization */}
                    <div className="flex flex-col items-center w-6 shrink-0 pt-2">
                      <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        idx === routePoints.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < routePoints.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border/60 min-h-[24px]" />
                      )}
                    </div>
                    {/* Point content */}
                    <div className="flex-1 space-y-1.5 pb-3">
                      <div className="flex items-center gap-1">
                        <Input value={p.name} onChange={e => updateRoutePoint(idx, 'name', e.target.value)} placeholder="Название" className="h-7 text-xs flex-1" />
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0" onClick={() => moveRoutePoint(idx, 'up')} disabled={idx === 0} title="Вверх">
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0" onClick={() => moveRoutePoint(idx, 'down')} disabled={idx === routePoints.length - 1} title="Вниз">
                          <ArrowDown className="size-3" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0 text-red-500 hover:text-red-700" onClick={() => removeRoutePoint(idx)} title="Удалить">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Input value={p.address} onChange={e => updateRoutePoint(idx, 'address', e.target.value)} placeholder="Адрес" className="h-7 text-xs flex-1" />
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => handleGeocodePoint(idx)} disabled={geocodingIdx === idx} title="Геокодировать адрес">
                          {geocodingIdx === idx ? <Loader2 className="size-3 animate-spin" /> : <MapPin className="size-3" />}
                        </Button>
                      </div>
                      {(p.latitude || p.longitude) && (
                        <div className="text-[9px] text-muted-foreground px-0.5">
                          📍 {p.latitude && parseFloat(p.latitude).toFixed(4)}{p.longitude && `, ${parseFloat(p.longitude).toFixed(4)}`}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Прибытие</Label>
                          <Input type="datetime-local" value={p.plannedArrival} onChange={e => updateRoutePoint(idx, 'plannedArrival', e.target.value)} className="h-6 text-[10px]" />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Отправление</Label>
                          <Input type="datetime-local" value={p.plannedDeparture} onChange={e => updateRoutePoint(idx, 'plannedDeparture', e.target.value)} className="h-6 text-[10px]" />
                        </div>
                      </div>
                      {idx > 0 && p.distanceFromPrev && (
                        <div className="text-[9px] text-muted-foreground px-0.5">
                          📏 {parseFloat(p.distanceFromPrev).toFixed(1)} км от предыдущей точки
                        </div>
                      )}
                      <Input value={p.notes} onChange={e => updateRoutePoint(idx, 'notes', e.target.value)} placeholder="Заметки" className="h-6 text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-card z-10 border-t pt-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

