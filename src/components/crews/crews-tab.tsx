'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Users, Plus, Search, Edit, Trash2, Phone, Car, Wrench,
  UserCheck, FileDown, Eye, MapPin, Clock, Truck,
  Shield, IdCard, User, ChevronDown, ChevronUp, Star, X
} from 'lucide-react'
import type { Crew, Employee } from '@/lib/types'
import { CREW_TYPE_MAP, MEMBER_ROLE_MAP, EMPLOYEE_POSITION_MAP } from '@/lib/constants'
import { formatDate, downloadCSV, useDebounce, statusBadge } from '@/lib/utils'
import { PanelSection, PanelConfigContext, PanelManagerDialog, PanelManagerButton, useTabPanels } from '@/components/panels'

// ═══════════════════════════════════════════════════════════════
// CREWS TAB — Экипажи (#81-90 improvements)
// Extracted from page.tsx into standalone component
// ═══════════════════════════════════════════════════════════════

type SortField = 'name' | 'type' | 'status' | 'members' | 'createdAt'
type SortDir = 'asc' | 'desc'

const CREW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'Активен', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  inactive: { label: 'Неактивен', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
}

const CREW_TYPE_COLORS: Record<string, string> = {
  driver: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  mechanic: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
  mixed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
}

export const CrewsTab = React.memo(function CrewsTab({ crews, employees, onAdd, onEdit, onDelete }: {
  crews: Crew[]; employees: Employee[];
  onAdd: () => void; onEdit: (c: Crew) => void; onDelete: (c: Crew) => void;
}) {
  // #82 Search/filter
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  // #83 Type filter
  const [typeFilter, setTypeFilter] = useState('all')
  // #84 Status filter
  const [statusFilter, setStatusFilter] = useState('all')
  // #89 Sorting
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  // #85 Detail sheet
  const [detailCrew, setDetailCrew] = useState<Crew | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const { panelConfig, panelManagerOpen, setPanelManagerOpen, contextValue } = useTabPanels('crews')

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let result = crews.filter(c => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const memberNames = (c.members || []).map(m => m.fullName.toLowerCase()).join(' ')
        if (!c.name.toLowerCase().includes(q) && !memberNames.includes(q)) return false
      }
      return true
    })
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = a.type.localeCompare(b.type); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'members': cmp = (a.members?.length || 0) - (b.members?.length || 0); break
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [crews, typeFilter, statusFilter, debouncedSearch, sortField, sortDir])

  // #87 Stats
  const totalCrews = crews.length
  const activeCrews = crews.filter(c => c.status === 'active').length
  const totalMembers = crews.reduce((sum, c) => sum + (c.members?.length || 0), 0)
  const driverCrews = crews.filter(c => c.type === 'driver').length
  const mixedCrews = crews.filter(c => c.type === 'mixed').length

  // #88 CSV export
  const handleExportCSV = () => {
    downloadCSV(crews.map(c => ({
      'Название': c.name,
      'Тип': CREW_TYPE_MAP[c.type] || c.type,
      'Статус': c.status === 'active' ? 'Активен' : 'Неактивен',
      'Описание': c.description || '',
      'Членов': c.members?.length || 0,
      'Участники': (c.members || []).map(m => `${m.fullName} (${MEMBER_ROLE_MAP[m.role] || m.role})`).join('; '),
      'Дата создания': formatDate(c.createdAt),
    })), 'crews')
  }

  const openDetail = (crew: Crew) => {
    setDetailCrew(crew)
    setDetailOpen(true)
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field ? (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : null
  )

  return (
    <PanelConfigContext.Provider value={contextValue}>
    <div className="flex flex-col gap-3">
      {/* #87 Stats header */}
      <PanelSection panelKey="crew_stats">
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-none bg-sky-50 dark:bg-sky-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center"><Users className="size-4 text-sky-600 dark:text-sky-400" /></div>
            <div><p className="text-lg font-bold text-sky-700 dark:text-sky-400">{totalCrews}</p><p className="text-[10px] text-muted-foreground">Всего экипажей</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{activeCrews}</p><p className="text-[10px] text-muted-foreground">Активных</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-violet-50 dark:bg-violet-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><Shield className="size-4 text-violet-600 dark:text-violet-400" /></div>
            <div><p className="text-lg font-bold text-violet-700 dark:text-violet-400">{totalMembers}</p><p className="text-[10px] text-muted-foreground">Всего участников</p></div>
          </CardContent>
        </Card>
      </div>
      </PanelSection>

      {/* #82 Search + #83 Type filter + #84 Status filter */}
      <PanelSection panelKey="crew_filters" noCollapse>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию или участникам..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(CREW_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активен</SelectItem>
            <SelectItem value="inactive">Неактивен</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Экипаж</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={handleExportCSV} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
        <PanelManagerButton panelConfig={panelConfig} onClick={() => setPanelManagerOpen(true)} />
      </div>
      </PanelSection>

      <PanelSection panelKey="crew_list" noCollapse>
      <p className="text-xs text-muted-foreground">Найдено: {filtered.length} из {crews.length}</p>

      {/* #90 Empty state with illustration */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Users className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Экипажи не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Создайте экипаж для назначения рейсов и техники</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={onAdd}><Plus className="size-3.5" />Создать экипаж</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('name')}>Название <SortIcon field="name" /></th>
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('type')}>Тип <SortIcon field="type" /></th>
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}>Статус <SortIcon field="status" /></th>
                    <th className="text-left py-1.5 px-2 font-medium cursor-pointer select-none" onClick={() => toggleSort('members')}>Состав <SortIcon field="members" /></th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Рейсы</th>
                    <th className="text-right py-1.5 px-2 font-medium w-20">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((crew, idx) => (
                    <tr key={crew.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => openDetail(crew)}>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-2">
                          {/* #86 Avatar in row */}
                          <div className={`flex items-center justify-center size-7 rounded-lg shrink-0 ${CREW_TYPE_COLORS[crew.type] || 'bg-gray-100 dark:bg-gray-900/40'}`}>
                            <Users className="size-3.5" />
                          </div>
                          <div>
                            <p className="font-medium">{crew.name}</p>
                            {crew.description && <p className="text-[9px] text-muted-foreground truncate max-w-[180px]">{crew.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${CREW_TYPE_COLORS[crew.type] || ''}`}>{CREW_TYPE_MAP[crew.type] || crew.type}</span>
                      </td>
                      <td className="py-1.5 px-2">{statusBadge(crew.status, CREW_STATUS_MAP)}</td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{crew.members?.length || 0}</span>
                          <span className="text-muted-foreground">чел.</span>
                          {/* #86 Member avatars */}
                          {crew.members && crew.members.length > 0 && (
                            <div className="flex -space-x-1.5 ml-1">
                              {crew.members.slice(0, 3).map((m, i) => (
                                <div key={i} className="size-5 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[7px] font-bold text-primary" title={m.fullName}>
                                  {m.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                              ))}
                              {crew.members.length > 3 && (
                                <div className="size-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[7px] text-muted-foreground">+{crew.members.length - 3}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden lg:table-cell text-muted-foreground">{crew._count?.trips || 0}</td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => openDetail(crew)} aria-label="Просмотр"><Eye className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(crew)} aria-label="Редактировать"><Edit className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(crew)} aria-label="Удалить"><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
            {filtered.map(crew => (
              <Card key={crew.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(crew)}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${CREW_TYPE_COLORS[crew.type] || 'bg-gray-100 dark:bg-gray-900/40'}`}>
                      <Users className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{crew.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`inline-flex items-center rounded px-1 py-0 text-[9px] font-medium ${CREW_TYPE_COLORS[crew.type] || ''}`}>{CREW_TYPE_MAP[crew.type] || crew.type}</span>
                        {statusBadge(crew.status, CREW_STATUS_MAP)}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" className="size-6 p-0" onClick={e => { e.stopPropagation(); onEdit(crew) }}><Edit className="size-3" /></Button>
                      <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(crew) }}><Trash2 className="size-3" /></Button>
                    </div>
                  </div>
                  {crew.description && <p className="text-[10px] text-muted-foreground truncate">{crew.description}</p>}
                  <Separator />
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Членов: <span className="font-medium text-foreground">{crew.members?.length || 0}</span></span>
                    {crew._count?.trips != null && <span className="text-muted-foreground">Рейсов: <span className="font-medium text-foreground">{crew._count.trips}</span></span>}
                  </div>
                  {/* #86 Member avatars in mobile card */}
                  {crew.members && crew.members.length > 0 && (
                    <div className="flex -space-x-1.5 mt-0.5">
                      {crew.members.slice(0, 5).map((m, i) => (
                        <div key={i} className="size-6 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary" title={`${m.fullName} — ${MEMBER_ROLE_MAP[m.role] || m.role}`}>
                          {m.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      ))}
                      {crew.members.length > 5 && (
                        <div className="size-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] text-muted-foreground">+{crew.members.length - 5}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      </PanelSection>

      {/* #85 Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          {detailCrew && (
            <>
              <SheetHeader className="px-4 pt-4 pb-2 border-b">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center size-12 rounded-xl shrink-0 ${CREW_TYPE_COLORS[detailCrew.type] || 'bg-gray-100 dark:bg-gray-900/40'}`}>
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base">{detailCrew.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${CREW_TYPE_COLORS[detailCrew.type] || ''}`}>{CREW_TYPE_MAP[detailCrew.type] || detailCrew.type}</span>
                      {statusBadge(detailCrew.status, CREW_STATUS_MAP)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {detailCrew.description && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Описание</p>
                    <p className="text-xs">{detailCrew.description}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-sm font-bold">{detailCrew.members?.length || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Участников</p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-sm font-bold">{detailCrew._count?.trips || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Рейсов</p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-sm font-bold">{detailCrew.members?.filter(m => m.role === 'driver').length || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Водителей</p>
                  </div>
                </div>

                {/* Members */}
                {detailCrew.members && detailCrew.members.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-2">Состав экипажа</p>
                    <div className="space-y-1.5">
                      {detailCrew.members.map((m, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border bg-card/50">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {m.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.fullName}</p>
                            <p className="text-[9px] text-muted-foreground">{MEMBER_ROLE_MAP[m.role] || m.role}{m.phone ? ` • ${m.phone}` : ''}</p>
                          </div>
                          {m.employeeId && <Badge variant="secondary" className="text-[9px] h-4 px-1"><UserCheck className="size-2.5 mr-0.5" />Сотрудник</Badge>}
                          {m.licenseNum && <span className="text-[9px] text-muted-foreground font-mono">ВУ: {m.licenseNum}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailCrew.notes && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Заметки</p>
                    <p className="text-xs whitespace-pre-wrap">{detailCrew.notes}</p>
                  </div>
                )}

                <div className="text-[9px] text-muted-foreground">
                  Создан: {formatDate(detailCrew.createdAt)} • Обновлён: {formatDate(detailCrew.updatedAt)}
                </div>
              </div>
              <div className="border-t px-4 py-3 flex gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setDetailOpen(false); onEdit(detailCrew) }}><Edit className="size-3.5" />Редактировать</Button>
                <div className="flex-1" />
                <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setDetailOpen(false); onDelete(detailCrew) }}><Trash2 className="size-3.5" />Удалить</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    <PanelManagerDialog open={panelManagerOpen} onOpenChange={setPanelManagerOpen} tabKey="crews" tabLabel="Экипажи" panelConfig={panelConfig} />
    </PanelConfigContext.Provider>
  )
})
