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
import {
  Users, Save, Loader2, Phone, Mail, Calendar, IdCard, MapPin
} from 'lucide-react'
import type { Employee, Crew, Equipment } from '@/lib/types'
import { EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP, API } from '@/lib/constants'
import { toLocalDate, formatDate, handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function EmployeeFormDialog({ open, onOpenChange, editData, crews, equipment, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Employee | null; crews: Crew[]; equipment: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({
        fullName: editData.fullName || '',
        position: editData.position || 'driver',
        phone: editData.phone || '',
        email: editData.email || '',
        birthDate: editData.birthDate ? toLocalDate(editData.birthDate) : '',
        hireDate: editData.hireDate ? toLocalDate(editData.hireDate) : '',
        fireDate: editData.fireDate ? toLocalDate(editData.fireDate) : '',
        licenseNum: editData.licenseNum || '',
        licenseCat: editData.licenseCat || '',
        licenseExpiry: editData.licenseExpiry ? toLocalDate(editData.licenseExpiry) : '',
        passportSeries: editData.passportSeries || '',
        passportNum: editData.passportNum || '',
        address: editData.address || '',
        status: editData.status || 'active',
        salary: editData.salary?.toString() || '',
        notes: editData.notes || '',
        crewId: editData.crewId || '',
        equipmentId: editData.equipmentId || '',
      })
    } else {
      setForm({ position: 'driver', status: 'active', hireDate: toLocalDate(new Date()) })
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('fullName').trim()) { toast.error('Укажите ФИО сотрудника'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/employees/${editData.id}` : '/api/employees'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Сотрудник обновлён' : 'Сотрудник добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">ФИО *</Label><Input value={f('fullName')} onChange={e => setF('fullName', e.target.value)} placeholder="Иванов Иван Иванович" autoFocus /></div>
            <div><Label className="text-xs">Должность</Label><Select value={f('position')} onValueChange={v => setF('position', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Телефон</Label><Input value={f('phone')} onChange={e => setF('phone', e.target.value)} placeholder="+7 (999) 123-45-67" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} placeholder="ivan@company.ru" /></div>
          </div>

          <Separator />

          {/* Work info */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><IdCard className="size-3.5" />Трудовая информация</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата приёма</Label><Input type="date" value={f('hireDate')} onChange={e => setF('hireDate', e.target.value)} /></div>
              <div><Label className="text-xs">Дата увольнения</Label><Input type="date" value={f('fireDate')} onChange={e => setF('fireDate', e.target.value)} /></div>
              <div><Label className="text-xs">Зарплата (₽)</Label><Input type="number" value={f('salary')} onChange={e => setF('salary', e.target.value)} /></div>
              <div><Label className="text-xs">Экипаж</Label><Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger><SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.filter(c => c.status === 'active').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Назначенная техника</Label><Select value={f('equipmentId') || '_none'} onValueChange={v => setF('equipmentId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не назначена" /></SelectTrigger><SelectContent><SelectItem value="_none">Не назначена</SelectItem>{equipment.filter(eq => eq.status === 'active' || eq.status === 'rented').map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}{eq.registrationNum ? ` (${eq.registrationNum})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>

          <Separator />

          {/* License */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><ClipboardCheck className="size-3.5" />Водительское удостоверение</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs">Номер ВУ</Label><Input value={f('licenseNum')} onChange={e => setF('licenseNum', e.target.value)} placeholder="99 99 999999" /></div>
              <div><Label className="text-xs">Категория</Label><Input value={f('licenseCat')} onChange={e => setF('licenseCat', e.target.value)} placeholder="B, C, D, CE" /></div>
              <div><Label className="text-xs">Срок действия</Label><Input type="date" value={f('licenseExpiry')} onChange={e => setF('licenseExpiry', e.target.value)} /></div>
            </div>
          </div>

          <Separator />

          {/* Personal info */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><User className="size-3.5" />Личные данные</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата рождения</Label><Input type="date" value={f('birthDate')} onChange={e => setF('birthDate', e.target.value)} /></div>
              <div><Label className="text-xs">Адрес</Label><Input value={f('address')} onChange={e => setF('address', e.target.value)} /></div>
              <div><Label className="text-xs">Серия паспорта</Label><Input value={f('passportSeries')} onChange={e => setF('passportSeries', e.target.value)} placeholder="9999" /></div>
              <div><Label className="text-xs">Номер паспорта</Label><Input value={f('passportNum')} onChange={e => setF('passportNum', e.target.value)} placeholder="999999" /></div>
            </div>
          </div>

          <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

