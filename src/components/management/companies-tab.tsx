'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2, Plus, Search, Edit, Trash2, Phone, Mail, FileText,
  FileDown, Shield, Users, Eye, Copy, MapPin, ExternalLink,
  ChevronUp, ChevronDown, ArrowUpDown, Calendar, Briefcase
} from 'lucide-react'
import type { Company } from '@/lib/types'
import { COMPANY_TYPES } from '@/lib/constants'
import { formatDate, downloadCSV, useDebounce, copyToClipboard } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// COMPANIES TAB — 15 improvements (#1-15)
// ═══════════════════════════════════════════════════════════════

type SortField = 'name' | 'type' | 'inn' | 'owned' | 'rented' | 'createdAt'
type SortDir = 'asc' | 'desc'

export const CompaniesTab = React.memo(function CompaniesTab({ companies, onAdd, onEdit, onDelete }: {
  companies: Company[];
  onAdd: () => void; onEdit: (c: Company) => void; onDelete: (c: Company) => void;
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  // #1 Type filter
  const [typeFilter, setTypeFilter] = useState('all')
  // #3 Sorting
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  // #2 Detail view
  const [detailCompany, setDetailCompany] = useState<Company | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let result = companies.filter(c => {
      // #1 Type filter
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
      // Search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !(c.inn || '').includes(q) && !(c.director || '').toLowerCase().includes(q) && !(c.email || '').toLowerCase().includes(q)) return false
      }
      return true
    })
    // #3 Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = a.type.localeCompare(b.type); break
        case 'inn': cmp = (a.inn || '').localeCompare(b.inn || ''); break
        case 'owned': cmp = (a._count?.ownedEquipment || 0) - (b._count?.ownedEquipment || 0); break
        case 'rented': cmp = (a._count?.rentedEquipment || 0) - (b._count?.rentedEquipment || 0); break
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [companies, typeFilter, debouncedSearch, sortField, sortDir])

  // #6 Stats header
  const totalOwned = companies.reduce((s, c) => s + (c._count?.ownedEquipment || 0), 0)
  const totalRented = companies.reduce((s, c) => s + (c._count?.rentedEquipment || 0), 0)
  const ownerCount = companies.filter(c => c.type === 'owner' || c.type === 'both').length
  const renterCount = companies.filter(c => c.type === 'renter' || c.type === 'both').length

  const formatINN = (inn?: string | null) => {
    if (!inn) return '—'
    if (inn.length === 10) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6)}`
    if (inn.length === 12) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6, 8)}-${inn.slice(8)}`
    return inn
  }

  // #7 INN validation visual
  const validateINN = (inn?: string | null): { valid: boolean; hint: string } => {
    if (!inn) return { valid: true, hint: '' }
    if (inn.length === 10 || inn.length === 12) return { valid: true, hint: '' }
    return { valid: false, hint: `ИНН: ${inn.length}/10-12 цифр` }
  }

  const getTypeIcon = (type: string) => {
    if (type === 'owner') return <Shield className="size-3 text-emerald-600 dark:text-emerald-400" />
    if (type === 'renter') return <Users className="size-3 text-sky-600 dark:text-sky-400" />
    return <Building2 className="size-3 text-violet-600 dark:text-violet-400" />
  }

  // #9 Copy INN
  const handleCopyINN = (inn: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    copyToClipboard(inn)
  }

  // #4 Map link for address
  const getMapLink = (address: string) => `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`

  // #15 Enhanced CSV export
  const handleExport = () => {
    downloadCSV(filtered.map(c => ({
      Название: c.name,
      ИНН: c.inn || '',
      КПП: c.kpp || '',
      ОГРН: c.ogrn || '',
      Тип: COMPANY_TYPES[c.type] || c.type,
      Телефон: c.phone || '',
      Email: c.email || '',
      'Юр. адрес': c.address || '',
      'Факт. адрес': c.factAddress || '',
      Директор: c.director || '',
      'Владеет техникой': c._count?.ownedEquipment || 0,
      'Арендует технику': c._count?.rentedEquipment || 0,
      'Дата создания': formatDate(c.createdAt),
    })), 'companies')
  }

  const openDetail = (c: Company) => { setDetailCompany(c); setDetailOpen(true) }

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field ? (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : null
  )

  return (
    <div className="space-y-3">
      {/* #6 Stats header */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Shield className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{totalOwned}</p><p className="text-[10px] text-muted-foreground">Техники владеют</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-sky-50 dark:bg-sky-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center"><Users className="size-4 text-sky-600 dark:text-sky-400" /></div>
            <div><p className="text-lg font-bold text-sky-700 dark:text-sky-400">{totalRented}</p><p className="text-[10px] text-muted-foreground">Техники арендуют</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-violet-50 dark:bg-violet-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><Building2 className="size-4 text-violet-600 dark:text-violet-400" /></div>
            <div><p className="text-lg font-bold text-violet-700 dark:text-violet-400">{companies.length}</p><p className="text-[10px] text-muted-foreground">Всего компаний</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search + #1 Type filter + actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию, ИНН, директору..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(COMPANY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить компанию</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={handleExport} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {filtered.length === 0 ? (
        // #11 Animated empty state
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Building2 className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Компании не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте компанию для управления контрагентами</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={onAdd}><Plus className="size-3.5" />Добавить компанию</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
            {filtered.map(c => {
              const innVal = validateINN(c.inn)
              return (
                <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(c)}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-muted-foreground font-mono">{formatINN(c.inn)}</p>
                          {!innVal.valid && <span className="text-[9px] text-amber-500">{innVal.hint}</span>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                    </div>
                    {c.director && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Briefcase className="size-2.5" />{c.director}</p>}
                    <Separator />
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div><span className="text-muted-foreground">Тел.:</span> {c.phone ? <a href={`tel:${c.phone}`} className="font-medium hover:text-primary" onClick={e => e.stopPropagation()}>{c.phone}</a> : <span className="text-muted-foreground">—</span>}</div>
                      <div><span className="text-muted-foreground">Email:</span> {c.email ? <a href={`mailto:${c.email}`} className="font-medium hover:text-primary truncate" onClick={e => e.stopPropagation()}>{c.email}</a> : <span className="text-muted-foreground">—</span>}</div>
                      <div><span className="text-muted-foreground">Владеет:</span> <span className="font-medium">{c._count?.ownedEquipment || 0}</span></div>
                      <div><span className="text-muted-foreground">Арендует:</span> <span className="font-medium">{c._count?.rentedEquipment || 0}</span></div>
                    </div>
                    {/* #4 Map link for address */}
                    {c.address && (
                      <a href={getMapLink(c.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline" onClick={e => e.stopPropagation()}>
                        <MapPin className="size-2.5" />{c.address.length > 40 ? c.address.slice(0, 40) + '...' : c.address}
                      </a>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={e => { e.stopPropagation(); openDetail(c) }}><Eye className="size-3" />Просмотр</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={e => { e.stopPropagation(); onEdit(c) }}><Edit className="size-3" />Изменить</Button>
                      {/* #9 Copy INN */}
                      {c.inn && <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={(e) => handleCopyINN(c.inn!, e)}><Copy className="size-3" />ИНН</Button>}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop table layout */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort('name')}>Название <SortIcon field="name" /></TableHead>
                  <TableHead className="text-xs hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('inn')}>ИНН/КПП <SortIcon field="inn" /></TableHead>
                  <TableHead className="text-xs hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('type')}>Тип <SortIcon field="type" /></TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Контакты</TableHead>
                  {/* #10 Director column */}
                  <TableHead className="text-xs hidden lg:table-cell">Директор</TableHead>
                  <TableHead className="text-xs text-center cursor-pointer select-none" onClick={() => toggleSort('owned')}>Вл. <SortIcon field="owned" /></TableHead>
                  <TableHead className="text-xs text-center cursor-pointer select-none" onClick={() => toggleSort('rented')}>Ар. <SortIcon field="rented" /></TableHead>
                  {/* #9 Creation date */}
                  <TableHead className="text-xs hidden xl:table-cell cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>Создана <SortIcon field="createdAt" /></TableHead>
                  <TableHead className="text-xs text-right w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, idx) => {
                  const innVal = validateINN(c.inn)
                  return (
                    <TableRow key={c.id} className={`cursor-pointer hover:bg-accent/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => openDetail(c)}>
                      <TableCell className="font-medium py-2">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                          <div>
                            <p className="text-xs font-medium">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground sm:hidden">{formatINN(c.inn)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs py-2">
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{formatINN(c.inn)}</span>
                          {/* #9 Copy INN button */}
                          {c.inn && <button className="size-4 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={e => handleCopyINN(c.inn!, e)} title="Копировать ИНН"><Copy className="size-2.5" /></button>}
                        </div>
                        {/* #7 INN validation visual */}
                        {!innVal.valid && <span className="block text-[9px] text-amber-500">{innVal.hint}</span>}
                        {c.kpp && <span className="block text-[9px] text-muted-foreground font-mono">КПП: {c.kpp}</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs py-2">
                        <div className="space-y-0.5">
                          {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-0.5 hover:text-primary transition-colors" onClick={e => e.stopPropagation()}><Phone className="size-2.5" />{c.phone}</a> : <span className="text-muted-foreground">—</span>}
                          {c.email && <a href={`mailto:${c.email}`} className="block text-[9px] text-muted-foreground hover:text-primary transition-colors" onClick={e => e.stopPropagation()}><Mail className="inline size-2 mr-0.5" />{c.email}</a>}
                          {/* #4 Address with map link */}
                          {c.address && <a href={getMapLink(c.address)} target="_blank" rel="noopener noreferrer" className="block text-[9px] text-muted-foreground hover:text-primary transition-colors truncate max-w-[200px]" onClick={e => e.stopPropagation()}><MapPin className="inline size-2 mr-0.5" />{c.address}</a>}
                        </div>
                      </TableCell>
                      {/* #10 Director in table */}
                      <TableCell className="hidden lg:table-cell text-xs py-2 text-muted-foreground truncate max-w-[140px]">{c.director || '—'}</TableCell>
                      <TableCell className="text-center text-xs py-2 font-medium">{c._count?.ownedEquipment || 0}</TableCell>
                      <TableCell className="text-center text-xs py-2 font-medium">{c._count?.rentedEquipment || 0}</TableCell>
                      {/* #9 Creation date */}
                      <TableCell className="hidden xl:table-cell text-xs py-2 text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); openDetail(c) }} aria-label="Просмотр"><Eye className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); onEdit(c) }} aria-label="Редактировать"><Edit className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(c) }} aria-label="Удалить"><Trash2 className="size-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* #2 Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          {detailCompany && (() => {
            const c = detailCompany
            return (
              <>
                <SheetHeader className="px-4 pt-4 pb-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg font-bold text-primary">{c.name[0]}</div>
                    <div className="min-w-0">
                      <SheetTitle className="text-base">{c.name}</SheetTitle>
                      <SheetDescription className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                  {/* Equipment stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{c._count?.ownedEquipment || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Владеет техникой</p>
                    </div>
                    <div className="rounded-lg border p-2.5 text-center">
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{c._count?.rentedEquipment || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Арендует технику</p>
                    </div>
                  </div>

                  {/* Requisites */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Реквизиты</p>
                    <div className="space-y-1.5 text-xs">
                      {c.inn && <div className="flex items-center justify-between"><span className="text-muted-foreground">ИНН</span><div className="flex items-center gap-1"><span className="font-mono">{formatINN(c.inn)}</span><button className="size-4 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(c.inn!)}><Copy className="size-2.5" /></button></div></div>}
                      {c.kpp && <div className="flex items-center justify-between"><span className="text-muted-foreground">КПП</span><span className="font-mono">{c.kpp}</span></div>}
                      {c.ogrn && <div className="flex items-center justify-between"><span className="text-muted-foreground">ОГРН</span><span className="font-mono">{c.ogrn}</span></div>}
                    </div>
                  </div>

                  {/* Contacts */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Контакты</p>
                    <div className="space-y-1.5 text-xs">
                      {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-3.5" />{c.phone}</a>}
                      {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="size-3.5" />{c.email}</a>}
                      {!c.phone && !c.email && <p className="text-muted-foreground">—</p>}
                    </div>
                  </div>

                  {/* Director */}
                  {c.director && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Директор</p>
                      <p className="text-xs flex items-center gap-1.5"><Briefcase className="size-3.5 text-muted-foreground" />{c.director}</p>
                    </div>
                  )}

                  {/* Addresses with map links */}
                  {(c.address || c.factAddress) && (
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Адреса</p>
                      <div className="space-y-1.5">
                        {c.address && <a href={getMapLink(c.address)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-xs hover:text-primary"><MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" /><div><span className="text-[9px] text-muted-foreground">Юр. адрес</span><br />{c.address}</div></a>}
                        {c.factAddress && c.factAddress !== c.address && <a href={getMapLink(c.factAddress)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-xs hover:text-primary"><MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" /><div><span className="text-[9px] text-muted-foreground">Факт. адрес</span><br />{c.factAddress}</div></a>}
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-muted-foreground">
                    Создана: {formatDate(c.createdAt)} • Обновлена: {formatDate(c.updatedAt)}
                  </div>
                </div>
                <div className="border-t px-4 py-3 flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setDetailOpen(false); onEdit(c) }}><Edit className="size-3.5" />Редактировать</Button>
                  <div className="flex-1" />
                  <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => { setDetailOpen(false); onDelete(c) }}><Trash2 className="size-3.5" />Удалить</Button>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
})
