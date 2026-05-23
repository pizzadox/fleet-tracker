'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2, Save, Loader2
} from 'lucide-react'
import type { Company } from '@/lib/types'
import { COMPANY_TYPES, API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// COMPANY FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function CompanyFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Company | null; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name || '', inn: editData.inn || '', kpp: editData.kpp || '', ogrn: editData.ogrn || '', address: editData.address || '', factAddress: editData.factAddress || '', phone: editData.phone || '', email: editData.email || '', director: editData.director || '', type: editData.type || 'owner' })
    } else { setForm({ type: 'owner' }) }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название компании'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/companies/${editData.id}` : '/api/companies'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Компания обновлена' : 'Компания добавлена')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование компании' : 'Новая компания'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="sm:col-span-2"><Label className="text-xs">Название *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} autoFocus /></div>
          <div><Label className="text-xs">ИНН</Label><Input value={f('inn')} onChange={e => setF('inn', e.target.value)} /></div>
          <div><Label className="text-xs">КПП</Label><Input value={f('kpp')} onChange={e => setF('kpp', e.target.value)} /></div>
          <div><Label className="text-xs">ОГРН</Label><Input value={f('ogrn')} onChange={e => setF('ogrn', e.target.value)} /></div>
          <div><Label className="text-xs">Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMPANY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2"><Label className="text-xs">Юридический адрес</Label><Input value={f('address')} onChange={e => setF('address', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Фактический адрес</Label><Input value={f('factAddress')} onChange={e => setF('factAddress', e.target.value)} /></div>
          <div><Label className="text-xs">Телефон</Label><Input value={f('phone')} onChange={e => setF('phone', e.target.value)} /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">ФИО директора</Label><Input value={f('director')} onChange={e => setF('director', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

