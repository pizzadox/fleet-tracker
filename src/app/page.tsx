'use client'

/* ═══════════════════════════════════════════════════════════════
   УЧЁТ ТЕХНИКИ — Комплексная система учёта оборудования
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

// ─── shadcn/ui ────────────────────────────────────────────────
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu'

// ─── Lucide Icons ─────────────────────────────────────────────
import {
  Truck, Wrench, Building2, Plus, Search, Moon, Sun, Edit, Trash2,
  ChevronRight, ChevronLeft, X, Loader2, Camera, FileText,
  Eye, Upload, Calendar, Phone, Mail, MapPin,
  Settings2, Info, DollarSign, Shield, User, Users, ArrowRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity, Gauge,
  Navigation, Fuel, Cog, RefreshCw, Wifi, WifiOff,
  Route, ClipboardCheck, ClipboardList, Map, Bell,
  ArrowUp, LogOut, TrendingUp
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────
import type {
  Company, Equipment, Repair, Trip, Crew, Employee, RouteTemplate,
  AppUserType, RoleKey, RepairStage, RepairComment, AxentaSettings
} from '@/lib/types'

// ─── Constants ─────────────────────────────────────────────────
import {
  ROLE_LABELS, DEFAULT_ROLE_PERMISSIONS, hasPermission, getInitials,
  API, EQUIPMENT_STATUS_MAP, EQUIPMENT_TYPE_MAP, COMPANY_TYPES,
  CREW_TYPE_MAP, EMPLOYEE_POSITION_MAP, setDynamicPermissions
} from '@/lib/constants'

// ─── Utils ─────────────────────────────────────────────────────
import {
  useDebounce, useOnlineStatus, useScrollPosition, useReducedMotion,
  handleApiError, formatDate, formatDateTime, formatPrice, statusBadge, fmtDuration
} from '@/lib/utils'

// ─── Components ────────────────────────────────────────────────
import { PinLoginScreen } from '@/components/auth/pin-login'
import { EquipmentTab } from '@/components/equipment/equipment-tab'
import { EquipmentDetailSheet } from '@/components/equipment/equipment-detail-sheet'
import { EquipmentFormDialog } from '@/components/equipment/equipment-form-dialog'
import { RepairsTab } from '@/components/repairs/repairs-tab'
import { RepairDetailDialog } from '@/components/repairs/repair-detail-dialog'
import { RepairFormDialog } from '@/components/repairs/repair-form-dialog'
import { StageFormDialog } from '@/components/repairs/stage-form-dialog'
import { PhotoUploadDialog, RepairPhotoUploadDialog } from '@/components/repairs/photo-upload-dialogs'
import { TripsTab } from '@/components/trips/trips-tab'
import { TripDetailDialog } from '@/components/trips/trip-detail-dialog'
import { TripFormDialog } from '@/components/trips/trip-form-dialog'
import { CrewFormDialog } from '@/components/crews/crew-form-dialog'
import { RouteTemplateFormDialog } from '@/components/routes/route-template-form-dialog'
import { CompaniesTab } from '@/components/management/companies-tab'
import { CompanyFormDialog } from '@/components/management/company-form-dialog'
import { EmployeesTab } from '@/components/employees/employees-tab'
import { EmployeeDetailSheet } from '@/components/employees/employee-detail-sheet'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import { MapTab } from '@/components/map/map-tab'
import { SettingsTabContent } from '@/components/settings/settings-tab-content'

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [mainTab, setMainTab] = useState('equipment')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const isOnline = useOnlineStatus()
  const scrolledDown = useScrollPosition()
  const reducedMotion = useReducedMotion()
  const [topLoadingBar, setTopLoadingBar] = useState(false)

  // Equipment filters with debounce
  const [eqSearch, setEqSearch] = useState('')
  const [eqStatusFilter, setEqStatusFilter] = useState('all')
  const [eqTypeFilter, setEqTypeFilter] = useState('all')
  const debouncedSearch = useDebounce(eqSearch, 300)

  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null)
  const [eqDetailOpen, setEqDetailOpen] = useState(false)
  const [eqDetailTab, setEqDetailTab] = useState('info')
  const [eqDetailLoading, setEqDetailLoading] = useState(false)
  const [eqFormOpen, setEqFormOpen] = useState(false)
  const [eqFormEdit, setEqFormEdit] = useState<Equipment | null>(null)
  const [eqFormStep, setEqFormStep] = useState(0)
  const [eqFormSaving, setEqFormSaving] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [repairDetailOpen, setRepairDetailOpen] = useState(false)
  const [repairDetailLoading, setRepairDetailLoading] = useState(false)
  const [repairFormOpen, setRepairFormOpen] = useState(false)
  const [repairFormEdit, setRepairFormEdit] = useState<Repair | null>(null)
  const [repairFormSaving, setRepairFormSaving] = useState(false)
  const [repairFormEquipmentId, setRepairFormEquipmentId] = useState('')
  const [companyFormOpen, setCompanyFormOpen] = useState(false)
  const [companyFormEdit, setCompanyFormEdit] = useState<Company | null>(null)
  const [companyFormSaving, setCompanyFormSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'equipment' | 'repair' | 'company' | 'trip' | 'crew' | 'employee'; id: string; name: string }>({
    open: false, type: 'equipment', id: '', name: ''
  })
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [photoUploadEq, setPhotoUploadEq] = useState<string | null>(null)
  const [photoUploadRepair, setPhotoUploadRepair] = useState<string | null>(null)
  const [stageFormOpen, setStageFormOpen] = useState(false)
  const [stageFormRepairId, setStageFormRepairId] = useState('')
  const [stageFormEdit, setStageFormEdit] = useState<RepairStage | null>(null)
  const [stageFormSaving, setStageFormSaving] = useState(false)
  const [fullPhoto, setFullPhoto] = useState<string | null>(null)
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('all')
  const [repairComments, setRepairComments] = useState<RepairComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [repairSort, setRepairSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'startDate', dir: 'desc' })
  const [selectedRepairs, setSelectedRepairs] = useState<Set<string>>(new Set())
  const [repairPhotoCategoryFilter, setRepairPhotoCategoryFilter] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [axentaSettings, setAxentaSettings] = useState<AxentaSettings>({ apiUrl: '', apiKey: '', username: '', password: '', syncInterval: 300, isActive: false })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [routeTemplates, setRouteTemplates] = useState<RouteTemplate[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [empPositionFilter, setEmpPositionFilter] = useState('all')
  const [empStatusFilter, setEmpStatusFilter] = useState('all')
  const [empFormOpen, setEmpFormOpen] = useState(false)
  const [empFormEdit, setEmpFormEdit] = useState<Employee | null>(null)
  const [empFormSaving, setEmpFormSaving] = useState(false)
  const [empDetailOpen, setEmpDetailOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [empDetailLoading, setEmpDetailLoading] = useState(false)
  const [tripFormOpen, setTripFormOpen] = useState(false)
  const [tripFormEdit, setTripFormEdit] = useState<Trip | null>(null)
  const [tripFormSaving, setTripFormSaving] = useState(false)
  const [tripFormEquipmentId, setTripFormEquipmentId] = useState('')
  const [tripDetailOpen, setTripDetailOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [tripDetailLoading, setTripDetailLoading] = useState(false)
  const [tripDetailFocusTrack, setTripDetailFocusTrack] = useState(false)
  const [crewFormOpen, setCrewFormOpen] = useState(false)
  const [crewFormEdit, setCrewFormEdit] = useState<Crew | null>(null)
  const [crewFormSaving, setCrewFormSaving] = useState(false)
  const [routeTemplateFormOpen, setRouteTemplateFormOpen] = useState(false)
  const [routeTemplateFormEdit, setRouteTemplateFormEdit] = useState<RouteTemplate | null>(null)
  const [notificationRules, setNotificationRules] = useState<Array<{
    id: string; equipmentId: string; conditionType: string; thresholdValue: number | null;
    isActive: boolean; lastTriggeredAt?: string | null; description?: string | null;
    equipment?: { id: string; name: string; registrationNum?: string | null };
  }>>([])
  const [activeAlerts, setActiveAlerts] = useState<Array<{
    ruleId: string; equipmentId: string; equipmentName: string; registrationNum: string | null;
    conditionType: string; message: string; severity: 'warning' | 'critical'; triggeredAt: string;
  }>>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [globalSearchIndex, setGlobalSearchIndex] = useState(-1)

  // ─── Auth state ─────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AppUserType | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [users, setUsers] = useState<AppUserType[]>([])
  const [mgmtSubTab, setMgmtSubTab] = useState<'companies' | 'employees' | 'crews'>('companies')
  const [settingsSubTab, setSettingsSubTab] = useState<'users' | 'permissions' | 'axenta' | 'about'>('users')
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(DEFAULT_ROLE_PERMISSIONS)

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const fetchEquipment = useCallback(async () => {
    try {
      setTopLoadingBar(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (eqStatusFilter && eqStatusFilter !== 'all') params.set('status', eqStatusFilter)
      if (eqTypeFilter && eqTypeFilter !== 'all') params.set('type', eqTypeFilter)
      const res = await fetch(`/api/equipment?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEquipment(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки техники') }
    finally { setTopLoadingBar(false) }
  }, [debouncedSearch, eqStatusFilter, eqTypeFilter])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch(API.companies)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCompanies(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки компаний') }
  }, [])

  const fetchRepairs = useCallback(async () => {
    try {
      const res = await fetch(API.repairs)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRepairs(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки ремонтов') }
  }, [])

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch(API.trips)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTrips(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки рейсов') }
  }, [])

  const fetchCrews = useCallback(async () => {
    try {
      const res = await fetch(API.crews)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCrews(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки экипажей') }
  }, [])

  const fetchRouteTemplates = useCallback(async () => {
    try {
      const res = await fetch(API.routeTemplates)
      if (res.ok) { const data = await res.json(); setRouteTemplates(data) }
    } catch {}
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(API.employees)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmployees(data)
    } catch (e) { handleApiError(e, 'Ошибка загрузки сотрудников') }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setLoadingProgress(0)
    const fetchers = [fetchEquipment, fetchCompanies, fetchRepairs, fetchTrips, fetchCrews, fetchRouteTemplates, fetchEmployees]
    const total = fetchers.length
    let completed = 0
    const updateProgress = () => {
      completed++
      setLoadingProgress(Math.round((completed / total) * 100))
    }
    await Promise.all(fetchers.map(fn => fn().finally(updateProgress)))
    setLoadingProgress(100)
    setLoading(false)
  }, [fetchEquipment, fetchCompanies, fetchRepairs, fetchTrips, fetchCrews, fetchRouteTemplates, fetchEmployees])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Auth check on mount ───────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Always fetch public user list for login screen
        const usersRes = await fetch('/api/auth/users')
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData)
        }

        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setCurrentUser(data.user)
          // Restore last tab from localStorage
          const lastTab = localStorage.getItem('fleet_lastTab')
          if (lastTab) setMainTab(lastTab)

          // Load dynamic permissions
          try {
            const permRes = await fetch('/api/permissions/me')
            if (permRes.ok) {
              const permData = await permRes.json()
              // Also load all role permissions if admin
              if (data.user.role === 'admin') {
                const allPermRes = await fetch('/api/permissions')
                if (allPermRes.ok) {
                  const allPermData = await allPermRes.json()
                  if (allPermData.grouped && Object.keys(allPermData.grouped).length > 0) {
                    setRolePermissions(allPermData.grouped)
                    setDynamicPermissions(allPermData.grouped)
                  }
                }
              }
            }
          } catch {}
        }
      } catch {}
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  // Fetch users list (for admin settings and login screen)
  const fetchUsers = useCallback(async () => {
    try {
      // Use public endpoint (works without auth) for login screen
      // Falls back to admin endpoint if already authenticated
      const endpoint = currentUser ? '/api/users' : '/api/auth/users'
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch {}
  }, [currentUser])

  // Fetch users when authenticated as admin
  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers()
  }, [currentUser, fetchUsers])

  // Save tab to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fleet_lastTab', mainTab)
    }
  }, [mainTab, currentUser])

  // Global search shortcut (Ctrl+K) with keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setGlobalSearchOpen(true)
      }
      if (e.key === 'Escape') setGlobalSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Global search results with type color coding
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return []
    const q = globalSearchQuery.toLowerCase()
    const results: Array<{ type: string; id: string; label: string; sub: string; icon: React.ReactNode; color: string; action: () => void }> = []
    for (const eq of equipment) {
      if (eq.name.toLowerCase().includes(q) || (eq.registrationNum || '').toLowerCase().includes(q) || (eq.vin || '').toLowerCase().includes(q)) {
        results.push({ type: 'Техника', id: eq.id, label: eq.name, sub: [eq.registrationNum, eq.brand, eq.model].filter(Boolean).join(' • '), icon: <Truck className="size-3.5" />, color: 'text-amber-600', action: () => { setGlobalSearchOpen(false); openEquipmentDetail(eq) } })
      }
    }
    for (const r of repairs) {
      if (r.description.toLowerCase().includes(q) || (r.equipment?.name || '').toLowerCase().includes(q)) {
        results.push({ type: 'Ремонт', id: r.id, label: r.description, sub: `${r.equipment?.name || ''} • ${formatDate(r.startDate)}`, icon: <Wrench className="size-3.5" />, color: 'text-orange-600', action: () => { setGlobalSearchOpen(false); openRepairDetail(r) } })
      }
    }
    for (const t of trips) {
      if (t.route.toLowerCase().includes(q) || (t.cargo || '').toLowerCase().includes(q)) {
        results.push({ type: 'Рейс', id: t.id, label: t.route, sub: `${t.equipment?.name || ''} • ${formatDate(t.startDate)}`, icon: <Route className="size-3.5" />, color: 'text-violet-600', action: () => { setGlobalSearchOpen(false); openTripDetail(t) } })
      }
    }
    for (const emp of employees) {
      if (emp.fullName.toLowerCase().includes(q) || (emp.phone || '').toLowerCase().includes(q)) {
        results.push({ type: 'Сотрудник', id: emp.id, label: emp.fullName, sub: `${EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position} • ${emp.phone || ''}`, icon: <Users className="size-3.5" />, color: 'text-sky-600', action: () => { setGlobalSearchOpen(false); openEmployeeDetail(emp) } })
      }
    }
    for (const c of companies) {
      if (c.name.toLowerCase().includes(q) || (c.inn || '').toLowerCase().includes(q)) {
        results.push({ type: 'Компания', id: c.id, label: c.name, sub: `${COMPANY_TYPES[c.type] || c.type} • ИНН: ${c.inn || '—'}`, icon: <Building2 className="size-3.5" />, color: 'text-slate-600', action: () => { setGlobalSearchOpen(false); setMainTab('companies') } })
      }
    }
    return results.slice(0, 12)
  }, [globalSearchQuery, equipment, repairs, trips, employees, companies])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/glonass/settings')
        if (res.ok) { const data = await res.json(); if (data.apiUrl) setAxentaSettings(data) }
      } catch { /* ignore */ }
    }
    loadSettings()
  }, [])

  // Fetch notification rules
  const fetchNotificationRules = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/rules')
      if (res.ok) { const data = await res.json(); setNotificationRules(data) }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchNotificationRules() }, [fetchNotificationRules])

  // Check notification rules and trigger alerts
  const checkNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/check', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.alerts && data.alerts.length > 0) {
          setActiveAlerts(data.alerts)
          setShowAlerts(true)
          // Show toast for each alert
          for (const alert of data.alerts) {
            if (alert.severity === 'critical') {
              toast.error(`⚠️ ${alert.message}`, { duration: 8000 })
            } else {
              toast.warning(`🔔 ${alert.message}`, { duration: 6000 })
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-refresh: sync + check notifications every 60 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return
    const interval = setInterval(async () => {
      try {
        // Sync GLONASS data
        const syncRes = await fetch('/api/glonass/sync', { method: 'POST' })
        if (syncRes.ok) {
          setLastSyncTime(new Date())
        }
        // Refresh equipment data
        await fetchEquipment()
        // Check notification rules
        await checkNotifications()
      } catch { /* ignore auto-refresh errors */ }
    }, 60000) // every 60 seconds
    return () => clearInterval(interval)
  }, [autoRefreshEnabled, fetchEquipment, checkNotifications])

  const fetchEquipmentDetail = async (id: string) => {
    setEqDetailLoading(true)
    try {
      const res = await fetch(`/api/equipment/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedEq(data)
    } catch { toast.error('Ошибка загрузки данных техники') }
    setEqDetailLoading(false)
  }

  const openEquipmentDetail = (eq: Equipment, tab?: string) => {
    setEqDetailTab(tab || 'info')
    setEqDetailOpen(true)
    fetchEquipmentDetail(eq.id)
  }

  const openEquipmentDetailById = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId)
    if (eq) openEquipmentDetail(eq)
  }

  const fetchEmployeeDetail = async (id: string) => {
    setEmpDetailLoading(true)
    try {
      const res = await fetch(`/api/employees/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedEmp(data)
    } catch { toast.error('Ошибка загрузки данных сотрудника') }
    setEmpDetailLoading(false)
  }

  const openEmployeeDetail = (emp: Employee) => {
    setEmpDetailOpen(true)
    fetchEmployeeDetail(emp.id)
  }

  const fetchRepairDetail = async (id: string) => {
    setRepairDetailLoading(true)
    try {
      const res = await fetch(`/api/repairs/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedRepair(data)
    } catch { toast.error('Ошибка загрузки данных ремонта') }
    setRepairDetailLoading(false)
  }

  const openRepairDetail = (r: Repair) => {
    setRepairDetailOpen(true)
    fetchRepairDetail(r.id)
  }

  const fetchTripDetail = async (id: string) => {
    setTripDetailLoading(true)
    try {
      const res = await fetch(`/api/trips/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedTrip(data)
    } catch { toast.error('Ошибка загрузки данных рейса') }
    setTripDetailLoading(false)
  }

  const openTripDetail = (t: Trip, focusTrack?: boolean) => {
    setTripDetailOpen(true)
    setTripDetailFocusTrack(!!focusTrack)
    fetchTripDetail(t.id)
  }

  // ─── Stats with memo ─────────────────────────────────────────
  const stats = useMemo(() => {
    const onlineTrackers = equipment.reduce((c, e) => c + (e.trackers?.filter(t => t.isActive).length || 0), 0)
    const totalDistance = trips.reduce((s, t) => s + (t.distance || 0), 0)
    const totalFuel = trips.reduce((s, t) => s + (t.fuelConsumed || 0), 0)
    const totalRepairCost = repairs.reduce((s, r) => s + (r.cost || 0), 0)
    return {
      total: equipment.length,
      active: equipment.filter(e => e.status === 'active').length,
      repair: equipment.filter(e => e.status === 'repair').length,
      rented: equipment.filter(e => e.status === 'rented').length,
      decommissioned: equipment.filter(e => e.status === 'decommissioned').length,
      tripsActive: trips.filter(t => t.status === 'in_progress').length,
      tripsTotal: trips.length,
      repairsTotal: repairs.length,
      repairsInProgress: repairs.filter(r => r.status === 'in_progress').length,
      onlineTrackers,
      totalDistance,
      totalFuel: Math.round(totalFuel * 10) / 10,
      totalRepairCost,
      companiesTotal: companies.length,
      employeesActive: employees.filter(e => e.status === 'active').length,
      employeesTotal: employees.length,
    }
  }, [equipment, trips, repairs, companies, employees])

  const handleDelete = async () => {
    const { type, id } = deleteDialog
    try {
      setTopLoadingBar(true)
      const urlMap: Record<string, string> = {
        equipment: `/api/equipment/${id}`,
        repair: `/api/repairs/${id}`,
        company: `/api/companies/${id}`,
        trip: `/api/trips/${id}`,
        crew: `/api/crews/${id}`,
        employee: `/api/employees/${id}`,
        routeTemplate: `/api/route-templates/${id}`,
      }
      const res = await fetch(urlMap[type] || `/api/${type}s/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Удалено успешно')
      if (type === 'equipment') { setEqDetailOpen(false); setSelectedEq(null) }
      if (type === 'repair') { setRepairDetailOpen(false); setSelectedRepair(null) }
      if (type === 'trip') { setTripDetailOpen(false); setSelectedTrip(null) }
      if (type === 'employee') { setEmpDetailOpen(false); setSelectedEmp(null) }
      if (type === 'routeTemplate') fetchRouteTemplates()
      fetchAll()
    } catch (e) { handleApiError(e, 'Ошибка удаления') }
    finally { setTopLoadingBar(false) }
    setDeleteDialog({ open: false, type: 'equipment', id: '', name: '' })
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — AUTH CHECK
  // ═══════════════════════════════════════════════════════════════

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <PinLoginScreen
        onLogin={(user) => setCurrentUser(user)}
        users={users}
        fetchUsers={fetchUsers}
      />
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — LOADING (Skeleton)
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 animate-pulse"><Truck className="size-3.5" /></div>
            <h1 className="text-sm font-bold shrink-0 hidden sm:block">Учёт техники</h1>
            <div className="hidden md:flex items-center gap-1 ml-1">
              {[0,1,2,3,4,5,6,7].map(i => <div key={i} className="h-5 w-14 rounded-md bg-muted animate-pulse" />)}
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4">
          {/* Loading progress */}
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative size-20">
              <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - loadingProgress / 100)}`}
                  className="text-primary transition-all duration-500 ease-out" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{loadingProgress}%</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Загрузка данных...</p>
              <p className="text-xs text-muted-foreground">Подождите, пока приложение загрузится</p>
            </div>
          </div>
          {/* Skeleton tabs */}
          <div className="hidden md:flex items-center gap-2 mb-4">
            {[0,1,2,3,4,5].map(i => <div key={i} className="h-9 w-24 rounded-md bg-muted animate-pulse" />)}
          </div>
          {/* Skeleton search bar */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 h-9 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-[140px] rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-[160px] rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-[100px] rounded-md bg-muted animate-pulse" />
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0,1,2,3,4,5].map(i => <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />)}
          </div>
        </main>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — MAIN
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-16 md:pb-0" role="application" aria-label="Система учёта техники">
      {/* Skip to content link */}
      <a href="#main-content" className="skip-to-content">Перейти к содержимому</a>

      {/* Top loading bar */}
      {topLoadingBar && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary/20">
          <div className="h-full bg-primary animate-loading-bar" />
        </div>
      )}

      {/* ─── HEADER ──────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30" role="banner">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 h-12 sm:h-11 flex items-center justify-between gap-1 sm:gap-2">
          {/* Left: logo + title + stats */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Truck className="size-3.5" /></div>
            {/* Online/Offline indicator */}
            <span className={`size-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-online-ring' : 'bg-red-500'}`} title={isOnline ? 'Онлайн' : 'Офлайн'} aria-label={isOnline ? 'Подключено к сети' : 'Нет подключения к сети'} />
            <h1 className="text-sm font-bold tracking-tight shrink-0 hidden sm:block">Учёт техники</h1>
            <div className="hidden md:flex items-center gap-1 ml-1">
              <button onClick={() => setMainTab('equipment')} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-muted/80 transition-colors" title={`Всего техники: ${stats.total} (Активна: ${stats.active}, Ремонт: ${stats.repair}, Аренда: ${stats.rented})`}><Truck className="size-3" />{stats.total}<TrendingUp className="size-2 text-emerald-500" /></button>
              <button onClick={() => setMainTab('equipment')} className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors" title={`В эксплуатации: ${stats.active}`}><CheckCircle2 className="size-3" />{stats.active}</button>
              <button onClick={() => { setMainTab('repairs') }} className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors" title={`На ремонте: ${stats.repair} • В процессе: ${stats.repairsInProgress}`}><Wrench className="size-3" />{stats.repair}</button>
              <button onClick={() => setMainTab('equipment')} className="inline-flex items-center gap-1 rounded-md bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors" title={`В аренде: ${stats.rented}`}><Users className="size-3" />{stats.rented}</button>
              <span className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400" title={`Онлайн трекеры: ${stats.onlineTrackers}`}><Wifi className="size-3" />{stats.onlineTrackers}</span>
              <button onClick={() => setMainTab('trips')} className="inline-flex items-center gap-1 rounded-md bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors" title={`Рейсов: ${stats.tripsTotal} • В пути: ${stats.tripsActive}`}><Route className="size-3" />{stats.tripsTotal}</button>
              <button onClick={() => setMainTab('repairs')} className="inline-flex items-center gap-1 rounded-md bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors" title={`Ремонтов: ${stats.repairsTotal}`}><ClipboardList className="size-3" />{stats.repairsTotal}</button>
              <button onClick={() => setMainTab('companies')} className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-900/40 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900/60 transition-colors" title={`Компаний: ${stats.companiesTotal}`}><Building2 className="size-3" />{stats.companiesTotal}</button>
            </div>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Mobile: compact stats row */}
            <div className="sm:hidden flex items-center gap-0.5 mr-0.5">
              <button onClick={() => setMainTab('equipment')} className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[9px] font-medium shrink-0" title={`Всего: ${stats.total}`}>
                <Truck className="size-2.5" />{stats.total}
              </button>
              <button onClick={() => setMainTab('repairs')} className="inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400 shrink-0" title={`Ремонт: ${stats.repair}`}>
                <Wrench className="size-2.5" />{stats.repair}
              </button>
              <button onClick={() => setMainTab('trips')} className="inline-flex items-center gap-0.5 rounded bg-violet-100 dark:bg-violet-900/40 px-1 py-0.5 text-[9px] font-medium text-violet-700 dark:text-violet-400 shrink-0" title={`Рейсы: ${stats.tripsTotal}`}>
                <Route className="size-2.5" />{stats.tripsTotal}
              </button>
              <span className="inline-flex items-center gap-0.5 rounded bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[9px] font-medium text-green-700 dark:text-green-400 shrink-0" title={`Онлайн: ${stats.onlineTrackers}`}>
                <Wifi className="size-2.5" />{stats.onlineTrackers}
              </span>
            </div>
            {/* Global search button */}
            <Button variant="ghost" size="icon" className="size-8 sm:size-7" onClick={() => setGlobalSearchOpen(true)} aria-label="Поиск (Ctrl+K)" title="Поиск (Ctrl+K)">
              <Search className="size-4 sm:size-3.5" />
            </Button>
            {/* Last sync indicator */}
            {lastSyncTime && (
              <span className="hidden lg:inline text-[9px] text-muted-foreground mr-1" title={`Последняя синхронизация: ${formatDateTime(lastSyncTime.toISOString())}`}>
                <RefreshCw className="inline size-2.5 mr-0.5" />{new Date(lastSyncTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {/* Auto-refresh toggle - hidden on mobile to save space */}
            <Button variant="ghost" size="icon" className={`size-7 hidden sm:inline-flex ${autoRefreshEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)} aria-label="Автообновление" title={autoRefreshEnabled ? 'Автообновление вкл' : 'Автообновление выкл'}>
              <RefreshCw className={`size-3.5 ${autoRefreshEnabled ? '' : 'opacity-50'}`} />
            </Button>
            {/* Notification bell */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowAlerts(!showAlerts)} aria-label="Уведомления">
                <Bell className="size-3.5" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">{activeAlerts.length}</span>
                )}
              </Button>
              {/* Alerts dropdown */}
              {showAlerts && (
                <div className="absolute right-0 top-full mt-1 w-72 max-h-64 overflow-y-auto bg-card border rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b flex items-center justify-between">
                    <span className="text-[11px] font-semibold">Уведомления ({activeAlerts.length})</span>
                    {activeAlerts.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-5 text-[9px]" onClick={() => { setActiveAlerts([]); setShowAlerts(false) }}>Очистить</Button>
                    )}
                  </div>
                  {activeAlerts.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-muted-foreground">Нет активных уведомлений</div>
                  ) : (
                    activeAlerts.map((alert, i) => (
                      <div key={i} className={`p-2 border-b last:border-0 ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                        <div className="flex items-start gap-1.5">
                          {alert.severity === 'critical' ? <AlertTriangle className="size-3.5 text-red-500 mt-0.5 shrink-0" /> : <Bell className="size-3.5 text-amber-500 mt-0.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium">{alert.message}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime(alert.triggeredAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {notificationRules.length > 0 && (
                    <div className="p-1.5 border-t">
                      <p className="text-[9px] text-muted-foreground">Правил: {notificationRules.filter(r => r.isActive).length}/{notificationRules.length}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {mounted && (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Тема">
                {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            )}
            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 ml-1 pl-2 border-l focus:outline-none" aria-label="Профиль">
                  <div
                    className="size-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: currentUser.avatar || '#6366f1' }}
                  >
                    {getInitials(currentUser.name)}
                  </div>
                  <span className="text-[11px] font-medium hidden sm:inline max-w-[80px] truncate">{currentUser.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: currentUser.avatar || '#6366f1' }}
                      >
                        {getInitials(currentUser.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[currentUser.role as RoleKey] || currentUser.role}</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasPermission(currentUser.role, 'settings') && (
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="gap-2 cursor-pointer">
                    <Cog className="size-4" />Настройки
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="gap-2 cursor-pointer">
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
                  setCurrentUser(null)
                  localStorage.removeItem('fleet_lastUserId')
                }} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="size-4" />Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
      <main id="main-content" role="main" className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-6 py-3 sm:py-4">
        {/* Desktop tabs */}
        <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v); if (v === 'management') setMgmtSubTab('companies'); if (v === 'settings') setSettingsSubTab('users'); }} className="hidden md:block">
          <TabsList className="mb-4">
            {hasPermission(currentUser.role, 'equipment') && <TabsTrigger value="equipment" className="gap-1.5"><Truck className="size-4" />Техника<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{stats.total}</Badge></TabsTrigger>}
            {hasPermission(currentUser.role, 'repairs') && <TabsTrigger value="repairs" className="gap-1.5"><Wrench className="size-4" />Ремонты<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{stats.repairsTotal}</Badge></TabsTrigger>}
            {hasPermission(currentUser.role, 'trips') && <TabsTrigger value="trips" className="gap-1.5"><Route className="size-4" />Рейсы<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{stats.tripsTotal}</Badge></TabsTrigger>}
            {hasPermission(currentUser.role, 'employees') && hasPermission(currentUser.role, 'companies') && (
              <TabsTrigger value="management" className="gap-1.5"><ClipboardCheck className="size-4" />Управление</TabsTrigger>
            )}
            {hasPermission(currentUser.role, 'map') && <TabsTrigger value="map" className="gap-1.5"><Map className="size-4" />Карта</TabsTrigger>}
          </TabsList>
          {hasPermission(currentUser.role, 'equipment') && (
            <TabsContent value="equipment" className="animate-in fade-in duration-200">
              <EquipmentTab equipment={equipment} companies={companies} eqSearch={eqSearch} setEqSearch={setEqSearch} eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter} eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter} onOpenDetail={openEquipmentDetail} onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }} onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })} onGoToMap={(eq) => openEquipmentDetail(eq, 'glonass')} onCreateTrip={(eq) => { setTripFormEdit(null); setTripFormEquipmentId(eq.id); setTripFormOpen(true) }} readOnly={!hasPermission(currentUser.role, 'equipment')} />
            </TabsContent>
          )}
          {hasPermission(currentUser.role, 'repairs') && (
            <TabsContent value="repairs" className="animate-in fade-in duration-200">
              <RepairsTab repairs={repairs} equipment={equipment} onOpenDetail={openRepairDetail} onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }} onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })} readOnly={!hasPermission(currentUser.role, 'repairs')} />
            </TabsContent>
          )}
          {hasPermission(currentUser.role, 'trips') && (
            <TabsContent value="trips" className="animate-in fade-in duration-200">
              <TripsTab trips={trips} equipment={equipment} crews={crews} routeTemplates={routeTemplates} onOpenDetail={openTripDetail} onAdd={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId || ''); setTripFormOpen(true) }} onDelete={(t) => setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route })} onAddCrew={() => { setCrewFormEdit(null); setCrewFormOpen(true) }} onEditCrew={(c) => { setCrewFormEdit(c); setCrewFormOpen(true) }} onDeleteCrew={(c) => setDeleteDialog({ open: true, type: 'crew', id: c.id, name: c.name })} onAddRouteTemplate={() => { setRouteTemplateFormEdit(null); setRouteTemplateFormOpen(true) }} onEditRouteTemplate={(rt) => { setRouteTemplateFormEdit(rt); setRouteTemplateFormOpen(true) }} onDeleteRouteTemplate={(rt) => setDeleteDialog({ open: true, type: 'routeTemplate', id: rt.id, name: rt.name })} readOnly={!hasPermission(currentUser.role, 'trips')} />
            </TabsContent>
          )}
          {hasPermission(currentUser.role, 'employees') && hasPermission(currentUser.role, 'companies') && (
            <TabsContent value="management">
              <div className="space-y-4">
                <Tabs value={mgmtSubTab} onValueChange={(v) => setMgmtSubTab(v as 'companies' | 'employees' | 'crews')}>
                  <TabsList>
                    <TabsTrigger value="companies" className="gap-1.5"><Building2 className="size-3.5" />Компании<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{stats.companiesTotal}</Badge></TabsTrigger>
                    <TabsTrigger value="employees" className="gap-1.5"><Users className="size-3.5" />Сотрудники<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{stats.employeesTotal}</Badge></TabsTrigger>
                    <TabsTrigger value="crews" className="gap-1.5"><Users className="size-3.5" />Экипажи</TabsTrigger>
                  </TabsList>
                </Tabs>
                {mgmtSubTab === 'companies' && <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />}
                {mgmtSubTab === 'employees' && <EmployeesTab employees={employees} crews={crews} empSearch={empSearch} setEmpSearch={setEmpSearch} empPositionFilter={empPositionFilter} setEmpPositionFilter={setEmpPositionFilter} empStatusFilter={empStatusFilter} setEmpStatusFilter={setEmpStatusFilter} onOpenDetail={openEmployeeDetail} onAdd={() => { setEmpFormEdit(null); setEmpFormOpen(true) }} onEdit={(emp) => { setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName })} />}
                {mgmtSubTab === 'crews' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Экипажи</h3>
                      <Button size="sm" onClick={() => { setCrewFormEdit(null); setCrewFormOpen(true) }}><Plus className="size-3.5 mr-1" />Добавить</Button>
                    </div>
                    {crews.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Нет экипажей</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {crews.map(crew => (
                          <Card key={crew.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setCrewFormEdit(crew); setCrewFormOpen(true) }}>
                            <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold">{crew.name}</CardTitle></CardHeader>
                            <CardContent className="p-3 pt-1">
                              <p className="text-[10px] text-muted-foreground">{CREW_TYPE_MAP[crew.type] || crew.type} • {crew.status === 'active' ? 'Активен' : 'Неактивен'}</p>
                              {crew.members && crew.members.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">Членов: {crew.members.length}</p>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          {hasPermission(currentUser.role, 'map') && (
            <TabsContent value="map">
              <MapTab equipment={equipment} onOpenDetail={openEquipmentDetailById} onSync={async () => { try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка'); fetchEquipment() } catch { toast.error('Ошибка синхронизации') } }} />
            </TabsContent>
          )}
        </Tabs>

        {/* Mobile: show active tab content directly */}
        <div className="md:hidden">
          {mainTab === 'equipment' && hasPermission(currentUser.role, 'equipment') && <EquipmentTab equipment={equipment} companies={companies} eqSearch={eqSearch} setEqSearch={setEqSearch} eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter} eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter} onOpenDetail={openEquipmentDetail} onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }} onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })} onGoToMap={(eq) => openEquipmentDetail(eq, 'glonass')} onCreateTrip={(eq) => { setTripFormEdit(null); setTripFormEquipmentId(eq.id); setTripFormOpen(true) }} readOnly={!hasPermission(currentUser.role, 'equipment')} />}
          {mainTab === 'repairs' && hasPermission(currentUser.role, 'repairs') && <RepairsTab repairs={repairs} equipment={equipment} onOpenDetail={openRepairDetail} onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }} onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })} readOnly={!hasPermission(currentUser.role, 'repairs')} />}
          {mainTab === 'trips' && hasPermission(currentUser.role, 'trips') && <TripsTab trips={trips} equipment={equipment} crews={crews} routeTemplates={routeTemplates} onOpenDetail={openTripDetail} onAdd={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId || ''); setTripFormOpen(true) }} onDelete={(t) => setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route })} onAddCrew={() => { setCrewFormEdit(null); setCrewFormOpen(true) }} onEditCrew={(c) => { setCrewFormEdit(c); setCrewFormOpen(true) }} onDeleteCrew={(c) => setDeleteDialog({ open: true, type: 'crew', id: c.id, name: c.name })} onAddRouteTemplate={() => { setRouteTemplateFormEdit(null); setRouteTemplateFormOpen(true) }} onEditRouteTemplate={(rt) => { setRouteTemplateFormEdit(rt); setRouteTemplateFormOpen(true) }} onDeleteRouteTemplate={(rt) => setDeleteDialog({ open: true, type: 'routeTemplate', id: rt.id, name: rt.name })} readOnly={!hasPermission(currentUser.role, 'trips')} />}
          {mainTab === 'management' && hasPermission(currentUser.role, 'employees') && (
            <div className="space-y-4">
              <Tabs value={mgmtSubTab} onValueChange={(v) => setMgmtSubTab(v as 'companies' | 'employees' | 'crews')}>
                <TabsList>
                  <TabsTrigger value="companies" className="gap-1 text-xs"><Building2 className="size-3" />Компании</TabsTrigger>
                  <TabsTrigger value="employees" className="gap-1 text-xs"><Users className="size-3" />Сотрудники</TabsTrigger>
                  <TabsTrigger value="crews" className="gap-1 text-xs"><Users className="size-3" />Экипажи</TabsTrigger>
                </TabsList>
              </Tabs>
              {mgmtSubTab === 'companies' && <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />}
              {mgmtSubTab === 'employees' && <EmployeesTab employees={employees} crews={crews} empSearch={empSearch} setEmpSearch={setEmpSearch} empPositionFilter={empPositionFilter} setEmpPositionFilter={setEmpPositionFilter} empStatusFilter={empStatusFilter} setEmpStatusFilter={setEmpStatusFilter} onOpenDetail={openEmployeeDetail} onAdd={() => { setEmpFormEdit(null); setEmpFormOpen(true) }} onEdit={(emp) => { setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName })} />}
              {mgmtSubTab === 'crews' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Экипажи</h3><Button size="sm" onClick={() => { setCrewFormEdit(null); setCrewFormOpen(true) }}><Plus className="size-3.5 mr-1" />Добавить</Button></div>
                  {crews.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Нет экипажей</p> : (
                    <div className="space-y-2">{crews.map(crew => (<Card key={crew.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setCrewFormEdit(crew); setCrewFormOpen(true) }}><CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-semibold">{crew.name}</CardTitle></CardHeader><CardContent className="p-3 pt-1"><p className="text-[10px] text-muted-foreground">{CREW_TYPE_MAP[crew.type] || crew.type}</p></CardContent></Card>))}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {mainTab === 'map' && hasPermission(currentUser.role, 'map') && <MapTab equipment={equipment} onOpenDetail={openEquipmentDetailById} onSync={async () => { try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка'); fetchEquipment() } catch { toast.error('Ошибка синхронизации') } }} />}
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md safe-bottom" role="navigation" aria-label="Основная навигация">
        <div className="grid h-14 grid-cols-5">
          {[
            ...(hasPermission(currentUser.role, 'equipment') ? [{ value: 'equipment', icon: <Truck className="size-5" />, label: 'Техника' }] : []),
            ...(hasPermission(currentUser.role, 'repairs') ? [{ value: 'repairs', icon: <Wrench className="size-5" />, label: 'Ремонты' }] : []),
            ...(hasPermission(currentUser.role, 'trips') ? [{ value: 'trips', icon: <Route className="size-5" />, label: 'Рейсы' }] : []),
            ...(hasPermission(currentUser.role, 'employees') && hasPermission(currentUser.role, 'companies') ? [{ value: 'management', icon: <ClipboardCheck className="size-5" />, label: 'Управл.' }] : []),
            ...(hasPermission(currentUser.role, 'map') ? [{ value: 'map', icon: <Map className="size-5" />, label: 'Карта' }] : []),
          ].map(tab => (
            <button key={tab.value} onClick={() => setMainTab(tab.value)}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 min-h-[44px] min-w-[44px] ${mainTab === tab.value ? 'text-primary' : 'text-muted-foreground active:text-foreground'}`}
              role="tab" aria-selected={mainTab === tab.value} aria-label={tab.label}>
              {mainTab === tab.value && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary transition-all duration-200" />
              )}
              {tab.icon}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Scroll-to-top button */}
      {scrolledDown && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 size-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
          aria-label="Наверх"
          title="Наверх"
        >
          <ArrowUp className="size-4" />
        </button>
      )}

      {/* FAB button on mobile - primary action for current tab */}
      <button
        onClick={() => {
          if (mainTab === 'equipment') { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }
          else if (mainTab === 'repairs') { setRepairFormEdit(null); setRepairFormEquipmentId(''); setRepairFormOpen(true) }
          else if (mainTab === 'trips') { setTripFormEdit(null); setTripFormEquipmentId(''); setTripFormOpen(true) }
          else if (mainTab === 'management') { setCompanyFormEdit(null); setCompanyFormOpen(true) }
        }}
        className="md:hidden fixed bottom-20 right-4 z-30 size-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center"
        aria-label="Добавить"
        title="Добавить"
      >
        <Plus className="size-5" />
      </button>

      {/* ─── DIALOGS ──────────────────────────────────────────── */}
      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 gap-0">
          {/* Profile header */}
          <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30">
            <SheetTitle className="sr-only">Настройки</SheetTitle>
            <SheetDescription className="sr-only">Профиль и параметры системы</SheetDescription>
            <div className="flex items-center gap-4">
              <div
                className="size-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md"
                style={{ backgroundColor: currentUser.avatar || '#6366f1' }}
              >
                {getInitials(currentUser.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{currentUser.name}</p>
                <Badge className="mt-1 text-[10px] h-5" style={{ backgroundColor: currentUser.role === 'admin' ? '#6366f1' : currentUser.role === 'manager' ? '#10b981' : '#6b7280', color: '#fff', border: 'none' }}>
                  <Shield className="size-3 mr-1" />{ROLE_LABELS[currentUser.role as RoleKey] || currentUser.role}
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30" onClick={async () => {
                try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
                setCurrentUser(null)
                setSettingsOpen(false)
                localStorage.removeItem('fleet_lastUserId')
              }} aria-label="Выход" title="Выйти">
                <LogOut className="size-3.5" />Выйти
              </Button>
            </div>
          </div>

          {/* Settings tabs (admin only) */}
          {hasPermission(currentUser.role, 'settings') && (
            <SettingsTabContent users={users} fetchUsers={fetchUsers} axentaSettings={axentaSettings} setAxentaSettings={setAxentaSettings} settingsSaving={settingsSaving} setSettingsSaving={setSettingsSaving} syncing={syncing} setSyncing={setSyncing} settingsSubTab={settingsSubTab} setSettingsSubTab={setSettingsSubTab} onRefreshAll={fetchAll} rolePermissions={rolePermissions} onPermissionsUpdate={(perms) => { setRolePermissions(perms); setDynamicPermissions(perms) }} />
          )}
        </SheetContent>
      </Sheet>

      <EquipmentDetailSheet open={eqDetailOpen} onOpenChange={setEqDetailOpen} equipment={selectedEq} loading={eqDetailLoading} detailTab={eqDetailTab} setDetailTab={setEqDetailTab} companies={companies} photoCategoryFilter={photoCategoryFilter} setPhotoCategoryFilter={setPhotoCategoryFilter} fullPhoto={fullPhoto} setFullPhoto={setFullPhoto} onEdit={(eq) => { setEqDetailOpen(false); setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => { setEqDetailOpen(false); setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name }) }} onAddRepair={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId); setRepairFormOpen(true) }} onUploadPhoto={(eqId) => setPhotoUploadEq(eqId)} onRefresh={() => selectedEq && fetchEquipmentDetail(selectedEq.id)} onOpenRepairDetail={(r) => openRepairDetail(r)} onAddTrip={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId); setTripFormOpen(true) }} onOpenTripDetail={openTripDetail} allEquipment={equipment} onRefreshAll={fetchEquipment} />
      <EquipmentFormDialog open={eqFormOpen} onOpenChange={setEqFormOpen} editData={eqFormEdit} companies={companies} step={eqFormStep} setStep={setEqFormStep} saving={eqFormSaving} setSaving={setEqFormSaving} onSaved={() => { setEqFormOpen(false); fetchAll() }} />
      <RepairDetailDialog open={repairDetailOpen} onOpenChange={setRepairDetailOpen} repair={selectedRepair} loading={repairDetailLoading} fullPhoto={fullPhoto} setFullPhoto={setFullPhoto} onEdit={(r) => { setRepairDetailOpen(false); setRepairFormEdit(r); setRepairFormEquipmentId(r.equipmentId); setRepairFormOpen(true) }} onDelete={(r) => { setRepairDetailOpen(false); setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description }) }} onComplete={async (r) => { try { const res = await fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, status: 'completed', endDate: new Date().toISOString() }) }); if (!res.ok) throw new Error(); toast.success('Ремонт завершён'); fetchRepairDetail(r.id); fetchAll() } catch { toast.error('Ошибка завершения ремонта') } }} onAddStage={(repairId) => { setStageFormRepairId(repairId); setStageFormEdit(null); setStageFormOpen(true) }} onEditStage={(stage, repairId) => { setStageFormRepairId(repairId); setStageFormEdit(stage); setStageFormOpen(true) }} onDeleteStage={async (stageId, repairId) => { try { const res = await fetch(`/api/repairs/${repairId}/stages?stageId=${stageId}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); toast.success('Этап удалён'); fetchRepairDetail(repairId); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } catch { toast.error('Ошибка удаления этапа') } }} onUploadPhoto={(repairId) => setPhotoUploadRepair(repairId)} onRefresh={() => { if (selectedRepair) { fetchRepairDetail(selectedRepair.id); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } }} employees={employees} onDuplicate={(r) => { setRepairDetailOpen(false); setRepairFormEdit({ ...r, id: '', status: 'in_progress', startDate: new Date().toISOString(), endDate: null, endDate: undefined } as any); setRepairFormEquipmentId(r.equipmentId); setRepairFormOpen(true) }} onPause={async (r) => { try { const res = await fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paused' }) }); if (!res.ok) throw new Error(); toast.success('Ремонт приостановлен'); fetchRepairDetail(r.id); fetchAll() } catch { toast.error('Ошибка') } }} onResume={async (r) => { try { const res = await fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) }); if (!res.ok) throw new Error(); toast.success('Ремонт возобновлён'); fetchRepairDetail(r.id); fetchAll() } catch { toast.error('Ошибка') } }} />
      <RepairFormDialog open={repairFormOpen} onOpenChange={setRepairFormOpen} editData={repairFormEdit} equipmentId={repairFormEquipmentId} equipmentList={equipment} saving={repairFormSaving} setSaving={setRepairFormSaving} onSaved={() => { setRepairFormOpen(false); fetchAll() }} employees={employees} />
      <CompanyFormDialog open={companyFormOpen} onOpenChange={setCompanyFormOpen} editData={companyFormEdit} saving={companyFormSaving} setSaving={setCompanyFormSaving} onSaved={() => { setCompanyFormOpen(false); fetchAll() }} />
      <StageFormDialog open={stageFormOpen} onOpenChange={setStageFormOpen} repairId={stageFormRepairId} editData={stageFormEdit} saving={stageFormSaving} setSaving={setStageFormSaving} onSaved={() => { setStageFormOpen(false); if (selectedRepair) { fetchRepairDetail(selectedRepair.id); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } }} />
      <PhotoUploadDialog open={!!photoUploadEq} onOpenChange={(v) => { if (!v) setPhotoUploadEq(null) }} targetId={photoUploadEq || ''} targetType="equipment" onUploaded={() => { setPhotoUploadEq(null); if (selectedEq) fetchEquipmentDetail(selectedEq.id); fetchAll() }} />
      <RepairPhotoUploadDialog open={!!photoUploadRepair} onOpenChange={(v) => { if (!v) setPhotoUploadRepair(null) }} targetId={photoUploadRepair || ''} stages={selectedRepair?.stages || []} onUploaded={() => { setPhotoUploadRepair(null); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }} />
      <TripDetailDialog open={tripDetailOpen} onOpenChange={setTripDetailOpen} trip={selectedTrip} loading={tripDetailLoading} crews={crews} focusTrack={tripDetailFocusTrack} onEdit={(t) => { setTripDetailOpen(false); setTripFormEdit(t); setTripFormEquipmentId(t.equipmentId); setTripFormOpen(true) }} onDelete={(t) => { setTripDetailOpen(false); setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route }) }} onStart={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }) }); if (!res.ok) { const errData = await res.json().catch(() => null); throw new Error(errData?.error || 'Ошибка') } toast.success('Рейс начат, данные трекера заполнены'); fetchTripDetail(t.id); fetchAll() } catch (e: any) { toast.error(e.message || 'Ошибка') } }} onComplete={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete' }) }); if (!res.ok) { const errData = await res.json().catch(() => null); throw new Error(errData?.error || 'Ошибка') } toast.success('Рейс завершён, данные трекера заполнены'); fetchTripDetail(t.id); fetchAll() } catch (e: any) { toast.error(e.message || 'Ошибка завершения рейса') } }} onRefresh={() => { if (selectedTrip) fetchTripDetail(selectedTrip.id); fetchAll() }} />
      <TripFormDialog open={tripFormOpen} onOpenChange={setTripFormOpen} editData={tripFormEdit} equipmentId={tripFormEquipmentId} equipmentList={equipment} crews={crews} routeTemplates={routeTemplates} saving={tripFormSaving} setSaving={setTripFormSaving} onSaved={() => { setTripFormOpen(false); fetchAll() }} />
      <CrewFormDialog open={crewFormOpen} onOpenChange={setCrewFormOpen} editData={crewFormEdit} saving={crewFormSaving} setSaving={setCrewFormSaving} onSaved={() => { setCrewFormOpen(false); fetchAll() }} employees={employees} />
      <RouteTemplateFormDialog open={routeTemplateFormOpen} setOpen={setRouteTemplateFormOpen} editData={routeTemplateFormEdit} onSaved={fetchRouteTemplates} />
      <EmployeeDetailSheet open={empDetailOpen} onOpenChange={setEmpDetailOpen} employee={selectedEmp} loading={empDetailLoading} crews={crews} onEdit={(emp) => { setEmpDetailOpen(false); setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => { setEmpDetailOpen(false); setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName }) }} onRefresh={() => selectedEmp && fetchEmployeeDetail(selectedEmp.id)} />
      <EmployeeFormDialog open={empFormOpen} onOpenChange={setEmpFormOpen} editData={empFormEdit} crews={crews} equipment={equipment} saving={empFormSaving} setSaving={setEmpFormSaving} onSaved={() => { setEmpFormOpen(false); fetchAll() }} />

      {/* Full photo view */}
      <Dialog open={!!fullPhoto} onOpenChange={() => setFullPhoto(null)}>
        <DialogContent className="sm:max-w-3xl p-2" showCloseButton>
          {fullPhoto && <img src={fullPhoto} alt="Фото" className="w-full h-auto rounded-md object-contain max-h-[70dvh]" loading="lazy" />}
        </DialogContent>
      </Dialog>

      {/* Axenta settings dialog - kept for backward compat, now accessible from Settings tab */}

      {/* Delete confirm */}
      {/* Delete confirm with name input for critical items */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => { setDeleteDialog({ ...deleteDialog, open }); if (!open) setDeleteConfirmText('') }}>
        <AlertDialogContent className="w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              {['equipment', 'trip'].includes(deleteDialog.type) ? (
                <>Для удаления введите <strong>&laquo;{deleteDialog.name}&raquo;</strong> в поле ниже:</>
              ) : (
                <>Удалить &laquo;{deleteDialog.name}&raquo;? Это действие нельзя отменить.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {['equipment', 'trip'].includes(deleteDialog.type) && (
            <Input
              placeholder={`Введите "${deleteDialog.name}"`}
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 active:scale-95 transition-transform"
              disabled={(['equipment', 'trip'].includes(deleteDialog.type)) && deleteConfirmText !== deleteDialog.name}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Search Dialog (Ctrl+K) */}
      <Dialog open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 w-[95vw]">
          <div className="flex items-center border-b px-3">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Input value={globalSearchQuery} onChange={e => { setGlobalSearchQuery(e.target.value); setGlobalSearchIndex(-1) }} placeholder="Поиск по всей системе..." className="border-0 focus-visible:ring-0 h-10 text-sm" autoFocus />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0">ESC</kbd>
          </div>
          <div className="max-h-[50dvh] overflow-y-auto">
            {globalSearchQuery.trim() === '' ? (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Введите запрос для поиска по технике, ремонтам, рейсам, сотрудникам и компаниям</p>
                <p className="text-[10px] mt-1"><kbd className="rounded border bg-muted px-1 py-0.5">Ctrl+K</kbd> для быстрого доступа • <kbd className="rounded border bg-muted px-1 py-0.5">↑↓</kbd> навигация • <kbd className="rounded border bg-muted px-1 py-0.5">Enter</kbd> выбор</p>
              </div>
            ) : globalSearchResults.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <XCircle className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Ничего не найдено по запросу &laquo;{globalSearchQuery}&raquo;</p>
              </div>
            ) : (
              <div className="py-1">
                {globalSearchResults.map((r, i) => (
                  <button key={`${r.type}-${r.id}`} className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left ${i === globalSearchIndex ? 'bg-accent' : ''}`} onClick={r.action}>
                    <div className={`size-7 rounded-md bg-muted flex items-center justify-center shrink-0 ${r.color}`}>{r.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                    </div>
                    <span className={`text-[9px] shrink-0 rounded bg-muted px-1 py-0.5 font-medium ${r.color}`}>{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
