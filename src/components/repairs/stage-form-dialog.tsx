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
  Save, Loader2, CheckCircle2
} from 'lucide-react'
import type { RepairStage } from '@/lib/types'
import { STAGE_STATUS_MAP, STAGE_TEMPLATES, API } from '@/lib/constants'
import { toLocalDatetime, localDatetimeToISO, handleApiError } from '@/lib/utils'

// STAGE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

export function StageFormDialog({ open, onOpenChange, repairId, editData, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  repairId: string; editData: RepairStage | null;
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name || '', description: editData.description || '', status: editData.status || 'pending', startDate: editData.startDate ? toLocalDate(editData.startDate) : '', endDate: editData.endDate ? toLocalDate(editData.endDate) : '', performer: editData.performer || '', cost: editData.cost?.toString() || '', sortOrder: editData.sortOrder?.toString() || '0', estimatedDuration: editData.estimatedDuration?.toString() || '', notes: editData.notes || '' })
    } else { setForm({ status: 'pending', sortOrder: '0' }) }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  // Auto-calculate actual duration display
  const actualDuration = f('startDate') && f('endDate') ? Math.ceil((new Date(f('endDate')).getTime() - new Date(f('startDate')).getTime()) / (1000*60*60*24)) : null

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название этапа'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: f('name'), description: f('description') || null, status: f('status'), startDate: f('startDate') || null, endDate: f('endDate') || null, performer: f('performer') || null, cost: f('cost') ? parseFloat(f('cost')) : null, sortOrder: parseInt(f('sortOrder') || '0'), estimatedDuration: f('estimatedDuration') ? parseFloat(f('estimatedDuration')) : null, notes: f('notes') || null }
      if (editData) body.stageId = editData.id
      const res = await fetch(`/api/repairs/${repairId}/stages`, { method: editData ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Этап обновлён' : 'Этап добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения этапа') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{editData ? 'Редактирование этапа' : 'Новый этап ремонта'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="sm:col-span-2"><Label className="text-xs">Название *</Label>
            {!editData && (
              <div className="flex gap-1 mt-1">
                {STAGE_TEMPLATES.slice(0, 4).map((t, i) => (
                  <button key={i} type="button" className="text-[9px] rounded px-1.5 py-0.5 bg-muted hover:bg-muted/80 transition-colors" onClick={() => { setF('name', t.name); setF('description', t.description) }}>{t.name}</button>
                ))}
              </div>
            )}
            <Input value={f('name')} onChange={e => setF('name', e.target.value)} autoFocus className="mt-1" />
          </div>
          <div className="sm:col-span-2"><Label className="text-xs">Описание</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} /></div>
          <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Исполнитель</Label><Input value={f('performer')} onChange={e => setF('performer', e.target.value)} /></div>
          <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
          <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
          <div><Label className="text-xs">Плановая длительность (дн.)</Label><Input type="number" value={f('estimatedDuration')} onChange={e => setF('estimatedDuration', e.target.value)} /></div>
          <div>
            <Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} />
            {actualDuration != null && f('estimatedDuration') && actualDuration !== parseFloat(f('estimatedDuration')) && (
              <p className={`text-[9px] mt-0.5 ${actualDuration > parseFloat(f('estimatedDuration')) ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                Факт: {actualDuration} дн. ({actualDuration > parseFloat(f('estimatedDuration')) ? '+' : ''}{actualDuration - parseFloat(f('estimatedDuration'))} дн.)
              </p>
            )}
          </div>
          <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Дополнительные заметки по этапу..." /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

