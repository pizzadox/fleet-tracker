'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, Plus, Trash2, Save, Loader2, UserPlus, Phone, IdCard,
  Edit, X, CheckCircle2, UserCheck
} from 'lucide-react'
import type { Crew, Employee, CrewMember } from '@/lib/types'
import { CREW_TYPE_MAP, MEMBER_ROLE_MAP, EMPLOYEE_POSITION_MAP, API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// CREW FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function CrewFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved, employees }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Crew | null; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
  employees: Employee[];
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<{ employeeId: string; fullName: string; role: string; phone: string; licenseNum: string; licenseCat: string }[]>([])

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name || '', description: editData.description || '', type: editData.type || 'driver', status: editData.status || 'active', notes: editData.notes || '' })
      setMembers(editData.members?.map(m => ({
        employeeId: m.employeeId || '',
        fullName: m.fullName,
        role: m.role,
        phone: m.phone || '',
        licenseNum: m.licenseNum || '',
        licenseCat: m.licenseCat || '',
      })) || [])
    } else {
      setForm({ type: 'driver', status: 'active' })
      setMembers([])
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  // Get IDs already added to avoid duplicates in employee selector
  const usedEmployeeIds = members.filter(m => m.employeeId).map(m => m.employeeId)

  // Add employee from dropdown
  const handleAddEmployee = (empId: string) => {
    if (!empId || usedEmployeeIds.includes(empId)) return
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setMembers(prev => [...prev, {
      employeeId: emp.id,
      fullName: emp.fullName,
      role: emp.position || 'driver',
      phone: emp.phone || '',
      licenseNum: emp.licenseNum || '',
      licenseCat: emp.licenseCat || '',
    }])
  }

  // Add empty manual member
  const handleAddManual = () => {
    setMembers(prev => [...prev, { employeeId: '', fullName: '', role: 'driver', phone: '', licenseNum: '', licenseCat: '' }])
  }

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название экипажа'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/crews/${editData.id}` : '/api/crews'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, members }) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Экипаж обновлён' : 'Экипаж добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование экипажа' : 'Новый экипаж'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Название *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Экипаж №1" autoFocus /></div>
            <div><Label className="text-xs">Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CREW_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Активен</SelectItem><SelectItem value="inactive">Неактивен</SelectItem></SelectContent></Select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Описание</Label><Input value={f('description')} onChange={e => setF('description', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs flex items-center gap-1"><Users className="size-3" />Состав экипажа ({members.length})</Label>
              <div className="flex gap-1.5">
                <Select onValueChange={handleAddEmployee}>
                  <SelectTrigger className="h-6 text-[11px] gap-1 w-auto px-2">
                    <UserPlus className="size-3" />
                    <span>Из сотрудников</span>
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(e => e.status === 'active' && !usedEmployeeIds.includes(e.id))
                      .map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName} ({EMPLOYEE_POSITION_MAP[e.position]?.label || e.position}{e.phone ? `, ${e.phone}` : ''})
                        </SelectItem>
                      ))}
                    {employees.filter(e => e.status === 'active' && !usedEmployeeIds.includes(e.id)).length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Нет доступных сотрудников</div>
                    )}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={handleAddManual}><Plus className="size-3" />Вручную</Button>
              </div>
            </div>
            {members.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">Добавьте сотрудников из списка или вручную</div>
            )}
            {members.map((m, i) => (
              <div key={i} className={`mb-2 rounded-lg border ${m.employeeId ? 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30' : 'bg-muted/50'}`}>
                <div className="flex items-start gap-2 p-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Employee link badge or manual input */}
                    {m.employeeId ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0"><UserCheck className="size-2.5" />Сотрудник</Badge>
                        <span className="text-sm font-medium truncate">{m.fullName}</span>
                      </div>
                    ) : (
                      <Input placeholder="ФИО *" value={m.fullName} onChange={e => { const n = [...members]; n[i] = { ...n[i], fullName: e.target.value }; setMembers(n) }} className="h-8 text-sm" />
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <Select value={m.role} onValueChange={v => { const n = [...members]; n[i] = { ...n[i], role: v }; setMembers(n) }}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(MEMBER_ROLE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Телефон" value={m.phone} onChange={e => { const n = [...members]; n[i] = { ...n[i], phone: e.target.value }; setMembers(n) }} className="h-7 text-xs" />
                      <Input placeholder="ВУ №" value={m.licenseNum} onChange={e => { const n = [...members]; n[i] = { ...n[i], licenseNum: e.target.value }; setMembers(n) }} className="h-7 text-xs" />
                      <Input placeholder="Кат. ВУ" value={m.licenseCat} onChange={e => { const n = [...members]; n[i] = { ...n[i], licenseCat: e.target.value }; setMembers(n) }} className="h-7 text-xs" />
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive shrink-0" onClick={() => setMembers(members.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

