'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Route, Plus, Trash2, Save, Loader2, MapPin, GripVertical, Navigation,
  ArrowUp, ArrowDown, Clock, Package,
  Edit, FileText, MapPinned, CheckCircle2, StickyNote, Zap,
  ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react'
import type { RouteTemplate, RouteTemplatePoint } from '@/lib/types'
import { API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// ROUTE TEMPLATE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function RouteTemplateFormDialog({ open, setOpen, editData, onSaved }: {
  open: boolean; setOpen: (v: boolean) => void;
  editData: RouteTemplate | null; onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [points, setPoints] = useState<Array<{
    id?: string; name: string; address: string; latitude: string; longitude: string;
    plannedArrival: string; plannedDeparture: string; distanceFromPrev: string; notes: string;
  }>>([])
  const [saving, setSaving] = useState(false)
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null)
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '', description: editData.description || '',
        startPoint: editData.startPoint || '', endPoint: editData.endPoint || '',
        totalDistance: editData.totalDistance?.toString() || '',
        estimatedDuration: editData.estimatedDuration?.toString() || '',
        notes: editData.notes || '',
      })
      setPoints((editData.points || []).map(p => ({
        id: p.id, name: p.name || '', address: p.address || '',
        latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
        plannedArrival: p.plannedArrival || '', plannedDeparture: p.plannedDeparture || '',
        distanceFromPrev: p.distanceFromPrev?.toString() || '', notes: p.notes || '',
      })))
    } else {
      setForm({ name: '' })
      setPoints([])
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const recalcDistances = (pts: typeof points) => {
    return pts.map((p, i) => {
      if (i === 0) return { ...p, distanceFromPrev: '' }
      const prev = pts[i - 1]
      const lat1 = parseFloat(prev.latitude), lng1 = parseFloat(prev.longitude)
      const lat2 = parseFloat(p.latitude), lng2 = parseFloat(p.longitude)
      if (isFinite(lat1) && isFinite(lng1) && isFinite(lat2) && isFinite(lng2)) {
        return { ...p, distanceFromPrev: haversineDistance(lat1, lng1, lat2, lng2).toFixed(1) }
      }
      return p
    })
  }

  const recalcTimes = (pts: typeof points, avgSpeedKmh = 60, stopMin = 15) => {
    let currentMinutes: number | null = null
    return pts.map((p, i) => {
      // Use first point's existing arrival time as start, or default 08:00
      if (i === 0) {
        const startTime = p.plannedArrival || '08:00'
        const [h, m] = startTime.split(':').map(Number)
        if (isFinite(h) && isFinite(m)) currentMinutes = h * 60 + m
        else currentMinutes = 8 * 60
        const depMin = currentMinutes + (p.plannedDeparture ? 0 : stopMin)
        const depTime = p.plannedDeparture || `${String(Math.floor(depMin / 60) % 24).padStart(2, '0')}:${String(depMin % 60).padStart(2, '0')}`
        if (!p.plannedDeparture) currentMinutes = depMin
        else {
          const [dh, dm] = p.plannedDeparture.split(':').map(Number)
          if (isFinite(dh) && isFinite(dm)) currentMinutes = dh * 60 + dm
        }
        return { ...p, plannedArrival: p.plannedArrival || startTime, plannedDeparture: depTime }
      }
      if (currentMinutes === null) return p
      const dist = parseFloat(p.distanceFromPrev) || 0
      const travelMin = Math.round((dist / avgSpeedKmh) * 60)
      currentMinutes += travelMin
      const arrTime = p.plannedArrival || `${String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`
      const depMin = currentMinutes + (p.plannedDeparture ? 0 : stopMin)
      const depTime = p.plannedDeparture || `${String(Math.floor(depMin / 60) % 24).padStart(2, '0')}:${String(depMin % 60).padStart(2, '0')}`
      if (!p.plannedArrival) currentMinutes = currentMinutes
      else {
        const [ah, am] = p.plannedArrival.split(':').map(Number)
        if (isFinite(ah) && isFinite(am)) currentMinutes = ah * 60 + am
      }
      if (!p.plannedDeparture) currentMinutes = depMin
      else {
        const [dh, dm] = p.plannedDeparture.split(':').map(Number)
        if (isFinite(dh) && isFinite(dm)) currentMinutes = dh * 60 + dm
      }
      return { ...p, plannedArrival: arrTime, plannedDeparture: depTime }
    })
  }

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
    try {
      const res = await fetch(`/api/glonass/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.latitude && data.longitude) return { latitude: data.latitude, longitude: data.longitude, address: data.address || address }
    } catch {}
    return null
  }

  const handleGeocodePoint = async (idx: number) => {
    const p = points[idx]
    if (!p.address.trim()) { toast.error('Введите адрес'); return }
    setGeocodingIdx(idx)
    try {
      const result = await geocodeAddress(p.address)
      if (result) {
        const newPoints = [...points]
        newPoints[idx] = { ...newPoints[idx], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        setPoints(recalcTimes(recalcDistances(newPoints)))
        toast.success(`Координаты: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`)
      } else { toast.error('Не удалось определить координаты') }
    } catch { toast.error('Ошибка геокодирования') }
    setGeocodingIdx(null)
  }

  const handleAutoSort = async () => {
    if (points.length < 2) { toast.info('Добавьте минимум 2 точки'); return }
    setOptimizing(true)
    try {
      const geocoded = [...points]
      for (let i = 0; i < geocoded.length; i++) {
        if (!geocoded[i].latitude && !geocoded[i].longitude && geocoded[i].address.trim()) {
          const result = await geocodeAddress(geocoded[i].address)
          if (result) geocoded[i] = { ...geocoded[i], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        }
      }
      const coords = geocoded.map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), hasCoords: !!(p.latitude && p.longitude) }))
      const coordIndices: number[] = []
      const coordList: { lat: number; lng: number }[] = []
      for (let i = 0; i < geocoded.length; i++) {
        if (coords[i].hasCoords) { coordIndices.push(i); coordList.push({ lat: coords[i].lat, lng: coords[i].lng }) }
      }
      const n = coordList.length
      if (n < 2) { toast.error('Недостаточно точек с координатами'); setOptimizing(false); return }

      const visited = new Set<number>()
      const order: number[] = [0]
      visited.add(0)
      while (visited.size < n) {
        const current = order[order.length - 1]
        let nearest = -1, nearestDist = Infinity
        for (let i = 0; i < n; i++) {
          if (visited.has(i)) continue
          const dist = haversineDistance(coordList[current].lat, coordList[current].lng, coordList[i].lat, coordList[i].lng)
          if (dist < nearestDist) { nearestDist = dist; nearest = i }
        }
        if (nearest >= 0) { order.push(nearest); visited.add(nearest) }
      }
      const ordered = order.map(i => geocoded[coordIndices[i]])
      const noCoords = geocoded.filter(p => !p.latitude && !p.longitude)
      const result = recalcDistances([...ordered, ...noCoords])

      if (result.length > 0) {
        if (result[0].address) setF('startPoint', result[0].address)
        if (result[result.length - 1].address) setF('endPoint', result[result.length - 1].address)
      }
      const totalDist = result.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)
      if (totalDist > 0) setF('totalDistance', totalDist.toFixed(1))
      // Auto-calculate estimated duration (avg speed 60 km/h)
      const avgSpeedKmh = 60
      const estMin = Math.round((totalDist / avgSpeedKmh) * 60)
      if (estMin > 0) setF('estimatedDuration', estMin.toString())
      // Auto-calculate point arrival/departure times
      const resultWithTimes = recalcTimes(result, avgSpeedKmh, 15)
      setPoints(resultWithTimes)
      const hrs = Math.floor(estMin / 60)
      const mins = estMin % 60
      toast.success(`Маршрут оптимизирован: ${totalDist.toFixed(1)} км, ~${hrs > 0 ? hrs + ' ч ' : ''}${mins > 0 ? mins + ' мин' : ''}`)
    } catch { toast.error('Ошибка оптимизации') }
    setOptimizing(false)
  }

  const addPoint = () => {
    setPoints(prev => [...prev, { name: `Точка ${prev.length + 1}`, address: '', latitude: '', longitude: '', plannedArrival: '', plannedDeparture: '', distanceFromPrev: '', notes: '' }])
  }
  const removePoint = (idx: number) => {
    setPoints(prev => recalcTimes(recalcDistances(prev.filter((_, i) => i !== idx))))
  }
  const movePoint = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= points.length) return
    const newPoints = [...points]
    const temp = newPoints[idx]
    newPoints[idx] = newPoints[newIdx]
    newPoints[newIdx] = temp
    setPoints(recalcTimes(recalcDistances(newPoints)))
  }
  const updatePoint = (idx: number, field: string, value: string) => {
    setPoints(prev => {
      const newPoints = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
      if (field === 'latitude' || field === 'longitude') return recalcTimes(recalcDistances(newPoints))
      if (field === 'plannedArrival' || field === 'plannedDeparture') return recalcTimes(newPoints, 60, 15)
      return newPoints
    })
  }

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название маршрута'); return }
    setSaving(true)
    try {
      // Auto-calculate estimatedDuration if not set but distance is known
      const dist = parseFloat(f('totalDistance')) || totalDist
      const estDur = f('estimatedDuration') ? f('estimatedDuration') : (dist > 0 ? Math.round((dist / 60) * 60).toString() : '')
      const url = editData ? `/api/route-templates/${editData.id}` : '/api/route-templates'
      const method = editData ? 'PUT' : 'POST'
      const payload = {
        ...form,
        estimatedDuration: estDur,
        points: points.map((p, i) => ({
          id: p.id || undefined,
          name: p.name || `Точка ${i + 1}`,
          address: p.address || null,
          latitude: p.latitude ? parseFloat(p.latitude) : null,
          longitude: p.longitude ? parseFloat(p.longitude) : null,
          sortOrder: i,
          plannedArrival: p.plannedArrival || null,
          plannedDeparture: p.plannedDeparture || null,
          distanceFromPrev: p.distanceFromPrev ? parseFloat(p.distanceFromPrev) : null,
          notes: p.notes || null,
        })),
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Ошибка'); return }
      toast.success(editData ? 'Маршрут обновлён' : 'Маршрут создан')
      onSaved()
      setOpen(false)
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  const totalDist = points.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)

  const [expandedPoint, setExpandedPoint] = useState<number | null>(null)

  const totalEstMin = f('estimatedDuration') ? parseInt(f('estimatedDuration')) : (totalDist > 0 ? Math.round((totalDist / 60) * 60) : 0)
  const totalHrs = Math.floor(totalEstMin / 60)
  const totalMins = totalEstMin % 60
  const durationStr = totalEstMin > 0 ? `${totalHrs > 0 ? totalHrs + ' ч ' : ''}${totalMins > 0 ? totalMins + ' мин' : ''}` : ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[98dvh] flex flex-col">
        {/* Header with border-l indicator */}
        <DialogHeader className="border-l-4 border-l-sky-500 pl-3">
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-4" /> : <Route className="size-4" />}
            <span>{editData ? 'Редактирование маршрута' : 'Новый маршрут'}</span>
          </DialogTitle>
          {(points.length > 0 || totalDist > 0) && (
            <DialogDescription className="text-xs">
              {points.length > 0 && `${points.length} ${points.length === 1 ? 'точка' : points.length < 5 ? 'точки' : 'точек'}`}
              {points.length > 0 && totalDist > 0 && ' · '}
              {totalDist > 0 && `${totalDist.toFixed(1)} км`}
              {totalDist > 0 && durationStr && ' · '}
              {durationStr && `~${durationStr}`}
            </DialogDescription>
          )}
          {!editData && (
            <DialogDescription className="text-xs">Создайте шаблон маршрута с точками назначения</DialogDescription>
          )}
          {editData && !(points.length > 0 || totalDist > 0) && (
            <DialogDescription className="text-xs">Измените параметры маршрута и точки маршрута</DialogDescription>
          )}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0">
          {/* Section 1: Basic parameters */}
          <div className="px-4 sm:px-5 py-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FileText className="size-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold">Основные параметры</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Название маршрута <span className="text-red-500">*</span></Label>
                <Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Например: Москва — Санкт-Петербург" className="mt-1 h-9" autoFocus />
              </div>
              <div>
                <Label className="text-xs font-medium">Пункт отправления</Label>
                <div className="relative mt-1">
                  <MapPin className="size-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input value={f('startPoint')} onChange={e => setF('startPoint', e.target.value)} placeholder="Москва" className="h-9 pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Пункт назначения</Label>
                <div className="relative mt-1">
                  <MapPin className="size-3.5 text-red-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input value={f('endPoint')} onChange={e => setF('endPoint', e.target.value)} placeholder="Санкт-Петербург" className="h-9 pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Общее расстояние</Label>
                <div className="relative mt-1">
                  <Navigation className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input type="number" value={f('totalDistance')} onChange={e => setF('totalDistance', e.target.value)} placeholder="700" className="h-9 pl-8 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">км</span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Ориентировочное время</Label>
                <div className="relative mt-1">
                  <Clock className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input type="number" value={f('estimatedDuration')} onChange={e => setF('estimatedDuration', e.target.value)} placeholder="480" className="h-9 pl-8 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">мин</span>
                </div>
                {totalDist > 0 && !f('estimatedDuration') && (
                  <p className="text-[10px] text-muted-foreground mt-1 ml-0.5">Авто: ~{Math.round((totalDist / 60) * 60)} мин при 60 км/ч</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Route points — Timeline style */}
          <div className="px-4 sm:px-5 py-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <MapPinned className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold">Точки маршрута</h3>
                {points.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">{points.length}</Badge>
                )}
              </div>
              {totalDist > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Navigation className="size-3 text-sky-500" />{totalDist.toFixed(1)} км</span>
                  {durationStr && <span className="flex items-center gap-1"><Clock className="size-3 text-sky-500" />{durationStr}</span>}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button type="button" size="sm" className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700" onClick={addPoint}>
                <Plus className="size-3.5" />Добавить точку
              </Button>
              {points.length >= 2 && (
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleAutoSort} disabled={optimizing}>
                  {optimizing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  {optimizing ? 'Оптимизация...' : 'Оптимизировать маршрут'}
                </Button>
              )}
            </div>

            {/* Empty state */}
            {points.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <MapPinned className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Точки маршрута не добавлены</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Нажмите «Добавить точку» для создания маршрута</p>
              </div>
            )}

            {/* Timeline points list */}
            {points.length > 0 && (
              <div className="relative">
                {points.map((p, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === points.length - 1
                  const isExpanded = expandedPoint === idx
                  const hasCoords = !!(p.latitude && p.longitude)

                  return (
                    <div key={idx} className="relative flex gap-3">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center w-8 shrink-0">
                        {/* Connector line above */}
                        {!isFirst && (
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-sky-300 to-sky-400 dark:from-sky-700 dark:to-sky-600 -mb-1" />
                        )}
                        {/* Point number circle */}
                        <div className={`relative z-10 flex items-center justify-center size-8 rounded-full text-xs font-bold border-2 shrink-0 transition-colors ${
                          isFirst ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700' :
                          isLast ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700' :
                          'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/50 dark:text-sky-400 dark:border-sky-700'
                        }`}>
                          {isFirst ? <MapPin className="size-3.5" /> : isLast ? <MapPin className="size-3.5" /> : idx + 1}
                        </div>
                        {/* Connector line below */}
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-sky-400 to-sky-300 dark:from-sky-600 dark:to-sky-700 -mt-1" />
                        )}
                      </div>

                      {/* Point card */}
                      <div className={`flex-1 mb-3 rounded-xl border transition-all ${
                        isExpanded ? 'border-sky-300 dark:border-sky-700 shadow-sm bg-sky-50/50 dark:bg-sky-950/20' : 'border-border hover:border-sky-200 dark:hover:border-sky-800 bg-card'
                      }`}>
                        {/* Point header — always visible */}
                        <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpandedPoint(isExpanded ? null : idx)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{p.name || `Точка ${idx + 1}`}</span>
                              {p.distanceFromPrev && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 rounded-full shrink-0">
                                  +{parseFloat(p.distanceFromPrev).toFixed(1)} км
                                </span>
                              )}
                              {hasCoords && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <CheckCircle2 className="size-2.5" />
                                </span>
                              )}
                            </div>
                            {p.address && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                                <MapPin className="size-3 shrink-0" />{p.address}
                              </p>
                            )}
                            {!p.address && !p.name && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">Заполните название и адрес</p>
                            )}
                            {(p.plannedArrival || p.plannedDeparture) && !isExpanded && (
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                {p.plannedArrival && <span className="flex items-center gap-0.5"><ArrowDownToLine className="size-2.5" />{p.plannedArrival}</span>}
                                {p.plannedArrival && p.plannedDeparture && <span>→</span>}
                                {p.plannedDeparture && <span className="flex items-center gap-0.5"><ArrowUpFromLine className="size-2.5" />{p.plannedDeparture}</span>}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); movePoint(idx, 'up') }} disabled={isFirst} title="Вверх">
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); movePoint(idx, 'down') }} disabled={isLast} title="Вниз">
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={e => { e.stopPropagation(); removePoint(idx) }} title="Удалить">
                              <Trash2 className="size-3.5" />
                            </Button>
                            <div className={`ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="size-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                            {/* Name field */}
                            <div className="pt-2">
                              <Label className="text-xs font-medium">Название точки</Label>
                              <Input value={p.name} onChange={e => updatePoint(idx, 'name', e.target.value)} placeholder="Название точки" className="mt-1 h-8 text-sm" />
                            </div>

                            {/* Address + geocode */}
                            <div>
                              <Label className="text-xs font-medium">Адрес</Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Input value={p.address} onChange={e => updatePoint(idx, 'address', e.target.value)} placeholder="Введите адрес для геокодирования" className="h-8 text-sm flex-1" />
                                <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 shrink-0 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30" onClick={() => handleGeocodePoint(idx)} disabled={geocodingIdx === idx}>
                                  {geocodingIdx === idx ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}
                                  Найти
                                </Button>
                              </div>
                            </div>

                            {/* Coordinates */}
                            <div>
                              <Label className="text-xs font-medium">Координаты {hasCoords && <CheckCircle2 className="size-3 text-emerald-500 inline ml-1" />}</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Ш</span>
                                  <Input value={p.latitude} onChange={e => updatePoint(idx, 'latitude', e.target.value)} placeholder="55.7558" className="h-8 text-sm pl-7" />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Д</span>
                                  <Input value={p.longitude} onChange={e => updatePoint(idx, 'longitude', e.target.value)} placeholder="37.6173" className="h-8 text-sm pl-7" />
                                </div>
                              </div>
                            </div>

                            {/* Time schedule */}
                            <div>
                              <Label className="text-xs font-medium">Расписание</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowDownToLine className="size-2.5" />Прибытие</Label>
                                  <Input type="time" value={p.plannedArrival} onChange={e => updatePoint(idx, 'plannedArrival', e.target.value)} className="h-8 text-sm mt-0.5" />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowUpFromLine className="size-2.5" />Отправление</Label>
                                  <Input type="time" value={p.plannedDeparture} onChange={e => updatePoint(idx, 'plannedDeparture', e.target.value)} className="h-8 text-sm mt-0.5" />
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <Label className="text-xs font-medium">Заметки</Label>
                              <Input value={p.notes} onChange={e => updatePoint(idx, 'notes', e.target.value)} placeholder="Комментарий к точке маршрута" className="h-8 text-sm mt-1" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 3: Description & Notes */}
          <div className="px-4 sm:px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <StickyNote className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold">Дополнительно</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Описание</Label>
                <Input value={f('description')} onChange={e => setF('description', e.target.value)} placeholder="Краткое описание маршрута" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium">Заметки</Label>
                <Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} placeholder="Дополнительные заметки к маршруту" rows={2} className="mt-1 text-sm" />
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t bg-card px-4 sm:px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {points.length > 0 && <span className="flex items-center gap-1"><MapPinned className="size-3" />{points.length} {points.length === 1 ? 'точка' : points.length < 5 ? 'точки' : 'точек'}</span>}
              {totalDist > 0 && <span className="flex items-center gap-1"><Navigation className="size-3" />{totalDist.toFixed(1)} км</span>}
              {durationStr && <span className="flex items-center gap-1"><Clock className="size-3" />{durationStr}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="h-9">Отмена</Button>
              <Button onClick={handleSave} disabled={saving} className="h-9 bg-sky-600 hover:bg-sky-700">
                {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}{editData ? 'Сохранить' : 'Создать маршрут'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

