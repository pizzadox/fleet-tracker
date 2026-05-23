'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Upload, Camera, ImagePlus, Loader2, X
} from 'lucide-react'
import type { RepairStage } from '@/lib/types'
import { PHOTO_CATEGORIES, REPAIR_PHOTO_CATEGORY_MAP, API } from '@/lib/constants'
import { handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// PHOTO UPLOAD DIALOG (Equipment)
// ═══════════════════════════════════════════════════════════════

export function PhotoUploadDialog({ open, onOpenChange, targetId, targetType, onUploaded }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  targetId: string; targetType: 'equipment';
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!open) { setFile(null); setDescription(''); setCategory('general') } }, [open])

  const handleUpload = async () => {
    if (!file) { toast.error('Выберите файл'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file); formData.append('description', description); formData.append('category', category)
      const res = await fetch(`/api/equipment/${targetId}/photos`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      toast.success('Фото загружено')
      onUploaded()
    } catch { toast.error('Ошибка загрузки фото') }
    setUploading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="size-4" />Загрузка фото</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5">
          <div>
            <Label className="text-xs">Файл *</Label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <Button variant="outline" className="w-full gap-2 h-9 text-sm mt-1" onClick={() => fileInputRef.current?.click()}><ImagePlus className="size-3.5" />{file ? file.name : 'Выбрать файл'}</Button>
          </div>
          <div><Label className="text-xs">Описание</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><Label className="text-xs">Категория</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PHOTO_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          {file && <div className="rounded-lg overflow-hidden border bg-muted aspect-video"><img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" /></div>}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleUpload} disabled={uploading || !file}>{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}Загрузить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// REPAIR PHOTO UPLOAD DIALOG
// ═══════════════════════════════════════════════════════════════

export function RepairPhotoUploadDialog({ open, onOpenChange, targetId, stages, onUploaded }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  targetId: string; stages: RepairStage[];
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([])
  const [description, setDescription] = useState('')
  const [stageId, setStageId] = useState('')
  const [category, setCategory] = useState('during')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!open) { setFiles([]); setDescription(''); setStageId(''); setCategory('during') } }, [open])

  const handleUpload = async () => {
    if (files.length === 0) { toast.error('Выберите файл(ы)'); return }
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file); formData.append('description', description)
        formData.append('category', category)
        if (stageId) formData.append('stageId', stageId)
        const res = await fetch(`/api/repairs/${targetId}/photos`, { method: 'POST', body: formData })
        if (!res.ok) throw new Error()
      }
      toast.success(`Загружено ${files.length} фото`)
      onUploaded()
    } catch { toast.error('Ошибка загрузки фото') }
    setUploading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="size-4" />Загрузка фото ремонта</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5">
          <div>
            <Label className="text-xs">Файл(ы) *</Label>
            <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="hidden" />
            <Button variant="outline" className="w-full gap-2 h-9 text-sm mt-1" onClick={() => fileInputRef.current?.click()}><ImagePlus className="size-3.5" />{files.length > 0 ? `${files.length} файл(ов)` : 'Выбрать файл(ы)'}</Button>
          </div>
          <div><Label className="text-xs">Категория</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_PHOTO_CATEGORY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Описание</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          {stages.length > 0 && (
            <div><Label className="text-xs">Привязка к этапу</Label><Select value={stageId || '_none'} onValueChange={v => setStageId(v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без привязки" /></SelectTrigger><SelectContent><SelectItem value="_none">Без привязки</SelectItem>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          {/* Preview for files */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {files.slice(0, 6).map((file, i) => (
                <div key={i} className="relative rounded-md overflow-hidden border bg-muted aspect-square">
                  <img src={URL.createObjectURL(file)} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  {i === 5 && files.length > 6 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-medium">+{files.length - 6}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleUpload} disabled={uploading || files.length === 0}>{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}Загрузить{files.length > 1 ? ` (${files.length})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

