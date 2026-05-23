'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, Plus, Search, Edit, Trash2, Phone, Mail, Car, Wrench,
  UserCircle, Weight, User
} from 'lucide-react'
import type { Employee, Crew } from '@/lib/types'
import { EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP } from '@/lib/constants'
import { formatDate, formatPrice, statusBadge, TypeBadge, PaginationControls, downloadCSV } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES TAB — Сотрудники (водители, техники)
// ═══════════════════════════════════════════════════════════════

export const EmployeesTab = React.memo(function EmployeesTab({ employees, crews, empSearch, setEmpSearch, empPositionFilter, setEmpPositionFilter, empStatusFilter, setEmpStatusFilter, onOpenDetail, onAdd, onEdit, onDelete }: {
  employees: Employee[]; crews: Crew[];
  empSearch: string; setEmpSearch: (v: string) => void;
  empPositionFilter: string; setEmpPositionFilter: (v: string) => void;
  empStatusFilter: string; setEmpStatusFilter: (v: string) => void;
  onOpenDetail: (emp: Employee) => void; onAdd: () => void;
  onEdit: (emp: Employee) => void; onDelete: (emp: Employee) => void;
}) {
  const debouncedSearch = useDebounce(empSearch, 300)

  const filtered = useMemo(() => employees.filter(e => {
    if (empPositionFilter !== 'all' && e.position !== empPositionFilter) return false
    if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!e.fullName.toLowerCase().includes(q) && !(e.phone || '').toLowerCase().includes(q) && !(e.licenseNum || '').toLowerCase().includes(q) && !(e.email || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [employees, empPositionFilter, empStatusFilter, debouncedSearch])

  const driverCount = employees.filter(e => e.position === 'driver' && e.status === 'active').length
  const mechanicCount = employees.filter(e => e.position === 'mechanic' && e.status === 'active').length
  const activeCount = employees.filter(e => e.status === 'active').length

  const getPositionIcon = (pos: string) => EMPLOYEE_POSITION_MAP[pos]?.icon || <User className="size-3.5" />
  const getPositionColor = (pos: string) => {
    const p = EMPLOYEE_POSITION_MAP[pos]
    return p ? `${p.color} ${p.darkColor}` : 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400'
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
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
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО, телефону, ВУ..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={empPositionFilter} onValueChange={setEmpPositionFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Должность" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все должности</SelectItem>
            {Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={empStatusFilter} onValueChange={setEmpStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Сотрудник</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(e => ({ ФИО: e.fullName, Должность: EMPLOYEE_POSITION_MAP[e.position]?.label || e.position, Телефон: e.phone || '', Email: e.email || '', Статус: EMPLOYEE_STATUS_MAP[e.status]?.label || e.status, 'Дата приёма': formatDate(e.hireDate), 'Категория ВУ': e.licenseCat || '', Экипаж: e.crew?.name || '' })), 'employees')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length} из {employees.length}</p>

      {/* Employee list */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Users className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Сотрудники не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте водителей и техников для управления персоналом</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-2 font-medium w-8"></th>
                  <th className="text-left py-1.5 px-2 font-medium">ФИО</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Должность</th>
                  <th className="text-left py-1.5 px-2 font-medium">Статус</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Телефон</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">ВУ / Кат.</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Техника</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Стаж</th>
                  <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const statusInfo = EMPLOYEE_STATUS_MAP[emp.status]
                  const posInfo = EMPLOYEE_POSITION_MAP[emp.position]
                  const licenseExpiring = emp.licenseExpiry && new Date(emp.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(emp.licenseExpiry) >= new Date()
                  const licenseExpired = emp.licenseExpiry && new Date(emp.licenseExpiry) < new Date()
                  const tenure = emp.hireDate ? Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
                  const tenureMonths = emp.hireDate ? Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)) : null
                  const repairCount = emp.repairAssignments?.length || 0
                  return (
                    <tr key={emp.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${statusInfo?.border || 'border-l-gray-300'} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(emp)}>
                      <td className="py-1.5 px-2">
                        <div className={`flex items-center justify-center size-6 rounded-full text-[8px] font-bold ${getPositionColor(emp.position)}`}>
                          {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium truncate max-w-[200px]">{emp.fullName}</div>
                        <div className="flex items-center gap-1 mt-0.5">
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
                        {emp.phone ? <a href={`tel:${emp.phone}`} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5" onClick={e => e.stopPropagation()}><Phone className="size-2.5" />{emp.phone}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        <span className="font-mono">{emp.licenseNum || '—'}</span>
                        {emp.licenseCat && <span className="ml-1 text-[9px] text-muted-foreground">кат. {emp.licenseCat}</span>}
                        {licenseExpired && <AlertTriangle className="inline size-2.5 text-red-500 ml-0.5" />}
                        {licenseExpiring && !licenseExpired && <Clock className="inline size-2.5 text-amber-500 ml-0.5" />}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
                        {emp.equipment ? <span className="inline-flex items-center gap-0.5"><Truck className="size-2" />{emp.equipment.name}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 hidden lg:table-cell text-muted-foreground">
                        {tenure != null ? <span>{tenure > 0 ? `${tenure} г.` : `${tenureMonths} мес.`}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
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
    </div>
  )
})

