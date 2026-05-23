'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Building2, Plus, Search, Edit, Trash2, Phone, Mail, FileText
} from 'lucide-react'
import type { Company } from '@/lib/types'
import { COMPANY_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// COMPANIES TAB
// ═══════════════════════════════════════════════════════════════

export const CompaniesTab = React.memo(function CompaniesTab({ companies, onAdd, onEdit, onDelete }: {
  companies: Company[];
  onAdd: () => void; onEdit: (c: Company) => void; onDelete: (c: Company) => void;
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => companies.filter(c => {
    if (debouncedSearch && !c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(c.inn || '').includes(debouncedSearch)) return false
    return true
  }), [companies, debouncedSearch])

  const formatINN = (inn?: string | null) => {
    if (!inn) return '—'
    if (inn.length === 10) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6)}`
    if (inn.length === 12) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6, 8)}-${inn.slice(8)}`
    return inn
  }

  const getTypeIcon = (type: string) => {
    if (type === 'owner') return <Shield className="size-3 text-emerald-600 dark:text-emerald-400" />
    if (type === 'renter') return <Users className="size-3 text-sky-600 dark:text-sky-400" />
    return <Building2 className="size-3 text-violet-600 dark:text-violet-400" />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию или ИНН..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить компанию</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(c => ({ Название: c.name, ИНН: c.inn || '', КПП: c.kpp || '', ОГРН: c.ogrn || '', Тип: COMPANY_TYPES[c.type] || c.type, Телефон: c.phone || '', Email: c.email || '', 'Юр. адрес': c.address || '', 'Факт. адрес': c.factAddress || '', Директор: c.director || '' })), 'companies')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0"><Building2 className="size-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Компании не найдены</p><p className="text-xs text-muted-foreground mt-1">Добавьте компанию для управления контрагентами</p></CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
            {filtered.map(c => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatINN(c.inn)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-muted-foreground">Тел.:</span> {c.phone ? <a href={`tel:${c.phone}`} className="font-medium hover:text-primary">{c.phone}</a> : <span className="text-muted-foreground">—</span>}</div>
                    <div><span className="text-muted-foreground">Email:</span> {c.email ? <a href={`mailto:${c.email}`} className="font-medium hover:text-primary truncate">{c.email}</a> : <span className="text-muted-foreground">—</span>}</div>
                    <div><span className="text-muted-foreground">Владеет:</span> <span className="font-medium">{c._count?.ownedEquipment || 0}</span></div>
                    <div><span className="text-muted-foreground">Арендует:</span> <span className="font-medium">{c._count?.rentedEquipment || 0}</span></div>
                  </div>
                  <div className="flex gap-1 pt-0.5">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEdit(c)}><Edit className="size-3" />Изменить</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDelete(c)}><Trash2 className="size-3" />Удалить</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Desktop table layout */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Название</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">ИНН/КПП</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Тип</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Контакты</TableHead>
                  <TableHead className="text-xs text-center">Вл.</TableHead>
                  <TableHead className="text-xs text-center">Ар.</TableHead>
                  <TableHead className="text-xs text-right w-20">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, idx) => (
                  <TableRow key={c.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                    <TableCell className="font-medium py-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                        <div><p className="text-xs font-medium">{c.name}</p><p className="text-[10px] text-muted-foreground sm:hidden">{formatINN(c.inn)}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs py-2">
                      <span className="font-mono">{formatINN(c.inn)}</span>
                      {c.kpp && <span className="block text-[9px] text-muted-foreground font-mono">КПП: {c.kpp}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs py-2">
                      <div className="space-y-0.5">
                        {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-0.5 hover:text-primary transition-colors"><Phone className="size-2.5" />{c.phone}</a> : <span className="text-muted-foreground">—</span>}
                        {c.email && <a href={`mailto:${c.email}`} className="block text-[9px] text-muted-foreground hover:text-primary transition-colors"><Mail className="inline size-2 mr-0.5" />{c.email}</a>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs py-2 font-medium">{c._count?.ownedEquipment || 0}</TableCell>
                    <TableCell className="text-center text-xs py-2 font-medium">{c._count?.rentedEquipment || 0}</TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex justify-end gap-0.5">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(c)} aria-label="Редактировать"><Edit className="size-3" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(c)} aria-label="Удалить"><Trash2 className="size-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
})

