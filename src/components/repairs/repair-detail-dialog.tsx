'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Wrench, Edit, Trash2, ChevronDown, ChevronUp, Clock, XCircle,
  CheckCircle2, AlertTriangle, Activity, Camera, Upload,
  Plus, MoreVertical, CopyPlus, Pause, Play, MessageSquare, UserPlus, Save
} from 'lucide-react'
import type { Repair, RepairStage, RepairPhoto, RepairEmployee, RepairComment, Employee } from '@/lib/types'
import { REPAIR_STATUS_MAP, STAGE_STATUS_MAP, REPAIR_PRIORITY_MAP, REPAIR_TYPE_MAP, REPAIR_PHOTO_CATEGORY_MAP, REPAIR_MASTER_ROLE_MAP, STAGE_TEMPLATES, hasPermission } from '@/lib/constants'
import { formatDate, formatDateTime, formatPrice, formatTime, statusBadge, getStageProgress, SectionDivider, formatDaysUntil, formatDurationShort } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// REPAIR MASTERS SECTION — НАЗНАЧЕННЫЕ МАСТЕРА
// ═══════════════════════════════════════════════════════════════

export function RepairMastersSection({ repair, employees, onRefresh }: {
  repair: Repair; employees: Employee[]; onRefresh: () => void;
}) {
  const [addingMaster, setAddingMaster] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedRole, setSelectedRole] = useState('master')
  const [assigning, setAssigning] = useState(false)

  const assignedIds = new Set(repair.masters?.map(m => m.employeeId) || [])
  const availableEmployees = employees.filter(e => e.status === 'active' && !assignedIds.has(e.id))

  const handleAssign = async () => {
    if (!selectedEmployee) { toast.error('Выберите сотрудника'); return }
    setAssigning(true)
    try {
      const res = await fetch(`/api/repairs/${repair.id}/masters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee, role: selectedRole })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Ошибка назначения')
        setAssigning(false)
        return
      }
      toast.success('Мастер назначен')
      setSelectedEmployee('')
      setSelectedRole('master')
      setAddingMaster(false)
      onRefresh()
    } catch { toast.error('Ошибка назначения мастера') }
    setAssigning(false)
  }

  const handleRemove = async (employeeId: string) => {
    try {
      const res = await fetch(`/api/repairs/${repair.id}/masters?employeeId=${employeeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Мастер снят с ремонта')
      onRefresh()
    } catch { toast.error('Ошибка снятия мастера') }
  }

  return (
    <DetailSection title="Назначенные мастера" icon={<Users className="size-3.5" />}>
      <div className="col-span-2">
        {/* List of assigned masters */}
        {repair.masters && repair.masters.length > 0 ? (
          <div className="space-y-1.5 mb-2">
            {repair.masters.map(m => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="size-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium truncate">{m.employee.fullName}</p>
                    {statusBadge(m.role, REPAIR_MASTER_ROLE_MAP)}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {m.employee.phone && <a href={`tel:${m.employee.phone}`} className="hover:text-primary transition-colors flex items-center gap-0.5"><Phone className="size-2.5" />{m.employee.phone}</a>}
                    {m.employee.position && <span>{EMPLOYEE_POSITION_MAP[m.employee.position]?.label || m.employee.position}</span>}
                  </div>
                </div>
                {/* Quick action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {m.employee.phone && (
                    <Button size="sm" variant="ghost" className="size-6 p-0" asChild>
                      <a href={`tel:${m.employee.phone}`} aria-label="Позвонить"><Phone className="size-3 text-emerald-600 dark:text-emerald-400" /></a>
                    </Button>
                  )}
                  {(m.employee as any).email && (
                    <Button size="sm" variant="ghost" className="size-6 p-0" asChild>
                      <a href={`mailto:${(m.employee as any).email}`} aria-label="Написать"><Mail className="size-3 text-sky-600 dark:text-sky-400" /></a>
                    </Button>
                  )}
                  {(repair.status === 'in_progress' || repair.status === 'paused') && (
                    <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(m.employeeId)} aria-label="Снять с ремонта">
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mb-2">Мастера не назначены</p>
        )}

        {/* Add master form */}
        {repair.status === 'in_progress' && (
          addingMaster ? (
            <div className="flex flex-col gap-2 p-2 rounded-md border border-dashed">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Нет доступных сотрудников</div>
                  ) : (
                    availableEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName} — {EMPLOYEE_POSITION_MAP[e.position]?.label || e.position}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Роль" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REPAIR_MASTER_ROLE_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={handleAssign} disabled={assigning || !selectedEmployee}>
                  {assigning ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                  Назначить
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setAddingMaster(false); setSelectedEmployee('') }}>Отмена</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setAddingMaster(true)}>
              <Plus className="size-3" />Назначить мастера
            </Button>
          )
        )}
      </div>
    </DetailSection>
  )
}

// ═══════════════════════════════════════════════════════════════
// REPAIR DETAIL DIALOG — С ПРОКРУТКОЙ!
// ═══════════════════════════════════════════════════════════════

export function RepairDetailDialog({ open, onOpenChange, repair, loading, fullPhoto, setFullPhoto, onEdit, onDelete, onComplete, onAddStage, onEditStage, onDeleteStage, onUploadPhoto, onRefresh, employees, onDuplicate, onPause, onResume }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  repair: Repair | null; loading: boolean;
  fullPhoto: string | null; setFullPhoto: (v: string | null) => void;
  onEdit: (r: Repair) => void; onDelete: (r: Repair) => void;
  onComplete: (r: Repair) => void;
  onAddStage: (repairId: string) => void;
  onEditStage: (stage: RepairStage, repairId: string) => void;
  onDeleteStage: (stageId: string, repairId: string) => void;
  onUploadPhoto: (repairId: string) => void;
  onRefresh: () => void;
  employees: Employee[];
  onDuplicate?: (r: Repair) => void;
  onPause?: (r: Repair) => void;
  onResume?: (r: Repair) => void;
}) {
  const [photoCatFilter, setPhotoCatFilter] = useState('all')
  const [lightboxIdx, setLightboxIdx] = useState(-1)
  const [comments, setComments] = useState<RepairComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: () => void; title: string; desc: string }>({ open: false, action: () => {}, title: '', desc: '' })
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Load comments when repair changes
  useEffect(() => {
    if (repair && open) {
      setCommentsLoading(true)
      fetch(`/api/repairs/${repair.id}/comments`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { setComments(Array.isArray(data) ? data : []); setCommentsLoading(false) })
        .catch(() => { setComments([]); setCommentsLoading(false) })
    }
  }, [repair?.id, open])

  // Scroll to bottom on new comment
  useEffect(() => {
    if (comments.length > 0) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  // Auto-close lightbox
  useEffect(() => {
    if (lightboxIdx < 0) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(-1)
      if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(i + 1, (repair?.photos?.length || 1) - 1))
      if (e.key === 'ArrowLeft') setLightboxIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, repair?.photos?.length])

  const handleAddComment = async () => {
    if (!commentText.trim() || !repair) return
    try {
      const res = await fetch(`/api/repairs/${repair.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() })
      })
      if (!res.ok) throw new Error()
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setCommentText('')
      toast.success('Комментарий добавлен')
    } catch { toast.error('Ошибка добавления комментария') }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/repairs/${repair!.id}/comments?commentId=${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('Комментарий удалён')
    } catch { toast.error('Ошибка удаления комментария') }
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/repairs/${repair!.id}/photos?photoId=${photoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Фото удалено')
      onRefresh()
    } catch { toast.error('Ошибка удаления фото') }
  }

  if (!repair) return null
  const r = repair
  const stagesCost = r.stages?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0
  const completedStages = r.stages?.filter(s => s.status === 'completed').length || 0
  const totalStages = r.stages?.length || 0
  const progressPct = getStageProgress(r.stages || [])

  // Duration calculation
  const startMs = new Date(r.startDate).getTime()
  const endMs = r.endDate ? new Date(r.endDate).getTime() : Date.now()
  const durationMs = endMs - startMs
  const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24))
  const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  // Overdue check
  const isOverdue = r.status === 'in_progress' && r.estimatedEndDate && new Date(r.estimatedEndDate) < new Date()

  // Cost deviation
  const costDeviation = r.estimatedCost && r.cost ? Math.round(((r.cost - r.estimatedCost) / r.estimatedCost) * 100) : null

  // Time comparison (estimated days)
  const estimatedDays = r.estimatedEndDate ? Math.ceil((new Date(r.estimatedEndDate).getTime() - startMs) / (1000*60*60*24)) : null
  const timeDeviation = estimatedDays != null ? durationDays - estimatedDays : null

  // Filter photos by category
  const filteredPhotos = photoCatFilter === 'all' ? (r.photos || []) : (r.photos || []).filter(p => p.category === photoCatFilter)

  // Photo counts by category
  const photoCounts: Record<string, number> = { all: (r.photos || []).length }
  for (const p of (r.photos || [])) {
    photoCounts[p.category] = (photoCounts[p.category] || 0) + 1
  }

  // Status color for border
  const statusBorderColor = r.status === 'in_progress' ? 'border-l-amber-500' : r.status === 'completed' ? 'border-l-emerald-500' : r.status === 'paused' ? 'border-l-blue-500' : 'border-l-red-500'

  // Priority dot color
  const priorityDotColor: Record<string, string> = { low: 'bg-gray-400', medium: 'bg-sky-500', high: 'bg-amber-500', critical: 'bg-red-500' }

  // Equipment type icon
  const eqTypeInfo = r.equipment?.type ? getTypeInfo(r.equipment.type) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header with status bar */}
        <DialogHeader className={`border-l-4 ${statusBorderColor} pl-3`}>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Wrench className="size-4 shrink-0" />
            <span className="truncate">{r.description}</span>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">#{r.id.slice(0, 6)}</span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {eqTypeInfo && <span className="inline-flex items-center gap-1">{eqTypeInfo.icon}<span className="font-medium">{r.equipment?.name}</span></span>}
            {!eqTypeInfo && r.equipment?.name && <span className="font-medium">{r.equipment.name}</span>}
            <span className="ml-1">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
            {r.priority && REPAIR_PRIORITY_MAP[r.priority] && <span className="inline-flex items-center gap-1">{statusBadge(r.priority, REPAIR_PRIORITY_MAP as any)}</span>}
            {r.repairType && REPAIR_TYPE_MAP[r.repairType] && <span className="inline-flex items-center gap-1">{statusBadge(r.repairType, REPAIR_TYPE_MAP)}</span>}
            {r.warrantyRepair && <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400"><ShieldCheck className="size-2.5" />Гарантия</span>}
            {r.insuranceClaim && <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"><Shield className="size-2.5" />Страховка</span>}
          </DialogDescription>
          {/* Duration + Overdue */}
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" />{durationDays} дн. {durationHours} ч.</span>
            {isOverdue && <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-3" />Просрочен на {Math.ceil((Date.now() - new Date(r.estimatedEndDate!).getTime()) / (1000*60*60*24))} дн.</span>}
          </div>
        </DialogHeader>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Progress section */}
              {totalStages > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Прогресс ремонта</span>
                    <span className="font-medium">{completedStages}/{totalStages} этапов • {progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  {/* Estimated vs actual time */}
                  {(estimatedDays != null || timeDeviation != null) && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {estimatedDays != null && <span>План: {estimatedDays} дн.</span>}
                      <span>Факт: {durationDays} дн.</span>
                      {timeDeviation != null && timeDeviation !== 0 && (
                        <span className={timeDeviation > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                          ({timeDeviation > 0 ? '+' : ''}{timeDeviation} дн.)
                        </span>
                      )}
                    </div>
                  )}
                  {/* Estimated vs actual cost */}
                  {r.estimatedCost != null && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>План: {formatPrice(r.estimatedCost)}</span>
                      <span>Факт: {formatPrice(r.cost)}</span>
                      {costDeviation != null && costDeviation !== 0 && (
                        <span className={costDeviation > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                          ({costDeviation > 0 ? '+' : ''}{costDeviation}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Основная информация */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                  <span className="text-muted-foreground"><ClipboardList className="size-3.5" /></span>
                  <h3 className="text-xs font-semibold">Основная информация</h3>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                    <DetailRow label="Описание" value={r.description} />
                    <DetailRow label="Причина" value={r.reason} />
                    <DetailRow label="Местоположение" value={r.location ? <span className="flex items-center gap-1"><MapPin className="size-3" />{r.location}</span> : null} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Сроки и стоимость */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                  <span className="text-muted-foreground"><CalendarDays className="size-3.5" /></span>
                  <h3 className="text-xs font-semibold">Сроки и стоимость</h3>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                    <DetailRow label="Дата начала" value={formatDate(r.startDate)} />
                    <DetailRow label="Дата окончания" value={formatDate(r.endDate)} />
                    <DetailRow label="Плановая дата" value={formatDate(r.estimatedEndDate)} />
                    <DetailRow label="Стоимость" value={formatPrice(r.cost)} />
                    <DetailRow label="Плановая стоимость" value={formatPrice(r.estimatedCost)} />
                    {costDeviation != null && <DetailRow label="Отклонение" value={<span className={costDeviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{costDeviation > 0 ? '+' : ''}{costDeviation}%</span>} />}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Пробег и простой */}
              {(r.mileageStart != null || r.mileageEnd != null || r.downtimeHours != null) && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                    <span className="text-muted-foreground"><Gauge className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Пробег и простой</h3>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                      <DetailRow label="Пробег начало" value={r.mileageStart != null ? `${new Intl.NumberFormat('ru-RU').format(r.mileageStart)} км` : null} />
                      <DetailRow label="Пробег конец" value={r.mileageEnd != null ? `${new Intl.NumberFormat('ru-RU').format(r.mileageEnd)} км` : null} />
                      {(r.mileageStart != null && r.mileageEnd != null) && <DetailRow label="Разница пробега" value={`${new Intl.NumberFormat('ru-RU').format(r.mileageEnd! - r.mileageStart!)} км`} />}
                      <DetailRow label="Время простоя" value={r.downtimeHours != null ? `${r.downtimeHours} ч.` : null} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Подрядчик */}
              {(r.contractor || r.contractorPhone || r.contractorEmail) && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                    <span className="text-muted-foreground"><Building2 className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Подрядчик</h3>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                      <DetailRow label="Подрядчик" value={r.contractor} />
                      <DetailRow label="Телефон" value={r.contractorPhone ? <a href={`tel:${r.contractorPhone}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="size-3" />{r.contractorPhone}</a> : null} />
                      <DetailRow label="Email" value={r.contractorEmail ? <a href={`mailto:${r.contractorEmail}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="size-3" />{r.contractorEmail}</a> : null} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Результат */}
              {(r.workPerformed || r.spareParts || r.nextInspection) && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                    <span className="text-muted-foreground"><ClipboardCheck className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Результат</h3>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                      <DetailRow label="Выполненные работы" value={r.workPerformed} />
                      <DetailRow label="Запчасти" value={r.spareParts} />
                      <DetailRow label="Следующий ТО" value={formatDate(r.nextInspection)} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Гарантия и страховка */}
              {(r.warrantyRepair || r.insuranceClaim || r.insuranceNumber) && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                    <span className="text-muted-foreground"><Shield className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Гарантия и страховка</h3>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">
                      <DetailRow label="Гарантийный ремонт" value={r.warrantyRepair ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="size-3" />Да</span> : <span className="text-muted-foreground">Нет</span>} />
                      <DetailRow label="Страховой случай" value={r.insuranceClaim ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="size-3" />Да</span> : <span className="text-muted-foreground">Нет</span>} />
                      <DetailRow label="Номер страховки" value={r.insuranceNumber} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Заметки */}
              {r.notes && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 mb-1.5 w-full text-left hover:text-foreground transition-colors">
                    <span className="text-muted-foreground"><StickyNote className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Заметки</h3>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-5">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.notes}</p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Assigned Masters */}
              <RepairMastersSection repair={r} employees={employees} onRefresh={onRefresh} />

              {/* Stages - Timeline visualization */}
              <DetailSection title="Этапы ремонта" icon={<Settings2 className="size-3.5" />}>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => onAddStage(r.id)}><Plus className="size-3" />Добавить этап</Button>
                    {totalStages > 0 && (
                      <span className="text-[10px] text-muted-foreground">Итого по этапам: {formatPrice(stagesCost)}</span>
                    )}
                  </div>
                  {totalStages > 0 ? (
                    <div className="relative pl-4">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-2">
                        {r.stages!.map((stage, si) => {
                          const stageDays = stage.startDate ? Math.ceil(((stage.endDate ? new Date(stage.endDate) : new Date()).getTime() - new Date(stage.startDate).getTime()) / (1000*60*60*24)) : null
                          const actualDuration = stage.startDate && stage.endDate ? Math.ceil((new Date(stage.endDate).getTime() - new Date(stage.startDate).getTime()) / (1000*60*60*24)) : null
                          return (
                            <div key={stage.id} className="relative flex items-start gap-2">
                              <button
                                className="shrink-0 z-10 mt-1"
                                onClick={() => {
                                  const nextStatus = stage.status === 'pending' ? 'in_progress' : stage.status === 'in_progress' ? 'completed' : stage.status === 'paused' ? 'in_progress' : 'pending'
                                  fetch(`/api/repairs/${r.id}/stages`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ stageId: stage.id, status: nextStatus, startDate: nextStatus === 'in_progress' && !stage.startDate ? new Date().toISOString() : undefined, endDate: nextStatus === 'completed' ? new Date().toISOString() : undefined })
                                  }).then(res => { if (res.ok) { toast.success(`Этап: ${STAGE_STATUS_MAP[nextStatus]?.label || nextStatus}`); onRefresh() } else toast.error('Ошибка') }).catch(() => toast.error('Ошибка'))
                                }}
                                aria-label="Переключить статус"
                              >
                                {stage.status === 'completed' ? <CheckCircle2 className="size-4 text-emerald-500" /> : stage.status === 'in_progress' ? <Clock className="size-4 text-amber-500" /> : stage.status === 'paused' ? <PauseCircle className="size-4 text-blue-500" /> : <XCircle className="size-4 text-gray-400" />}
                              </button>
                              <div className="flex-1 min-w-0 p-2 rounded-md border bg-card/50">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium">{stage.name}</p>
                                  {statusBadge(stage.status, STAGE_STATUS_MAP)}
                                  {si + 1 < totalStages && <span className="text-[9px] text-muted-foreground">#{si + 1}</span>}
                                </div>
                                {stage.description && <p className="text-[10px] text-muted-foreground">{stage.description}</p>}
                                <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                  {stage.performer && <span>Исполнитель: {stage.performer}</span>}
                                  {stage.cost != null && <span>Стоимость: {formatPrice(stage.cost)}</span>}
                                  {stage.estimatedDuration != null && <span>План: {stage.estimatedDuration} дн.</span>}
                                  {stageDays != null && <span>Факт: {stageDays} дн.</span>}
                                  {stage.estimatedDuration != null && actualDuration != null && actualDuration !== stage.estimatedDuration && (
                                    <span className={actualDuration > stage.estimatedDuration ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                                      ({actualDuration > stage.estimatedDuration ? '+' : ''}{actualDuration - stage.estimatedDuration} дн.)
                                    </span>
                                  )}
                                </div>
                                {stage.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">📝 {stage.notes}</p>}
                                {stage.status === 'in_progress' && stage.startDate && (
                                  <div className="mt-1"><Progress value={Math.min(100, Math.round(((Date.now() - new Date(stage.startDate).getTime()) / (1000*60*60*24*(stage.estimatedDuration || 7))) * 100))} className="h-1" /></div>
                                )}
                                <div className="flex gap-0.5 shrink-0 mt-1">
                                  <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onEditStage(stage, r.id)} aria-label="Редактировать этап"><Edit className="size-3" /></Button>
                                  <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDeleteStage(stage.id, r.id)} aria-label="Удалить этап"><Trash2 className="size-3" /></Button>
                                </div>
                              </div>
                            </div>
                        )})}
                      {stagesCost > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 border-t">
                          Итого по этапам: {formatPrice(stagesCost)}
                        </div>
                      )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Этапы не добавлены</p>
                  )}
                </div>
              </DetailSection>

              {/* Photos with category filter */}
              <DetailSection title="Фотографии" icon={<Camera className="size-3.5" />}>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => onUploadPhoto(r.id)}><Upload className="size-3" />Загрузить фото</Button>
                  </div>
                  {/* Category filter tabs */}
                  {(r.photos || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <button onClick={() => setPhotoCatFilter('all')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${photoCatFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Все ({photoCounts.all})</button>
                      {Object.entries(REPAIR_PHOTO_CATEGORY_MAP).map(([k, v]) => {
                        const count = photoCounts[k] || 0
                        if (count === 0) return null
                        return (
                          <button key={k} onClick={() => setPhotoCatFilter(k)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${photoCatFilter === k ? v.color : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{v.label} ({count})</button>
                        )
                      })}
                    </div>
                  )}
                  {filteredPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {filteredPhotos.map((p, idx) => (
                        <div key={p.id} className="relative group rounded-md overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => { setLightboxIdx((r.photos || []).indexOf(p)) }}>
                          <img src={p.url} alt={p.description || ''} className="w-full h-full object-cover" loading="lazy" />
                          {/* Category badge */}
                          {p.category && REPAIR_PHOTO_CATEGORY_MAP[p.category] && (
                            <span className={`absolute top-1 left-1 inline-flex items-center rounded px-1 py-0.5 text-[8px] font-medium ${REPAIR_PHOTO_CATEGORY_MAP[p.category].color}`}>{REPAIR_PHOTO_CATEGORY_MAP[p.category].label}</span>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Eye className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {/* Delete button on hover */}
                          <Button size="sm" variant="ghost" className="absolute top-1 right-1 size-5 p-0 text-white bg-black/50 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(p.id) }} aria-label="Удалить фото">
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Нет фотографий</p>
                  )}
                </div>
              </DetailSection>

              {/* Comments section */}
              <DetailSection title="Комментарии" icon={<MessageSquare className="size-3.5" />}>
                <div className="col-span-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {commentsLoading ? (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="size-3 animate-spin" />Загрузка...</div>
                    ) : comments.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Нет комментариев</p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="flex gap-2 p-1.5 rounded-md border bg-card/50">
                          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="size-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-medium">{c.author || 'Аноним'}</span>
                              <span className="text-[9px] text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="text-[11px] whitespace-pre-wrap">{c.text}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="size-5 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteComment(c.id)} aria-label="Удалить комментарий">
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                  {/* Add comment form */}
                  <div className="flex gap-1.5 mt-2">
                    <Input placeholder="Добавить комментарий..." value={commentText} onChange={e => setCommentText(e.target.value)} className="h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }} />
                    <Button size="sm" className="h-8 px-3" onClick={handleAddComment} disabled={!commentText.trim()}><Send className="size-3" /></Button>
                  </div>
                </div>
              </DetailSection>
            </div>
          )}

          {/* Footer after content */}
          <div className="sticky bottom-0 bg-card border-t pt-3 pb-2 -mx-4 sm:-mx-5 px-4 sm:px-5 mt-4 z-10">
            <div className="flex flex-wrap gap-1.5 sm:gap-0 justify-end">
              {r.status === 'in_progress' && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setConfirmDialog({ open: true, title: 'Завершить ремонт?', desc: 'Ремонт будет отмечен как завершённый. Это действие можно отменить через редактирование.', action: () => { onComplete(r); setConfirmDialog(prev => ({ ...prev, open: false })) } })}><CheckCircle2 className="size-3.5" />Завершить</Button>
              )}
              {r.status === 'in_progress' && onPause && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onPause(r)}><Pause className="size-3.5" />Приостановить</Button>
              )}
              {r.status === 'paused' && onResume && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onResume(r)}><Play className="size-3.5" />Возобновить</Button>
              )}
              {(r.status === 'in_progress' || r.status === 'paused') && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-red-600 hover:text-red-700" onClick={() => setConfirmDialog({ open: true, title: 'Отменить ремонт?', desc: 'Ремонт будет отмечен как отменённый.', action: () => { fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }).then(res => { if (res.ok) { toast.success('Ремонт отменён'); onRefresh() } else toast.error('Ошибка') }) ; setConfirmDialog(prev => ({ ...prev, open: false })) } })}><XCircle className="size-3.5" />Отменить</Button>
              )}
              {onDuplicate && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDuplicate(r)}><Copy className="size-3.5" />Дублировать</Button>
              )}
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(r)}><Edit className="size-3.5" />Редактировать</Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => window.print()}><Printer className="size-3.5" />Печать</Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><RefreshCw className="size-3.5" />Обновить</Button>
              <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => setConfirmDialog({ open: true, title: 'Удалить ремонт?', desc: 'Это действие необратимо. Все данные о ремонте будут удалены.', action: () => { onDelete(r); setConfirmDialog(prev => ({ ...prev, open: false })) } })}><Trash2 className="size-3.5" />Удалить</Button>
            </div>
          </div>
        </div>

        {/* Lightbox */}
        {lightboxIdx >= 0 && (r.photos || []).length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(-1)}>
            <button className="absolute top-4 right-4 text-white size-8 hover:bg-white/20 rounded-full flex items-center justify-center" onClick={() => setLightboxIdx(-1)}><X className="size-5" /></button>
            {lightboxIdx > 0 && <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white size-10 hover:bg-white/20 rounded-full flex items-center justify-center" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1) }}><ChevronLeft className="size-6" /></button>}
            {lightboxIdx < (r.photos || []).length - 1 && <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white size-10 hover:bg-white/20 rounded-full flex items-center justify-center" onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1) }}><ChevronRight className="size-6" /></button>}
            <img src={r.photos![lightboxIdx]?.url} alt="" className="max-h-[85vh] max-w-[90vw] object-contain" onClick={e => e.stopPropagation()} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs">{lightboxIdx + 1} / {(r.photos || []).length}</div>
          </div>
        )}

        {/* Confirm dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={v => setConfirmDialog(prev => ({ ...prev, open: v }))}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmDialog.desc}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.action}>Подтвердить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


      </DialogContent>
    </Dialog>
  )
}

