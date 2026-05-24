'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Users, Plus, Trash2, Save, Loader2, UserPlus, Phone, IdCard,
  Edit, X, CheckCircle2, UserCheck, AlertTriangle, Search,
  GripVertical, Car, Wrench, UserCircle, Weight, User
} from 'lucide-react'
import type { Crew, Employee, CrewMember } from '@/lib/types'
import { CREW_TYPE_MAP, MEMBER_ROLE_MAP, EMPLOYEE_POSITION_MAP, API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// CREW FORM DIALOG — 10 improvements (#71-80)
// ═══════════════════════════════════════════════════════════════

const POSITION_COLORS: Record<string, string> = {
  driver: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  mechanic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  assistant: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  loader: 'bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400',
}

export function CrewFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved, employees }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Crew | null; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
  employees: Employee[];
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<{ employeeId: string; fullName: string; role: string; phone: string; licenseNum: string; licenseCat: string }[]>([])
  // #72 Employee search in dropdown
  const [empSearch, setEmpSearch] = useState('')
  // #74 Form dirty state + unsaved changes
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

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
    setIsDirty(false)
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => { setForm(prev => ({ ...prev, [key]: value })); setIsDirty(true) }

  const usedEmployeeIds = members.filter(m => m.employeeId).map(m => m.employeeId)

  // #72 Filtered employees for search
  const filteredEmployees = employees.filter(e => {
    if (e.status !== 'active') return false
    if (usedEmployeeIds.includes(e.id)) return false
    if (empSearch) {
      const q = empSearch.toLowerCase()
      return e.fullName.toLowerCase().includes(q) || (e.phone || '').includes(q) || e.position.includes(q)
    }
    return true
  })

  // #74 Duplicate detection
  const duplicateNames = (() => {
    const names = members.map(m => m.fullName.toLowerCase().trim()).filter(Boolean)
    const seen = new Set<string>()
    const dupes = new Set<string>()
    names.forEach(n => { if (seen.has(n)) dupes.add(n); seen.add(n) })
    return dupes
  })()

  // #75 Crew member limits by type
  const memberLimit = (() => {
    switch (f('type')) {
      case 'driver': return { min: 1, max: 2, label: '1-2 водителя' }
      case 'mechanic': return { min: 1, max: 3, label: '1-3 механика' }
      case 'mixed': return { min: 2, max: 5, label: '2-5 участников' }
      default: return { min: 1, max: 10, label: '1-10 участников' }
    }
  })()

  // #77 Crew stats summary
  const crewStats = useMemo(() => {
    const drivers = members.filter(m => m.role === 'driver').length
    const mechanics = members.filter(m => m.role === 'mechanic').length
    const linked = members.filter(m => m.employeeId).length
    return { drivers, mechanics, linked, total: members.length }
  }, [members])

  const handleAddEmployee = (empId: string) => {
    if (!empId || usedEmployeeIds.includes(empId)) return
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setMembers(prev => [...prev, {
      employeeId: emp.id,
      fullName: emp.fullName,
      // #76 Auto-suggest role from position
      role: emp.position === 'mechanic' ? 'mechanic' : emp.position === 'driver' ? 'driver' : emp.position || 'driver',
      phone: emp.phone || '',
      licenseNum: emp.licenseNum || '',
      licenseCat: emp.licenseCat || '',
    }])
    setIsDirty(true)
  }

  const handleAddManual = () => {
    setMembers(prev => [...prev, { employeeId: '', fullName: '', role: 'driver', phone: '', licenseNum: '', licenseCat: '' }])
    setIsDirty(true)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v && isDirty) { setShowCloseConfirm(true); return }
    onOpenChange(v)
  }

  const handleSave = async () => {
    // #79 Validate member names
    if (!f('name').trim()) { toast.error('Укажите название экипажа'); return }
    const emptyNames = members.filter(m => !m.fullName.trim())
    if (emptyNames.length > 0) { toast.error('Укажите ФИО для всех участников'); return }
    // #74 Duplicate check
    if (duplicateNames.size > 0) { toast.warning(`Обнаружены дубликаты: ${[...duplicateNames].join(', ')}`) }
    setSaving(true)
    try {
      const url = editData ? `/api/crews/${editData.id}` : '/api/crews'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, members }) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Экипаж обновлён' : 'Экипаж добавлен')
      setIsDirty(false)
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[98dvh] flex flex-col">
          <DialogHeader className="border-l-4 border-l-sky-500 pl-3">
            <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование экипажа' : 'Новый экипаж'}</DialogTitle>
            {/* #71 DialogDescription for accessibility */}
            <DialogDescription>{editData ? 'Измените данные экипажа и нажмите "Сохранить"' : 'Заполните данные нового экипажа и добавьте участников'}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label className="text-xs">Название * <span className="text-red-400">*</span></Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Экипаж №1" autoFocus /></div>
                <div>
                  <Label className="text-xs">Тип</Label>
                  <Select value={f('type')} onValueChange={v => setF('type', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CREW_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  {/* #75 Member limits hint */}
                  <p className="text-[9px] text-muted-foreground mt-0.5">Рекомендуется: {memberLimit.label}</p>
                </div>
                <div>
                  <Label className="text-xs">Статус</Label>
                  <Select value={f('status')} onValueChange={v => setF('status', v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Активен</SelectItem><SelectItem value="inactive">Неактивен</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label className="text-xs">Описание</Label><Input value={f('description')} onChange={e => setF('description', e.target.value)} placeholder="Краткое описание экипажа" /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
              </div>

              <Separator />

              {/* #77 Crew stats summary */}
              {members.length > 0 && (
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>Всего: <span className="font-medium text-foreground">{crewStats.total}</span></span>
                  <span className="flex items-center gap-0.5"><Car className="size-2.5 text-blue-500" />Водителей: <span className="font-medium text-foreground">{crewStats.drivers}</span></span>
                  <span className="flex items-center gap-0.5"><Wrench className="size-2.5 text-amber-500" />Механиков: <span className="font-medium text-foreground">{crewStats.mechanics}</span></span>
                  <span className="flex items-center gap-0.5"><UserCheck className="size-2.5 text-emerald-500" />Связано: <span className="font-medium text-foreground">{crewStats.linked}</span></span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs flex items-center gap-1"><Users className="size-3" />Состав экипажа ({members.length})</Label>
                  <div className="flex gap-1.5">
                    {/* #72 Employee search */}
                    <div className="relative">
                      <Select onValueChange={handleAddEmployee}>
                        <SelectTrigger className="h-6 text-[11px] gap-1 w-auto px-2">
                          <UserPlus className="size-3" />
                          <span>Из сотрудников</span>
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 sticky top-0 bg-popover border-b">
                            <Input placeholder="Поиск сотрудника..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="h-6 text-[10px]" onClick={e => e.stopPropagation()} />
                          </div>
                          {filteredEmployees.slice(0, 20).map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              <span className="flex items-center gap-1.5">
                                {/* #80 Visual member avatar */}
                                <span className={`inline-flex items-center justify-center size-4 rounded-full text-[7px] font-bold ${POSITION_COLORS[e.position] || 'bg-gray-100 dark:bg-gray-900/40'}`}>
                                  {e.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </span>
                                {e.fullName} ({EMPLOYEE_POSITION_MAP[e.position]?.label || e.position})
                              </span>
                            </SelectItem>
                          ))}
                          {filteredEmployees.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Нет доступных сотрудников</div>
                          )}
                          {filteredEmployees.length > 20 && (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground">...и ещё {filteredEmployees.length - 20}</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={handleAddManual}><Plus className="size-3" />Вручную</Button>
                  </div>
                </div>
                {/* #74 Duplicate warning */}
                {duplicateNames.size > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 mb-1.5 px-1">
                    <AlertTriangle className="size-3" />Дубликаты: {[...duplicateNames].join(', ')}
                  </div>
                )}
                {members.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">Добавьте сотрудников из списка или вручную</div>
                )}
                {members.map((m, i) => (
                  <div key={i} className={`mb-2 rounded-lg border ${m.employeeId ? 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30' : 'bg-muted/50'} ${duplicateNames.has(m.fullName.toLowerCase().trim()) ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}>
                    <div className="flex items-start gap-2 p-2">
                      {/* #80 Visual avatar */}
                      <div className={`flex items-center justify-center size-7 rounded-full shrink-0 ${POSITION_COLORS[m.role] || 'bg-gray-100 dark:bg-gray-900/40'}`}>
                        {m.fullName ? m.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : '?'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {m.employeeId ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0"><UserCheck className="size-2.5" />Сотрудник</Badge>
                            <span className="text-sm font-medium truncate">{m.fullName}</span>
                          </div>
                        ) : (
                          <div>
                            <Input placeholder="ФИО *" value={m.fullName} onChange={e => { const n = [...members]; n[i] = { ...n[i], fullName: e.target.value }; setMembers(n); setIsDirty(true) }} className="h-8 text-sm" />
                            {/* #79 Name validation */}
                            {!m.fullName.trim() && i > 0 && <p className="text-[9px] text-red-500 mt-0.5">Укажите ФИО</p>}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {/* #76 Auto-suggested role */}
                          <Select value={m.role} onValueChange={v => { const n = [...members]; n[i] = { ...n[i], role: v }; setMembers(n); setIsDirty(true) }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(MEMBER_ROLE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input placeholder="Телефон" value={m.phone} onChange={e => { const n = [...members]; n[i] = { ...n[i], phone: e.target.value }; setMembers(n); setIsDirty(true) }} className="h-7 text-xs" />
                          <Input placeholder="ВУ №" value={m.licenseNum} onChange={e => { const n = [...members]; n[i] = { ...n[i], licenseNum: e.target.value }; setMembers(n); setIsDirty(true) }} className="h-7 text-xs" />
                          <Input placeholder="Кат. ВУ" value={m.licenseCat} onChange={e => { const n = [...members]; n[i] = { ...n[i], licenseCat: e.target.value }; setMembers(n); setIsDirty(true) }} className="h-7 text-xs" />
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive shrink-0" onClick={() => { setMembers(members.filter((_, j) => j !== i)); setIsDirty(true) }}><X className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
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

      {/* Unsaved changes confirmation */}
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
