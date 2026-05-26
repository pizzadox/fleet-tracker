'use client'

import React, { useState, useEffect } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  CheckCircle2, Activity, ArrowRight, Users, Wrench,
  Camera, Shield, Info, Package, ChevronLeft, ChevronRight
} from 'lucide-react'
import type { RepairStage, EquipmentTypeInfo } from './types'
import { EQUIPMENT_TYPE_MAP } from './constants'

// ─── shadcn/ui utility ────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function toLocalDatetime(d: Date | string): string {
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localDatetimeToISO(dtLocal: string | null | undefined): string | null {
  if (!dtLocal) return null
  const match = dtLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hour, minute] = match.map(Number)
    const d = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  const d = new Date(dtLocal)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export function toLocalDate(d: Date | string): string {
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('ru-RU') } catch { return '—' }
}

export function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export function formatTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

export function formatPrice(p?: number | null): string {
  if (p == null) return '—'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(p)
}

export function statusBadge(status: string, map: Record<string, { label: string; color: string; description?: string }>) {
  const s = map[status]
  if (!s) return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  const inner = <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium ${s.color}`}>{s.label}</span>
  if (s.description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-balance">
          <p className="font-semibold">{s.label}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{s.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

export function getEventIcon(event: string) {
  switch (event) {
    case 'registration': return <CheckCircle2 className="size-3.5 text-emerald-500" />
    case 'status_change': return <Activity className="size-3.5 text-amber-500" />
    case 'transfer': return <ArrowRight className="size-3.5 text-sky-500" />
    case 'rental': return <Users className="size-3.5 text-violet-500" />
    case 'repair': return <Wrench className="size-3.5 text-orange-500" />
    case 'photo_added': return <Camera className="size-3.5 text-pink-500" />
    case 'inspection': return <Shield className="size-3.5 text-teal-500" />
    default: return <Info className="size-3.5 text-gray-500" />
  }
}

export function getStageProgress(stages: RepairStage[]): number {
  if (!stages || stages.length === 0) return 0
  const completed = stages.filter(s => s.status === 'completed').length
  return Math.round((completed / stages.length) * 100)
}

export function formatDaysUntil(d?: string | null): { text: string; className: string } | null {
  if (!d) return null
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { text: `Истекло ${Math.abs(days)} дн. назад (${formatDate(d)})`, className: 'text-red-600 dark:text-red-400 font-medium' }
  if (days < 30) return { text: `${days} дн. (${formatDate(d)})`, className: 'text-amber-600 dark:text-amber-400 font-medium' }
  return { text: `${days} дн. (${formatDate(d)})`, className: '' }
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 24) { const d = Math.floor(h / 24); return `${d}д ${h % 24}ч` }
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`
}

export function fmtDuration(sec: number | null | undefined): string | null {
  if (sec == null) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useScrollPosition() {
  const [scrolledDown, setScrolledDown] = useState(false)
  useEffect(() => {
    const handler = () => {
      setScrolledDown(window.scrollY > 300)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return scrolledDown
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function usePersistedFilter<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(`fleet_filter_${key}`)
      return stored ? JSON.parse(stored) : defaultValue
    } catch { return defaultValue }
  })
  const setAndPersist = (v: T) => {
    setValue(v)
    try { localStorage.setItem(`fleet_filter_${key}`, JSON.stringify(v)) } catch {}
  }
  return [value, setAndPersist]
}

export function useAutoRefreshCountdown(intervalMs: number, enabled: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(intervalMs / 1000)
  useEffect(() => {
    if (!enabled) { setSecondsLeft(intervalMs / 1000); return }
    setSecondsLeft(intervalMs / 1000)
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { setSecondsLeft(intervalMs / 1000); return intervalMs / 1000 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [intervalMs, enabled])
  return secondsLeft
}

// ═══════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════

export function handleApiError(error: unknown, message: string = 'Ошибка') {
  console.error(message, error)
  toast.error(message)
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(','))
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Скопировано')
    return true
  } catch {
    toast.error('Ошибка копирования')
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
// SMALL SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Separator className="flex-1" />
    </div>
  )
}

export function PaginationControls({ page, totalPages, total, pageSize, onPageChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onPageChange: (p: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-muted-foreground">
        {total > 0 ? `Показано ${start}–${end} из ${total}` : 'Нет данных'}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Предыдущая страница">
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground px-1">{page} / {Math.max(totalPages, 1)}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Следующая страница">
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// Helper to get type info with fallback
export function getTypeInfo(type: string): EquipmentTypeInfo {
  return EQUIPMENT_TYPE_MAP[type] || { label: type, icon: <Package className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Другое' }
}

// Type badge component
export function TypeBadge({ type }: { type: string }) {
  const info = getTypeInfo(type)
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${info.color} ${info.darkColor}`}>
      {info.icon}{info.label}
    </span>
  )
}
