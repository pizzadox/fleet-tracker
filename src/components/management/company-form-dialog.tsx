'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Building2, Save, Loader2, Plus, Edit, CheckCircle2, Shield,
  Users, FileText, Phone, Mail, MapPin, Copy, AlertTriangle,
  Briefcase, Globe, ChevronDown, ChevronUp, User
} from 'lucide-react'
import type { Company } from '@/lib/types'
import { COMPANY_TYPES, API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// COMPANY FORM DIALOG
// ═══════════════════════════════════════════════════════════════

// Collapsible sections (matches employee-form-dialog pattern)
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

export function CompanyFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Company | null; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  // #23 Track dirty state for unsaved changes warning
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  // #16 Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialFormRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      const initial = { name: editData.name || '', inn: editData.inn || '', kpp: editData.kpp || '', ogrn: editData.ogrn || '', address: editData.address || '', factAddress: editData.factAddress || '', phone: editData.phone || '', email: editData.email || '', director: editData.director || '', type: editData.type || 'owner' }
      setForm(initial)
      initialFormRef.current = initial
    } else {
      const initial = { type: 'owner' }
      setForm(initial)
      initialFormRef.current = initial
    }
    setIsDirty(false)
    setErrors({})
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
    // Clear error for this field
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // #16 Form validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!f('name').trim()) errs.name = 'Укажите название компании'
    // #20 INN/KPP/OGRN validation
    const inn = f('inn').trim()
    if (inn && inn.length !== 10 && inn.length !== 12) errs.inn = 'ИНН должен быть 10 или 12 цифр'
    if (inn && !/^\d+$/.test(inn)) errs.inn = 'ИНН должен содержать только цифры'
    const kpp = f('kpp').trim()
    if (kpp && kpp.length !== 9) errs.kpp = 'КПП должен быть 9 цифр'
    const ogrn = f('ogrn').trim()
    if (ogrn && ogrn.length !== 13 && ogrn.length !== 15) errs.ogrn = 'ОГРН должен быть 13 или 15 цифр'
    // #21 Email validation
    const email = f('email').trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Некорректный email'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // #23 Unsaved changes warning
  const handleOpenChange = (v: boolean) => {
    if (!v && isDirty) { setShowCloseConfirm(true); return }
    onOpenChange(v)
  }

  // #19 Copy legal address to actual
  const copyLegalAddress = () => {
    setF('factAddress', f('address'))
    toast.success('Юр. адрес скопирован в факт. адрес')
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const url = editData ? `/api/companies/${editData.id}` : '/api/companies'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Компания обновлена' : 'Компания добавлена')
      setIsDirty(false)
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  // #23 Type as visual cards
  const typeOptions = [
    { value: 'owner', label: 'Владелец', icon: <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />, color: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30' },
    { value: 'renter', label: 'Арендатор', icon: <Users className="size-4 text-sky-600 dark:text-sky-400" />, color: 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30' },
    { value: 'both', label: 'Владелец и арендатор', icon: <Building2 className="size-4 text-violet-600 dark:text-violet-400" />, color: 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30' },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[98dvh] flex flex-col">
          <DialogHeader className="border-l-4 border-l-emerald-500 pl-3">
            <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование компании' : 'Новая компания'}</DialogTitle>
            <DialogDescription>{editData ? 'Измените данные компании и нажмите "Сохранить"' : 'Заполните данные новой компании'}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
            <div className="space-y-3 py-2">
              {/* Section: Basic */}
              <CollapsibleSection title="Основные данные" icon={<FileText className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Название <span className="text-red-400">*</span></Label>
                    <Input value={f('name')} onChange={e => setF('name', e.target.value)} autoFocus placeholder="ООО «Компания»" />
                    {errors.name && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.name}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">ИНН</Label>
                    <Input value={f('inn')} onChange={e => setF('inn', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="10 или 12 цифр" />
                    {errors.inn && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.inn}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">КПП</Label>
                    <Input value={f('kpp')} onChange={e => setF('kpp', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="9 цифр" />
                    {errors.kpp && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.kpp}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">ОГРН</Label>
                    <Input value={f('ogrn')} onChange={e => setF('ogrn', e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="13 или 15 цифр" />
                    {errors.ogrn && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.ogrn}</p>}
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              {/* Type as visual cards */}
              <CollapsibleSection title="Тип компании" icon={<Shield className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setF('type', opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all text-center ${f('type') === opt.value ? opt.color + ' ring-2 ring-primary/30' : 'border-muted hover:border-muted-foreground/30'}`}>
                      {opt.icon}
                      <span className="text-[10px] font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <Separator />

              {/* Section: Contacts */}
              <CollapsibleSection title="Контакты" icon={<Phone className="size-3.5" />} defaultOpen>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Телефон</Label>
                    <Input value={f('phone')} onChange={e => setF('phone', e.target.value)} placeholder="+7 (999) 123-45-67" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} placeholder="info@company.ru" />
                    {errors.email && <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="size-2.5" />{errors.email}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">ФИО директора</Label>
                    <Input value={f('director')} onChange={e => setF('director', e.target.value)} placeholder="Иванов Иван Иванович" />
                  </div>
                </div>
              </CollapsibleSection>

              <Separator />

              {/* Section: Address */}
              <CollapsibleSection title="Адреса" icon={<MapPin className="size-3.5" />} defaultOpen={false}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Юридический адрес</Label>
                    <Input value={f('address')} onChange={e => setF('address', e.target.value)} placeholder="г. Москва, ул. Примерная, д. 1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Фактический адрес</Label>
                      {f('address') && <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1" onClick={copyLegalAddress}><Copy className="size-2.5" />Скопировать юр.</Button>}
                    </div>
                    <Input value={f('factAddress')} onChange={e => setF('factAddress', e.target.value)} placeholder="Совпадает с юридическим" />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
          <div className="shrink-0 border-t bg-card px-4 sm:px-5 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              {/* #25 Focus management - Cancel button */}
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* #23 Unsaved changes confirmation */}
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
