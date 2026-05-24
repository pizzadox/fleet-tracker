'user client'

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Settings2, Save, Loader2, RefreshCw, Shield, Users, User, Plus, Edit,
  Trash2, CheckCircle2, XCircle, Database, Palette, Globe, LogOut,
  Cog, Activity, Bell, Info, UserPlus, Copy, Eye, Key,
  ArrowLeft, Cpu, Map, Route, Satellite, Tag, Truck, Wrench,
  ChevronRight, Clock, Search, EyeOff, Sparkles, Zap, Heart,
  Server, HardDrive, ThermometerSun, Keyboard, Download, Upload
} from 'lucide-react'
import type { AppUserType, AxentaSettings, RoleKey } from '@/lib/types'
import { ROLE_LABELS, DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS, AVATAR_COLORS, getInitials, hasPermission, API } from '@/lib/constants'
import { handleApiError, formatDateTime, useDebounce, copyToClipboard } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB CONTENT — 10 improvements (#91-100)
// ═══════════════════════════════════════════════════════════════

export function SettingsTabContent({
  users, fetchUsers, axentaSettings, setAxentaSettings, settingsSaving, setSettingsSaving,
  syncing, setSyncing, settingsSubTab, setSettingsSubTab, onRefreshAll, rolePermissions, onPermissionsUpdate
}: {
  users: AppUserType[]; fetchUsers: () => void;
  axentaSettings: AxentaSettings; setAxentaSettings: React.Dispatch<React.SetStateAction<AxentaSettings>>;
  settingsSaving: boolean; setSettingsSaving: (v: boolean) => void;
  syncing: boolean; setSyncing: (v: boolean) => void;
  settingsSubTab: 'users' | 'permissions' | 'axenta' | 'about'; setSettingsSubTab: (v: 'users' | 'permissions' | 'axenta' | 'about') => void;
  onRefreshAll: () => void;
  rolePermissions: Record<string, string[]>;
  onPermissionsUpdate: (perms: Record<string, string[]>) => void;
}) {
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [userFormEdit, setUserFormEdit] = useState<AppUserType | null>(null)
  const [userFormSaving, setUserFormSaving] = useState(false)
  const [userDeleteDialog, setUserDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' })
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<string[]>([])
  const [permsSaving, setPermsSaving] = useState(false)
  // #91 User search
  const [userSearch, setUserSearch] = useState('')
  const debouncedUserSearch = useDebounce(userSearch, 200)
  // #95 Batch operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate' | null>(null)

  // #91 Filtered users
  const filteredUsers = useMemo(() => {
    if (!debouncedUserSearch) return users
    const q = debouncedUserSearch.toLowerCase()
    return users.filter(u => u.name.toLowerCase().includes(q) || (ROLE_LABELS[u.role as RoleKey] || '').toLowerCase().includes(q))
  }, [users, debouncedUserSearch])

  const handleSaveUser = async (data: { name: string; pin: string; role: string; isActive: boolean; avatar: string }) => {
    setUserFormSaving(true)
    try {
      if (userFormEdit) {
        const res = await fetch(`/api/users/${userFormEdit.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error()
        toast.success('Пользователь обновлён')
      } else {
        const res = await fetch('/api/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error()
        toast.success('Пользователь создан')
      }
      setUserFormOpen(false)
      fetchUsers()
    } catch { toast.error('Ошибка сохранения') }
    setUserFormSaving(false)
  }

  const handleDeleteUser = async () => {
    try {
      const res = await fetch(`/api/users/${userDeleteDialog.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Ошибка') }
      toast.success('Пользователь удалён')
      fetchUsers()
    } catch (e: any) { toast.error(e.message || 'Ошибка удаления') }
    setUserDeleteDialog({ open: false, id: '', name: '' })
  }

  // #95 Batch operations
  const handleBatchAction = async () => {
    if (!batchAction || selectedUsers.size === 0) return
    const isActive = batchAction === 'activate'
    let success = 0
    for (const userId of selectedUsers) {
      try {
        const user = users.find(u => u.id === userId)
        if (!user) continue
        const res = await fetch(`/api/users/${userId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user.name, role: user.role, isActive, avatar: user.avatar || '' }),
        })
        if (res.ok) success++
      } catch {}
    }
    toast.success(`${success} пользовател${success === 1 ? 'ь' : success < 5 ? 'я' : 'ей'} ${isActive ? 'активировано' : 'деактивировано'}`)
    setSelectedUsers(new Set())
    setBatchAction(null)
    fetchUsers()
  }

  const handleSavePermissions = async () => {
    if (!editingRole) return
    setPermsSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole, permissions: editPerms }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Права для "${ROLE_LABELS[editingRole as RoleKey] || editingRole}" сохранены`)
      const allRes = await fetch('/api/permissions')
      if (allRes.ok) {
        const data = await allRes.json()
        if (data.grouped) {
          onPermissionsUpdate(data.grouped)
        }
      }
      setEditingRole(null)
    } catch { toast.error('Ошибка сохранения прав') }
    setPermsSaving(false)
  }

  const togglePerm = (perm: string) => {
    setEditPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  const PERM_CATEGORIES = (() => {
    const cats: Record<string, typeof ALL_PERMISSIONS> = {}
    for (const p of ALL_PERMISSIONS) {
      if (!cats[p.category]) cats[p.category] = []
      cats[p.category].push(p)
    }
    return cats
  })()

  const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
    admin: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', darkBg: 'dark:bg-indigo-900/50', darkText: 'dark:text-indigo-400', darkBorder: 'dark:border-indigo-700' },
    manager: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', darkBg: 'dark:bg-emerald-900/50', darkText: 'dark:text-emerald-400', darkBorder: 'dark:border-emerald-700' },
    trip_master: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', darkBg: 'dark:bg-amber-900/50', darkText: 'dark:text-amber-400', darkBorder: 'dark:border-amber-700' },
    repair_worker: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', darkBg: 'dark:bg-red-900/50', darkText: 'dark:text-red-400', darkBorder: 'dark:border-red-700' },
    worker: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', darkBg: 'dark:bg-violet-900/50', darkText: 'dark:text-violet-400', darkBorder: 'dark:border-violet-700' },
  }

  const ROLE_HEX: Record<string, string> = {
    admin: '#6366f1', manager: '#10b981', trip_master: '#f59e0b', repair_worker: '#ef4444', worker: '#8b5cf6',
  }

  const ROLE_ICONS: Record<string, React.ReactNode> = {
    admin: <Shield className="size-4" />,
    manager: <Users className="size-4" />,
    trip_master: <Route className="size-4" />,
    repair_worker: <Wrench className="size-4" />,
    worker: <User className="size-4" />,
  }

  const PERM_CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Техника': <Truck className="size-3.5" />,
    'Ремонты': <Wrench className="size-3.5" />,
    'Рейсы': <Route className="size-3.5" />,
    'Управление': <Users className="size-3.5" />,
    'Мониторинг': <Map className="size-3.5" />,
    'Система': <Settings2 className="size-3.5" />,
  }

  const activeUsers = users.filter(u => u.isActive).length

  // #98 Export permissions
  const handleExportPermissions = () => {
    const data = JSON.stringify(rolePermissions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'permissions.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Права экспортированы')
  }

  // #99 System health check
  const [healthCheck, setHealthCheck] = useState<Record<string, { ok: boolean; ms: number }> | null>(null)
  const runHealthCheck = async () => {
    const checks: Record<string, { ok: boolean; ms: number }> = {}
    // Check API health
    for (const endpoint of ['/api/equipment', '/api/companies', '/api/employees']) {
      const start = Date.now()
      try {
        const res = await fetch(endpoint)
        checks[endpoint] = { ok: res.ok, ms: Date.now() - start }
      } catch {
        checks[endpoint] = { ok: false, ms: Date.now() - start }
      }
    }
    setHealthCheck(checks)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)]">
      <div className="px-4 pt-3 border-b bg-muted/20">
        <Tabs value={settingsSubTab} onValueChange={(v) => setSettingsSubTab(v as 'users' | 'permissions' | 'axenta' | 'about')}>
          <TabsList className="bg-transparent h-9 p-0 gap-0 w-full">
            <TabsTrigger value="users" className="gap-1.5 text-xs h-9 rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <Users className="size-3.5" />Пользователи
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{users.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs h-9 rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <Shield className="size-3.5" />Права
            </TabsTrigger>
            <TabsTrigger value="axenta" className="gap-1.5 text-xs h-9 rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <Satellite className="size-3.5" />Axenta
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5 text-xs h-9 rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <Info className="size-3.5" />О системе
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* ─── USERS TAB ─── */}
        {settingsSubTab === 'users' && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-2.5 text-center">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{users.length}</p>
                <p className="text-[10px] text-muted-foreground">Всего</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{activeUsers}</p>
                <p className="text-[10px] text-muted-foreground">Активных</p>
              </div>
              <div className="rounded-lg border bg-violet-50 dark:bg-violet-950/20 p-2.5 text-center">
                <p className="text-lg font-bold text-violet-700 dark:text-violet-400">{Object.keys(ROLE_LABELS).length}</p>
                <p className="text-[10px] text-muted-foreground">Ролей</p>
              </div>
            </div>

            {/* #91 User search + Add button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Поиск пользователей..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Button className="h-9 gap-2" onClick={() => { setUserFormEdit(null); setUserFormOpen(true) }}>
                <UserPlus className="size-4" />Добавить
              </Button>
            </div>

            {/* #95 Batch operations */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                <span className="text-xs text-muted-foreground">Выбрано: {selectedUsers.size}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setBatchAction('activate') }}><CheckCircle2 className="size-3" />Активировать</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setBatchAction('deactivate') }}><XCircle className="size-3" />Деактивировать</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedUsers(new Set())}>Снять</Button>
              </div>
            )}

            {/* User list */}
            <div className="space-y-2">
              {filteredUsers.map(user => {
                const rc = ROLE_COLORS[user.role] || ROLE_COLORS.worker
                return (
                  <div key={user.id} className={`flex items-center gap-3 rounded-xl border p-3 hover:bg-accent/50 transition-colors group ${selectedUsers.has(user.id) ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}>
                    {/* #95 Checkbox for batch */}
                    <Checkbox checked={selectedUsers.has(user.id)} onCheckedChange={(checked) => {
                      setSelectedUsers(prev => {
                        const next = new Set(prev)
                        if (checked) next.add(user.id); else next.delete(user.id)
                        return next
                      })
                    }} />
                    <div className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                      style={{ backgroundColor: user.avatar || '#6366f1' }}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${rc.bg} ${rc.text} ${rc.darkBg} ${rc.darkText}`}>
                          {ROLE_ICONS[user.role] || <User className="size-3" />}
                          {ROLE_LABELS[user.role as RoleKey] || user.role}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          <span className={`size-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                          {user.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                        {/* #96 Last login (createdAt as fallback) */}
                        {user.createdAt && <span className="text-[9px] text-muted-foreground hidden sm:inline">Создан: {formatDateTime(user.createdAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => { setUserFormEdit(user); setUserFormOpen(true) }} title="Редактировать">
                        <Edit className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setUserDeleteDialog({ open: true, id: user.id, name: user.name })} title="Удалить">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* User Form Dialog */}
            <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      {userFormEdit ? <Edit className="size-3.5 text-blue-600 dark:text-blue-400" /> : <UserPlus className="size-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    {userFormEdit ? 'Редактировать пользователя' : 'Новый пользователь'}
                  </DialogTitle>
                </DialogHeader>
                <UserForm editData={userFormEdit} saving={userFormSaving} onSave={handleSaveUser} />
              </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <AlertDialog open={userDeleteDialog.open} onOpenChange={(open) => setUserDeleteDialog({ ...userDeleteDialog, open })}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                  <AlertDialogDescription>Удалить &laquo;{userDeleteDialog.name}&raquo;? Это действие нельзя отменить.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-white hover:bg-destructive/90">Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* #95 Batch action confirmation */}
            <AlertDialog open={!!batchAction} onOpenChange={() => setBatchAction(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{batchAction === 'activate' ? 'Активировать' : 'Деактивировать'} пользователей?</AlertDialogTitle>
                  <AlertDialogDescription>Вы уверены, что хотите {batchAction === 'activate' ? 'активировать' : 'деактивировать'} {selectedUsers.size} пользовател{selectedUsers.size === 1 ? 'я' : 'ей'}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBatchAction}>Подтвердить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* ─── PERMISSIONS TAB ─── */}
        {settingsSubTab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border bg-blue-50 dark:bg-blue-950/20 p-3">
              <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Настройка прав доступа</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Нажмите на роль для настройки прав. Администратор всегда имеет полный доступ.
                </p>
              </div>
              {/* #98 Export permissions */}
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 ml-auto shrink-0" onClick={handleExportPermissions}>
                <Download className="size-3" />Экспорт
              </Button>
            </div>

            {editingRole ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingRole(null)}>
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className={`size-9 rounded-xl flex items-center justify-center text-white shrink-0`}
                    style={{ backgroundColor: ROLE_HEX[editingRole] || '#6366f1' }}>
                    {ROLE_ICONS[editingRole] || <Shield className="size-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{ROLE_LABELS[editingRole as RoleKey] || editingRole}</p>
                    {editingRole === 'admin' && <p className="text-[10px] text-muted-foreground">Полный доступ ко всем разделам</p>}
                  </div>
                  {/* #97 Permission count comparison */}
                  {editingRole !== 'admin' && (
                    <div className="text-right mr-2">
                      <p className="text-sm font-bold">{editPerms.length}</p>
                      <p className="text-[9px] text-muted-foreground">из {ALL_PERMISSIONS.length} прав</p>
                    </div>
                  )}
                  {editingRole !== 'admin' && (
                    <Button size="sm" className="h-8 gap-1.5" onClick={handleSavePermissions} disabled={permsSaving}>
                      {permsSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Сохранить
                    </Button>
                  )}
                </div>

                {editingRole === 'admin' ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="size-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                      <Shield className="size-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium">Полный доступ</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">Администратор всегда имеет доступ ко всем разделам системы.</p>
                  </div>
                ) : (
                  Object.entries(PERM_CATEGORIES).map(([category, perms]) => {
                    const catIcon = PERM_CATEGORY_ICONS[category] || <Settings2 className="size-3.5" />
                    const activeCount = perms.filter(p => editPerms.includes(p.key) || (p.key.endsWith('_read') && editPerms.includes(p.key.replace('_read', '')))).length
                    return (
                      <div key={category} className="rounded-xl border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                          <div className="size-5 rounded flex items-center justify-center text-muted-foreground">{catIcon}</div>
                          <span className="text-xs font-semibold">{category}</span>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto">{activeCount}/{perms.length}</Badge>
                        </div>
                        <div className="p-2 space-y-1">
                          {perms.map(perm => {
                            const isChecked = editPerms.includes(perm.key)
                            const isImplied = perm.key.endsWith('_read') && editPerms.includes(perm.key.replace('_read', ''))
                            const isFullAccess = !perm.key.endsWith('_read') && editPerms.includes(perm.key) && perms.some(p => p.key === perm.key + '_read')
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all text-xs
                                  ${isChecked ? 'bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-200 dark:ring-emerald-800' : isImplied ? 'bg-sky-50 dark:bg-sky-950/20 ring-1 ring-sky-200 dark:ring-sky-800' : 'hover:bg-accent'}`}
                              >
                                <div className={`size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isChecked ? 'bg-emerald-500 border-emerald-500' : isImplied ? 'bg-sky-400 border-sky-400' : 'border-muted-foreground/30'
                                }`}>
                                  {(isChecked || isImplied) && <CheckCircle2 className="size-3.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={isChecked || isImplied ? 'font-medium' : ''}>{perm.label}</span>
                                  {isImplied && <span className="text-[10px] text-sky-600 dark:text-sky-400 ml-1.5">(автоматически)</span>}
                                  {isFullAccess && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1.5">(включает просмотр)</span>}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(Object.keys(ROLE_LABELS) as RoleKey[]).map(role => {
                  const perms = rolePermissions[role] || []
                  const rc = ROLE_COLORS[role] || ROLE_COLORS.worker
                  return (
                    <div key={role} className="rounded-xl border p-3.5 cursor-pointer hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all group"
                      onClick={() => { setEditingRole(role); setEditPerms([...(rolePermissions[role] || [])]) }}>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: ROLE_HEX[role] || '#6366f1' }}>
                          {ROLE_ICONS[role] || <Shield className="size-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
                            {role === 'admin' && (
                              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[9px] h-4 px-1.5 border-0">Полный доступ</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {role === 'admin' ? 'Все права автоматически' : `${perms.length} ${perms.length === 1 ? 'право' : perms.length < 5 ? 'права' : 'прав'}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {role !== 'admin' && (
                            <div className="flex flex-wrap gap-1 max-w-[160px] justify-end">
                              {perms.slice(0, 3).map(p => {
                                const ap = ALL_PERMISSIONS.find(a => a.key === p)
                                return ap ? (
                                  <span key={p} className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ${rc.bg} ${rc.text} ${rc.darkBg} ${rc.darkText}`}>
                                    {ap.label.split(' (')[0]}
                                  </span>
                                ) : null
                              })}
                              {perms.length > 3 && (
                                <span className="text-[9px] text-muted-foreground self-center">+{perms.length - 3}</span>
                              )}
                            </div>
                          )}
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── AXENTA TAB ─── */}
        {settingsSubTab === 'axenta' && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${
              axentaSettings.isActive && axentaSettings.apiKey
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                axentaSettings.isActive && axentaSettings.apiKey
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-amber-100 dark:bg-amber-900/40'
              }`}>
                <Satellite className={`size-5 ${
                  axentaSettings.isActive && axentaSettings.apiKey
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {axentaSettings.isActive && axentaSettings.apiKey ? 'Подключено' : 'Не подключено'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {axentaSettings.apiKey ? `Токен: ${axentaSettings.apiKey.substring(0, 8)}...${axentaSettings.apiKey.slice(-4)}` : 'Требуется авторизация'}
                </p>
              </div>
              <div className={`size-3 rounded-full ${axentaSettings.isActive && axentaSettings.apiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                <Info className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Как подключить</span>
              </div>
              <div className="p-3 space-y-2">
                {['Зарегистрируйтесь на axenta.cloud', 'Создайте учётную запись в разделе «Учетные записи»', 'Введите логин и пароль ниже — токен будет получен автоматически'].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold shrink-0">{i + 1}</span>
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">API URL</Label>
                <div className="relative mt-1">
                  <Globe className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input placeholder="https://axenta.cloud" value={axentaSettings.apiUrl} onChange={e => setAxentaSettings(s => ({ ...s, apiUrl: e.target.value }))} className="h-9 pl-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Логин</Label>
                  <Input placeholder="Логин Axenta" value={axentaSettings.username || ''} onChange={e => setAxentaSettings(s => ({ ...s, username: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Пароль</Label>
                  <Input type="password" placeholder="Пароль Axenta" value={axentaSettings.password || ''} onChange={e => setAxentaSettings(s => ({ ...s, password: e.target.value }))} className="h-9 text-sm mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Интервал синхронизации</Label>
                <div className="relative mt-1">
                  <Clock className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input type="number" value={axentaSettings.syncInterval} onChange={e => setAxentaSettings(s => ({ ...s, syncInterval: parseInt(e.target.value) || 300 }))} className="h-9 pl-8 pr-14 text-sm" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">сек</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-xs font-medium">Интеграция активна</p>
                  <p className="text-[10px] text-muted-foreground">Разрешить обмен данными с Axenta</p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${axentaSettings.isActive ? 'bg-emerald-500' : 'bg-muted'}`}
                  onClick={() => setAxentaSettings(s => ({ ...s, isActive: !s.isActive }))}
                >
                  <span className={`inline-block size-4 transform rounded-full bg-white transition-transform shadow-sm ${axentaSettings.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {axentaSettings.lastSyncAt && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />Последняя синхронизация: {formatDateTime(axentaSettings.lastSyncAt)}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-9 gap-1.5" onClick={async () => { setSyncing(true); try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка') } catch { toast.error('Ошибка синхронизации') }; setSyncing(false) }} disabled={syncing}>
                {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}Синхронизировать
              </Button>
              <Button className="flex-1 h-9 gap-1.5" onClick={async () => {
                setSettingsSaving(true);
                try {
                  if (axentaSettings.username && axentaSettings.password && axentaSettings.apiUrl) {
                    const authRes = await fetch('/api/glonass/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(axentaSettings) });
                    const authData = await authRes.json();
                    if (authRes.ok && authData.success) {
                      toast.success(authData.message || 'Авторизация успешна');
                      const settingsRes = await fetch('/api/glonass/settings');
                      if (settingsRes.ok) { const settingsData = await settingsRes.json(); if (settingsData.apiUrl) setAxentaSettings(settingsData); }
                    } else { toast.error(authData.error || 'Ошибка авторизации'); }
                  } else {
                    const res = await fetch('/api/glonass/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(axentaSettings) });
                    if (!res.ok) throw new Error();
                    const data = await res.json(); setAxentaSettings(data); toast.success('Настройки сохранены');
                  }
                } catch { toast.error('Ошибка сохранения') }
                setSettingsSaving(false);
              }} disabled={settingsSaving}>
                {settingsSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Satellite className="size-3.5" />}Войти и сохранить
              </Button>
            </div>
          </div>
        )}

        {/* ─── ABOUT TAB ─── */}
        {settingsSubTab === 'about' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg mb-3">
                <Truck className="size-8 text-white" />
              </div>
              <h3 className="text-base font-bold">Учёт техники</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Комплексная система управления парком</p>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="divide-y">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Tag className="size-3.5" />Версия</span>
                  <span className="text-xs font-medium">1.7.4-beta</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Cpu className="size-3.5" />Фреймворк</span>
                  <span className="text-xs font-medium">Next.js 16</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Database className="size-3.5" />База данных</span>
                  <span className="text-xs font-medium">SQLite (Prisma)</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Map className="size-3.5" />Карты</span>
                  <span className="text-xs font-medium">Leaflet + Axenta.cloud</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Palette className="size-3.5" />UI</span>
                  <span className="text-xs font-medium">shadcn/ui + Tailwind</span>
                </div>
                {/* #99 System health check */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Server className="size-3.5" />Статус API</span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={runHealthCheck}>
                    <Activity className="size-3" />Проверить
                  </Button>
                </div>
              </div>
              {healthCheck && (
                <div className="border-t px-4 py-2 space-y-1">
                  {Object.entries(healthCheck).map(([endpoint, result]) => (
                    <div key={endpoint} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{endpoint}</span>
                      <span className={result.ok ? 'text-emerald-600' : 'text-red-600'}>
                        {result.ok ? 'OK' : 'Ошибка'} ({result.ms}мс)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* #100 Keyboard shortcuts reference */}
            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                <Keyboard className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Клавиатурные сокращения</span>
              </div>
              <div className="divide-y text-[10px]">
                {[
                  ['Ctrl + N', 'Новый элемент'],
                  ['Ctrl + F', 'Поиск'],
                  ['Ctrl + S', 'Сохранить форму'],
                  ['Esc', 'Закрыть диалог'],
                  ['Tab', 'Следующее поле'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2">
                    <span className="text-muted-foreground">{desc}</span>
                    <kbd className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px]">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
              Система учёта оборудования, ремонтов, рейсов и отслеживания техники на карте с интеграцией GPS/ГЛОНАСС трекеров через Axenta.cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// User form component for settings — #93 Avatar color picker + #94 PIN visibility
export function UserForm({ editData, saving, onSave }: {
  editData: AppUserType | null; saving: boolean; onSave: (data: { name: string; pin: string; role: string; isActive: boolean; avatar: string }) => void;
}) {
  const [name, setName] = useState(editData?.name || '')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState(editData?.role || 'worker')
  const [isActive, setIsActive] = useState(editData?.isActive ?? true)
  // #93 Avatar color picker
  const [avatar, setAvatar] = useState(editData?.avatar || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  // #94 PIN visibility toggle
  const [showPin, setShowPin] = useState(false)

  return (
    <div className="space-y-3 px-1">
      <div><Label className="text-xs">Имя *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Имя пользователя" /></div>
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">{editData ? 'Новый PIN (оставьте пустым чтобы не менять)' : 'PIN (4-6 цифр) *'}</Label>
          {/* #94 PIN visibility toggle */}
          <Button type="button" variant="ghost" size="sm" className="h-5 px-1" onClick={() => setShowPin(!showPin)}>
            {showPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </Button>
        </div>
        <Input type={showPin ? 'text' : 'password'} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="1234" />
      </div>
      <div>
        <Label className="text-xs">Роль</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Активен</Label>
        <Button variant={isActive ? 'default' : 'outline'} size="sm" onClick={() => setIsActive(!isActive)}>{isActive ? 'Да' : 'Нет'}</Button>
      </div>
      {/* #93 Avatar color picker */}
      <div>
        <Label className="text-xs">Цвет аватара</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {AVATAR_COLORS.map(color => (
            <button key={color} type="button" onClick={() => setAvatar(color)}
              className={`size-7 rounded-full border-2 transition-all ${avatar === color ? 'border-foreground scale-110' : 'border-transparent hover:border-muted-foreground/30'}`}
              style={{ backgroundColor: color }}>
              {avatar === color && <CheckCircle2 className="size-3.5 text-white mx-auto" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: avatar }}>{getInitials(name || '?')}</div>
        <span className="text-[10px] text-muted-foreground">Превью аватара</span>
      </div>
      <DialogFooter>
        <Button size="sm" disabled={saving || !name || (!editData && pin.length < 4)} onClick={() => onSave({ name, pin, role, isActive, avatar })}>
          {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Save className="size-3.5 mr-1" />}
          {editData ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogFooter>
    </div>
  )
}
