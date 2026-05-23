'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Wrench, Save, Loader2, Plus, Truck
} from 'lucide-react'
import type { Repair, Equipment, Employee } from '@/lib/types'
import { REPAIR_STATUS_MAP, REPAIR_PRIORITY_MAP, REPAIR_TYPE_MAP, STAGE_TEMPLATES, API } from '@/lib/constants'
import { toLocalDatetime, localDatetimeToISO, formatDate, handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// REPAIR FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function RepairFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, saving, setSaving, onSaved, employees }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Repair | null; equipmentId: string; equipmentList: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
  employees: Employee[];
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [stages, setStages] = useState<{ name: string; description: string }[]>([])
  const [selectedMasters, setSelectedMasters] = useState<{ employeeId: string; role: string }[]>([])

  useEffect(() => {
    if (editData) {
      const sd = editData.startDate ? toLocalDate(editData.startDate) : toLocalDate(new Date())
      // Auto-calculate estimatedEndDate = startDate + 7 days if not set
      const autoEstEnd = editData.estimatedEndDate ? toLocalDate(editData.estimatedEndDate) : toLocalDate(new Date(new Date(sd).getTime() + 7 * 24 * 60 * 60 * 1000))
      setForm({
        equipmentId: editData.equipmentId, description: editData.description || '', reason: editData.reason || '',
        startDate: sd,
        endDate: editData.endDate ? toLocalDate(editData.endDate) : '',
        estimatedEndDate: autoEstEnd,
        status: editData.status || 'in_progress', cost: editData.cost?.toString() || '',
        estimatedCost: editData.estimatedCost?.toString() || '',
        contractor: editData.contractor || '', contractorPhone: editData.contractorPhone || '',
        contractorEmail: editData.contractorEmail || '',
        location: editData.location || '',
        mileageStart: editData.mileageStart?.toString() || '',
        mileageEnd: editData.mileageEnd?.toString() || '',
        downtimeHours: editData.downtimeHours?.toString() || '',
        warrantyRepair: editData.warrantyRepair ? 'true' : 'false',
        insuranceClaim: editData.insuranceClaim ? 'true' : 'false',
        insuranceNumber: editData.insuranceNumber || '',
        priority: editData.priority || 'medium',
        repairType: editData.repairType || 'planned',
        workPerformed: editData.workPerformed || '', spareParts: editData.spareParts || '',
        nextInspection: editData.nextInspection ? toLocalDate(editData.nextInspection) : '',
        notes: editData.notes || '',
      })
      setSelectedMasters(editData.masters?.map(m => ({ employeeId: m.employeeId, role: m.role })) || [])
      setStages([])
    } else {
      const sd = toLocalDate(new Date())
      const autoEstEnd = toLocalDate(new Date(new Date(sd).getTime() + 7 * 24 * 60 * 60 * 1000))
      setForm({ equipmentId: equipmentId || '', startDate: sd, estimatedEndDate: autoEstEnd, status: 'in_progress', priority: 'medium', repairType: 'planned', warrantyRepair: 'false', insuranceClaim: 'false' })
      setSelectedMasters([])
      setStages([])
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const addMaster = (employeeId: string) => {
    if (!employeeId || selectedMasters.some(m => m.employeeId === employeeId)) return
    setSelectedMasters([...selectedMasters, { employeeId, role: 'master' }])
  }

  const removeMaster = (employeeId: string) => {
    setSelectedMasters(selectedMasters.filter(m => m.employeeId !== employeeId))
  }

  const updateMasterRole = (employeeId: string, role: string) => {
    setSelectedMasters(selectedMasters.map(m => m.employeeId === employeeId ? { ...m, role } : m))
  }

  const availableEmployees = employees.filter(e => e.status === 'active' && !selectedMasters.some(m => m.employeeId === e.id))

  // Calculate cost from stages
  const calcCostFromStages = () => {
    const stageCosts = stages.reduce((sum, s) => sum + (parseFloat((s as any).cost) || 0), 0)
    if (stageCosts > 0) setF('cost', stageCosts.toString())
  }

  // Copy from last repair
  const copyFromLastRepair = async () => {
    if (!f('equipmentId')) { toast.error('Сначала выберите технику'); return }
    try {
      const res = await fetch(`/api/repairs?equipmentId=${f('equipmentId')}&limit=1`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const lastRepair = Array.isArray(data) ? data[0] : null
      if (!lastRepair) { toast.error('Нет предыдущих ремонтов для этой техники'); return }
      setForm(prev => ({
        ...prev,
        contractor: lastRepair.contractor || prev.contractor,
        contractorPhone: lastRepair.contractorPhone || prev.contractorPhone,
        contractorEmail: lastRepair.contractorEmail || prev.contractorEmail,
        location: lastRepair.location || prev.location,
        priority: lastRepair.priority || prev.priority,
        repairType: lastRepair.repairType || prev.repairType,
      }))
      toast.success('Данные скопированы из предыдущего ремонта')
    } catch { toast.error('Ошибка загрузки данных') }
  }

  // Add stage templates
  const addStageTemplate = (template: typeof STAGE_TEMPLATES[number]) => {
    setStages([...stages, { name: template.name, description: template.description }])
  }

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('description').trim()) { toast.error('Укажите описание ремонта'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        ...form,
        cost: f('cost') ? parseFloat(f('cost')) : null,
        estimatedCost: f('estimatedCost') ? parseFloat(f('estimatedCost')) : null,
        mileageStart: f('mileageStart') ? parseFloat(f('mileageStart')) : null,
        mileageEnd: f('mileageEnd') ? parseFloat(f('mileageEnd')) : null,
        downtimeHours: f('downtimeHours') ? parseFloat(f('downtimeHours')) : null,
        warrantyRepair: f('warrantyRepair') === 'true',
        insuranceClaim: f('insuranceClaim') === 'true',
        stages: editData ? undefined : stages.filter(s => s.name.trim()),
        masters: selectedMasters,
      }
      const url = editData ? `/api/repairs/${editData.id}` : '/api/repairs'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Ремонт обновлён' : 'Ремонт добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование ремонта' : 'Новый ремонт'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          {/* Основная информация */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ClipboardList className="size-3.5 text-muted-foreground" />Основная информация</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label className="text-xs">Описание *</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} autoFocus /></div>
              <div><Label className="text-xs">Причина</Label><Input value={f('reason')} onChange={e => setF('reason', e.target.value)} /></div>
              <div><Label className="text-xs">Местоположение</Label><Input value={f('location')} onChange={e => setF('location', e.target.value)} placeholder="Цех, участок..." /></div>
              <div><Label className="text-xs">Приоритет</Label><Select value={f('priority')} onValueChange={v => setF('priority', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Тип ремонта</Label><Select value={f('repairType')} onValueChange={v => setF('repairType', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>

          {/* Сроки и стоимость */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" />Сроки и стоимость</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => { setF('startDate', e.target.value); if (!editData) { setF('estimatedEndDate', toLocalDate(new Date(new Date(e.target.value).getTime() + 7 * 24 * 60 * 60 * 1000))) } }} /></div>
              <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
              <div><Label className="text-xs">Плановая дата окончания</Label><Input type="date" value={f('estimatedEndDate')} onChange={e => setF('estimatedEndDate', e.target.value)} /></div>
              <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
              <div><Label className="text-xs">Плановая стоимость (₽)</Label><Input type="number" value={f('estimatedCost')} onChange={e => setF('estimatedCost', e.target.value)} /></div>
              {f('cost') && f('estimatedCost') && (
                <div className="flex items-end">
                  <div className="text-[10px] text-muted-foreground">
                    Отклонение: {Math.round(((parseFloat(f('cost')) - parseFloat(f('estimatedCost'))) / parseFloat(f('estimatedCost'))) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Пробег и простой */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Gauge className="size-3.5 text-muted-foreground" />Пробег и простой</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Пробег начало (км)</Label><Input type="number" value={f('mileageStart')} onChange={e => setF('mileageStart', e.target.value)} /></div>
              <div><Label className="text-xs">Пробег конец (км)</Label><Input type="number" value={f('mileageEnd')} onChange={e => setF('mileageEnd', e.target.value)} disabled={!editData} /></div>
              <div><Label className="text-xs">Время простоя (ч)</Label><Input type="number" step="0.5" value={f('downtimeHours')} onChange={e => setF('downtimeHours', e.target.value)} /></div>
            </div>
          </div>

          {/* Подрядчик */}
          <div className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold flex items-center gap-1.5"><Building2 className="size-3.5 text-muted-foreground" />Подрядчик</h4>
              {!editData && <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px]" onClick={copyFromLastRepair}><Copy className="size-3" />Из предыдущего</Button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Подрядчик</Label><Input value={f('contractor')} onChange={e => setF('contractor', e.target.value)} /></div>
              <div><Label className="text-xs">Телефон подрядчика</Label><Input value={f('contractorPhone')} onChange={e => setF('contractorPhone', e.target.value)} /></div>
              <div><Label className="text-xs">Email подрядчика</Label><Input type="email" value={f('contractorEmail')} onChange={e => setF('contractorEmail', e.target.value)} /></div>
            </div>
          </div>

          {/* Гарантия и страховка */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Shield className="size-3.5 text-muted-foreground" />Гарантия и страховка</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="warrantyRepair" checked={f('warrantyRepair') === 'true'} onCheckedChange={v => setF('warrantyRepair', v ? 'true' : 'false')} />
                <Label htmlFor="warrantyRepair" className="text-xs">Гарантийный ремонт</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="insuranceClaim" checked={f('insuranceClaim') === 'true'} onCheckedChange={v => setF('insuranceClaim', v ? 'true' : 'false')} />
                <Label htmlFor="insuranceClaim" className="text-xs">Страховой случай</Label>
              </div>
              {f('insuranceClaim') === 'true' && (
                <div className="sm:col-span-2"><Label className="text-xs">Номер страховки</Label><Input value={f('insuranceNumber')} onChange={e => setF('insuranceNumber', e.target.value)} /></div>
              )}
            </div>
          </div>

          {/* Результат */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ClipboardCheck className="size-3.5 text-muted-foreground" />Результат</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Выполненные работы</Label><Textarea value={f('workPerformed')} onChange={e => setF('workPerformed', e.target.value)} rows={2} /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Запчасти</Label><Textarea value={f('spareParts')} onChange={e => setF('spareParts', e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Дата следующего ТО</Label><Input type="date" value={f('nextInspection')} onChange={e => setF('nextInspection', e.target.value)} /></div>
            </div>
          </div>

          {/* Заметки */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><StickyNote className="size-3.5 text-muted-foreground" />Заметки</h4>
            <Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} />
          </div>

          {/* Masters assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs flex items-center gap-1"><Users className="size-3" />Назначить мастеров</Label>
              {availableEmployees.length > 0 && (
                <Select onValueChange={addMaster}>
                  <SelectTrigger className="h-6 w-auto gap-1 text-[11px] border-dashed"><Plus className="size-3" /><SelectValue placeholder="Добавить" /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.fullName} — {EMPLOYEE_POSITION_MAP[e.position]?.label || e.position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedMasters.length > 0 ? (
              <div className="space-y-1">
                {selectedMasters.map(m => {
                  const emp = employees.find(e => e.id === m.employeeId)
                  if (!emp) return null
                  return (
                    <div key={m.employeeId} className="flex items-center gap-2 p-1.5 rounded-md border bg-card/50">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="size-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{emp.fullName}</p>
                      </div>
                      <Select value={m.role} onValueChange={v => updateMasterRole(m.employeeId, v)}>
                        <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(REPAIR_MASTER_ROLE_MAP).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => removeMaster(m.employeeId)} aria-label="Удалить">
                        <X className="size-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Мастера не выбраны</p>
            )}
          </div>

          {!editData && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs flex items-center gap-1"><Settings2 className="size-3" />Начальные этапы</Label>
                <div className="flex gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]"><BookmarkCheck className="size-3" />Шаблоны</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {STAGE_TEMPLATES.map((t, i) => (
                        <DropdownMenuItem key={i} onClick={() => addStageTemplate(t)}>{t.name}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStages(STAGE_TEMPLATES.map(t => ({ name: t.name, description: t.description })))}>Добавить все шаблоны</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={() => setStages([...stages, { name: '', description: '' }])}><Plus className="size-3" />Добавить</Button>
                </div>
              </div>
              {stages.map((s, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <Input placeholder="Название" value={s.name} onChange={e => { const n = [...stages]; n[i] = { ...n[i], name: e.target.value }; setStages(n) }} className="flex-1 h-8 text-sm" />
                  <Input placeholder="Описание" value={s.description} onChange={e => { const n = [...stages]; n[i] = { ...n[i], description: e.target.value }; setStages(n) }} className="flex-1 h-8 text-sm" />
                  <Button size="sm" variant="ghost" className="size-8 p-0 text-destructive shrink-0" onClick={() => setStages(stages.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

