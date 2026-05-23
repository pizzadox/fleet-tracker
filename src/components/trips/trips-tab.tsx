'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Route, Plus, Search, Truck, Clock, XCircle, CheckCircle2, AlertTriangle,
  Users, Wrench, Edit, Trash2, Navigation, Map, Calendar, Package, Weight,
  ChevronDown, ChevronUp, Filter, ListFilter, ArrowUp, ArrowDown, ClipboardList
} from 'lucide-react'
import type { Trip, Equipment, Crew, RouteTemplate } from '@/lib/types'
import { TRIP_STATUS_MAP, CREW_TYPE_MAP, EQUIPMENT_STATUS_MAP } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, statusBadge, fmtDuration, handleApiError, downloadCSV, copyToClipboard, PaginationControls } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════

export const TripsTab = React.memo(function TripsTab({ trips, equipment, crews, routeTemplates, onOpenDetail, onAdd, onDelete, onAddCrew, onEditCrew, onDeleteCrew, onAddRouteTemplate, onEditRouteTemplate, onDeleteRouteTemplate, readOnly }: {
  trips: Trip[]; equipment: Equipment[]; crews: Crew[]; routeTemplates: RouteTemplate[];
  onOpenDetail: (t: Trip, focusTrack?: boolean) => void; onAdd: (eqId?: string) => void;
  onDelete: (t: Trip) => void;
  onAddCrew: () => void; onEditCrew: (c: Crew) => void; onDeleteCrew: (c: Crew) => void;
  onAddRouteTemplate: () => void; onEditRouteTemplate: (rt: RouteTemplate) => void; onDeleteRouteTemplate: (rt: RouteTemplate) => void;
  readOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showCrews, setShowCrews] = useState(false)
  const [showRoutes, setShowRoutes] = useState(false)
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
      // Use backend proxy to avoid CORS issues
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

  const filtered = useMemo(() => trips.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (eqFilter !== 'all' && t.equipmentId !== eqFilter) return false
    if (debouncedSearch && !t.route.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(t.cargo || '').toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    return true
  }), [trips, statusFilter, eqFilter, debouncedSearch])

  return (
    <div className="space-y-3">
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
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Рейс</Button>
        <Button onClick={onAddCrew} variant="outline" size="sm" className="h-9 gap-1.5"><Users className="size-3.5" />Экипаж</Button>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">Рейсов: {filtered.length}</p>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowCrews(!showCrews)}>
          <Users className="size-3" />{showCrews ? 'Скрыть экипажи' : 'Показать экипажи'}
          {showCrews ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowRoutes(!showRoutes)}>
          <Route className="size-3" />{showRoutes ? 'Скрыть маршруты' : 'Маршруты'}
          {showRoutes ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>

      {/* Crews section (toggleable) */}
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

      {/* Route Templates section (toggleable) */}
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

      {/* Trips list */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Route className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Рейсы не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Создайте новый рейс или измените фильтры</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px]"
                style={{ borderLeftColor: t.status === 'completed' ? '#10b981' : t.status === 'in_progress' ? '#3b82f6' : t.status === 'cancelled' ? '#ef4444' : '#f59e0b' }}
                onClick={() => onOpenDetail(t)}>
                <div className="flex items-start gap-2.5">
                  <div className="size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                    <Route className="size-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.route}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin className="size-2.5 text-emerald-500" />{t.startPoint}</span>}
                      {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2.5 text-red-500" />{t.endPoint}</span>}
                    </div>
                  </div>
                  {statusBadge(t.status, TRIP_STATUS_MAP)}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-[44px] text-[10px] text-muted-foreground">
                  {t.equipment?.name && <span className="flex items-center gap-1"><Truck className="size-3" />{t.equipment.name}</span>}
                  {t.startDate && <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(t.startDate)}</span>}
                  {t.distance != null && <span className="flex items-center gap-0.5 font-medium text-foreground"><Navigation className="size-3 text-sky-500" />{t.distance} км</span>}
                  {t.fuelConsumed != null && <span className="flex items-center gap-0.5"><Fuel className="size-3 text-amber-500" />{t.fuelConsumed} л</span>}
                  {t.cargo && <span className="flex items-center gap-1"><Package className="size-3" />{t.cargo}</span>}
                  {t.crew && <span className="flex items-center gap-1"><Users className="size-3" />{t.crew.name}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium w-8"></th>
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
                  {filtered.map((t, idx) => (
                    <tr key={t.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${TRIP_STATUS_MAP[t.status]?.border || ''} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(t)}>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center justify-center size-6 rounded bg-sky-100 dark:bg-sky-900/30">
                          <Route className="size-3 text-sky-600 dark:text-sky-400" />
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium truncate max-w-[200px]">{t.route}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><MapPin className="size-2 text-emerald-500" />{t.startPoint}</span>}
                          {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2 text-red-500" />{t.endPoint}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {t.cargo && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Package className="size-2" />{t.cargo}{t.cargoWeight != null ? ` • ${t.cargoWeight} т` : ''}</span>}
                          {t.crew && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="size-2" />{t.crew.name}</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden sm:table-cell text-muted-foreground">
                        <div className="truncate max-w-[120px]">{t.equipment?.name || '—'}</div>
                        {t.equipment?.registrationNum && <div className="text-[10px] font-mono">{t.equipment.registrationNum}</div>}
                      </td>
                      <td className="py-1.5 px-2">{statusBadge(t.status, TRIP_STATUS_MAP)}</td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <span className="cursor-pointer hover:text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onOpenDetail(t) }}>{formatDateTime(t.startDate)}</span>
                          {t.startDate && t.equipmentId && (
                            <Button size="sm" variant="ghost" className="size-5 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onOpenDetail(t, true) }} title="Показать трек">
                              <Map className="size-3 text-sky-500" />
                            </Button>
                          )}
                        </div>
                        {t.tripDuration != null && <div className="text-[9px] text-muted-foreground"><Timer className="inline size-2 mr-0.5" />{formatDurationShort(t.tripDuration)}</div>}
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
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {t.startDate && t.equipmentId && (
                            <Button size="sm" variant="ghost" className="size-6 p-0 text-sky-500 hover:text-sky-600" onClick={() => onOpenDetail(t, true)} title="Показать трек на карте">
                              <MapPinned className="size-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(t)}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
})

