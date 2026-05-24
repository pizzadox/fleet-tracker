'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Wrench, Plus, Search, Clock, XCircle, CheckCircle2, AlertTriangle,
  Truck, ArrowRight, ClipboardList, Filter, ListFilter, ArrowUp, ArrowDown,
  Calendar, Camera, DollarSign, FileDown, Flag, LayoutGrid, List, Pause, Phone,
  ShieldCheck, Trash2, Users
} from 'lucide-react'
import type { Repair, Equipment } from '@/lib/types'
import { REPAIR_STATUS_MAP, REPAIR_PRIORITY_MAP, REPAIR_TYPE_MAP } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, statusBadge, getStageProgress, downloadCSV, PaginationControls, useDebounce } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// REPAIRS TAB
// ═══════════════════════════════════════════════════════════════

export const RepairsTab = React.memo(function RepairsTab({ repairs, equipment, onOpenDetail, onAdd, onDelete, readOnly }: {
  repairs: Repair[]; equipment: Equipment[];
  onOpenDetail: (r: Repair) => void; onAdd: (eqId?: string) => void;
  onDelete: (r: Repair) => void;
  readOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'expensive' | 'critical' | 'warranty' | 'noContractor' | 'paused'>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortField, setSortField] = useState<string>('startDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [batchAction, setBatchAction] = useState<string>('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    let result = repairs.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (eqFilter !== 'all' && r.equipmentId !== eqFilter) return false
      if (debouncedSearch && !r.description.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(r.equipment?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()))) return false
      if (quickFilter === 'overdue') { if (r.status !== 'in_progress' || !r.estimatedEndDate || new Date(r.estimatedEndDate) >= new Date()) return false }
      else if (quickFilter === 'expensive' && (r.cost || 0) < 50000) return false
      else if (quickFilter === 'critical') { if (r.priority !== 'critical') return false }
      else if (quickFilter === 'warranty') { if (!r.warrantyRepair) return false }
      else if (quickFilter === 'noContractor') { if (r.contractor) return false }
      else if (quickFilter === 'paused') { if (r.status !== 'paused') return false }
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
      if (typeFilter !== 'all' && r.repairType !== typeFilter) return false
      return true
    })
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'startDate': aVal = new Date(a.startDate).getTime(); bVal = new Date(b.startDate).getTime(); break
        case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break
        case 'description': aVal = a.description.toLowerCase(); bVal = b.description.toLowerCase(); break
        case 'priority': { const po: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }; aVal = po[a.priority] || 0; bVal = po[b.priority] || 0; break }
        case 'status': { const so: Record<string, number> = { in_progress: 4, paused: 3, completed: 2, cancelled: 1 }; aVal = so[a.status] || 0; bVal = so[b.status] || 0; break }
        default: aVal = new Date(a.startDate).getTime(); bVal = new Date(b.startDate).getTime()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [repairs, statusFilter, eqFilter, debouncedSearch, quickFilter, priorityFilter, typeFilter, sortField, sortDir])

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0)
  const avgCost = filtered.length > 0 ? totalCost / filtered.length : 0
  const inProgress = filtered.filter(r => r.status === 'in_progress').length
  const completedThisMonth = filtered.filter(r => r.status === 'completed' && r.endDate && new Date(r.endDate).getMonth() === new Date().getMonth()).length
  const avgDuration = filtered.filter(r => r.status === 'completed' && r.endDate).reduce((sum, r) => {
    return sum + Math.ceil((new Date(r.endDate!).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24))
  }, 0) / Math.max(1, filtered.filter(r => r.status === 'completed' && r.endDate).length)

  // Most repaired equipment top-3
  const eqRepairCount: Record<string, number> = {}
  for (const r of filtered) { if (r.equipmentId) eqRepairCount[r.equipmentId] = (eqRepairCount[r.equipmentId] || 0) + 1 }
  const topRepaired = Object.entries(eqRepairCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const getRepairDays = (startDate: string, endDate?: string | null) => {
    const end = endDate ? new Date(endDate) : new Date()
    return Math.ceil((end.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDaysColor = (days: number) => {
    if (days < 7) return 'text-emerald-600 dark:text-emerald-400'
    if (days <= 14) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(r => r.id)))
  }

  const handleBatchAction = async () => {
    if (selectedIds.size === 0 || !batchAction) return
    try {
      if (batchAction === 'delete') {
        for (const id of selectedIds) { await fetch(`/api/repairs/${id}`, { method: 'DELETE' }) }
        toast.success(`Удалено ${selectedIds.size} ремонтов`)
      } else {
        for (const id of selectedIds) { await fetch(`/api/repairs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: batchAction }) }) }
        toast.success(`Статус изменён для ${selectedIds.size} ремонтов`)
      }
      setSelectedIds(new Set())
      setBatchAction('')
      // Refresh
      window.location.reload()
    } catch { toast.error('Ошибка пакетной операции') }
  }

  const priorityDotColor: Record<string, string> = { low: 'bg-gray-400', medium: 'bg-sky-500', high: 'bg-amber-500', critical: 'bg-red-500' }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left py-1.5 px-2 font-medium cursor-pointer hover:bg-muted/80 transition-colors select-none" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{children}{sortField === field && (sortDir === 'asc' ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />)}</span>
    </th>
  )

  return (
    <div className="space-y-3">
      {/* Statistics dashboard */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Всего</p><p className="text-sm font-bold">{filtered.length}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-900/20 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">В процессе</p><p className="text-sm font-bold text-amber-600 dark:text-amber-400">{inProgress}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-900/20 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Завершено (мес.)</p><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{completedThisMonth}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Общая стоимость</p><p className="text-xs font-bold">{formatPrice(totalCost)}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Ср. стоимость</p><p className="text-xs font-bold">{formatPrice(avgCost)}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Ср. длит. (дн.)</p><p className="text-sm font-bold">{avgDuration > 0 ? avgDuration.toFixed(1) : '—'}</p></CardContent></Card>
        </div>
      )}

      {/* Top repaired equipment */}
      {topRepaired.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Чаще в ремонте:</span>
          {topRepaired.map(([eqId, count], i) => {
            const eq = equipment.find(e => e.id === eqId)
            return eq ? <span key={eqId} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-muted">{i + 1}. {eq.name} ({count})</span> : null
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по описанию..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm"><SelectValue placeholder="Приоритет" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {Object.entries(REPAIR_PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(REPAIR_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(r => ({ Описание: r.description, Причина: r.reason || '', Техника: r.equipment?.name || '', Статус: REPAIR_STATUS_MAP[r.status]?.label || r.status, Приоритет: REPAIR_PRIORITY_MAP[r.priority]?.label || '', Тип: REPAIR_TYPE_MAP[r.repairType]?.label || '', 'Дата начала': formatDate(r.startDate), 'Дата окончания': formatDate(r.endDate), Стоимость: r.cost || 0, Подрядчик: r.contractor || '' })), 'repairs')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setQuickFilter('all')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Все</button>
        <button onClick={() => setQuickFilter('overdue')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'overdue' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200'}`}><AlertTriangle className="size-2.5" />Просроченные</button>
        <button onClick={() => setQuickFilter('critical')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}><Flag className="size-2.5" />Срочные</button>
        <button onClick={() => setQuickFilter('warranty')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'warranty' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'}`}><ShieldCheck className="size-2.5" />Гарантийные</button>
        <button onClick={() => setQuickFilter('paused')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'paused' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}><Pause className="size-2.5" />Приостановленные</button>
        <button onClick={() => setQuickFilter('noContractor')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'noContractor' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400'}`}>Без подрядчика</button>
        <button onClick={() => setQuickFilter('expensive')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'expensive' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}><DollarSign className="size-2.5" />&gt;50к ₽</button>
        {/* View mode toggle */}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setViewMode('table')} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><List className="size-3" /></button>
          <button onClick={() => setViewMode('kanban')} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] transition-colors ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><LayoutGrid className="size-3" /></button>
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
          <span className="text-xs font-medium">Выбрано: {selectedIds.size}</span>
          <Select value={batchAction} onValueChange={setBatchAction}>
            <SelectTrigger className="h-7 w-[150px] text-[11px]"><SelectValue placeholder="Действие..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Завершить</SelectItem>
              <SelectItem value="paused">Приостановить</SelectItem>
              <SelectItem value="cancelled">Отменить</SelectItem>
              <SelectItem value="delete">Удалить</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-[11px] gap-1" onClick={handleBatchAction} disabled={!batchAction}><CheckCircle2 className="size-3" />Применить</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSelectedIds(new Set())}>Снять</Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {/* Kanban view */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['in_progress', 'paused', 'completed', 'cancelled'] as const).map(status => {
            const items = filtered.filter(r => r.status === status)
            const info = REPAIR_STATUS_MAP[status]
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${info?.color || ''}`}>{info?.label || status}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[60dvh] overflow-y-auto">
                  {items.map(r => (
                    <div key={r.id} className="rounded-lg border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onOpenDetail(r)}>
                      <div className="flex items-start gap-1.5 mb-1">
                        {r.priority && priorityDotColor[r.priority] && <span className={`mt-1 size-2 rounded-full shrink-0 ${priorityDotColor[r.priority]}`} />}
                        <p className="text-xs font-medium line-clamp-2">{r.description}</p>
                      </div>
                      {r.equipment?.name && <p className="text-[10px] text-muted-foreground truncate">{r.equipment.name}</p>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                        <span>{formatDate(r.startDate)}</span>
                        {r.cost != null && <span className="font-medium text-foreground">₽{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span>}
                        {r.repairType && REPAIR_TYPE_MAP[r.repairType] && <span className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-medium ${REPAIR_TYPE_MAP[r.repairType].color}`}>{REPAIR_TYPE_MAP[r.repairType].label}</span>}
                      </div>
                      {r.estimatedEndDate && r.status === 'in_progress' && new Date(r.estimatedEndDate) < new Date() && <span className="flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium mt-0.5"><AlertTriangle className="size-2" />Просрочен</span>}
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">Пусто</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <>
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Wrench className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Ремонты не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Измените фильтры или добавьте новый ремонт</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-2">
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(r => {
              const repairDays = getRepairDays(r.startDate, r.endDate)
              const isOverdue = r.status === 'in_progress' && r.estimatedEndDate && new Date(r.estimatedEndDate) < new Date()
              return (
                <div key={r.id} className="rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px]"
                  style={{ borderLeftColor: r.status === 'in_progress' ? '#f59e0b' : r.status === 'completed' ? '#10b981' : r.status === 'paused' ? '#3b82f6' : '#ef4444' }}
                  onClick={() => onOpenDetail(r)}>
                  <div className="flex items-start gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} onClick={e => e.stopPropagation()} className="size-4" />
                      <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {r.priority && priorityDotColor[r.priority] && <span className={`size-2 rounded-full ${priorityDotColor[r.priority]}`} />}
                        <p className="text-sm font-medium truncate">{r.description}</p>
                      </div>
                      {r.equipment?.name && <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1"><Truck className="size-3" />{r.equipment.name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge(r.status, REPAIR_STATUS_MAP)}
                      {r.repairType && REPAIR_TYPE_MAP[r.repairType] && <span className="mt-0.5">{statusBadge(r.repairType, REPAIR_TYPE_MAP)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-[44px] text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(r.startDate)}</span>
                    {r.cost != null && <span className="flex items-center gap-0.5 font-medium text-foreground"><span className="text-[9px]">₽</span>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span>}
                    <span className={`flex items-center gap-1 font-medium ${r.status === 'in_progress' ? getDaysColor(repairDays) : ''}`}><Clock className="size-3" />{repairDays} дн.</span>
                    {isOverdue && <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-3" />Просрочен</span>}
                    {r.stages && r.stages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span>{r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                        <Progress value={getStageProgress(r.stages)} className="h-1 w-12 inline-flex" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="py-1.5 px-2 w-8"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></th>
                    <SortHeader field="description">Описание</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Техника</th>
                    <SortHeader field="status">Статус</SortHeader>
                    <SortHeader field="priority">Приоритет</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Тип</th>
                    <SortHeader field="startDate">Начало</SortHeader>
                    <SortHeader field="cost">Стоимость</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Дней</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Подрядчик</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Этапы</th>
                    <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, idx) => {
                    const borderColor = r.status === 'in_progress' ? 'border-l-amber-500' : r.status === 'completed' ? 'border-l-emerald-500' : r.status === 'paused' ? 'border-l-blue-500' : 'border-l-red-500'
                    const repairDays = getRepairDays(r.startDate, r.endDate)
                    const isOverdue = r.status === 'in_progress' && r.estimatedEndDate && new Date(r.estimatedEndDate) < new Date()
                    const costDeviation = r.estimatedCost && r.cost ? Math.round(((r.cost - r.estimatedCost) / r.estimatedCost) * 100) : null
                    return (
                      <tr key={r.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${borderColor} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(r)}>
                        <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="size-4" />
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            {r.priority && priorityDotColor[r.priority] && <span className={`size-2 rounded-full shrink-0 ${priorityDotColor[r.priority]}`} title={REPAIR_PRIORITY_MAP[r.priority]?.label} />}
                            <div className="font-medium truncate max-w-[200px]">{r.description}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {r.reason && <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{r.reason}</span>}
                            {r.masters && r.masters.length > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="size-2" />{r.masters.length}</span>}
                            {r.photos && r.photos.length > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Camera className="size-2" />{r.photos.length}</span>}
                            {isOverdue && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-2" />Просрочен</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">{r.equipment?.name || '—'}</td>
                        <td className="py-1.5 px-2">{statusBadge(r.status, REPAIR_STATUS_MAP)}</td>
                        <td className="py-1.5 px-2">{r.priority && REPAIR_PRIORITY_MAP[r.priority] ? statusBadge(r.priority, REPAIR_PRIORITY_MAP as any) : '—'}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">{r.repairType && REPAIR_TYPE_MAP[r.repairType] ? statusBadge(r.repairType, REPAIR_TYPE_MAP) : '—'}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">{formatDate(r.startDate)}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">
                          <div>
                            {r.cost != null ? <span className="inline-flex items-center gap-0.5 font-medium"><span className="text-[9px]">₽</span>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span> : '—'}
                            {costDeviation != null && costDeviation !== 0 && <span className={`block text-[9px] ${costDeviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{costDeviation > 0 ? '+' : ''}{costDeviation}%</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden lg:table-cell">
                          <span className={`font-medium ${r.status === 'in_progress' ? getDaysColor(repairDays) : ''}`}>{repairDays} дн.</span>
                        </td>
                        <td className="py-1.5 px-2 hidden lg:table-cell">
                          {r.contractor ? (
                            <div className="truncate max-w-[100px]">
                              <span className="text-muted-foreground">{r.contractor}</span>
                              {r.contractorPhone && <span className="block text-[9px] text-muted-foreground"><Phone className="inline size-2 mr-0.5" />{r.contractorPhone}</span>}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 px-2 hidden sm:table-cell">
                          {r.stages && r.stages.length > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                                <span className="font-medium">{getStageProgress(r.stages)}%</span>
                              </div>
                              <Progress value={getStageProgress(r.stages)} className="h-1" />
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(r)}><Trash2 className="size-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </>
      )}
      {filtered.length > PAGE_SIZE && (
        <PaginationControls page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
})

