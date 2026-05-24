'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import {
  Users, Plus, Search, Edit, Trash2, Phone, Mail, Car, Wrench,
  UserCircle, Weight, User, AlertTriangle, Clock, FileDown, Truck,
  Eye, ChevronUp, ChevronDown, ArrowUpDown, Calendar, X,
  Filter, SlidersHorizontal, Briefcase, DollarSign, TrendingUp
} from 'lucide-react'
import type { Employee, Crew } from '@/lib/types'
import { EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP } from '@/lib/constants'
import { formatDate, formatPrice, statusBadge, TypeBadge, PaginationControls, downloadCSV, useDebounce } from '@/lib/utils'
import { PanelSection, PanelConfigContext, PanelManagerDialog, PanelManagerButton, useTabPanels } from '@/components/panels'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES TAB — 20 improvements (#26-45)
// ═══════════════════════════════════════════════════════════════

type SortField = 'fullName' | 'position' | 'status' | 'phone' | 'hireDate' | 'salary'
type SortDir = 'asc' | 'desc'
type ViewMode = 'table' | 'cards'

export const EmployeesTab = React.memo(function EmployeesTab({ employees, crews, empSearch, setEmpSearch, empPositionFilter, setEmpPositionFilter, empStatusFilter, setEmpStatusFilter, onOpenDetail, onAdd, onEdit, onDelete }: {
  employees: Employee[]; crews: Crew[];
  empSearch: string; setEmpSearch: (v: string) => void;
  empPositionFilter: string; setEmpPositionFilter: (v: string) => void;
  empStatusFilter: string; setEmpStatusFilter: (v: string) => void;
  onOpenDetail: (emp: Employee) => void; onAdd: () => void;
  onEdit: (emp: Employee) => void; onDelete: (emp: Employee) => void;
}) {
  const debouncedSearch = useDebounce(empSearch, 300)
  // #26 Crew filter
  const [crewFilter, setCrewFilter] = useState('all')
  // #30 Sorting
  const [sortField, setSortField] = useState<SortField>('fullName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  // #31 View toggle
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  // #33 Pagination
  const [page, setPage] = useState(1)
  const pageSize = 25

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let result = employees.filter(e => {
      if (empPositionFilter !== 'all' && e.position !== empPositionFilter) return false
      if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false
      // #26 Crew filter
      if (crewFilter !== 'all') {
        if (crewFilter === '_none') { if (e.crewId) return false }
        else { if (e.crewId !== crewFilter) return false }
      }
      // #38 Search by crew name
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const crewName = e.crew?.name?.toLowerCase() || ''
        if (!e.fullName.toLowerCase().includes(q) && !(e.phone || '').toLowerCase().includes(q) && !(e.licenseNum || '').toLowerCase().includes(q) && !(e.email || '').toLowerCase().includes(q) && !crewName.includes(q)) return false
      }
      return true
    })
    // #30 Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'fullName': cmp = a.fullName.localeCompare(b.fullName); break
        case 'position': cmp = a.position.localeCompare(b.position); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'hireDate': cmp = (a.hireDate || '').localeCompare(b.hireDate || ''); break
        case 'salary': cmp = (a.salary || 0) - (b.salary || 0); break
        default: cmp = 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [employees, empPositionFilter, empStatusFilter, crewFilter, debouncedSearch, sortField, sortDir])

  // Paginated
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // #28 License expiry dashboard
  const licenseExpired = employees.filter(e => e.licenseExpiry && new Date(e.licenseExpiry) < new Date())
  const licenseExpiringSoon = employees.filter(e => e.licenseExpiry && new Date(e.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(e.licenseExpiry) >= new Date())

  // #29 Salary stats
  const activeSalaries = employees.filter(e => e.status === 'active' && e.salary)
  const totalSalary = activeSalaries.reduce((s, e) => s + (e.salary || 0), 0)
  const avgSalary = activeSalaries.length > 0 ? Math.round(totalSalary / activeSalaries.length) : 0

  const driverCount = employees.filter(e => e.position === 'driver' && e.status === 'active').length
  const mechanicCount = employees.filter(e => e.position === 'mechanic' && e.status === 'active').length
  const activeCount = employees.filter(e => e.status === 'active').length
  // #40 Age calculation
  const getAge = (birthDate?: string | null) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  // #35 Relative time for hire date
  const getRelativeHire = (hireDate?: string | null) => {
    if (!hireDate) return null
    const years = Math.floor((Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    const months = Math.floor((Date.now() - new Date(hireDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    if (years > 0) return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
    if (months > 0) return `${months} мес.`
    return '< 1 мес.'
  }

  // #36 License expiry progress
  const getLicenseProgress = (expiry?: string | null) => {
    if (!expiry) return null
    const now = Date.now()
    const expiryDate = new Date(expiry).getTime()
    const tenYears = 10 * 365.25 * 24 * 60 * 60 * 1000 // Typical license validity
    const startDate = expiryDate - tenYears
    const progress = Math.max(0, Math.min(100, ((now - startDate) / tenYears) * 100))
    const isExpired = now > expiryDate
    const isExpiring = !isExpired && (expiryDate - now) < 30 * 24 * 60 * 60 * 1000
    return { progress, isExpired, isExpiring }
  }

  const getPositionIcon = (pos: string) => EMPLOYEE_POSITION_MAP[pos]?.icon || <User className="size-3.5" />
  const getPositionColor = (pos: string) => {
    const p = EMPLOYEE_POSITION_MAP[pos]
    return p ? `${p.color} ${p.darkColor}` : 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400'
  }

  // #37 Count per position in filter
  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    employees.forEach(e => { counts[e.position] = (counts[e.position] || 0) + 1 })
    return counts
  }, [employees])

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field ? (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : null
  )

  // Reset page on filter changes
  React.useEffect(() => { setPage(1) }, [empPositionFilter, empStatusFilter, crewFilter, debouncedSearch])

  // #42 Skeleton loading state
  const [loading, setLoading] = React.useState(false)
  const { panelConfig, panelManagerOpen, setPanelManagerOpen, contextValue } = useTabPanels('employees')

  return (
    <PanelConfigContext.Provider value={contextValue}>
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <PanelSection panelKey="emp_stats">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <Card className="border-0 shadow-none bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Car className="size-4 text-blue-600 dark:text-blue-400" /></div>
            <div><p className="text-lg font-bold text-blue-700 dark:text-blue-400">{driverCount}</p><p className="text-[10px] text-muted-foreground">Водителей</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Wrench className="size-4 text-amber-600 dark:text-amber-400" /></div>
            <div><p className="text-lg font-bold text-amber-700 dark:text-amber-400">{mechanicCount}</p><p className="text-[10px] text-muted-foreground">Техников</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Users className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</p><p className="text-[10px] text-muted-foreground">Всего активных</p></div>
          </CardContent>
        </Card>
        {/* #28 License expiry dashboard */}
        <Card className="border-0 shadow-none bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-red-100 dark:bg-red-900/40 flex items-center justify-center"><AlertTriangle className="size-4 text-red-600 dark:text-red-400" /></div>
            <div><p className="text-lg font-bold text-red-700 dark:text-red-400">{licenseExpired.length}</p><p className="text-[10px] text-muted-foreground">ВУ истекло</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20 hidden sm:block">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="size-4 text-amber-600 dark:text-amber-400" /></div>
            <div><p className="text-lg font-bold text-amber-700 dark:text-amber-400">{licenseExpiringSoon.length}</p><p className="text-[10px] text-muted-foreground">ВУ истекает</p></div>
          </CardContent>
        </Card>
      </div>

      {/* #29 Salary stats */}
      {totalSalary > 0 && (
        <div className="flex gap-3 text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1"><DollarSign className="size-3" />ФОТ: <span className="font-medium text-foreground">{formatPrice(totalSalary)}</span></span>
          <span>Средняя: <span className="font-medium text-foreground">{formatPrice(avgSalary)}</span></span>
        </div>
      )}
      </PanelSection>

      {/* Filters */}
      <PanelSection panelKey="emp_filters" noCollapse>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО, телефону, ВУ, экипажу..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        {/* #37 Position filter with counts */}
        <Select value={empPositionFilter} onValueChange={setEmpPositionFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Должность" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все должности ({employees.length})</SelectItem>
            {Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} ({positionCounts[k] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={empStatusFilter} onValueChange={setEmpStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* #26 Crew filter */}
        <Select value={crewFilter} onValueChange={setCrewFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Экипаж" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все экипажи</SelectItem>
            <SelectItem value="_none">Без экипажа</SelectItem>
            {crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Сотрудник</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(e => ({ ФИО: e.fullName, Должность: EMPLOYEE_POSITION_MAP[e.position]?.label || e.position, Телефон: e.phone || '', Email: e.email || '', Статус: EMPLOYEE_STATUS_MAP[e.status]?.label || e.status, 'Дата приёма': formatDate(e.hireDate), 'Категория ВУ': e.licenseCat || '', 'Срок ВУ': formatDate(e.licenseExpiry), Экипаж: e.crew?.name || '', Зарплата: e.salary || '' })), 'employees')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
        {/* #31 View toggle */}
        <div className="hidden sm:flex items-center border rounded-md">
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'ghost'} className="h-7 px-2 rounded-r-none" onClick={() => setViewMode('table')}><SlidersHorizontal className="size-3" /></Button>
          <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'ghost'} className="h-7 px-2 rounded-l-none" onClick={() => setViewMode('cards')}><Users className="size-3" /></Button>
        </div>
        <PanelManagerButton panelConfig={panelConfig} onClick={() => setPanelManagerOpen(true)} />
      </div>
      </PanelSection>

      <PanelSection panelKey="emp_list" noCollapse>
      <p className="text-xs text-muted-foreground">Найдено: {filtered.length} из {employees.length}</p>

      {/* Employee list */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Users className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Сотрудники не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте водителей и техников для управления персоналом</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={onAdd}><Plus className="size-3.5" />Добавить сотрудника</Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* #39 Mobile card view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {paginated.map(emp => {
            const statusInfo = EMPLOYEE_STATUS_MAP[emp.status]
            const posInfo = EMPLOYEE_POSITION_MAP[emp.position]
            const licenseProg = getLicenseProgress(emp.licenseExpiry)
            const age = getAge(emp.birthDate)
            const relHire = getRelativeHire(emp.hireDate)
            return (
              <Card key={emp.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-2 ${statusInfo?.border || 'border-l-gray-300'}`} onClick={() => onOpenDetail(emp)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* #34 Avatar with position-colored initials */}
                    <div className={`flex items-center justify-center size-9 rounded-full text-[10px] font-bold ${getPositionColor(emp.position)}`}>
                      {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{emp.fullName}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                        {statusBadge(emp.status, EMPLOYEE_STATUS_MAP)}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" className="size-6 p-0" onClick={e => { e.stopPropagation(); onEdit(emp) }}><Edit className="size-3" /></Button>
                      <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(emp) }}><Trash2 className="size-3" /></Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {/* #32 Quick actions: call, email */}
                    <div><span className="text-muted-foreground">Тел.:</span> {emp.phone ? <a href={`tel:${emp.phone}`} className="font-medium hover:text-primary" onClick={e => e.stopPropagation()}>{emp.phone}</a> : '—'}</div>
                    <div><span className="text-muted-foreground">ВУ:</span> <span className="font-mono">{emp.licenseNum || '—'}</span></div>
                    <div><span className="text-muted-foreground">Экипаж:</span> <span className="font-medium">{emp.crew?.name || '—'}</span></div>
                    {/* #40 Age display */}
                    <div><span className="text-muted-foreground">Возраст:</span> <span className="font-medium">{age ? `${age} лет` : '—'}</span></div>
                    <div><span className="text-muted-foreground">Техника:</span> <span className="font-medium truncate">{emp.equipment?.name || '—'}</span></div>
                    {/* #35 Relative hire time */}
                    <div><span className="text-muted-foreground">Стаж:</span> <span className="font-medium">{relHire || '—'}</span></div>
                  </div>
                  {/* #36 License expiry progress bar */}
                  {licenseProg && (
                    <div>
                      <div className="flex items-center justify-between text-[9px] mb-0.5">
                        <span className={licenseProg.isExpired ? 'text-red-500 font-medium' : licenseProg.isExpiring ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>ВУ: {formatDate(emp.licenseExpiry)}</span>
                        {licenseProg.isExpired && <span className="text-red-500">Истекло!</span>}
                        {licenseProg.isExpiring && <span className="text-amber-500">Истекает</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${licenseProg.isExpired ? 'bg-red-500' : licenseProg.isExpiring ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, licenseProg.progress)}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table view */
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-2 font-medium w-8"></th>
                  <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('fullName')}>ФИО <SortIcon field="fullName" /></th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('position')}>Должность <SortIcon field="position" /></th>
                  <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}>Статус <SortIcon field="status" /></th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Телефон</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">ВУ / Кат.</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Техника</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('hireDate')}>Стаж <SortIcon field="hireDate" /></th>
                  <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp, idx) => {
                  const statusInfo = EMPLOYEE_STATUS_MAP[emp.status]
                  const posInfo = EMPLOYEE_POSITION_MAP[emp.position]
                  const licenseExpiring = emp.licenseExpiry && new Date(emp.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(emp.licenseExpiry) >= new Date()
                  const licenseExpired = emp.licenseExpiry && new Date(emp.licenseExpiry) < new Date()
                  const relHire = getRelativeHire(emp.hireDate)
                  const repairCount = emp.repairAssignments?.length || 0
                  const licenseProg = getLicenseProgress(emp.licenseExpiry)
                  return (
                    <tr key={emp.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${statusInfo?.border || 'border-l-gray-300'} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(emp)}>
                      <td className="py-1.5 px-2">
                        {/* #34 Avatar with position-colored initials */}
                        <div className={`flex items-center justify-center size-6 rounded-full text-[8px] font-bold ${getPositionColor(emp.position)}`}>
                          {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium truncate max-w-[200px]">{emp.fullName}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={`sm:hidden inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                          {licenseExpired && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-2.5" />ВУ истекло!</span>}
                          {licenseExpiring && !licenseExpired && <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400 font-medium"><Clock className="size-2.5" />ВУ истекает</span>}
                          {repairCount > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Wrench className="size-2" />{repairCount}</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[10px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                      </td>
                      <td className="py-1.5 px-2">{statusBadge(emp.status, EMPLOYEE_STATUS_MAP)}</td>
                      <td className="py-1.5 px-2 hidden sm:table-cell">
                        {/* #32 Quick action: phone link */}
                        {emp.phone ? <a href={`tel:${emp.phone}`} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5" onClick={e => e.stopPropagation()}><Phone className="size-2.5" />{emp.phone}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        <div>
                          <span className="font-mono">{emp.licenseNum || '—'}</span>
                          {emp.licenseCat && <span className="ml-1 text-[9px] text-muted-foreground">кат. {emp.licenseCat}</span>}
                          {licenseExpired && <AlertTriangle className="inline size-2.5 text-red-500 ml-0.5" />}
                          {licenseExpiring && !licenseExpired && <Clock className="inline size-2.5 text-amber-500 ml-0.5" />}
                        </div>
                        {/* #36 License expiry progress bar */}
                        {licenseProg && (
                          <div className="h-1 rounded-full bg-muted overflow-hidden mt-0.5 w-20">
                            <div className={`h-full rounded-full ${licenseProg.isExpired ? 'bg-red-500' : licenseProg.isExpiring ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, licenseProg.progress)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
                        {emp.equipment ? <span className="inline-flex items-center gap-0.5"><Truck className="size-2" />{emp.equipment.name}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 hidden lg:table-cell text-muted-foreground">
                        {/* #35 Relative hire date */}
                        {relHire ? <span title={formatDate(emp.hireDate)}>{relHire}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onOpenDetail(emp)}><Eye className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onEdit(emp)}><Edit className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(emp)}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* #33 Pagination */}
      {filtered.length > pageSize && (
        <PaginationControls page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPageChange={setPage} />
      )}
      </PanelSection>
    </div>
    <PanelManagerDialog open={panelManagerOpen} onOpenChange={setPanelManagerOpen} tabKey="employees" tabLabel="Сотрудники" panelConfig={panelConfig} />
    </PanelConfigContext.Provider>
  )
})
