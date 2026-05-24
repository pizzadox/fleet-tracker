'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Users, Save, Loader2, Phone, Mail, Calendar, IdCard, MapPin,
  Edit, Plus, ClipboardCheck, User, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Eye, X, Car, Wrench, UserCircle, Weight
} from 'lucide-react'
import type { Employee, Crew, Equipment } from '@/lib/types'
import { EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP, API } from '@/lib/constants'
import { toLocalDate, formatDate, handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE FORM DIALOG — 15 improvements (#46-60)
// ═══════════════════════════════════════════════════════════════

// #53 Collapsible sections
function CollapsibleSection({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button type="button" className="flex items-center gap-1.5 w-full text-left" onClick={() => setOpen(!open)}>
        <p className="text-xs font-semibold flex items-center gap-1.5 flex-1">{icon}{title}</p>
        {open ? <ChevronUp className="size-3 text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground" />}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

// #58 License categories as checkboxes
const LICENSE_CATEGORIES = ['A', 'A1', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'BE', 'CE', 'C1E', 'DE', 'D1E', 'M', 'Tm', 'Tb']

export function EmployeeFormDialog({ open, onOpenChange, editData, crews, equipment, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Employee | null; crews: Crew[]; equipment: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  // #46 Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  // #53 Dirty state tracking
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

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
    setIsDirty(false)
    setErrors({})
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // #46 Form validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!f('fullName').trim()) errs.fullName = 'Укажите ФИО сотрудника'
    if (f('fullName').trim().split(/\s+/).length < 2) errs.fullName = 'Укажите полностью ФИО (минимум 2 слова)'
    const email = f('email').trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Некорректный email'
    const phone = f('phone').trim()
    if (phone && phone.replace(/\D/g, '').length < 7) errs.phone = 'Слишком короткий номер'
    const salary = f('salary').trim()
    if (salary && (isNaN(Number(salary)) || Number(salary) < 0)) errs.salary = 'Зарплата должна быть положительным числом'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // #53 Unsaved changes warning
  const handleOpenChange = (v: boolean) => {
    if (!v && isDirty) { setShowCloseConfirm(true); return }
    onOpenChange(v)
  }

  // #49 License expiry warning
  const licenseExpiryWarning = (() => {
    const expiry = f('licenseExpiry')
    if (!expiry) return null
    const expiryDate = new Date(expiry)
    const now = new Date()
    const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return { type: 'error' as const, text: `ВУ истекло ${Math.abs(daysUntil)} дн. назад` }
    if (daysUntil <= 30) return { type: 'warning' as const, text: `ВУ истекает через ${daysUntil} дн.` }
    return null
  })()

  // #50 Auto-calculate age from birth date
  const autoAge = (() => {
    const bd = f('birthDate')
    if (!bd) return null
    const today = new Date()
    const birth = new Date(bd)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 0 ? age : null
  })()

  // #51 Auto-calculate tenure from hire date
  const autoTenure = (() => {
    const hd = f('hireDate')
    if (!hd) return null
    const years = Math.floor((Date.now() - new Date(hd).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    const months = Math.floor((Date.now() - new Date(hd).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    if (years > 0) return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
    if (months > 0) return `${months} мес.`
    return '< 1 мес.'
  })()

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const url = editData ? `/api/employees/${editData.id}` : '/api/employees'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Сотрудник обновлён' : 'Сотрудник добавлен')
      setIsDirty(false)
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  // #58 Toggle license category
  const toggleLicenseCat = (cat: string) => {
    const current = f('licenseCat').split(',').map(s => s.trim()).filter(Boolean)
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat]
    setF('licenseCat', next.join(', '))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[98dvh] flex flex-col">
          <DialogHeader className="border-l-4 border-l-violet-500 pl-3">
            <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
            {/* #47 DialogDescription for accessibility */}
            <DialogDescription>{editData ? 'Измените данные сотрудника и нажмите "Сохранить"' : 'Заполните данные нового сотрудника'}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
            <div className="space-y-3 py-2">
              {/* Basic info */}
              <CollapsibleSection title="Основная информация" icon={<User className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">ФИО * <span className="text-red-400">*</span></Label>
                    <Input value={f('fullName')} onChange={e => setF('fullName', e.target.value)} placeholder="Иванов Иван Иванович" autoFocus />
                    {errors.fullName && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.fullName}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Должность</Label>
                    <Select value={f('position')} onValueChange={v => setF('position', v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Статус</Label>
                    <Select value={f('status')} onValueChange={v => setF('status', v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Телефон</Label>
                    <Input value={f('phone')} onChange={e => setF('phone', e.target.value)} placeholder="+7 (999) 123-45-67" />
                    {errors.phone && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.phone}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} placeholder="ivan@company.ru" />
                    {errors.email && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.email}</p>}
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              {/* Work info */}
              <CollapsibleSection title="Трудовая информация" icon={<IdCard className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Дата приёма</Label>
                    <Input type="date" value={f('hireDate')} onChange={e => setF('hireDate', e.target.value)} />
                    {/* #51 Auto-tenure */}
                    {autoTenure && <p className="text-[10px] text-muted-foreground mt-0.5">Стаж: {autoTenure}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Дата увольнения</Label>
                    <Input type="date" value={f('fireDate')} onChange={e => setF('fireDate', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Зарплата (₽)</Label>
                    <Input type="number" value={f('salary')} onChange={e => setF('salary', e.target.value)} placeholder="0" />
                    {errors.salary && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.salary}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Экипаж</Label>
                    <Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger>
                      <SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.filter(c => c.status === 'active').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Назначенная техника</Label>
                    <Select value={f('equipmentId') || '_none'} onValueChange={v => setF('equipmentId', v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не назначена" /></SelectTrigger>
                      <SelectContent><SelectItem value="_none">Не назначена</SelectItem>{equipment.filter(eq => eq.status === 'active' || eq.status === 'rented').map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}{eq.registrationNum ? ` (${eq.registrationNum})` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              {/* License */}
              <CollapsibleSection title="Водительское удостоверение" icon={<ClipboardCheck className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Номер ВУ</Label>
                    <Input value={f('licenseNum')} onChange={e => setF('licenseNum', e.target.value)} placeholder="99 99 999999" />
                  </div>
                  <div>
                    <Label className="text-xs">Срок действия</Label>
                    <Input type="date" value={f('licenseExpiry')} onChange={e => setF('licenseExpiry', e.target.value)} />
                    {/* #49 License expiry warning */}
                    {licenseExpiryWarning && (
                      <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${licenseExpiryWarning.type === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                        <AlertTriangle className="size-2.5" />{licenseExpiryWarning.text}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Категории ВУ</Label>
                    {/* #58 Category checkboxes */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {LICENSE_CATEGORIES.map(cat => {
                        const selected = f('licenseCat').split(',').map(s => s.trim()).includes(cat)
                        return (
                          <button key={cat} type="button" onClick={() => toggleLicenseCat(cat)}
                            className={`inline-flex items-center justify-center size-7 rounded text-[10px] font-bold border transition-all ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted hover:border-foreground/30'}`}>
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                    <Input value={f('licenseCat')} onChange={e => setF('licenseCat', e.target.value)} className="mt-1.5 h-7 text-[10px]" placeholder="Или введите вручную: B, C, D, CE" />
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              {/* Personal info */}
              <CollapsibleSection title="Личные данные" icon={<User className="size-3.5" />} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Дата рождения</Label>
                    <Input type="date" value={f('birthDate')} onChange={e => setF('birthDate', e.target.value)} />
                    {/* #50 Auto-age */}
                    {autoAge !== null && <p className="text-[10px] text-muted-foreground mt-0.5">Возраст: {autoAge} лет</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Адрес</Label>
                    <Input value={f('address')} onChange={e => setF('address', e.target.value)} placeholder="г. Москва, ул. Примерная, д. 1" />
                  </div>
                  <div>
                    <Label className="text-xs">Серия паспорта</Label>
                    <Input value={f('passportSeries')} onChange={e => setF('passportSeries', e.target.value)} placeholder="9999" />
                  </div>
                  <div>
                    <Label className="text-xs">Номер паспорта</Label>
                    <Input value={f('passportNum')} onChange={e => setF('passportNum', e.target.value)} placeholder="999999" />
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              <div>
                <Label className="text-xs">Заметки</Label>
                <Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Дополнительная информация о сотруднике..." />
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t bg-card px-4 sm:px-5 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenChange(false)}>Отмена</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* #53 Unsaved changes confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Несохранённые изменения</AlertDialogTitle>
            <AlertDialogDescription>У вас есть несохранённые изменения. Закрыть форму без сохранения?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>Продолжить редактирование</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCloseConfirm(false); setIsDirty(false); onOpenChange(false) }} className="bg-destructive text-white hover:bg-destructive/90">Закрыть без сохранения</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
