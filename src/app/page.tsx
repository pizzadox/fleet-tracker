'use client'

/* ═══════════════════════════════════════════════════════════════
   УЧЁТ ТЕХНИКИ — Комплексная система учёта оборудования
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })

// ─── shadcn/ui ────────────────────────────────────────────────
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'

// ─── Lucide Icons ─────────────────────────────────────────────
import {
  Truck, Wrench, Building2, Plus, Search, Moon, Sun, Edit, Trash2,
  ChevronRight, ChevronLeft, ImagePlus, X, Loader2, Camera, FileText,
  History, ClipboardList, Eye, Upload, Calendar, Phone, Mail, MapPin,
  Settings2, Info, DollarSign, Shield, User, Users, ArrowRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity, Gauge,
  Navigation, Fuel, Thermometer, Zap, Cog, RefreshCw, Wifi, WifiOff,
  Satellite, ArrowLeft, ChevronDown, ChevronUp, Filter, ListFilter,
  Route, Package, Weight, UserCircle, IdCard, ClipboardCheck
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Company {
  id: string; name: string; inn?: string | null; kpp?: string | null;
  ogrn?: string | null; address?: string | null; factAddress?: string | null;
  phone?: string | null; email?: string | null; director?: string | null;
  type: string; createdAt: string; updatedAt: string;
  _count?: { ownedEquipment: number; rentedEquipment: number };
}

interface EquipmentPhoto {
  id: string; equipmentId: string; url: string;
  description?: string | null; category: string; createdAt: string;
}

interface RepairStage {
  id: string; repairId: string; name: string; description?: string | null;
  status: string; startDate?: string | null; endDate?: string | null;
  performer?: string | null; cost?: number | null; sortOrder: number;
}

interface RepairPhoto {
  id: string; repairId: string; url: string;
  description?: string | null; stageId?: string | null;
}

interface Repair {
  id: string; equipmentId: string; description: string;
  reason?: string | null; startDate: string; endDate?: string | null;
  status: string; cost?: number | null; contractor?: string | null;
  contractorPhone?: string | null; workPerformed?: string | null;
  spareParts?: string | null; nextInspection?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null };
  photos?: RepairPhoto[]; stages?: RepairStage[];
}

interface EquipmentHistory {
  id: string; equipmentId: string; event: string;
  description?: string | null; date: string;
  oldValue?: string | null; newValue?: string | null; performedBy?: string | null;
}

interface EquipmentDocument {
  id: string; equipmentId: string; name: string; type: string;
  url: string; expiryDate?: string | null; notes?: string | null;
}

interface Equipment {
  id: string; name: string; type: string; brand?: string | null;
  model?: string | null; year?: number | null; vin?: string | null;
  serialNumber?: string | null; registrationNum?: string | null;
  stsNumber?: string | null; ptsNumber?: string | null;
  category?: string | null; color?: string | null;
  engineType?: string | null; engineVolume?: string | null;
  enginePower?: string | null; mileage?: number | null;
  fuelType?: string | null; loadCapacity?: string | null;
  passengerSeats?: number | null; purchaseDate?: string | null;
  purchasePrice?: number | null; currentPrice?: number | null;
  insuranceNumber?: string | null; insuranceExpiry?: string | null;
  inspectionDate?: string | null; inspectionExpiry?: string | null;
  status: string; notes?: string | null; ownerId?: string | null;
  renterId?: string | null; createdAt: string; updatedAt: string;
  owner?: Company | null; renter?: Company | null;
  _count?: { repairs: number; photos: number };
  photos?: EquipmentPhoto[]; repairs?: Repair[];
  history?: EquipmentHistory[]; documents?: EquipmentDocument[];
  trackers?: GlonassTracker[];
}

interface GlonassTracker {
  id: string; equipmentId: string; trackerId: string; trackerName?: string | null;
  imei?: string | null; phoneNumber?: string | null;
  lastLatitude?: number | null; lastLongitude?: number | null;
  lastSpeed?: number | null; lastCourse?: number | null; lastAltitude?: number | null;
  lastIgnition?: boolean | null; lastFuelLevel?: number | null;
  lastMileage?: number | null; lastEngineTemp?: number | null;
  lastAddress?: string | null; lastSeenAt?: string | null; lastPositionAt?: string | null;
  axentaCloudId?: string | null; isActive: boolean;
  createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null };
  sensorData?: GlonassSensorData[];
}

interface GlonassSensorData {
  id: string; trackerId: string; sensorType: string; sensorName?: string | null;
  value?: number | null; stringValue?: string | null; unit?: string | null;
  timestamp: string; createdAt: string;
}

interface AxentaSettings {
  id?: string; apiUrl: string; apiKey: string; username?: string | null;
  password?: string | null; syncInterval: number; lastSyncAt?: string | null;
  isActive: boolean;
}

interface CrewMember {
  id: string; crewId: string; fullName: string; role: string;
  phone?: string | null; licenseNum?: string | null; licenseCat?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
}

interface Crew {
  id: string; name: string; description?: string | null; type: string;
  status: string; notes?: string | null; createdAt: string; updatedAt: string;
  members?: CrewMember[]; _count?: { trips: number };
}

interface Trip {
  id: string; equipmentId: string; crewId?: string | null;
  route: string; startPoint?: string | null; endPoint?: string | null;
  cargo?: string | null; cargoWeight?: number | null; distance?: number | null;
  startDate: string; endDate?: string | null; plannedEndDate?: string | null;
  status: string; fuelStart?: number | null; fuelEnd?: number | null;
  mileageStart?: number | null; mileageEnd?: number | null;
  cost?: number | null; revenue?: number | null; notes?: string | null;
  createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null };
  crew?: { id: string; name: string; members?: { fullName: string; role: string }[] } | null;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'В эксплуатации', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  repair: { label: 'На ремонте', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
  decommissioned: { label: 'Списана', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
  rented: { label: 'В аренде', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
}

const REPAIR_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
}

const STAGE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидание', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
}

const EQUIPMENT_TYPES = [
  'автомобиль', 'спецтехника', 'прицеп', 'грузовик', 'автобус',
  'мототехника', 'сельхозтехника', 'строительная техника', 'водный транспорт', 'другое'
]

const PHOTO_CATEGORIES: Record<string, string> = {
  general: 'Общие', document: 'Документы', damage: 'Повреждения', repair: 'Ремонт'
}

const COMPANY_TYPES: Record<string, string> = {
  owner: 'Владелец', renter: 'Арендатор', both: 'Владелец и арендатор'
}

const TRIP_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  planned: { label: 'Запланирован', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  in_progress: { label: 'В пути', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
}

const CREW_TYPE_MAP: Record<string, string> = {
  driver: 'Водители', mechanic: 'Механики', mixed: 'Смешанный', other: 'Другой'
}

const MEMBER_ROLE_MAP: Record<string, string> = {
  driver: 'Водитель', mechanic: 'Механик', assistant: 'Помощник', loader: 'Грузчик', other: 'Другой'
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('ru-RU') } catch { return '—' }
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

function formatPrice(p?: number | null): string {
  if (p == null) return '—'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(p)
}

function statusBadge(status: string, map: Record<string, { label: string; color: string }>) {
  const s = map[status]
  if (!s) return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium ${s.color}`}>{s.label}</span>
}

function getEventIcon(event: string) {
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

function getStageProgress(stages: RepairStage[]): number {
  if (!stages || stages.length === 0) return 0
  const completed = stages.filter(s => s.status === 'completed').length
  return Math.round((completed / stages.length) * 100)
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [mainTab, setMainTab] = useState('equipment')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'equipment' | 'repair' | 'company' | 'trip' | 'crew'; id: string; name: string }>({
    open: false, type: 'equipment', id: '', name: ''
  })
  const [photoUploadEq, setPhotoUploadEq] = useState<string | null>(null)
  const [photoUploadRepair, setPhotoUploadRepair] = useState<string | null>(null)
  const [stageFormOpen, setStageFormOpen] = useState(false)
  const [stageFormRepairId, setStageFormRepairId] = useState('')
  const [stageFormEdit, setStageFormEdit] = useState<RepairStage | null>(null)
  const [stageFormSaving, setStageFormSaving] = useState(false)
  const [fullPhoto, setFullPhoto] = useState<string | null>(null)
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [axentaSettings, setAxentaSettings] = useState<AxentaSettings>({ apiUrl: '', apiKey: '', username: '', password: '', syncInterval: 300, isActive: false })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [tripFormOpen, setTripFormOpen] = useState(false)
  const [tripFormEdit, setTripFormEdit] = useState<Trip | null>(null)
  const [tripFormSaving, setTripFormSaving] = useState(false)
  const [tripFormEquipmentId, setTripFormEquipmentId] = useState('')
  const [tripDetailOpen, setTripDetailOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [tripDetailLoading, setTripDetailLoading] = useState(false)
  const [crewFormOpen, setCrewFormOpen] = useState(false)
  const [crewFormEdit, setCrewFormEdit] = useState<Crew | null>(null)
  const [crewFormSaving, setCrewFormSaving] = useState(false)

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const fetchEquipment = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (eqStatusFilter && eqStatusFilter !== 'all') params.set('status', eqStatusFilter)
      if (eqTypeFilter && eqTypeFilter !== 'all') params.set('type', eqTypeFilter)
      const res = await fetch(`/api/equipment?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEquipment(data)
    } catch { toast.error('Ошибка загрузки техники') }
  }, [debouncedSearch, eqStatusFilter, eqTypeFilter])

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCompanies(data)
    } catch { toast.error('Ошибка загрузки компаний') }
  }, [])

  const fetchRepairs = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRepairs(data)
    } catch { toast.error('Ошибка загрузки ремонтов') }
  }, [])

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch('/api/trips')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTrips(data)
    } catch { toast.error('Ошибка загрузки рейсов') }
  }, [])

  const fetchCrews = useCallback(async () => {
    try {
      const res = await fetch('/api/crews')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCrews(data)
    } catch { toast.error('Ошибка загрузки экипажей') }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchEquipment(), fetchCompanies(), fetchRepairs(), fetchTrips(), fetchCrews()])
    setLoading(false)
  }, [fetchEquipment, fetchCompanies, fetchRepairs, fetchTrips, fetchCrews])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/glonass/settings')
        if (res.ok) { const data = await res.json(); if (data.apiUrl) setAxentaSettings(data) }
      } catch { /* ignore */ }
    }
    loadSettings()
  }, [])

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

  const openEquipmentDetail = (eq: Equipment) => {
    setEqDetailTab('info')
    setEqDetailOpen(true)
    fetchEquipmentDetail(eq.id)
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

  const openTripDetail = (t: Trip) => {
    setTripDetailOpen(true)
    fetchTripDetail(t.id)
  }

  // ─── Stats with memo ─────────────────────────────────────────
  const stats = useMemo(() => ({
    total: equipment.length,
    active: equipment.filter(e => e.status === 'active').length,
    repair: equipment.filter(e => e.status === 'repair').length,
    rented: equipment.filter(e => e.status === 'rented').length,
    tripsActive: trips.filter(t => t.status === 'in_progress').length,
    tripsTotal: trips.length,
  }), [equipment, trips])

  const handleDelete = async () => {
    const { type, id } = deleteDialog
    try {
      let apiUrl = `/api/${type}s/${id}`
      if (type === 'crew') apiUrl = `/api/crews/${id}`
      if (type === 'trip') apiUrl = `/api/trips/${id}`
      const res = await fetch(apiUrl, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Удалено успешно')
      if (type === 'equipment') { setEqDetailOpen(false); setSelectedEq(null) }
      if (type === 'repair') { setRepairDetailOpen(false); setSelectedRepair(null) }
      if (type === 'trip') { setTripDetailOpen(false); setSelectedTrip(null) }
      fetchAll()
    } catch { toast.error('Ошибка удаления') }
    setDeleteDialog({ open: false, type: 'equipment', id: '', name: '' })
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — LOADING (Skeleton)
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Truck className="size-4" /></div>
              <div><h1 className="text-lg font-bold">Учёт техники</h1><p className="text-[10px] text-muted-foreground hidden sm:block">Система управления оборудованием</p></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0,1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4">
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
    <div className="min-h-screen flex flex-col bg-background pb-16 md:pb-0">
      {/* ─── HEADER ──────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Truck className="size-4" /></div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">Учёт техники</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Управление оборудованием предприятия</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSettingsOpen(true)} aria-label="Настройки"><Cog className="size-4" /></Button>
              {mounted && (
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Тема">
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              )}
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon={<Truck className="size-3.5" />} label="Всего" value={stats.total} color="text-primary" />
            <StatCard icon={<CheckCircle2 className="size-3.5" />} label="Экспл." value={stats.active} color="text-emerald-600" />
            <StatCard icon={<Wrench className="size-3.5" />} label="Ремонт" value={stats.repair} color="text-amber-600" />
            <StatCard icon={<Users className="size-3.5" />} label="Аренда" value={stats.rented} color="text-sky-600" />
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4">
        {/* Desktop tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="hidden md:block">
          <TabsList className="mb-4">
            <TabsTrigger value="equipment" className="gap-1.5"><Truck className="size-4" />Техника</TabsTrigger>
            <TabsTrigger value="repairs" className="gap-1.5"><Wrench className="size-4" />Ремонты</TabsTrigger>
            <TabsTrigger value="trips" className="gap-1.5"><Route className="size-4" />Рейсы</TabsTrigger>
            <TabsTrigger value="companies" className="gap-1.5"><Building2 className="size-4" />Компании</TabsTrigger>
          </TabsList>
          <TabsContent value="equipment">
            <EquipmentTab equipment={equipment} companies={companies} eqSearch={eqSearch} setEqSearch={setEqSearch} eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter} eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter} onOpenDetail={openEquipmentDetail} onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }} onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })} />
          </TabsContent>
          <TabsContent value="repairs">
            <RepairsTab repairs={repairs} equipment={equipment} onOpenDetail={openRepairDetail} onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }} onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })} />
          </TabsContent>
          <TabsContent value="trips">
            <TripsTab trips={trips} equipment={equipment} crews={crews} onOpenDetail={openTripDetail} onAdd={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId || ''); setTripFormOpen(true) }} onDelete={(t) => setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route })} onAddCrew={() => { setCrewFormEdit(null); setCrewFormOpen(true) }} onEditCrew={(c) => { setCrewFormEdit(c); setCrewFormOpen(true) }} onDeleteCrew={(c) => setDeleteDialog({ open: true, type: 'crew', id: c.id, name: c.name })} />
          </TabsContent>
          <TabsContent value="companies">
            <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />
          </TabsContent>
        </Tabs>

        {/* Mobile: show active tab content directly */}
        <div className="md:hidden">
          {mainTab === 'equipment' && <EquipmentTab equipment={equipment} companies={companies} eqSearch={eqSearch} setEqSearch={setEqSearch} eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter} eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter} onOpenDetail={openEquipmentDetail} onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }} onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })} />}
          {mainTab === 'repairs' && <RepairsTab repairs={repairs} equipment={equipment} onOpenDetail={openRepairDetail} onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }} onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })} />}
          {mainTab === 'trips' && <TripsTab trips={trips} equipment={equipment} crews={crews} onOpenDetail={openTripDetail} onAdd={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId || ''); setTripFormOpen(true) }} onDelete={(t) => setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route })} onAddCrew={() => { setCrewFormEdit(null); setCrewFormOpen(true) }} onEditCrew={(c) => { setCrewFormEdit(c); setCrewFormOpen(true) }} onDeleteCrew={(c) => setDeleteDialog({ open: true, type: 'crew', id: c.id, name: c.name })} />}
          {mainTab === 'companies' && <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />}
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm">
        <div className="grid grid-cols-4 h-14">
          {[
            { value: 'equipment', icon: <Truck className="size-5" />, label: 'Техника' },
            { value: 'repairs', icon: <Wrench className="size-5" />, label: 'Ремонты' },
            { value: 'trips', icon: <Route className="size-5" />, label: 'Рейсы' },
            { value: 'companies', icon: <Building2 className="size-5" />, label: 'Компании' },
          ].map(tab => (
            <button key={tab.value} onClick={() => setMainTab(tab.value)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${mainTab === tab.value ? 'text-primary' : 'text-muted-foreground'}`}>
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ─── DIALOGS ──────────────────────────────────────────── */}
      <EquipmentDetailSheet open={eqDetailOpen} onOpenChange={setEqDetailOpen} equipment={selectedEq} loading={eqDetailLoading} detailTab={eqDetailTab} setDetailTab={setEqDetailTab} companies={companies} photoCategoryFilter={photoCategoryFilter} setPhotoCategoryFilter={setPhotoCategoryFilter} fullPhoto={fullPhoto} setFullPhoto={setFullPhoto} onEdit={(eq) => { setEqDetailOpen(false); setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => { setEqDetailOpen(false); setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name }) }} onAddRepair={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId); setRepairFormOpen(true) }} onUploadPhoto={(eqId) => setPhotoUploadEq(eqId)} onRefresh={() => selectedEq && fetchEquipmentDetail(selectedEq.id)} onOpenRepairDetail={(r) => openRepairDetail(r)} onAddTrip={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId); setTripFormOpen(true) }} onOpenTripDetail={openTripDetail} allEquipment={equipment} onRefreshAll={fetchEquipment} />
      <EquipmentFormDialog open={eqFormOpen} onOpenChange={setEqFormOpen} editData={eqFormEdit} companies={companies} step={eqFormStep} setStep={setEqFormStep} saving={eqFormSaving} setSaving={setEqFormSaving} onSaved={() => { setEqFormOpen(false); fetchAll() }} />
      <RepairDetailDialog open={repairDetailOpen} onOpenChange={setRepairDetailOpen} repair={selectedRepair} loading={repairDetailLoading} fullPhoto={fullPhoto} setFullPhoto={setFullPhoto} onEdit={(r) => { setRepairDetailOpen(false); setRepairFormEdit(r); setRepairFormEquipmentId(r.equipmentId); setRepairFormOpen(true) }} onDelete={(r) => { setRepairDetailOpen(false); setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description }) }} onComplete={async (r) => { try { const res = await fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, status: 'completed', endDate: new Date().toISOString() }) }); if (!res.ok) throw new Error(); toast.success('Ремонт завершён'); fetchRepairDetail(r.id); fetchAll() } catch { toast.error('Ошибка завершения ремонта') } }} onAddStage={(repairId) => { setStageFormRepairId(repairId); setStageFormEdit(null); setStageFormOpen(true) }} onEditStage={(stage, repairId) => { setStageFormRepairId(repairId); setStageFormEdit(stage); setStageFormOpen(true) }} onDeleteStage={async (stageId, repairId) => { try { const res = await fetch(`/api/repairs/${repairId}/stages?stageId=${stageId}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); toast.success('Этап удалён'); fetchRepairDetail(repairId) } catch { toast.error('Ошибка удаления этапа') } }} onUploadPhoto={(repairId) => setPhotoUploadRepair(repairId)} onRefresh={() => selectedRepair && fetchRepairDetail(selectedRepair.id)} />
      <RepairFormDialog open={repairFormOpen} onOpenChange={setRepairFormOpen} editData={repairFormEdit} equipmentId={repairFormEquipmentId} equipmentList={equipment} saving={repairFormSaving} setSaving={setRepairFormSaving} onSaved={() => { setRepairFormOpen(false); fetchAll() }} />
      <CompanyFormDialog open={companyFormOpen} onOpenChange={setCompanyFormOpen} editData={companyFormEdit} saving={companyFormSaving} setSaving={setCompanyFormSaving} onSaved={() => { setCompanyFormOpen(false); fetchAll() }} />
      <StageFormDialog open={stageFormOpen} onOpenChange={setStageFormOpen} repairId={stageFormRepairId} editData={stageFormEdit} saving={stageFormSaving} setSaving={setStageFormSaving} onSaved={() => { setStageFormOpen(false); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }} />
      <PhotoUploadDialog open={!!photoUploadEq} onOpenChange={(v) => { if (!v) setPhotoUploadEq(null) }} targetId={photoUploadEq || ''} targetType="equipment" onUploaded={() => { setPhotoUploadEq(null); if (selectedEq) fetchEquipmentDetail(selectedEq.id); fetchAll() }} />
      <RepairPhotoUploadDialog open={!!photoUploadRepair} onOpenChange={(v) => { if (!v) setPhotoUploadRepair(null) }} targetId={photoUploadRepair || ''} stages={selectedRepair?.stages || []} onUploaded={() => { setPhotoUploadRepair(null); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }} />
      <TripDetailDialog open={tripDetailOpen} onOpenChange={setTripDetailOpen} trip={selectedTrip} loading={tripDetailLoading} crews={crews} onEdit={(t) => { setTripDetailOpen(false); setTripFormEdit(t); setTripFormEquipmentId(t.equipmentId); setTripFormOpen(true) }} onDelete={(t) => { setTripDetailOpen(false); setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route }) }} onStart={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) }); if (!res.ok) throw new Error(); toast.success('Рейс начат'); fetchTripDetail(t.id); fetchAll() } catch { toast.error('Ошибка') } }} onComplete={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', endDate: new Date().toISOString() }) }); if (!res.ok) throw new Error(); toast.success('Рейс завершён'); fetchTripDetail(t.id); fetchAll() } catch { toast.error('Ошибка завершения рейса') } }} onRefresh={() => selectedTrip && fetchTripDetail(selectedTrip.id)} />
      <TripFormDialog open={tripFormOpen} onOpenChange={setTripFormOpen} editData={tripFormEdit} equipmentId={tripFormEquipmentId} equipmentList={equipment} crews={crews} saving={tripFormSaving} setSaving={setTripFormSaving} onSaved={() => { setTripFormOpen(false); fetchAll() }} />
      <CrewFormDialog open={crewFormOpen} onOpenChange={setCrewFormOpen} editData={crewFormEdit} saving={crewFormSaving} setSaving={setCrewFormSaving} onSaved={() => { setCrewFormOpen(false); fetchAll() }} />

      {/* Full photo view */}
      <Dialog open={!!fullPhoto} onOpenChange={() => setFullPhoto(null)}>
        <DialogContent className="sm:max-w-3xl p-2" showCloseButton>
          {fullPhoto && <img src={fullPhoto} alt="Фото" className="w-full h-auto rounded-md object-contain max-h-[70vh]" loading="lazy" />}
        </DialogContent>
      </Dialog>

      {/* Axenta settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cog className="size-4" />Настройки Axenta.cloud</DialogTitle>
            <DialogDescription>Авторизация и подключение к API ГЛОНАСС</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
            <div className="rounded-md bg-muted/50 border p-3 space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5"><Info className="size-3.5" />Как получить токен</p>
              <ol className="text-[11px] text-muted-foreground list-decimal list-inside space-y-0.5">
                <li>Зарегистрируйтесь на <span className="font-medium text-foreground">axenta.cloud</span></li>
                <li>Создайте учётную запись в разделе «Учетные записи»</li>
                <li>Введите логин и пароль ниже — токен будет получен автоматически</li>
              </ol>
              <p className="text-[10px] text-muted-foreground">API: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">POST /api/auth/login/</code> → <code className="text-[10px] bg-muted px-1 py-0.5 rounded">Authorization: Token &lt;ваш_токен&gt;</code></p>
            </div>
            <div><Label className="text-xs">API URL *</Label><Input placeholder="https://axenta.cloud" value={axentaSettings.apiUrl} onChange={e => setAxentaSettings(s => ({ ...s, apiUrl: e.target.value }))} /><p className="text-[10px] text-muted-foreground mt-0.5">Базовый адрес: https://axenta.cloud</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Логин *</Label><Input placeholder="Логин Axenta" value={axentaSettings.username || ''} onChange={e => setAxentaSettings(s => ({ ...s, username: e.target.value }))} /></div>
              <div><Label className="text-xs">Пароль *</Label><Input type="password" placeholder="Пароль Axenta" value={axentaSettings.password || ''} onChange={e => setAxentaSettings(s => ({ ...s, password: e.target.value }))} /></div>
            </div>
            {axentaSettings.apiKey && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2.5">
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />Токен получен</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">Ключ: {axentaSettings.apiKey.substring(0, 10)}...{axentaSettings.apiKey.slice(-4)}</p>
              </div>
            )}
            <div><Label className="text-xs">Интервал синхронизации (сек)</Label><Input type="number" value={axentaSettings.syncInterval} onChange={e => setAxentaSettings(s => ({ ...s, syncInterval: parseInt(e.target.value) || 300 }))} /></div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Интеграция активна</Label>
              <Button variant={axentaSettings.isActive ? 'default' : 'outline'} size="sm" onClick={() => setAxentaSettings(s => ({ ...s, isActive: !s.isActive }))}>{axentaSettings.isActive ? 'Вкл' : 'Выкл'}</Button>
            </div>
            {axentaSettings.lastSyncAt && <p className="text-[10px] text-muted-foreground">Последняя синхронизация: {formatDateTime(axentaSettings.lastSyncAt)}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={async () => { setSyncing(true); try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка') } catch { toast.error('Ошибка синхронизации') }; setSyncing(false) }} disabled={syncing}>
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}Синхронизировать
            </Button>
            <Button size="sm" onClick={async () => {
              setSettingsSaving(true);
              try {
                // Авторизация через API — автоматически получает токен
                if (axentaSettings.username && axentaSettings.password && axentaSettings.apiUrl) {
                  const authRes = await fetch('/api/glonass/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(axentaSettings)
                  });
                  const authData = await authRes.json();
                  if (authRes.ok && authData.success) {
                    toast.success(authData.message || 'Авторизация успешна');
                    // Обновим настройки из БД
                    const settingsRes = await fetch('/api/glonass/settings');
                    if (settingsRes.ok) {
                      const settingsData = await settingsRes.json();
                      if (settingsData.apiUrl) setAxentaSettings(settingsData);
                    }
                  } else {
                    toast.error(authData.error || 'Ошибка авторизации');
                  }
                } else {
                  // Если нет логина/пароля — сохраняем как есть (ручной ввод ключа)
                  const res = await fetch('/api/glonass/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(axentaSettings) });
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  setAxentaSettings(data);
                  toast.success('Настройки сохранены');
                }
              } catch { toast.error('Ошибка сохранения') }
              setSettingsSaving(false);
            }} disabled={settingsSaving}>
              {settingsSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Satellite className="size-3.5" />}Войти и сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>Удалить &laquo;{deleteDialog.name}&raquo;? Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD (compact)
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="py-2 gap-0">
      <CardContent className="flex items-center gap-2 px-3 pt-0">
        <div className={`flex items-center justify-center size-7 rounded-md bg-muted ${color}`}>{icon}</div>
        <div>
          <p className="text-lg sm:text-xl font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT TAB
// ═══════════════════════════════════════════════════════════════

function EquipmentTab({ equipment, companies, eqSearch, setEqSearch, eqStatusFilter, setEqStatusFilter, eqTypeFilter, setEqTypeFilter, onOpenDetail, onAdd, onEdit, onDelete }: {
  equipment: Equipment[]; companies: Company[];
  eqSearch: string; setEqSearch: (v: string) => void;
  eqStatusFilter: string; setEqStatusFilter: (v: string) => void;
  eqTypeFilter: string; setEqTypeFilter: (v: string) => void;
  onOpenDetail: (eq: Equipment) => void;
  onAdd: () => void; onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию, номеру..." value={eqSearch} onChange={e => setEqSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex gap-2">
          <Select value={eqStatusFilter} onValueChange={setEqStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eqTypeFilter} onValueChange={setEqTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Добавить</Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {equipment.length}</p>

      {equipment.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Truck className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Техника не найдена</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map(eq => (
            <Card key={eq.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-3 ${EQUIPMENT_STATUS_MAP[eq.status]?.border || ''}`} onClick={() => onOpenDetail(eq)}>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0"><Truck className="size-3.5 text-muted-foreground" /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{eq.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground truncate">{[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}</p>
                    </div>
                  </div>
                  {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <div><span className="text-muted-foreground">Гос. номер:</span> <span className="font-medium">{eq.registrationNum || '—'}</span></div>
                  <div><span className="text-muted-foreground">Тип:</span> <span className="font-medium capitalize">{eq.type}</span></div>
                  <div><span className="text-muted-foreground">Владелец:</span> <span className="font-medium truncate">{eq.owner?.name || '—'}</span></div>
                  <div><span className="text-muted-foreground">Арендатор:</span> <span className="font-medium truncate">{eq.renter?.name || '—'}</span></div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-0.5"><Wrench className="size-3" />{eq._count?.repairs || 0}</span>
                  <span className="flex items-center gap-0.5"><Camera className="size-3" />{eq._count?.photos || 0}</span>
                </div>
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => onEdit(eq)}><Edit className="size-3" />Изменить</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(eq)}><Trash2 className="size-3" />Удалить</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT DETAIL SHEET
// ═══════════════════════════════════════════════════════════════

function EquipmentDetailSheet({ open, onOpenChange, equipment, loading, detailTab, setDetailTab, companies, photoCategoryFilter, setPhotoCategoryFilter, fullPhoto, setFullPhoto, onEdit, onDelete, onAddRepair, onUploadPhoto, onRefresh, onOpenRepairDetail, onAddTrip, onOpenTripDetail, allEquipment, onRefreshAll }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  equipment: Equipment | null; loading: boolean;
  detailTab: string; setDetailTab: (v: string) => void;
  companies: Company[];
  photoCategoryFilter: string; setPhotoCategoryFilter: (v: string) => void;
  fullPhoto: string | null; setFullPhoto: (v: string | null) => void;
  onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
  onAddRepair: (eqId: string) => void; onUploadPhoto: (eqId: string) => void;
  onRefresh: () => void; onOpenRepairDetail: (r: Repair) => void;
  onAddTrip: (eqId: string) => void; onOpenTripDetail: (t: Trip) => void;
  allEquipment: Equipment[]; onRefreshAll: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [localTrips, setLocalTrips] = useState<Trip[]>([])
  const eq = equipment
  const filteredPhotos = eq?.photos?.filter(p => photoCategoryFilter === 'all' || p.category === photoCategoryFilter) || []

  // Tracker connection dialog
  const [trackerPickerOpen, setTrackerPickerOpen] = useState(false)
  const [trackerPickerLoading, setTrackerPickerLoading] = useState(false)
  const [availableObjects, setAvailableObjects] = useState<Array<{ id: number; name: string; uniqueId: string; connectedStatus: boolean; isLinked: boolean }>>([])
  const [trackerPickerEqId, setTrackerPickerEqId] = useState('')

  // Map & historical data
  const [mapTrackData, setMapTrackData] = useState<Array<{ lat: number; lng: number }>>([])
  const [trackerStats, setTrackerStats] = useState<Record<string, unknown> | null>(null)
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showAllTrackersMap, setShowAllTrackersMap] = useState(false)

  useEffect(() => {
    if (open && eq && detailTab === 'trips') {
      fetch(`/api/trips?equipmentId=${eq.id}`).then(r => r.json()).then(setLocalTrips).catch(() => {})
    }
  }, [open, eq, detailTab])

  if (!equipment) return null

  // Get unique sensors (latest value per sensor name)
  const getUniqueSensors = (sensors: GlonassSensorData[]) => {
    const seen = new Set<string>()
    return sensors.filter(s => {
      const key = `${s.sensorType}-${s.sensorName || 'unnamed'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Get course direction name
  const getCourseDirection = (course: number) => {
    const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
    const idx = Math.round(course / 45) % 8
    return `${course}° ${dirs[idx]}`
  }

  // Format duration from seconds
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}ч ${m}мин` : `${m}мин`
  }

  // Apply date preset
  const applyDatePreset = (preset: string) => {
    const now = new Date()
    let from: Date
    const to = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        to.setDate(to.getDate() - 1)
        to.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      default:
        return
    }
    setHistoryDateFrom(from.toISOString().slice(0, 16))
    setHistoryDateTo(to.toISOString().slice(0, 16))
  }

  // Fetch historical data for a tracker
  const fetchHistoricalData = async (tracker: GlonassTracker) => {
    if (!historyDateFrom || !historyDateTo) return
    setHistoryLoading(true)
    setTrackerStats(null)
    setMapTrackData([])

    const axentaId = tracker.axentaCloudId || tracker.trackerId

    try {
      // Fetch stats
      const statsRes = await fetch('/api/glonass/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: axentaId,
          startDate: new Date(historyDateFrom).toISOString(),
          endDate: new Date(historyDateTo).toISOString(),
        })
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setTrackerStats(statsData)
      }

      // Fetch track
      const tracksRes = await fetch('/api/glonass/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: axentaId,
          startDate: new Date(historyDateFrom).toISOString(),
          endDate: new Date(historyDateTo).toISOString(),
        })
      })
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()
        // Parse track points from Axenta response
        const points: Array<{ lat: number; lng: number }> = []
        if (Array.isArray(tracksData)) {
          for (const track of tracksData) {
            if (track.points && Array.isArray(track.points)) {
              for (const p of track.points) {
                if (p.pos) {
                  points.push({ lat: p.pos.y, lng: p.pos.x })
                } else if (p.lat != null && p.lng != null) {
                  points.push({ lat: p.lat, lng: p.lng })
                }
              }
            }
          }
        }
        setMapTrackData(points)
      }

      toast.success('Данные за период загружены')
    } catch {
      toast.error('Ошибка загрузки данных за период')
    }
    setHistoryLoading(false)
  }

  const handleTabChange = (v: string) => {
    setDetailTab(v)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 pr-8">
            <Button variant="ghost" size="icon" className="size-7 sm:hidden shrink-0" onClick={() => onOpenChange(false)} aria-label="Назад"><ArrowLeft className="size-4" /></Button>
            <SheetTitle className="flex items-center gap-2 text-base"><Truck className="size-4" />{eq.name}</SheetTitle>
          </div>
          <SheetDescription className="text-xs">{[eq.brand, eq.model, eq.year].filter(Boolean).join(' • ')} — {eq.registrationNum || 'без номера'}</SheetDescription>
          <div className="flex items-center gap-2 pt-1">
            {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
            <span className="text-[10px] text-muted-foreground">создано {formatDate(eq.createdAt)}</span>
          </div>
        </SheetHeader>

        <Tabs value={detailTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="px-3 sm:px-5 border-b shrink-0 overflow-x-auto">
            <TabsList className="w-full min-w-max h-9">
              <TabsTrigger value="info" className="gap-1 text-xs"><Info className="size-3" /><span className="hidden sm:inline">Информация</span></TabsTrigger>
              <TabsTrigger value="photos" className="gap-1 text-xs"><Camera className="size-3" /><span className="hidden sm:inline">Фото</span></TabsTrigger>
              <TabsTrigger value="repairs" className="gap-1 text-xs"><Wrench className="size-3" /><span className="hidden sm:inline">Ремонты</span></TabsTrigger>
              <TabsTrigger value="glonass" className="gap-1 text-xs"><MapPin className="size-3" /><span className="hidden sm:inline">ГЛОНАСС</span></TabsTrigger>
              <TabsTrigger value="trips" className="gap-1 text-xs"><Route className="size-3" /><span className="hidden sm:inline">Рейсы</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-1 text-xs"><History className="size-3" /><span className="hidden sm:inline">История</span></TabsTrigger>
            </TabsList>
          </div>

          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {detailTab === 'info' && (
                  <div className="px-4 sm:px-5 py-3 space-y-4">
                    <DetailSection title="Основные данные" icon={<Settings2 className="size-3.5" />}>
                      <DetailRow label="Наименование" value={eq.name} />
                      <DetailRow label="Тип" value={eq.type} />
                      <DetailRow label="Марка" value={eq.brand} />
                      <DetailRow label="Модель" value={eq.model} />
                      <DetailRow label="Год выпуска" value={eq.year?.toString()} />
                      <DetailRow label="Категория" value={eq.category} />
                      <DetailRow label="Цвет" value={eq.color} />
                    </DetailSection>
                    <DetailSection title="Регистрация" icon={<FileText className="size-3.5" />}>
                      <DetailRow label="VIN" value={eq.vin} />
                      <DetailRow label="Серийный номер" value={eq.serialNumber} />
                      <DetailRow label="Гос. номер" value={eq.registrationNum} />
                      <DetailRow label="СТС" value={eq.stsNumber} />
                      <DetailRow label="ПТС" value={eq.ptsNumber} />
                    </DetailSection>
                    <DetailSection title="Тех. характеристики" icon={<Gauge className="size-3.5" />}>
                      <DetailRow label="Двигатель" value={eq.engineType} />
                      <DetailRow label="Объём" value={eq.engineVolume} />
                      <DetailRow label="Мощность (л.с.)" value={eq.enginePower} />
                      <DetailRow label="Пробег (км)" value={eq.mileage?.toLocaleString('ru-RU')} />
                      <DetailRow label="Топливо" value={eq.fuelType} />
                      <DetailRow label="Грузоподъёмность" value={eq.loadCapacity} />
                      <DetailRow label="Мест" value={eq.passengerSeats?.toString()} />
                    </DetailSection>
                    <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                      <DetailRow label="Дата покупки" value={formatDate(eq.purchaseDate)} />
                      <DetailRow label="Цена покупки" value={formatPrice(eq.purchasePrice)} />
                      <DetailRow label="Текущая стоимость" value={formatPrice(eq.currentPrice)} />
                    </DetailSection>
                    <DetailSection title="Страхование и ТО" icon={<Shield className="size-3.5" />}>
                      <DetailRow label="Полис" value={eq.insuranceNumber} />
                      <DetailRow label="Страховка до" value={formatDate(eq.insuranceExpiry)} />
                      <DetailRow label="ТО дата" value={formatDate(eq.inspectionDate)} />
                      <DetailRow label="ТО до" value={formatDate(eq.inspectionExpiry)} />
                    </DetailSection>
                    <DetailSection title="Компания" icon={<Building2 className="size-3.5" />}>
                      <DetailRow label="Владелец" value={eq.owner?.name} />
                      <DetailRow label="Арендатор" value={eq.renter?.name} />
                    </DetailSection>
                    {eq.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{eq.notes}</p></DetailSection>}
                  </div>
                )}

                {detailTab === 'photos' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Select value={photoCategoryFilter} onValueChange={setPhotoCategoryFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Категория" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          {Object.entries(PHOTO_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onUploadPhoto(eq.id)}><Upload className="size-3" />Загрузить</Button>
                    </div>
                    {filteredPhotos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><Camera className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет фотографий</p></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredPhotos.map(photo => (
                          <div key={photo.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => setFullPhoto(photo.url)}>
                            <img src={photo.url} alt={photo.description || ''} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[9px] text-white truncate">{PHOTO_CATEGORIES[photo.category] || photo.category}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'repairs' && (
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <Button size="sm" className="h-8 gap-1 text-xs mb-1" onClick={() => onAddRepair(eq.id)}><Plus className="size-3" />Новый ремонт</Button>
                    {(!eq.repairs || eq.repairs.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><Wrench className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет записей о ремонтах</p></div>
                    ) : eq.repairs.map(r => (
                      <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onOpenRepairDetail(r)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium">{r.description}</p>
                            {statusBadge(r.status, REPAIR_STATUS_MAP)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span>{formatDate(r.startDate)}</span>{r.cost != null && <span> • {formatPrice(r.cost)}</span>}
                          </div>
                          {r.stages && r.stages.length > 0 && (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Этапы: {r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                                <span>{getStageProgress(r.stages)}%</span>
                              </div>
                              <Progress value={getStageProgress(r.stages)} className="h-1" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {detailTab === 'glonass' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    {(!eq.trackers || eq.trackers.length === 0) ? (
                      <div className="text-center py-8">
                        <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground mb-1">ГЛОНАСС трекер не подключён</p>
                        <Button size="sm" className="h-8 gap-1 text-xs mt-2" onClick={async () => {
                          setTrackerPickerEqId(eq.id)
                          setTrackerPickerLoading(true)
                          setTrackerPickerOpen(true)
                          try {
                            const res = await fetch('/api/glonass/objects')
                            if (res.ok) {
                              const data = await res.json()
                              setAvailableObjects(data.objects || [])
                            } else {
                              toast.error('Ошибка получения объектов Axenta')
                            }
                          } catch { toast.error('Ошибка подключения к Axenta') }
                          setTrackerPickerLoading(false)
                        }}><Plus className="size-3" />Подключить из Axenta</Button>
                      </div>
                    ) : (
                      <>
                        {/* MAP */}
                        {eq.trackers.some(t => t.lastLatitude != null && t.lastLongitude != null) && (
                          <Card>
                            <CardHeader className="pb-1.5 pt-3 px-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="size-3.5" />Карта</CardTitle>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setShowAllTrackersMap(!showAllTrackersMap)}>
                                  {showAllTrackersMap ? 'Текущая техника' : 'Вся техника'}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 pt-0">
                              <div className="h-[300px] rounded-lg overflow-hidden border">
                                <TrackerMap
                                  trackers={showAllTrackersMap
                                    ? allEquipment.flatMap(e => (e.trackers || []).filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: e.name, registrationNum: e.registrationNum })))
                                    : eq.trackers!.filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: eq.name, registrationNum: eq.registrationNum }))
                                  }
                                  trackPoints={mapTrackData}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Tracker cards */}
                        {eq.trackers?.map(tracker => (
                          <Card key={tracker.id}>
                            <CardHeader className="pb-1.5 pt-3 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`size-7 rounded-md flex items-center justify-center ${tracker.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                    {tracker.isActive ? <Wifi className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-3.5 text-red-600 dark:text-red-400" />}
                                  </div>
                                  <div>
                                    <CardTitle className="text-xs font-semibold">{tracker.trackerName || `Трекер ${tracker.trackerId}`}</CardTitle>
                                    <p className="text-[10px] text-muted-foreground">ID: {tracker.trackerId}{tracker.axentaCloudId ? ` • Axenta: ${tracker.axentaCloudId}` : ''}</p>
                                  </div>
                                </div>
                                {statusBadge(tracker.isActive ? 'active' : 'repair', { active: { label: 'Активен', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' }, repair: { label: 'Неактивен', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' } })}
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 pt-0 space-y-2">
                              <Separator />
                              <DetailSection title="Местоположение" icon={<MapPin className="size-3.5" />}>
                                <DetailRow label="Широта" value={tracker.lastLatitude?.toFixed(6)} />
                                <DetailRow label="Долгота" value={tracker.lastLongitude?.toFixed(6)} />
                                <DetailRow label="Скорость" value={tracker.lastSpeed != null ? `${tracker.lastSpeed} км/ч` : undefined} />
                                <DetailRow label="Курс" value={tracker.lastCourse != null ? getCourseDirection(tracker.lastCourse) : undefined} />
                                <DetailRow label="Высота" value={tracker.lastAltitude != null ? `${tracker.lastAltitude} м` : undefined} />
                                {tracker.lastAddress && <DetailRow label="Адрес" value={tracker.lastAddress} />}
                              </DetailSection>
                              <DetailSection title="Датчики" icon={<Gauge className="size-3.5" />}>
                                <DetailRow label="Зажигание" value={tracker.lastIgnition != null ? (tracker.lastIgnition ? 'Вкл' : 'Выкл') : undefined} />
                                <DetailRow label="Топливо" value={tracker.lastFuelLevel != null ? `${tracker.lastFuelLevel}%` : undefined} />
                                <DetailRow label="Пробег" value={tracker.lastMileage != null ? `${tracker.lastMileage?.toLocaleString('ru-RU')} км` : undefined} />
                                {tracker.sensorData && tracker.sensorData.length > 0 && (
                                  <>
                                    <div className="col-span-2 mt-1 pt-1 border-t border-dashed border-border/40">
                                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Данные датчиков Axenta</p>
                                    </div>
                                    {getUniqueSensors(tracker.sensorData).map((s, i) => (
                                      <DetailRow key={i} label={s.sensorName || s.sensorType} value={`${(s.value ?? s.stringValue) || '—'}${s.unit ? ` ${s.unit}` : ''}`} />
                                    ))}
                                  </>
                                )}
                                {(!tracker.sensorData || tracker.sensorData.length === 0) && tracker.lastEngineTemp == null && (
                                  <p className="text-[10px] text-muted-foreground col-span-2">Нет данных датчиков</p>
                                )}
                              </DetailSection>
                              <DetailSection title="Связь" icon={<Clock className="size-3.5" />}>
                                <DetailRow label="Выход на связь" value={formatDateTime(tracker.lastSeenAt)} />
                                <DetailRow label="Позиция" value={formatDateTime(tracker.lastPositionAt)} />
                              </DetailSection>

                              {/* Date range for historical data */}
                              <DetailSection title="Запрос данных за период" icon={<Calendar className="size-3.5" />}>
                                <div className="grid grid-cols-2 gap-2 col-span-2">
                                  <div>
                                    <Label className="text-[10px]">С</Label>
                                    <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">По</Label>
                                    <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 col-span-2">
                                  {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                                    <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyDatePreset(preset)}>{preset}</Button>
                                  ))}
                                </div>
                                <Button size="sm" className="h-7 text-[11px] w-full gap-1 col-span-2" disabled={!historyDateFrom || !historyDateTo || historyLoading} onClick={() => fetchHistoricalData(tracker)}>
                                  {historyLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                                  Запросить данные
                                </Button>
                              </DetailSection>

                              {/* Stats display */}
                              {trackerStats && (
                                <DetailSection title="Статистика за период" icon={<Activity className="size-3.5" />}>
                                  <DetailRow label="Пробег" value={trackerStats.mileage ? `${Number(trackerStats.mileage).toFixed(1)} км` : undefined} />
                                  <DetailRow label="Ср. скорость" value={trackerStats.avgSpeed ? `${Number(trackerStats.avgSpeed).toFixed(1)} км/ч` : undefined} />
                                  <DetailRow label="Макс. скорость" value={trackerStats.maxSpeed ? `${Number(trackerStats.maxSpeed).toFixed(1)} км/ч` : undefined} />
                                  <DetailRow label="Расход топлива" value={trackerStats.fuelConsumption ? `${Number(trackerStats.fuelConsumption).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Ср. расход" value={trackerStats.avgFuelConsumption ? `${Number(trackerStats.avgFuelConsumption).toFixed(1)} л/100км` : undefined} />
                                  <DetailRow label="Заправки" value={trackerStats.refuelVolume ? `${Number(trackerStats.refuelVolume).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Сливы" value={trackerStats.plumVolume ? `${Number(trackerStats.plumVolume).toFixed(1)} л` : undefined} />
                                  <DetailRow label="Время поездок" value={trackerStats.tripsDuration ? formatDuration(Number(trackerStats.tripsDuration)) : undefined} />
                                  <DetailRow label="Время стоянок" value={trackerStats.parkingsDuration ? formatDuration(Number(trackerStats.parkingsDuration)) : undefined} />
                                  <DetailRow label="Моточасы" value={trackerStats.engineHours ? `${Number(trackerStats.engineHours).toFixed(1)} ч` : undefined} />
                                </DetailSection>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={async () => {
                                  try {
                                    const res = await fetch('/api/glonass/sync', { method: 'POST' })
                                    const data = await res.json()
                                    if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`)
                                    else toast.error(data.error || 'Ошибка')
                                    onRefresh()
                                    onRefreshAll()
                                  } catch { toast.error('Ошибка') }
                                }}><RefreshCw className="size-3" />Синхронизировать</Button>
                                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { onRefresh(); onRefreshAll() }}><Activity className="size-3" />Обновить</Button>
                                <div className="flex-1" />
                                <Button size="sm" variant="destructive" className="h-7 text-[11px] gap-1" onClick={async () => {
                                  try {
                                    await fetch(`/api/glonass/${tracker.id}`, { method: 'DELETE' })
                                    toast.success('Трекер отключён')
                                    onRefresh()
                                    onRefreshAll()
                                  } catch { toast.error('Ошибка') }
                                }}><Trash2 className="size-3" />Отключить</Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}

                    {/* Tracker picker dialog */}
                    <Dialog open={trackerPickerOpen} onOpenChange={setTrackerPickerOpen}>
                      <DialogContent className="max-w-md max-h-[70vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2"><Satellite className="size-4" />Подключить трекер</DialogTitle>
                          <DialogDescription>Выберите объект из Axenta.cloud для привязки</DialogDescription>
                        </DialogHeader>
                        {trackerPickerLoading ? (
                          <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
                        ) : availableObjects.length === 0 ? (
                          <div className="text-center py-8">
                            <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Нет доступных объектов</p>
                            <p className="text-xs text-muted-foreground mt-1">Проверьте настройки Axenta и выполните синхронизацию</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 overflow-y-auto max-h-[50vh]">
                            {availableObjects.map(obj => (
                              <div key={obj.id} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${obj.isLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={async () => {
                                  if (obj.isLinked) return
                                  try {
                                    const res = await fetch('/api/glonass', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        equipmentId: trackerPickerEqId,
                                        trackerId: String(obj.uniqueId || obj.id),
                                        trackerName: obj.name,
                                        axentaCloudId: String(obj.id),
                                      })
                                    })
                                    if (res.ok) {
                                      toast.success(`Трекер "${obj.name}" подключён`)
                                      setTrackerPickerOpen(false)
                                      onRefresh()
                                      onRefreshAll()
                                    } else {
                                      toast.error('Ошибка подключения трекера')
                                    }
                                  } catch { toast.error('Ошибка подключения') }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`size-6 rounded flex items-center justify-center ${obj.connectedStatus ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    {obj.connectedStatus ? <Wifi className="size-3 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-3 text-gray-400" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">{obj.name}</p>
                                    <p className="text-[10px] text-muted-foreground">ID: {obj.id} • {obj.uniqueId}</p>
                                  </div>
                                </div>
                                {obj.isLinked ? <Badge variant="secondary" className="text-[10px]">Привязан</Badge> : <Plus className="size-4 text-muted-foreground" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {detailTab === 'trips' && (
                  <div className="px-4 sm:px-5 py-3 space-y-2">
                    <Button size="sm" className="h-8 gap-1 text-xs mb-1" onClick={() => onAddTrip(eq.id)}><Plus className="size-3" />Новый рейс</Button>
                    {localTrips.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><Route className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет рейсов</p></div>
                    ) : localTrips.map(t => (
                      <Card key={t.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onOpenTripDetail(t)}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium">{t.route}</p>
                            {statusBadge(t.status, TRIP_STATUS_MAP)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span>{formatDate(t.startDate)}</span>{t.cargo && <span> • {t.cargo}</span>}{t.distance != null && <span> • {t.distance} км</span>}
                          </div>
                          {t.crew && <p className="text-[10px] text-muted-foreground">Экипаж: {t.crew.name}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {detailTab === 'history' && (
                  <div className="px-4 sm:px-5 py-3">
                    {(!eq.history || eq.history.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><History className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет записей</p></div>
                    ) : (
                      <div className="space-y-0">
                        {eq.history.map((h, i) => (
                          <div key={h.id} className="flex gap-2.5 pb-3 relative">
                            {i < (eq.history?.length || 0) - 1 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />}
                            <div className="shrink-0 mt-0.5 z-10">{getEventIcon(h.event)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{h.description || h.event}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(h.date)}</p>
                              {h.oldValue && h.newValue && <p className="text-[10px] text-muted-foreground"><span className="line-through">{h.oldValue}</span> → {h.newValue}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs>

        {/* Actions */}
        <div className="border-t px-3 sm:px-5 py-2 flex flex-wrap gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onEdit(eq)}><Edit className="size-3" />Редактировать</Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onUploadPhoto(eq.id)}><ImagePlus className="size-3" />Фото</Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={onRefresh}><Activity className="size-3" />Обновить</Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onDelete(eq)}><Trash2 className="size-3" />Удалить</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-xs font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-5">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-dashed border-border/40">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{value || '—'}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT FORM DIALOG (Multi-Step)
// ═══════════════════════════════════════════════════════════════

function EquipmentFormDialog({ open, onOpenChange, editData, companies, step, setStep, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Equipment | null; companies: Company[];
  step: number; setStep: (v: number) => void;
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '', type: editData.type || 'автомобиль',
        brand: editData.brand || '', model: editData.model || '',
        year: editData.year?.toString() || '', vin: editData.vin || '',
        serialNumber: editData.serialNumber || '', registrationNum: editData.registrationNum || '',
        stsNumber: editData.stsNumber || '', ptsNumber: editData.ptsNumber || '',
        category: editData.category || '', color: editData.color || '',
        engineType: editData.engineType || '', engineVolume: editData.engineVolume || '',
        enginePower: editData.enginePower || '', mileage: editData.mileage?.toString() || '',
        fuelType: editData.fuelType || '', loadCapacity: editData.loadCapacity || '',
        passengerSeats: editData.passengerSeats?.toString() || '',
        purchaseDate: editData.purchaseDate ? new Date(editData.purchaseDate).toISOString().split('T')[0] : '',
        purchasePrice: editData.purchasePrice?.toString() || '', currentPrice: editData.currentPrice?.toString() || '',
        insuranceNumber: editData.insuranceNumber || '',
        insuranceExpiry: editData.insuranceExpiry ? new Date(editData.insuranceExpiry).toISOString().split('T')[0] : '',
        inspectionDate: editData.inspectionDate ? new Date(editData.inspectionDate).toISOString().split('T')[0] : '',
        inspectionExpiry: editData.inspectionExpiry ? new Date(editData.inspectionExpiry).toISOString().split('T')[0] : '',
        status: editData.status || 'active', notes: editData.notes || '',
        ownerId: editData.ownerId || '', renterId: editData.renterId || '',
      })
    } else {
      setForm({ type: 'автомобиль', status: 'active' })
    }
    setStep(0)
  }, [editData, open, setStep])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const steps = [
    { title: 'Основные', icon: <Settings2 className="size-3.5" /> },
    { title: 'Регистрация', icon: <FileText className="size-3.5" /> },
    { title: 'Тех. характеристики', icon: <Gauge className="size-3.5" /> },
    { title: 'Финансы', icon: <DollarSign className="size-3.5" /> },
    { title: 'Назначение', icon: <Building2 className="size-3.5" /> },
  ]

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите наименование техники'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/equipment/${editData.id}` : '/api/equipment'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Техника обновлена' : 'Техника добавлена')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {editData ? 'Редактирование техники' : 'Добавление техники'}
          </DialogTitle>
          <DialogDescription>Шаг {step + 1} из {steps.length}: {steps[step].title}</DialogDescription>
        </DialogHeader>

        {/* Step indicator — compact */}
        <div className="flex items-center gap-0.5 px-4 sm:px-5 overflow-x-auto shrink-0">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {s.icon}<span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 py-2">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Наименование *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Грузовой автомобиль ГАЗель" autoFocus /></div>
              <div><Label className="text-xs">Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Марка</Label><Input value={f('brand')} onChange={e => setF('brand', e.target.value)} /></div>
              <div><Label className="text-xs">Модель</Label><Input value={f('model')} onChange={e => setF('model', e.target.value)} /></div>
              <div><Label className="text-xs">Год выпуска</Label><Input type="number" value={f('year')} onChange={e => setF('year', e.target.value)} /></div>
              <div><Label className="text-xs">Категория</Label><Input value={f('category')} onChange={e => setF('category', e.target.value)} placeholder="B, C, D..." /></div>
              <div><Label className="text-xs">Цвет</Label><Input value={f('color')} onChange={e => setF('color', e.target.value)} /></div>
              <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">VIN номер</Label><Input value={f('vin')} onChange={e => setF('vin', e.target.value)} placeholder="17 символов" /></div>
              <div><Label className="text-xs">Серийный номер</Label><Input value={f('serialNumber')} onChange={e => setF('serialNumber', e.target.value)} /></div>
              <div><Label className="text-xs">Гос. номер</Label><Input value={f('registrationNum')} onChange={e => setF('registrationNum', e.target.value)} placeholder="А000АА 00" /></div>
              <div><Label className="text-xs">Номер СТС</Label><Input value={f('stsNumber')} onChange={e => setF('stsNumber', e.target.value)} /></div>
              <div><Label className="text-xs">Номер ПТС</Label><Input value={f('ptsNumber')} onChange={e => setF('ptsNumber', e.target.value)} /></div>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Тип двигателя</Label><Input value={f('engineType')} onChange={e => setF('engineType', e.target.value)} placeholder="Бензин, Дизель..." /></div>
              <div><Label className="text-xs">Объём двигателя</Label><Input value={f('engineVolume')} onChange={e => setF('engineVolume', e.target.value)} placeholder="2.0 л" /></div>
              <div><Label className="text-xs">Мощность (л.с.)</Label><Input value={f('enginePower')} onChange={e => setF('enginePower', e.target.value)} /></div>
              <div><Label className="text-xs">Пробег (км)</Label><Input type="number" value={f('mileage')} onChange={e => setF('mileage', e.target.value)} /></div>
              <div><Label className="text-xs">Тип топлива</Label><Input value={f('fuelType')} onChange={e => setF('fuelType', e.target.value)} /></div>
              <div><Label className="text-xs">Грузоподъёмность</Label><Input value={f('loadCapacity')} onChange={e => setF('loadCapacity', e.target.value)} /></div>
              <div><Label className="text-xs">Пассажирских мест</Label><Input type="number" value={f('passengerSeats')} onChange={e => setF('passengerSeats', e.target.value)} /></div>
            </div>
          )}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата приобретения</Label><Input type="date" value={f('purchaseDate')} onChange={e => setF('purchaseDate', e.target.value)} /></div>
              <div><Label className="text-xs">Цена приобретения (₽)</Label><Input type="number" value={f('purchasePrice')} onChange={e => setF('purchasePrice', e.target.value)} /></div>
              <div><Label className="text-xs">Текущая стоимость (₽)</Label><Input type="number" value={f('currentPrice')} onChange={e => setF('currentPrice', e.target.value)} /></div>
              <div><Label className="text-xs">Номер полиса</Label><Input value={f('insuranceNumber')} onChange={e => setF('insuranceNumber', e.target.value)} /></div>
              <div><Label className="text-xs">Страховка до</Label><Input type="date" value={f('insuranceExpiry')} onChange={e => setF('insuranceExpiry', e.target.value)} /></div>
              <div><Label className="text-xs">Дата ТО</Label><Input type="date" value={f('inspectionDate')} onChange={e => setF('inspectionDate', e.target.value)} /></div>
              <div><Label className="text-xs">ТО до</Label><Input type="date" value={f('inspectionExpiry')} onChange={e => setF('inspectionExpiry', e.target.value)} /></div>
            </div>
          )}
          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Компания-владелец</Label><Select value={f('ownerId') || '_none'} onValueChange={v => setF('ownerId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не указан" /></SelectTrigger><SelectContent><SelectItem value="_none">Не указан</SelectItem>{companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Компания-арендатор</Label><Select value={f('renterId') || '_none'} onValueChange={v => setF('renterId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не указан" /></SelectTrigger><SelectContent><SelectItem value="_none">Не указан</SelectItem>{companies.filter(c => c.type === 'renter' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={3} /></div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="size-3.5" />Назад</Button>
          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>Далее<ChevronRight className="size-3.5" /></Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// REPAIRS TAB
// ═══════════════════════════════════════════════════════════════

function RepairsTab({ repairs, equipment, onOpenDetail, onAdd, onDelete }: {
  repairs: Repair[]; equipment: Equipment[];
  onOpenDetail: (r: Repair) => void; onAdd: (eqId?: string) => void;
  onDelete: (r: Repair) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => repairs.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (eqFilter !== 'all' && r.equipmentId !== eqFilter) return false
    if (debouncedSearch && !r.description.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(r.equipment?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()))) return false
    return true
  }), [repairs, statusFilter, eqFilter, debouncedSearch])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по описанию..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Добавить</Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {filtered.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Wrench className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Ремонты не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(r => (
            <Card key={r.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-3 ${r.status === 'in_progress' ? 'border-l-amber-500' : r.status === 'completed' ? 'border-l-emerald-500' : 'border-l-red-500'}`} onClick={() => onOpenDetail(r)}>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0"><Wrench className="size-3.5 text-amber-600 dark:text-amber-400" /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{r.description}</CardTitle>
                      <p className="text-[11px] text-muted-foreground truncate">{r.equipment?.name}</p>
                    </div>
                  </div>
                  {statusBadge(r.status, REPAIR_STATUS_MAP)}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <div><span className="text-muted-foreground">Начало:</span> <span className="font-medium">{formatDate(r.startDate)}</span></div>
                  <div><span className="text-muted-foreground">Стоимость:</span> <span className="font-medium">{formatPrice(r.cost)}</span></div>
                  <div><span className="text-muted-foreground">Подрядчик:</span> <span className="font-medium truncate">{r.contractor || '—'}</span></div>
                  <div><span className="text-muted-foreground">Причина:</span> <span className="font-medium truncate">{r.reason || '—'}</span></div>
                </div>
                {r.stages && r.stages.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Этапы: {r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                      <span>{getStageProgress(r.stages)}%</span>
                    </div>
                    <Progress value={getStageProgress(r.stages)} className="h-1" />
                  </div>
                )}
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(r)}><Trash2 className="size-3" />Удалить</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// REPAIR DETAIL DIALOG — С ПРОКРУТКОЙ!
// ═══════════════════════════════════════════════════════════════

function RepairDetailDialog({ open, onOpenChange, repair, loading, fullPhoto, setFullPhoto, onEdit, onDelete, onComplete, onAddStage, onEditStage, onDeleteStage, onUploadPhoto, onRefresh }: {
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
}) {
  if (!repair) return null
  const r = repair
  const stagesCost = r.stages?.reduce((sum, s) => sum + (s.cost || 0), 0) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wrench className="size-4" />{r.description}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {r.equipment?.name}
            <span className="ml-1">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Progress bar */}
              {r.stages && r.stages.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Прогресс ремонта</span>
                    <span className="font-medium">{getStageProgress(r.stages)}%</span>
                  </div>
                  <Progress value={getStageProgress(r.stages)} className="h-2" />
                </div>
              )}

              <DetailSection title="Информация о ремонте" icon={<ClipboardList className="size-3.5" />}>
                <DetailRow label="Описание" value={r.description} />
                <DetailRow label="Причина" value={r.reason} />
                <DetailRow label="Дата начала" value={formatDate(r.startDate)} />
                <DetailRow label="Дата окончания" value={formatDate(r.endDate)} />
                <DetailRow label="Стоимость" value={formatPrice(r.cost)} />
                <DetailRow label="Подрядчик" value={r.contractor} />
                <DetailRow label="Телефон" value={r.contractorPhone} />
                <DetailRow label="Выполненные работы" value={r.workPerformed} />
                <DetailRow label="Запчасти" value={r.spareParts} />
                <DetailRow label="Следующий ТО" value={formatDate(r.nextInspection)} />
                <DetailRow label="Заметки" value={r.notes} />
              </DetailSection>

              {/* Stages */}
              <DetailSection title="Этапы ремонта" icon={<Settings2 className="size-3.5" />}>
                <div className="col-span-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] mb-2" onClick={() => onAddStage(r.id)}><Plus className="size-3" />Добавить этап</Button>
                  {r.stages && r.stages.length > 0 ? (
                    <div className="space-y-1.5">
                      {r.stages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                          {/* Quick status toggle */}
                          <button
                            className="shrink-0"
                            onClick={() => {
                              const nextStatus = stage.status === 'pending' ? 'in_progress' : stage.status === 'in_progress' ? 'completed' : 'pending'
                              fetch(`/api/repairs/${r.id}/stages`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ stageId: stage.id, status: nextStatus })
                              }).then(res => { if (res.ok) { toast.success('Статус обновлён'); onRefresh() } else toast.error('Ошибка') }).catch(() => toast.error('Ошибка'))
                            }}
                            aria-label="Переключить статус"
                          >
                            {stage.status === 'completed' ? <CheckCircle2 className="size-4 text-emerald-500" /> : stage.status === 'in_progress' ? <Clock className="size-4 text-amber-500" /> : <XCircle className="size-4 text-gray-400" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium">{stage.name}</p>
                              {statusBadge(stage.status, STAGE_STATUS_MAP)}
                            </div>
                            {stage.description && <p className="text-[10px] text-muted-foreground">{stage.description}</p>}
                            <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                              {stage.performer && <span>Исполнитель: {stage.performer}</span>}
                              {stage.cost != null && <span>Стоимость: {formatPrice(stage.cost)}</span>}
                            </div>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onEditStage(stage, r.id)} aria-label="Редактировать этап"><Edit className="size-3" /></Button>
                            <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDeleteStage(stage.id, r.id)} aria-label="Удалить этап"><Trash2 className="size-3" /></Button>
                          </div>
                        </div>
                      ))}
                      {stagesCost > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1 border-t">
                          Итого по этапам: {formatPrice(stagesCost)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Этапы не добавлены</p>
                  )}
                </div>
              </DetailSection>

              {/* Photos */}
              <DetailSection title="Фотографии" icon={<Camera className="size-3.5" />}>
                <div className="col-span-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] mb-2" onClick={() => onUploadPhoto(r.id)}><Upload className="size-3" />Загрузить фото</Button>
                  {r.photos && r.photos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {r.photos.map(p => (
                        <div key={p.id} className="relative group rounded-md overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => setFullPhoto(p.url)}>
                          <img src={p.url} alt={p.description || ''} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Eye className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Нет фотографий</p>
                  )}
                </div>
              </DetailSection>
            </div>
          )}
        </div>

        <DialogFooter className="gap-1.5 sm:gap-0 flex-wrap">
          {r.status === 'in_progress' && (
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onComplete(r)}><CheckCircle2 className="size-3.5" />Завершить</Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(r)}><Edit className="size-3.5" />Редактировать</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><Activity className="size-3.5" />Обновить</Button>
          <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDelete(r)}><Trash2 className="size-3.5" />Удалить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// REPAIR FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function RepairFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Repair | null; equipmentId: string; equipmentList: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [stages, setStages] = useState<{ name: string; description: string }[]>([])

  useEffect(() => {
    if (editData) {
      setForm({
        equipmentId: editData.equipmentId, description: editData.description || '', reason: editData.reason || '',
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
        status: editData.status || 'in_progress', cost: editData.cost?.toString() || '',
        contractor: editData.contractor || '', contractorPhone: editData.contractorPhone || '',
        workPerformed: editData.workPerformed || '', spareParts: editData.spareParts || '',
        nextInspection: editData.nextInspection ? new Date(editData.nextInspection).toISOString().split('T')[0] : '',
        notes: editData.notes || '',
      })
      setStages([])
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: new Date().toISOString().split('T')[0], status: 'in_progress' })
      setStages([])
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('description').trim()) { toast.error('Укажите описание ремонта'); return }
    setSaving(true)
    try {
      const body = { ...form, stages: editData ? undefined : stages.filter(s => s.name.trim()) }
      const url = editData ? `/api/repairs/${editData.id}` : '/api/repairs'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Ремонт обновлён' : 'Ремонт добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование ремонта' : 'Новый ремонт'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Описание *</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} autoFocus /></div>
            <div><Label className="text-xs">Причина</Label><Input value={f('reason')} onChange={e => setF('reason', e.target.value)} /></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
            <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
            <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
            <div><Label className="text-xs">Подрядчик</Label><Input value={f('contractor')} onChange={e => setF('contractor', e.target.value)} /></div>
            <div><Label className="text-xs">Телефон подрядчика</Label><Input value={f('contractorPhone')} onChange={e => setF('contractorPhone', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Выполненные работы</Label><Textarea value={f('workPerformed')} onChange={e => setF('workPerformed', e.target.value)} rows={2} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Запчасти</Label><Textarea value={f('spareParts')} onChange={e => setF('spareParts', e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">Дата следующего ТО</Label><Input type="date" value={f('nextInspection')} onChange={e => setF('nextInspection', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>
          {!editData && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Начальные этапы</Label>
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={() => setStages([...stages, { name: '', description: '' }])}><Plus className="size-3" />Добавить</Button>
              </div>
              {stages.map((s, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <Input placeholder="Название" value={s.name} onChange={e => { const n = [...stages]; n[i] = { ...n[i], name: e.target.value }; setStages(n) }} className="flex-1 h-8 text-sm" />
                  <Input placeholder="Описание" value={s.description} onChange={e => { const n = [...stages]; n[i] = { ...n[i], description: e.target.value }; setStages(n) }} className="flex-1 h-8 text-sm" />
                  <Button size="sm" variant="ghost" className="size-8 p-0 text-destructive shrink-0" onClick={() => setStages(stages.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPANIES TAB
// ═══════════════════════════════════════════════════════════════

function CompaniesTab({ companies, onAdd, onEdit, onDelete }: {
  companies: Company[];
  onAdd: () => void; onEdit: (c: Company) => void; onDelete: (c: Company) => void;
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => companies.filter(c => {
    if (debouncedSearch && !c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(c.inn || '').includes(debouncedSearch)) return false
    return true
  }), [companies, debouncedSearch])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию или ИНН..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Добавить компанию</Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {filtered.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0"><Building2 className="size-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Компании не найдены</p></CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
            {filtered.map(c => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0"><Building2 className="size-3.5 text-muted-foreground" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.inn || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{COMPANY_TYPES[c.type] || c.type}</span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-muted-foreground">Тел.:</span> <span className="font-medium">{c.phone || '—'}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium truncate">{c.email || '—'}</span></div>
                    <div><span className="text-muted-foreground">Владеет:</span> <span className="font-medium">{c._count?.ownedEquipment || 0}</span></div>
                    <div><span className="text-muted-foreground">Арендует:</span> <span className="font-medium">{c._count?.rentedEquipment || 0}</span></div>
                  </div>
                  <div className="flex gap-1 pt-0.5">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEdit(c)}><Edit className="size-3" />Изменить</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDelete(c)}><Trash2 className="size-3" />Удалить</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Desktop table layout */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Название</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">ИНН</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Тип</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Телефон</TableHead>
                  <TableHead className="text-xs text-center">Вл.</TableHead>
                  <TableHead className="text-xs text-center">Ар.</TableHead>
                  <TableHead className="text-xs text-right w-20">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium py-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0"><Building2 className="size-3.5 text-muted-foreground" /></div>
                        <div><p className="text-xs font-medium">{c.name}</p><p className="text-[10px] text-muted-foreground sm:hidden">{c.inn || '—'}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs py-2">{c.inn || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{COMPANY_TYPES[c.type] || c.type}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs py-2">{c.phone || '—'}</TableCell>
                    <TableCell className="text-center text-xs py-2">{c._count?.ownedEquipment || 0}</TableCell>
                    <TableCell className="text-center text-xs py-2">{c._count?.rentedEquipment || 0}</TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex justify-end gap-0.5">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(c)} aria-label="Редактировать"><Edit className="size-3" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(c)} aria-label="Удалить"><Trash2 className="size-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPANY FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function CompanyFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved }: {
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

// ═══════════════════════════════════════════════════════════════
// STAGE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function StageFormDialog({ open, onOpenChange, repairId, editData, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  repairId: string; editData: RepairStage | null;
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name || '', description: editData.description || '', status: editData.status || 'pending', startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : '', endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '', performer: editData.performer || '', cost: editData.cost?.toString() || '', sortOrder: editData.sortOrder?.toString() || '0' })
    } else { setForm({ status: 'pending', sortOrder: '0' }) }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название этапа'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: f('name'), description: f('description') || null, status: f('status'), startDate: f('startDate') || null, endDate: f('endDate') || null, performer: f('performer') || null, cost: f('cost') ? parseFloat(f('cost')) : null, sortOrder: parseInt(f('sortOrder') || '0') }
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
          <div className="sm:col-span-2"><Label className="text-xs">Название *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} autoFocus /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Описание</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} /></div>
          <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Исполнитель</Label><Input value={f('performer')} onChange={e => setF('performer', e.target.value)} /></div>
          <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
          <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
          <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// PHOTO UPLOAD DIALOG (Equipment)
// ═══════════════════════════════════════════════════════════════

function PhotoUploadDialog({ open, onOpenChange, targetId, targetType, onUploaded }: {
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

function RepairPhotoUploadDialog({ open, onOpenChange, targetId, stages, onUploaded }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  targetId: string; stages: RepairStage[];
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [stageId, setStageId] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!open) { setFile(null); setDescription(''); setStageId('') } }, [open])

  const handleUpload = async () => {
    if (!file) { toast.error('Выберите файл'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file); formData.append('description', description)
      if (stageId) formData.append('stageId', stageId)
      const res = await fetch(`/api/repairs/${targetId}/photos`, { method: 'POST', body: formData })
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
          <DialogTitle className="flex items-center gap-2"><Upload className="size-4" />Загрузка фото ремонта</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5">
          <div>
            <Label className="text-xs">Файл *</Label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <Button variant="outline" className="w-full gap-2 h-9 text-sm mt-1" onClick={() => fileInputRef.current?.click()}><ImagePlus className="size-3.5" />{file ? file.name : 'Выбрать файл'}</Button>
          </div>
          <div><Label className="text-xs">Описание</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          {stages.length > 0 && (
            <div><Label className="text-xs">Привязка к этапу</Label><Select value={stageId || '_none'} onValueChange={v => setStageId(v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без привязки" /></SelectTrigger><SelectContent><SelectItem value="_none">Без привязки</SelectItem>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          )}
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
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════

function TripsTab({ trips, equipment, crews, onOpenDetail, onAdd, onDelete, onAddCrew, onEditCrew, onDeleteCrew }: {
  trips: Trip[]; equipment: Equipment[]; crews: Crew[];
  onOpenDetail: (t: Trip) => void; onAdd: (eqId?: string) => void;
  onDelete: (t: Trip) => void;
  onAddCrew: () => void; onEditCrew: (c: Crew) => void; onDeleteCrew: (c: Crew) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showCrews, setShowCrews] = useState(false)

  const filtered = useMemo(() => trips.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (eqFilter !== 'all' && t.equipmentId !== eqFilter) return false
    if (debouncedSearch && !t.route.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(t.cargo || '').toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    return true
  }), [trips, statusFilter, eqFilter, debouncedSearch])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по маршруту, грузу..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(TRIP_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Рейс</Button>
        <Button onClick={onAddCrew} variant="outline" size="sm" className="h-9 gap-1.5"><Users className="size-3.5" />Экипаж</Button>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">Рейсов: {filtered.length}</p>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowCrews(!showCrews)}>
          <Users className="size-3" />{showCrews ? 'Скрыть экипажи' : 'Показать экипажи'}
          {showCrews ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>

      {/* Crews section (toggleable) */}
      {showCrews && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5"><Users className="size-3.5" />Экипажи ({crews.length})</h3>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onAddCrew}><Plus className="size-3" />Добавить</Button>
          </div>
          {crews.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Экипажи не созданы</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {crews.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0"><Users className="size-3.5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{CREW_TYPE_MAP[c.type] || c.type} • {c.members?.length || 0} чел.</p>
                      </div>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>{c.status === 'active' ? 'Активен' : 'Неактивен'}</span>
                    </div>
                    {c.members && c.members.length > 0 && (
                      <div className="space-y-0.5 pl-2">
                        {c.members.map(m => (
                          <div key={m.id} className="flex items-center gap-1 text-[10px]">
                            <UserCircle className="size-3 text-muted-foreground" />
                            <span>{m.fullName}</span>
                            <span className="text-muted-foreground">({MEMBER_ROLE_MAP[m.role] || m.role})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEditCrew(c)}><Edit className="size-3" />Изменить</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDeleteCrew(c)}><Trash2 className="size-3" />Удалить</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Separator />
        </div>
      )}

      {/* Trips list */}
      {filtered.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Route className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Рейсы не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(t => (
            <Card key={t.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-3 ${TRIP_STATUS_MAP[t.status]?.border || ''}`} onClick={() => onOpenDetail(t)}>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 shrink-0"><Route className="size-3.5 text-sky-600 dark:text-sky-400" /></div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{t.route}</CardTitle>
                      <p className="text-[11px] text-muted-foreground truncate">{t.equipment?.name} {t.equipment?.registrationNum ? `• ${t.equipment.registrationNum}` : ''}</p>
                    </div>
                  </div>
                  {statusBadge(t.status, TRIP_STATUS_MAP)}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <div><span className="text-muted-foreground">Начало:</span> <span className="font-medium">{formatDate(t.startDate)}</span></div>
                  <div><span className="text-muted-foreground">Груз:</span> <span className="font-medium truncate">{t.cargo || '—'}</span></div>
                  <div><span className="text-muted-foreground">Расстояние:</span> <span className="font-medium">{t.distance != null ? `${t.distance} км` : '—'}</span></div>
                  <div><span className="text-muted-foreground">Экипаж:</span> <span className="font-medium truncate">{t.crew?.name || '—'}</span></div>
                </div>
                {t.cost != null && <p className="text-[10px] text-muted-foreground">Стоимость: {formatPrice(t.cost)} {t.revenue != null ? `• Доход: ${formatPrice(t.revenue)}` : ''}</p>}
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(t)}><Trash2 className="size-3" />Удалить</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRIP DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════

function TripDetailDialog({ open, onOpenChange, trip, loading, crews, onEdit, onDelete, onStart, onComplete, onRefresh }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  trip: Trip | null; loading: boolean; crews: Crew[];
  onEdit: (t: Trip) => void; onDelete: (t: Trip) => void;
  onStart: (t: Trip) => void; onComplete: (t: Trip) => void;
  onRefresh: () => void;
}) {
  if (!trip) return null
  const t = trip
  const crew = crews.find(c => c.id === t.crewId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route className="size-4" />{t.route}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {t.equipment?.name} {t.equipment?.registrationNum ? `• ${t.equipment.registrationNum}` : ''}
            <span className="ml-1">{statusBadge(t.status, TRIP_STATUS_MAP)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 px-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4 py-2">
              <DetailSection title="Маршрут" icon={<Route className="size-3.5" />}>
                <DetailRow label="Маршрут" value={t.route} />
                <DetailRow label="Пункт отправления" value={t.startPoint} />
                <DetailRow label="Пункт назначения" value={t.endPoint} />
                <DetailRow label="Расстояние" value={t.distance != null ? `${t.distance} км` : undefined} />
              </DetailSection>
              <DetailSection title="Груз" icon={<Package className="size-3.5" />}>
                <DetailRow label="Груз" value={t.cargo} />
                <DetailRow label="Вес (т)" value={t.cargoWeight?.toString()} />
              </DetailSection>
              <DetailSection title="Время" icon={<Calendar className="size-3.5" />}>
                <DetailRow label="Дата начала" value={formatDate(t.startDate)} />
                <DetailRow label="Планируемое окончание" value={formatDate(t.plannedEndDate)} />
                <DetailRow label="Дата окончания" value={formatDate(t.endDate)} />
              </DetailSection>
              <DetailSection title="Экипаж" icon={<Users className="size-3.5" />}>
                <DetailRow label="Экипаж" value={crew?.name || t.crew?.name} />
                {crew?.members && crew.members.length > 0 && (
                  <div className="col-span-2 space-y-0.5 pl-2">
                    {crew.members.map(m => (
                      <div key={m.id} className="flex items-center gap-1 text-[10px]">
                        <UserCircle className="size-3 text-muted-foreground" />
                        <span>{m.fullName}</span>
                        <span className="text-muted-foreground">({MEMBER_ROLE_MAP[m.role] || m.role})</span>
                        {m.phone && <span className="text-muted-foreground">• {m.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>
              <DetailSection title="Топливо и пробег" icon={<Fuel className="size-3.5" />}>
                <DetailRow label="Топливо на старте (л)" value={t.fuelStart?.toString()} />
                <DetailRow label="Топливо на финише (л)" value={t.fuelEnd?.toString()} />
                <DetailRow label="Пробег на старте" value={t.mileageStart?.toLocaleString('ru-RU')} />
                <DetailRow label="Пробег на финише" value={t.mileageEnd?.toLocaleString('ru-RU')} />
              </DetailSection>
              <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                <DetailRow label="Стоимость" value={formatPrice(t.cost)} />
                <DetailRow label="Доход" value={formatPrice(t.revenue)} />
              </DetailSection>
              {t.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{t.notes}</p></DetailSection>}
            </div>
          )}
        </div>
        <DialogFooter className="gap-1.5 sm:gap-0 flex-wrap">
          {t.status === 'planned' && (
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onStart(t)}><Navigation className="size-3.5" />Начать</Button>
          )}
          {t.status === 'in_progress' && (
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onComplete(t)}><CheckCircle2 className="size-3.5" />Завершить</Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(t)}><Edit className="size-3.5" />Редактировать</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><Activity className="size-3.5" />Обновить</Button>
          <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDelete(t)}><Trash2 className="size-3.5" />Удалить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRIP FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function TripFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, crews, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Trip | null; equipmentId: string; equipmentList: Equipment[];
  crews: Crew[]; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({
        equipmentId: editData.equipmentId, route: editData.route || '', startPoint: editData.startPoint || '', endPoint: editData.endPoint || '',
        cargo: editData.cargo || '', cargoWeight: editData.cargoWeight?.toString() || '', distance: editData.distance?.toString() || '',
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
        plannedEndDate: editData.plannedEndDate ? new Date(editData.plannedEndDate).toISOString().split('T')[0] : '',
        status: editData.status || 'planned', crewId: editData.crewId || '',
        fuelStart: editData.fuelStart?.toString() || '', fuelEnd: editData.fuelEnd?.toString() || '',
        mileageStart: editData.mileageStart?.toString() || '', mileageEnd: editData.mileageEnd?.toString() || '',
        cost: editData.cost?.toString() || '', revenue: editData.revenue?.toString() || '', notes: editData.notes || '',
      })
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: new Date().toISOString().split('T')[0], status: 'planned' })
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('route').trim()) { toast.error('Укажите маршрут'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/trips/${editData.id}` : '/api/trips'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Рейс обновлён' : 'Рейс добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование рейса' : 'Новый рейс'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name} {e.registrationNum ? `(${e.registrationNum})` : ''}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Маршрут *</Label><Input value={f('route')} onChange={e => setF('route', e.target.value)} placeholder="Москва — Санкт-Петербург" autoFocus /></div>
            <div><Label className="text-xs">Пункт отправления</Label><Input value={f('startPoint')} onChange={e => setF('startPoint', e.target.value)} /></div>
            <div><Label className="text-xs">Пункт назначения</Label><Input value={f('endPoint')} onChange={e => setF('endPoint', e.target.value)} /></div>
            <div><Label className="text-xs">Экипаж</Label><Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger><SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TRIP_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Груз</Label><Input value={f('cargo')} onChange={e => setF('cargo', e.target.value)} /></div>
            <div><Label className="text-xs">Вес груза (т)</Label><Input type="number" value={f('cargoWeight')} onChange={e => setF('cargoWeight', e.target.value)} /></div>
            <div><Label className="text-xs">Расстояние (км)</Label><Input type="number" value={f('distance')} onChange={e => setF('distance', e.target.value)} /></div>
            <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
            <div><Label className="text-xs">Планируемое окончание</Label><Input type="date" value={f('plannedEndDate')} onChange={e => setF('plannedEndDate', e.target.value)} /></div>
            <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
            <div><Label className="text-xs">Топливо на старте (л)</Label><Input type="number" value={f('fuelStart')} onChange={e => setF('fuelStart', e.target.value)} /></div>
            <div><Label className="text-xs">Топливо на финише (л)</Label><Input type="number" value={f('fuelEnd')} onChange={e => setF('fuelEnd', e.target.value)} /></div>
            <div><Label className="text-xs">Пробег на старте</Label><Input type="number" value={f('mileageStart')} onChange={e => setF('mileageStart', e.target.value)} /></div>
            <div><Label className="text-xs">Пробег на финише</Label><Input type="number" value={f('mileageEnd')} onChange={e => setF('mileageEnd', e.target.value)} /></div>
            <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
            <div><Label className="text-xs">Доход (₽)</Label><Input type="number" value={f('revenue')} onChange={e => setF('revenue', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// CREW FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function CrewFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Crew | null; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<{ fullName: string; role: string; phone: string; licenseNum: string; licenseCat: string }[]>([])

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name || '', description: editData.description || '', type: editData.type || 'driver', status: editData.status || 'active', notes: editData.notes || '' })
      setMembers(editData.members?.map(m => ({ fullName: m.fullName, role: m.role, phone: m.phone || '', licenseNum: m.licenseNum || '', licenseCat: m.licenseCat || '' })) || [])
    } else {
      setForm({ type: 'driver', status: 'active' })
      setMembers([])
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

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
              <Label className="text-xs flex items-center gap-1"><Users className="size-3" />Члены экипажа ({members.length})</Label>
              <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={() => setMembers([...members, { fullName: '', role: 'driver', phone: '', licenseNum: '', licenseCat: '' }])}><Plus className="size-3" />Добавить</Button>
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 mb-1.5">
                <Input placeholder="ФИО *" value={m.fullName} onChange={e => { const n = [...members]; n[i] = { ...n[i], fullName: e.target.value }; setMembers(n) }} className="sm:col-span-2 h-8 text-sm" />
                <Select value={m.role} onValueChange={v => { const n = [...members]; n[i] = { ...n[i], role: v }; setMembers(n) }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(MEMBER_ROLE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Телефон" value={m.phone} onChange={e => { const n = [...members]; n[i] = { ...n[i], phone: e.target.value }; setMembers(n) }} className="h-8 text-sm" />
                <div className="flex gap-1">
                  <Input placeholder="ВУ" value={m.licenseNum} onChange={e => { const n = [...members]; n[i] = { ...n[i], licenseNum: e.target.value }; setMembers(n) }} className="h-8 text-sm flex-1" />
                  <Button size="sm" variant="ghost" className="size-8 p-0 text-destructive shrink-0" onClick={() => setMembers(members.filter((_, j) => j !== i))}><X className="size-3.5" /></Button>
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
