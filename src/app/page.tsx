'use client'

/* ═══════════════════════════════════════════════════════════════
   УЧЁТ ТЕХНИКИ — Комплексная система учёта оборудования
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

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
  Satellite
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
  lastSeenAt?: string | null; lastPositionAt?: string | null;
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

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'В эксплуатации', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  repair: { label: 'На ремонте', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  decommissioned: { label: 'Списана', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  rented: { label: 'В аренде', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
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
  if (!s) return <Badge variant="outline">{status}</Badge>
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
}

function getEventIcon(event: string) {
  switch (event) {
    case 'registration': return <CheckCircle2 className="size-4 text-emerald-500" />
    case 'status_change': return <Activity className="size-4 text-amber-500" />
    case 'transfer': return <ArrowRight className="size-4 text-sky-500" />
    case 'rental': return <Users className="size-4 text-violet-500" />
    case 'repair': return <Wrench className="size-4 text-orange-500" />
    case 'photo_added': return <Camera className="size-4 text-pink-500" />
    case 'inspection': return <Shield className="size-4 text-teal-500" />
    default: return <Info className="size-4 text-gray-500" />
  }
}

function getStageProgress(stages: RepairStage[]): number {
  if (!stages || stages.length === 0) return 0
  const completed = stages.filter(s => s.status === 'completed').length
  return Math.round((completed / stages.length) * 100)
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  // ─── Theme ───────────────────────────────────────────────────
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ─── Main Tab ────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState('equipment')

  // ─── Data ────────────────────────────────────────────────────
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Equipment filters ──────────────────────────────────────
  const [eqSearch, setEqSearch] = useState('')
  const [eqStatusFilter, setEqStatusFilter] = useState('all')
  const [eqTypeFilter, setEqTypeFilter] = useState('all')

  // ─── Equipment detail ───────────────────────────────────────
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null)
  const [eqDetailOpen, setEqDetailOpen] = useState(false)
  const [eqDetailTab, setEqDetailTab] = useState('info')
  const [eqDetailLoading, setEqDetailLoading] = useState(false)

  // ─── Equipment add/edit ─────────────────────────────────────
  const [eqFormOpen, setEqFormOpen] = useState(false)
  const [eqFormEdit, setEqFormEdit] = useState<Equipment | null>(null)
  const [eqFormStep, setEqFormStep] = useState(0)
  const [eqFormSaving, setEqFormSaving] = useState(false)

  // ─── Repair detail ──────────────────────────────────────────
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [repairDetailOpen, setRepairDetailOpen] = useState(false)
  const [repairDetailLoading, setRepairDetailLoading] = useState(false)

  // ─── Repair add/edit ────────────────────────────────────────
  const [repairFormOpen, setRepairFormOpen] = useState(false)
  const [repairFormEdit, setRepairFormEdit] = useState<Repair | null>(null)
  const [repairFormSaving, setRepairFormSaving] = useState(false)
  const [repairFormEquipmentId, setRepairFormEquipmentId] = useState('')

  // ─── Company add/edit ───────────────────────────────────────
  const [companyFormOpen, setCompanyFormOpen] = useState(false)
  const [companyFormEdit, setCompanyFormEdit] = useState<Company | null>(null)
  const [companyFormSaving, setCompanyFormSaving] = useState(false)

  // ─── Delete confirm ─────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'equipment' | 'repair' | 'company'; id: string; name: string }>({
    open: false, type: 'equipment', id: '', name: ''
  })

  // ─── Photo upload ───────────────────────────────────────────
  const [photoUploadEq, setPhotoUploadEq] = useState<string | null>(null)
  const [photoUploadRepair, setPhotoUploadRepair] = useState<string | null>(null)

  // ─── Stage management ───────────────────────────────────────
  const [stageFormOpen, setStageFormOpen] = useState(false)
  const [stageFormRepairId, setStageFormRepairId] = useState('')
  const [stageFormEdit, setStageFormEdit] = useState<RepairStage | null>(null)
  const [stageFormSaving, setStageFormSaving] = useState(false)

  // ─── Full-screen photo view ─────────────────────────────────
  const [fullPhoto, setFullPhoto] = useState<string | null>(null)

  // ─── Photo category filter ──────────────────────────────────
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('all')

  // ─── Axenta settings dialog ────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [axentaSettings, setAxentaSettings] = useState<AxentaSettings>({ apiUrl: '', apiKey: '', username: '', password: '', syncInterval: 300, isActive: false })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // ═════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═════════════════════════════════════════════════════════════

  const fetchEquipment = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (eqSearch) params.set('search', eqSearch)
      if (eqStatusFilter && eqStatusFilter !== 'all') params.set('status', eqStatusFilter)
      if (eqTypeFilter && eqTypeFilter !== 'all') params.set('type', eqTypeFilter)
      const res = await fetch(`/api/equipment?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEquipment(data)
    } catch { toast.error('Ошибка загрузки техники') }
  }, [eqSearch, eqStatusFilter, eqTypeFilter])

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

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchEquipment(), fetchCompanies(), fetchRepairs()])
    setLoading(false)
  }, [fetchEquipment, fetchCompanies, fetchRepairs])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Load Axenta settings ──────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/glonass/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.apiUrl) setAxentaSettings(data)
        }
      } catch { /* ignore */ }
    }
    loadSettings()
  }, [])

  // ─── Fetch single equipment detail ──────────────────────────
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

  // ─── Fetch single repair detail ─────────────────────────────
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

  // ═════════════════════════════════════════════════════════════
  // STATS
  // ═════════════════════════════════════════════════════════════

  const stats = {
    total: equipment.length,
    active: equipment.filter(e => e.status === 'active').length,
    repair: equipment.filter(e => e.status === 'repair').length,
    rented: equipment.filter(e => e.status === 'rented').length,
  }

  // ═════════════════════════════════════════════════════════════
  // DELETE HANDLER
  // ═════════════════════════════════════════════════════════════

  const handleDelete = async () => {
    const { type, id } = deleteDialog
    try {
      const res = await fetch(`/api/${type}s/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Удалено успешно')
      if (type === 'equipment') { setEqDetailOpen(false); setSelectedEq(null) }
      if (type === 'repair') { setRepairDetailOpen(false); setSelectedRepair(null) }
      fetchAll()
    } catch { toast.error('Ошибка удаления') }
    setDeleteDialog({ open: false, type: 'equipment', id: '', name: '' })
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — LOADING
  // ═════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER — MAIN
  // ═════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── HEADER ──────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-primary-foreground">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Учёт техники</h1>
                <p className="text-xs text-muted-foreground">Система управления оборудованием предприятия</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Настройки Axenta.cloud">
                <Cog className="size-4" />
              </Button>
              {mounted && (
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              )}
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Truck className="size-4" />} label="Всего техники" value={stats.total} color="text-primary" />
            <StatCard icon={<CheckCircle2 className="size-4" />} label="В эксплуатации" value={stats.active} color="text-emerald-600" />
            <StatCard icon={<Wrench className="size-4" />} label="На ремонте" value={stats.repair} color="text-amber-600" />
            <StatCard icon={<Users className="size-4" />} label="В аренде" value={stats.rented} color="text-sky-600" />
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto">
            <TabsTrigger value="equipment" className="gap-1"><Truck className="size-4" /><span className="hidden sm:inline">Техника</span></TabsTrigger>
            <TabsTrigger value="repairs" className="gap-1"><Wrench className="size-4" /><span className="hidden sm:inline">Ремонты</span></TabsTrigger>
            <TabsTrigger value="companies" className="gap-1"><Building2 className="size-4" /><span className="hidden sm:inline">Компании</span></TabsTrigger>
          </TabsList>

          <TabsContent value="equipment">
            <EquipmentTab
              equipment={equipment}
              companies={companies}
              eqSearch={eqSearch} setEqSearch={setEqSearch}
              eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter}
              eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter}
              onOpenDetail={openEquipmentDetail}
              onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }}
              onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }}
              onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })}
            />
          </TabsContent>

          <TabsContent value="repairs">
            <RepairsTab
              repairs={repairs}
              equipment={equipment}
              onOpenDetail={openRepairDetail}
              onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }}
              onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })}
            />
          </TabsContent>

          <TabsContent value="companies">
            <CompaniesTab
              companies={companies}
              onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }}
              onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }}
              onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── EQUIPMENT DETAIL SHEET ──────────────────────────── */}
      <EquipmentDetailSheet
        open={eqDetailOpen}
        onOpenChange={setEqDetailOpen}
        equipment={selectedEq}
        loading={eqDetailLoading}
        detailTab={eqDetailTab}
        setDetailTab={setEqDetailTab}
        companies={companies}
        photoCategoryFilter={photoCategoryFilter}
        setPhotoCategoryFilter={setPhotoCategoryFilter}
        fullPhoto={fullPhoto}
        setFullPhoto={setFullPhoto}
        onEdit={(eq) => { setEqDetailOpen(false); setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }}
        onDelete={(eq) => { setEqDetailOpen(false); setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name }) }}
        onAddRepair={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId); setRepairFormOpen(true) }}
        onUploadPhoto={(eqId) => setPhotoUploadEq(eqId)}
        onRefresh={() => selectedEq && fetchEquipmentDetail(selectedEq.id)}
        onOpenRepairDetail={(r) => openRepairDetail(r)}
      />

      {/* ─── EQUIPMENT ADD/EDIT DIALOG ───────────────────────── */}
      <EquipmentFormDialog
        open={eqFormOpen}
        onOpenChange={setEqFormOpen}
        editData={eqFormEdit}
        companies={companies}
        step={eqFormStep}
        setStep={setEqFormStep}
        saving={eqFormSaving}
        setSaving={setEqFormSaving}
        onSaved={() => { setEqFormOpen(false); fetchAll() }}
      />

      {/* ─── REPAIR DETAIL DIALOG ────────────────────────────── */}
      <RepairDetailDialog
        open={repairDetailOpen}
        onOpenChange={setRepairDetailOpen}
        repair={selectedRepair}
        loading={repairDetailLoading}
        fullPhoto={fullPhoto}
        setFullPhoto={setFullPhoto}
        onEdit={(r) => { setRepairDetailOpen(false); setRepairFormEdit(r); setRepairFormEquipmentId(r.equipmentId); setRepairFormOpen(true) }}
        onDelete={(r) => { setRepairDetailOpen(false); setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description }) }}
        onComplete={async (r) => {
          try {
            const res = await fetch(`/api/repairs/${r.id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...r, status: 'completed', endDate: new Date().toISOString() })
            })
            if (!res.ok) throw new Error()
            toast.success('Ремонт завершён')
            fetchRepairDetail(r.id)
            fetchAll()
          } catch { toast.error('Ошибка завершения ремонта') }
        }}
        onAddStage={(repairId) => { setStageFormRepairId(repairId); setStageFormEdit(null); setStageFormOpen(true) }}
        onEditStage={(stage, repairId) => { setStageFormRepairId(repairId); setStageFormEdit(stage); setStageFormOpen(true) }}
        onDeleteStage={async (stageId, repairId) => {
          try {
            const res = await fetch(`/api/repairs/${repairId}/stages?stageId=${stageId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Этап удалён')
            fetchRepairDetail(repairId)
          } catch { toast.error('Ошибка удаления этапа') }
        }}
        onUploadPhoto={(repairId) => setPhotoUploadRepair(repairId)}
        onRefresh={() => selectedRepair && fetchRepairDetail(selectedRepair.id)}
      />

      {/* ─── REPAIR ADD/EDIT DIALOG ──────────────────────────── */}
      <RepairFormDialog
        open={repairFormOpen}
        onOpenChange={setRepairFormOpen}
        editData={repairFormEdit}
        equipmentId={repairFormEquipmentId}
        equipmentList={equipment}
        saving={repairFormSaving}
        setSaving={setRepairFormSaving}
        onSaved={() => { setRepairFormOpen(false); fetchAll() }}
      />

      {/* ─── COMPANY ADD/EDIT DIALOG ─────────────────────────── */}
      <CompanyFormDialog
        open={companyFormOpen}
        onOpenChange={setCompanyFormOpen}
        editData={companyFormEdit}
        saving={companyFormSaving}
        setSaving={setCompanyFormSaving}
        onSaved={() => { setCompanyFormOpen(false); fetchAll() }}
      />

      {/* ─── STAGE FORM DIALOG ───────────────────────────────── */}
      <StageFormDialog
        open={stageFormOpen}
        onOpenChange={setStageFormOpen}
        repairId={stageFormRepairId}
        editData={stageFormEdit}
        saving={stageFormSaving}
        setSaving={setStageFormSaving}
        onSaved={() => { setStageFormOpen(false); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }}
      />

      {/* ─── PHOTO UPLOAD DIALOG (Equipment) ─────────────────── */}
      <PhotoUploadDialog
        open={!!photoUploadEq}
        onOpenChange={(v) => { if (!v) setPhotoUploadEq(null) }}
        targetId={photoUploadEq || ''}
        targetType="equipment"
        onUploaded={() => { setPhotoUploadEq(null); if (selectedEq) fetchEquipmentDetail(selectedEq.id); fetchAll() }}
      />

      {/* ─── PHOTO UPLOAD DIALOG (Repair) ────────────────────── */}
      <RepairPhotoUploadDialog
        open={!!photoUploadRepair}
        onOpenChange={(v) => { if (!v) setPhotoUploadRepair(null) }}
        targetId={photoUploadRepair || ''}
        stages={selectedRepair?.stages || []}
        onUploaded={() => { setPhotoUploadRepair(null); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }}
      />

      {/* ─── FULL PHOTO VIEW ─────────────────────────────────── */}
      <Dialog open={!!fullPhoto} onOpenChange={() => setFullPhoto(null)}>
        <DialogContent className="max-w-3xl p-2" showCloseButton>
          {fullPhoto && (
            <img src={fullPhoto} alt="Фото" className="w-full h-auto rounded-md object-contain max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── AXENTA SETTINGS DIALOG ──────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cog className="size-5" />Настройки Axenta.cloud</DialogTitle>
            <DialogDescription>Подключение к API Axenta.cloud для получения данных ГЛОНАСС</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>API URL *</Label><Input placeholder="https://axenta.cloud/api" value={axentaSettings.apiUrl} onChange={e => setAxentaSettings(s => ({ ...s, apiUrl: e.target.value }))} /></div>
            <div><Label>API Key *</Label><Input type="password" placeholder="Ваш API-ключ" value={axentaSettings.apiKey} onChange={e => setAxentaSettings(s => ({ ...s, apiKey: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Логин</Label><Input placeholder="Логин (опционально)" value={axentaSettings.username || ''} onChange={e => setAxentaSettings(s => ({ ...s, username: e.target.value }))} /></div>
              <div><Label>Пароль</Label><Input type="password" placeholder="Пароль (опционально)" value={axentaSettings.password || ''} onChange={e => setAxentaSettings(s => ({ ...s, password: e.target.value }))} /></div>
            </div>
            <div><Label>Интервал синхронизации (сек)</Label><Input type="number" value={axentaSettings.syncInterval} onChange={e => setAxentaSettings(s => ({ ...s, syncInterval: parseInt(e.target.value) || 300 }))} /></div>
            <div className="flex items-center justify-between">
              <Label>Интеграция активна</Label>
              <Button variant={axentaSettings.isActive ? 'default' : 'outline'} size="sm" onClick={() => setAxentaSettings(s => ({ ...s, isActive: !s.isActive }))}>
                {axentaSettings.isActive ? 'Вкл' : 'Выкл'}
              </Button>
            </div>
            {axentaSettings.lastSyncAt && (
              <p className="text-xs text-muted-foreground">Последняя синхронизация: {formatDateTime(axentaSettings.lastSyncAt)}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button variant="outline" onClick={async () => {
              setSyncing(true)
              try {
                const res = await fetch('/api/glonass/sync', { method: 'POST' })
                const data = await res.json()
                if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`)
                else toast.error(data.error || 'Ошибка')
              } catch { toast.error('Ошибка синхронизации') }
              setSyncing(false)
            }} disabled={syncing}>
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Синхронизировать
            </Button>
            <Button onClick={async () => {
              setSettingsSaving(true)
              try {
                const res = await fetch('/api/glonass/settings', {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(axentaSettings)
                })
                if (!res.ok) throw new Error()
                const data = await res.json()
                setAxentaSettings(data)
                toast.success('Настройки сохранены')
              } catch { toast.error('Ошибка сохранения настроек') }
              setSettingsSaving(false)
            }} disabled={settingsSaving}>
              {settingsSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM ──────────────────────────────────── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &laquo;{deleteDialog.name}&raquo;? Это действие нельзя отменить.
            </AlertDialogDescription>
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
// STAT CARD
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="py-3 gap-2">
      <CardContent className="flex items-center gap-3 p-3 pt-0">
        <div className={`flex items-center justify-center size-9 rounded-lg bg-muted ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Поиск по названию, номеру, VIN..." value={eqSearch} onChange={e => setEqSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={eqStatusFilter} onValueChange={setEqStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={eqTypeFilter} onValueChange={setEqTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={onAdd} className="gap-1.5"><Plus className="size-4" />Добавить</Button>
      </div>

      {/* Grid */}
      {equipment.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center p-6 pt-0">
            <Truck className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Техника не найдена</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Добавьте технику или измените параметры поиска</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(eq => (
            <Card key={eq.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => onOpenDetail(eq)}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                      <Truck className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{eq.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}
                      </p>
                    </div>
                  </div>
                  {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Гос. номер:</span><p className="font-medium">{eq.registrationNum || '—'}</p></div>
                  <div><span className="text-muted-foreground">Тип:</span><p className="font-medium capitalize">{eq.type}</p></div>
                  <div><span className="text-muted-foreground">Владелец:</span><p className="font-medium truncate">{eq.owner?.name || '—'}</p></div>
                  <div><span className="text-muted-foreground">Арендатор:</span><p className="font-medium truncate">{eq.renter?.name || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Wrench className="size-3" />{eq._count?.repairs || 0} ремонтов
                  <Camera className="size-3 ml-2" />{eq._count?.photos || 0} фото
                </div>
                <div className="flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onEdit(eq)}>
                    <Edit className="size-3" /><span className="sm:inline">Изменить</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(eq)}>
                    <Trash2 className="size-3" /><span className="sm:inline">Удалить</span>
                  </Button>
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

function EquipmentDetailSheet({ open, onOpenChange, equipment, loading, detailTab, setDetailTab, companies, photoCategoryFilter, setPhotoCategoryFilter, fullPhoto, setFullPhoto, onEdit, onDelete, onAddRepair, onUploadPhoto, onRefresh, onOpenRepairDetail }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  equipment: Equipment | null; loading: boolean;
  detailTab: string; setDetailTab: (v: string) => void;
  companies: Company[];
  photoCategoryFilter: string; setPhotoCategoryFilter: (v: string) => void;
  fullPhoto: string | null; setFullPhoto: (v: string | null) => void;
  onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
  onAddRepair: (eqId: string) => void; onUploadPhoto: (eqId: string) => void;
  onRefresh: () => void; onOpenRepairDetail: (r: Repair) => void;
}) {
  if (!equipment) return null
  const eq = equipment
  const filteredPhotos = eq.photos?.filter(p => photoCategoryFilter === 'all' || p.category === photoCategoryFilter) || []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            {eq.name}
          </SheetTitle>
          <SheetDescription>{[eq.brand, eq.model, eq.year].filter(Boolean).join(' • ')} — {eq.registrationNum || 'без номера'}</SheetDescription>
          <div className="flex items-center gap-2 pt-1">
            {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
            <span className="text-xs text-muted-foreground">создано {formatDate(eq.createdAt)}</span>
          </div>
        </SheetHeader>

        <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 border-b overflow-x-auto">
            <TabsList className="w-full min-w-max">
              <TabsTrigger value="info" className="gap-1"><Info className="size-3.5" /><span className="hidden sm:inline">Информация</span></TabsTrigger>
              <TabsTrigger value="photos" className="gap-1"><Camera className="size-3.5" /><span className="hidden sm:inline">Фото</span></TabsTrigger>
              <TabsTrigger value="repairs" className="gap-1"><Wrench className="size-3.5" /><span className="hidden sm:inline">Ремонты</span></TabsTrigger>
              <TabsTrigger value="glonass" className="gap-1"><MapPin className="size-3.5" /><span className="hidden sm:inline">ГЛОНАСС</span></TabsTrigger>
              <TabsTrigger value="history" className="gap-1"><History className="size-3.5" /><span className="hidden sm:inline">История</span></TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* INFO TAB */}
                {detailTab === 'info' && (
                    <div className="px-6 py-4 space-y-5">
                      <DetailSection title="Основные данные" icon={<Settings2 className="size-4" />}>
                        <DetailRow label="Наименование" value={eq.name} />
                        <DetailRow label="Тип" value={eq.type} />
                        <DetailRow label="Марка" value={eq.brand} />
                        <DetailRow label="Модель" value={eq.model} />
                        <DetailRow label="Год выпуска" value={eq.year?.toString()} />
                        <DetailRow label="Категория" value={eq.category} />
                        <DetailRow label="Цвет" value={eq.color} />
                      </DetailSection>
                      <DetailSection title="Регистрационные данные" icon={<FileText className="size-4" />}>
                        <DetailRow label="VIN" value={eq.vin} />
                        <DetailRow label="Серийный номер" value={eq.serialNumber} />
                        <DetailRow label="Гос. номер" value={eq.registrationNum} />
                        <DetailRow label="Номер СТС" value={eq.stsNumber} />
                        <DetailRow label="Номер ПТС" value={eq.ptsNumber} />
                      </DetailSection>
                      <DetailSection title="Технические характеристики" icon={<Gauge className="size-4" />}>
                        <DetailRow label="Тип двигателя" value={eq.engineType} />
                        <DetailRow label="Объём двигателя" value={eq.engineVolume} />
                        <DetailRow label="Мощность (л.с.)" value={eq.enginePower} />
                        <DetailRow label="Пробег (км)" value={eq.mileage?.toLocaleString('ru-RU')} />
                        <DetailRow label="Тип топлива" value={eq.fuelType} />
                        <DetailRow label="Грузоподъёмность" value={eq.loadCapacity} />
                        <DetailRow label="Пассажирских мест" value={eq.passengerSeats?.toString()} />
                      </DetailSection>
                      <DetailSection title="Финансовые данные" icon={<DollarSign className="size-4" />}>
                        <DetailRow label="Дата приобретения" value={formatDate(eq.purchaseDate)} />
                        <DetailRow label="Цена приобретения" value={formatPrice(eq.purchasePrice)} />
                        <DetailRow label="Текущая стоимость" value={formatPrice(eq.currentPrice)} />
                      </DetailSection>
                      <DetailSection title="Страхование и ТО" icon={<Shield className="size-4" />}>
                        <DetailRow label="Номер полиса" value={eq.insuranceNumber} />
                        <DetailRow label="Срок действия страховки" value={formatDate(eq.insuranceExpiry)} />
                        <DetailRow label="Дата техосмотра" value={formatDate(eq.inspectionDate)} />
                        <DetailRow label="Срок действия ТО" value={formatDate(eq.inspectionExpiry)} />
                      </DetailSection>
                      <DetailSection title="Компания" icon={<Building2 className="size-4" />}>
                        <DetailRow label="Владелец" value={eq.owner?.name} />
                        <DetailRow label="Арендатор" value={eq.renter?.name} />
                      </DetailSection>
                      {eq.notes && (
                        <DetailSection title="Заметки" icon={<ClipboardList className="size-4" />}>
                          <p className="text-sm whitespace-pre-wrap">{eq.notes}</p>
                        </DetailSection>
                      )}
                    </div>
                )}

                {/* PHOTOS TAB */}
                {detailTab === 'photos' && (
                  <div className="px-6 py-4 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Select value={photoCategoryFilter} onValueChange={setPhotoCategoryFilter}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Категория" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          {Object.entries(PHOTO_CATEGORIES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="gap-1.5" onClick={() => onUploadPhoto(eq.id)}>
                        <Upload className="size-3.5" />Загрузить
                      </Button>
                    </div>
                    {filteredPhotos.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="size-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Нет фотографий</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredPhotos.map(photo => (
                          <div key={photo.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => setFullPhoto(photo.url)}>
                            <img src={photo.url} alt={photo.description || ''} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[10px] text-white truncate">{PHOTO_CATEGORIES[photo.category] || photo.category}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* REPAIRS TAB */}
                {detailTab === 'repairs' && (
                    <div className="px-6 py-4 space-y-3">
                      <Button size="sm" className="gap-1.5 mb-2" onClick={() => onAddRepair(eq.id)}>
                        <Plus className="size-3.5" />Новый ремонт
                      </Button>
                      {(!eq.repairs || eq.repairs.length === 0) ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Wrench className="size-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Нет записей о ремонтах</p>
                        </div>
                      ) : (
                        eq.repairs.map(r => (
                          <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onOpenRepairDetail(r)}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{r.description}</p>
                                {statusBadge(r.status, REPAIR_STATUS_MAP)}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>Начало: {formatDate(r.startDate)} {r.endDate ? `• Окончание: ${formatDate(r.endDate)}` : ''}</p>
                                {r.cost != null && <p>Стоимость: {formatPrice(r.cost)}</p>}
                                {r.contractor && <p>Подрядчик: {r.contractor}</p>}
                              </div>
                              {r.stages && r.stages.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Этапы: {r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                                    <span className="text-muted-foreground">{getStageProgress(r.stages)}%</span>
                                  </div>
                                  <Progress value={getStageProgress(r.stages)} className="h-1.5" />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                )}

                {/* GLONASS TAB */}
                {detailTab === 'glonass' && (
                    <div className="px-4 sm:px-6 py-4 space-y-4">
                      {(!eq.trackers || eq.trackers.length === 0) ? (
                        <div className="text-center py-12">
                          <Satellite className="size-12 mx-auto mb-3 text-muted-foreground/40" />
                          <p className="text-muted-foreground mb-2">ГЛОНАСС трекер не подключён</p>
                          <p className="text-xs text-muted-foreground/70 mb-4">Подключите трекер для отслеживания местоположения и данных датчиков</p>
                          <Button size="sm" className="gap-1.5" onClick={async () => {
                            const tid = prompt('Введите ID трекера:')
                            if (!tid) return
                            const tname = prompt('Название трекера:') || ''
                            try {
                              const res = await fetch('/api/glonass', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ equipmentId: eq.id, trackerId: tid, trackerName: tname })
                              })
                              if (!res.ok) throw new Error()
                              toast.success('Трекер подключён')
                              onRefresh()
                            } catch { toast.error('Ошибка подключения трекера') }
                          }}><Plus className="size-3.5" />Подключить трекер</Button>
                        </div>
                      ) : (
                        eq.trackers?.map(tracker => (
                          <Card key={tracker.id}>
                            <CardHeader className="pb-2 pt-4 px-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`flex items-center justify-center size-8 rounded-lg ${tracker.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                    {tracker.isActive ? <Wifi className="size-4 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-4 text-red-600 dark:text-red-400" />}
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm font-semibold">{tracker.trackerName || `Трекер ${tracker.trackerId}`}</CardTitle>
                                    <p className="text-xs text-muted-foreground">ID: {tracker.trackerId}{tracker.imei ? ` • IMEI: ${tracker.imei}` : ''}</p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tracker.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'}`}>
                                  {tracker.isActive ? 'Активен' : 'Неактивен'}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 pt-0 space-y-3">
                              <Separator />
                              {/* Position data */}
                              <DetailSection title="Местоположение" icon={<MapPin className="size-4" />}>
                                <DetailRow label="Широта" value={tracker.lastLatitude?.toFixed(6)} />
                                <DetailRow label="Долгота" value={tracker.lastLongitude?.toFixed(6)} />
                                <DetailRow label="Скорость" value={tracker.lastSpeed != null ? `${tracker.lastSpeed} км/ч` : undefined} />
                                <DetailRow label="Курс" value={tracker.lastCourse != null ? `${tracker.lastCourse}°` : undefined} />
                                <DetailRow label="Высота" value={tracker.lastAltitude != null ? `${tracker.lastAltitude} м` : undefined} />
                              </DetailSection>
                              {/* Sensor data */}
                              <DetailSection title="Датчики" icon={<Gauge className="size-4" />}>
                                <DetailRow label="Зажигание" value={tracker.lastIgnition != null ? (tracker.lastIgnition ? 'Вкл' : 'Выкл') : undefined} />
                                <DetailRow label="Уровень топлива" value={tracker.lastFuelLevel != null ? `${tracker.lastFuelLevel}%` : undefined} />
                                <DetailRow label="Пробег" value={tracker.lastMileage != null ? `${tracker.lastMileage?.toLocaleString('ru-RU')} км` : undefined} />
                                <DetailRow label="Температура двигателя" value={tracker.lastEngineTemp != null ? `${tracker.lastEngineTemp}°C` : undefined} />
                              </DetailSection>
                              <DetailSection title="Связь" icon={<Clock className="size-4" />}>
                                <DetailRow label="Последний выход на связь" value={formatDateTime(tracker.lastSeenAt)} />
                                <DetailRow label="Последняя позиция" value={formatDateTime(tracker.lastPositionAt)} />
                              </DetailSection>
                              {/* Sensor data history */}
                              {tracker.sensorData && tracker.sensorData.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Activity className="size-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">История показаний датчиков</h3>
                                  </div>
                                  <div className="space-y-1 max-h-48 overflow-y-auto pl-6">
                                    {tracker.sensorData.slice(0, 20).map(sd => (
                                      <div key={sd.id} className="flex items-baseline justify-between gap-2 text-xs py-0.5 border-b border-dashed border-border/50">
                                        <span className="text-muted-foreground">{sd.sensorName || sd.sensorType}</span>
                                        <span className="font-medium">{sd.value != null ? `${sd.value}${sd.unit ? ' ' + sd.unit : ''}` : (sd.stringValue || '—')}</span>
                                        <span className="text-muted-foreground text-[10px] shrink-0">{formatDateTime(sd.timestamp)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 pt-2">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                                  try {
                                    const res = await fetch('/api/glonass/sync', { method: 'POST' })
                                    const data = await res.json()
                                    if (data.synced !== undefined) {
                                      toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers} трекеров`)
                                    } else {
                                      toast.error(data.error || 'Ошибка синхронизации')
                                    }
                                    onRefresh()
                                  } catch { toast.error('Ошибка синхронизации') }
                                }}><RefreshCw className="size-3.5" />Синхронизировать</Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={onRefresh}><Activity className="size-3.5" />Обновить</Button>
                                <div className="flex-1" />
                                <Button size="sm" variant="destructive" className="gap-1.5" onClick={async () => {
                                  try {
                                    await fetch(`/api/glonass/${tracker.id}`, { method: 'DELETE' })
                                    toast.success('Трекер отключён')
                                    onRefresh()
                                  } catch { toast.error('Ошибка отключения трекера') }
                                }}><Trash2 className="size-3.5" />Отключить</Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                )}

                {/* HISTORY TAB */}
                {detailTab === 'history' && (
                    <div className="px-6 py-4">
                      {(!eq.history || eq.history.length === 0) ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <History className="size-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Нет записей в истории</p>
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {eq.history.map((h, i) => (
                            <div key={h.id} className="flex gap-3 pb-4 relative">
                              {i < (eq.history?.length || 0) - 1 && (
                                <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                              )}
                              <div className="shrink-0 mt-0.5 z-10">{getEventIcon(h.event)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{h.description || h.event}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                                {h.oldValue && h.newValue && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className="line-through">{h.oldValue}</span> → {h.newValue}
                                  </p>
                                )}
                                {h.performedBy && <p className="text-xs text-muted-foreground">Выполнил: {h.performedBy}</p>}
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
        <div className="border-t px-4 sm:px-6 py-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(eq)}>
            <Edit className="size-3.5" />Редактировать
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onUploadPhoto(eq.id)}>
            <ImagePlus className="size-3.5" />Фото
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh}>
            <Activity className="size-3.5" />Обновить
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete(eq)}>
            <Trash2 className="size-3.5" />Удалить
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-6">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 border-b border-dashed border-border/50">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right truncate">{value || '—'}</span>
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
    { title: 'Основные данные', icon: <Settings2 className="size-4" /> },
    { title: 'Регистрационные данные', icon: <FileText className="size-4" /> },
    { title: 'Технические характеристики', icon: <Gauge className="size-4" /> },
    { title: 'Финансы и страховка', icon: <DollarSign className="size-4" /> },
    { title: 'Назначение', icon: <Building2 className="size-4" /> },
  ]

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите наименование техники'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/equipment/${editData.id}` : '/api/equipment'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Техника обновлена' : 'Техника добавлена')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-5" /> : <Plus className="size-5" />}
            {editData ? 'Редактирование техники' : 'Добавление техники'}
          </DialogTitle>
          <DialogDescription>Шаг {step + 1} из {steps.length}: {steps[step].title}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-1">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {s.icon}<span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4 py-2">
            {/* Step 0: Основные данные */}
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Наименование *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Например: Грузовой автомобиль ГАЗель" /></div>
                <div><Label>Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Марка</Label><Input value={f('brand')} onChange={e => setF('brand', e.target.value)} /></div>
                <div><Label>Модель</Label><Input value={f('model')} onChange={e => setF('model', e.target.value)} /></div>
                <div><Label>Год выпуска</Label><Input type="number" value={f('year')} onChange={e => setF('year', e.target.value)} /></div>
                <div><Label>Категория</Label><Input value={f('category')} onChange={e => setF('category', e.target.value)} placeholder="B, C, D..." /></div>
                <div><Label>Цвет</Label><Input value={f('color')} onChange={e => setF('color', e.target.value)} /></div>
                <div><Label>Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            {/* Step 1: Регистрационные данные */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>VIN номер</Label><Input value={f('vin')} onChange={e => setF('vin', e.target.value)} placeholder="17 символов" /></div>
                <div><Label>Серийный номер</Label><Input value={f('serialNumber')} onChange={e => setF('serialNumber', e.target.value)} /></div>
                <div><Label>Гос. номер</Label><Input value={f('registrationNum')} onChange={e => setF('registrationNum', e.target.value)} placeholder="А000АА 00" /></div>
                <div><Label>Номер СТС</Label><Input value={f('stsNumber')} onChange={e => setF('stsNumber', e.target.value)} /></div>
                <div><Label>Номер ПТС</Label><Input value={f('ptsNumber')} onChange={e => setF('ptsNumber', e.target.value)} /></div>
              </div>
            )}
            {/* Step 2: Технические характеристики */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Тип двигателя</Label><Input value={f('engineType')} onChange={e => setF('engineType', e.target.value)} placeholder="Бензин, Дизель..." /></div>
                <div><Label>Объём двигателя</Label><Input value={f('engineVolume')} onChange={e => setF('engineVolume', e.target.value)} placeholder="2.0 л" /></div>
                <div><Label>Мощность (л.с.)</Label><Input value={f('enginePower')} onChange={e => setF('enginePower', e.target.value)} /></div>
                <div><Label>Пробег (км)</Label><Input type="number" value={f('mileage')} onChange={e => setF('mileage', e.target.value)} /></div>
                <div><Label>Тип топлива</Label><Input value={f('fuelType')} onChange={e => setF('fuelType', e.target.value)} /></div>
                <div><Label>Грузоподъёмность</Label><Input value={f('loadCapacity')} onChange={e => setF('loadCapacity', e.target.value)} /></div>
                <div><Label>Пассажирских мест</Label><Input type="number" value={f('passengerSeats')} onChange={e => setF('passengerSeats', e.target.value)} /></div>
              </div>
            )}
            {/* Step 3: Финансы и страховка */}
            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Дата приобретения</Label><Input type="date" value={f('purchaseDate')} onChange={e => setF('purchaseDate', e.target.value)} /></div>
                <div><Label>Цена приобретения (₽)</Label><Input type="number" value={f('purchasePrice')} onChange={e => setF('purchasePrice', e.target.value)} /></div>
                <div><Label>Текущая стоимость (₽)</Label><Input type="number" value={f('currentPrice')} onChange={e => setF('currentPrice', e.target.value)} /></div>
                <div><Label>Номер полиса ОСАГО/КАСКО</Label><Input value={f('insuranceNumber')} onChange={e => setF('insuranceNumber', e.target.value)} /></div>
                <div><Label>Срок действия страховки</Label><Input type="date" value={f('insuranceExpiry')} onChange={e => setF('insuranceExpiry', e.target.value)} /></div>
                <div><Label>Дата техосмотра</Label><Input type="date" value={f('inspectionDate')} onChange={e => setF('inspectionDate', e.target.value)} /></div>
                <div><Label>Срок действия ТО</Label><Input type="date" value={f('inspectionExpiry')} onChange={e => setF('inspectionExpiry', e.target.value)} /></div>
              </div>
            )}
            {/* Step 4: Назначение */}
            {step === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Компания-владелец</Label><Select value={f('ownerId') || '_none'} onValueChange={v => setF('ownerId', v === '_none' ? '' : v)}><SelectTrigger className="w-full"><SelectValue placeholder="Не указан" /></SelectTrigger><SelectContent><SelectItem value="_none">Не указан</SelectItem>{companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Компания-арендатор</Label><Select value={f('renterId') || '_none'} onValueChange={v => setF('renterId', v === '_none' ? '' : v)}><SelectTrigger className="w-full"><SelectValue placeholder="Не указан" /></SelectTrigger><SelectContent><SelectItem value="_none">Не указан</SelectItem>{companies.filter(c => c.type === 'renter' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="sm:col-span-2"><Label>Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={3} /></div>
              </div>
            )}
          </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="size-4" />Назад
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Далее<ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {editData ? 'Сохранить' : 'Добавить'}
            </Button>
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

  const filtered = repairs.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (eqFilter !== 'all' && r.equipmentId !== eqFilter) return false
    if (search && !r.description.toLowerCase().includes(search.toLowerCase()) && !(r.equipment?.name?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Поиск по описанию ремонта..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name} {e.registrationNum ? `(${e.registrationNum})` : ''}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} className="gap-1.5"><Plus className="size-4" />Добавить</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center p-6 pt-0">
            <Wrench className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Ремонты не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => onOpenDetail(r)}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                      <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{r.description}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.equipment?.name} {r.equipment?.registrationNum ? `• ${r.equipment.registrationNum}` : ''}
                      </p>
                    </div>
                  </div>
                  {statusBadge(r.status, REPAIR_STATUS_MAP)}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Начало:</span><p className="font-medium">{formatDate(r.startDate)}</p></div>
                  <div><span className="text-muted-foreground">Стоимость:</span><p className="font-medium">{formatPrice(r.cost)}</p></div>
                  <div><span className="text-muted-foreground">Подрядчик:</span><p className="font-medium truncate">{r.contractor || '—'}</p></div>
                  <div><span className="text-muted-foreground">Причина:</span><p className="font-medium truncate">{r.reason || '—'}</p></div>
                </div>
                {r.stages && r.stages.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Этапы: {r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                      <span className="text-muted-foreground">{getStageProgress(r.stages)}%</span>
                    </div>
                    <Progress value={getStageProgress(r.stages)} className="h-1.5" />
                  </div>
                )}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(r)}>
                    <Trash2 className="size-3" />Удалить
                  </Button>
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
// REPAIR DETAIL DIALOG
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5" />Ремонт: {r.description}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {r.equipment?.name} {r.equipment?.registrationNum ? `• ${r.equipment.registrationNum}` : ''}
            <span className="ml-2">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
              {/* Repair info */}
              <DetailSection title="Информация о ремонте" icon={<ClipboardList className="size-4" />}>
                <DetailRow label="Описание" value={r.description} />
                <DetailRow label="Причина" value={r.reason} />
                <DetailRow label="Дата начала" value={formatDate(r.startDate)} />
                <DetailRow label="Дата окончания" value={formatDate(r.endDate)} />
                <DetailRow label="Стоимость" value={formatPrice(r.cost)} />
                <DetailRow label="Подрядчик" value={r.contractor} />
                <DetailRow label="Телефон подрядчика" value={r.contractorPhone} />
                <DetailRow label="Выполненные работы" value={r.workPerformed} />
                <DetailRow label="Запчасти" value={r.spareParts} />
                <DetailRow label="Следующий ТО" value={formatDate(r.nextInspection)} />
                <DetailRow label="Заметки" value={r.notes} />
              </DetailSection>

              {/* Stages */}
              <DetailSection title="Этапы ремонта" icon={<Settings2 className="size-4" />}>
                <div className="col-span-2">
                  <Button size="sm" variant="outline" className="gap-1 mb-3" onClick={() => onAddStage(r.id)}>
                    <Plus className="size-3" />Добавить этап
                  </Button>
                  {r.stages && r.stages.length > 0 ? (
                    <div className="space-y-2">
                      {r.stages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{stage.name}</p>
                              {statusBadge(stage.status, STAGE_STATUS_MAP)}
                            </div>
                            {stage.description && <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>}
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              {stage.performer && <span>Исполнитель: {stage.performer}</span>}
                              {stage.cost != null && <span>Стоимость: {formatPrice(stage.cost)}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEditStage(stage, r.id)}>
                              <Edit className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDeleteStage(stage.id, r.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Этапы не добавлены</p>
                  )}
                </div>
              </DetailSection>

              {/* Photos */}
              <DetailSection title="Фотографии ремонта" icon={<Camera className="size-4" />}>
                <div className="col-span-2">
                  <Button size="sm" variant="outline" className="gap-1 mb-3" onClick={() => onUploadPhoto(r.id)}>
                    <Upload className="size-3" />Загрузить фото
                  </Button>
                  {r.photos && r.photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {r.photos.map(p => (
                        <div key={p.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square cursor-pointer" onClick={() => setFullPhoto(p.url)}>
                          <img src={p.url} alt={p.description || ''} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Eye className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Нет фотографий</p>
                  )}
                </div>
              </DetailSection>
            </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {r.status === 'in_progress' && (
            <Button variant="outline" className="gap-1.5" onClick={() => onComplete(r)}>
              <CheckCircle2 className="size-4" />Завершить ремонт
            </Button>
          )}
          <Button variant="outline" className="gap-1.5" onClick={() => onEdit(r)}>
            <Edit className="size-4" />Редактировать
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={onRefresh}>
            <Activity className="size-4" />Обновить
          </Button>
          <Button variant="destructive" className="gap-1.5" onClick={() => onDelete(r)}>
            <Trash2 className="size-4" />Удалить
          </Button>
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
        equipmentId: editData.equipmentId,
        description: editData.description || '',
        reason: editData.reason || '',
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
        status: editData.status || 'in_progress',
        cost: editData.cost?.toString() || '',
        contractor: editData.contractor || '',
        contractorPhone: editData.contractorPhone || '',
        workPerformed: editData.workPerformed || '',
        spareParts: editData.spareParts || '',
        nextInspection: editData.nextInspection ? new Date(editData.nextInspection).toISOString().split('T')[0] : '',
        notes: editData.notes || '',
      })
      setStages([])
    } else {
      setForm({
        equipmentId: equipmentId || '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'in_progress',
      })
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
      <DialogContent className="sm:max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-5" /> : <Plus className="size-5" />}
            {editData ? 'Редактирование ремонта' : 'Новый ремонт'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Техника *</Label>
                <Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Выберите технику" /></SelectTrigger>
                  <SelectContent>
                    {equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name} {e.registrationNum ? `(${e.registrationNum})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Описание *</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} /></div>
              <div><Label>Причина</Label><Input value={f('reason')} onChange={e => setF('reason', e.target.value)} /></div>
              <div><Label>Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
              <div><Label>Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
              <div><Label>Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
              <div><Label>Подрядчик</Label><Input value={f('contractor')} onChange={e => setF('contractor', e.target.value)} /></div>
              <div><Label>Телефон подрядчика</Label><Input value={f('contractorPhone')} onChange={e => setF('contractorPhone', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Выполненные работы</Label><Textarea value={f('workPerformed')} onChange={e => setF('workPerformed', e.target.value)} rows={2} /></div>
              <div className="sm:col-span-2"><Label>Запчасти</Label><Textarea value={f('spareParts')} onChange={e => setF('spareParts', e.target.value)} rows={2} /></div>
              <div><Label>Дата следующего ТО</Label><Input type="date" value={f('nextInspection')} onChange={e => setF('nextInspection', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
            </div>

            {/* Initial stages (only for new repairs) */}
            {!editData && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Начальные этапы ремонта</Label>
                  <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setStages([...stages, { name: '', description: '' }])}>
                    <Plus className="size-3" />Добавить этап
                  </Button>
                </div>
                {stages.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder="Название этапа" value={s.name} onChange={e => { const n = [...stages]; n[i] = { ...n[i], name: e.target.value }; setStages(n) }} className="flex-1" />
                    <Input placeholder="Описание" value={s.description} onChange={e => { const n = [...stages]; n[i] = { ...n[i], description: e.target.value }; setStages(n) }} className="flex-1" />
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => setStages(stages.filter((_, j) => j !== i))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {editData ? 'Сохранить' : 'Добавить'}
          </Button>
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

  const filtered = companies.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.inn || '').includes(search)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Поиск по названию или ИНН..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={onAdd} className="gap-1.5"><Plus className="size-4" />Добавить компанию</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center p-6 pt-0">
            <Building2 className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Компании не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filtered.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.inn || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                      {COMPANY_TYPES[c.type] || c.type}
                    </span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Телефон:</span><p className="font-medium">{c.phone || '—'}</p></div>
                    <div><span className="text-muted-foreground">Email:</span><p className="font-medium truncate">{c.email || '—'}</p></div>
                    <div><span className="text-muted-foreground">Владеет:</span><p className="font-medium">{c._count?.ownedEquipment || 0}</p></div>
                    <div><span className="text-muted-foreground">Арендует:</span><p className="font-medium">{c._count?.rentedEquipment || 0}</p></div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onEdit(c)}><Edit className="size-3" />Изменить</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(c)}><Trash2 className="size-3" />Удалить</Button>
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
                <TableHead>Название</TableHead>
                <TableHead className="hidden sm:table-cell">ИНН</TableHead>
                <TableHead className="hidden md:table-cell">Тип</TableHead>
                <TableHead className="hidden md:table-cell">Телефон</TableHead>
                <TableHead className="text-center">Владеет</TableHead>
                <TableHead className="text-center">Арендует</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
                        <Building2 className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{c.inn || '—'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{c.inn || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                      {COMPANY_TYPES[c.type] || c.type}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.phone || '—'}</TableCell>
                  <TableCell className="text-center">{c._count?.ownedEquipment || 0}</TableCell>
                  <TableCell className="text-center">{c._count?.rentedEquipment || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(c)}><Edit className="size-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(c)}><Trash2 className="size-3" /></Button>
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
      setForm({
        name: editData.name || '', inn: editData.inn || '', kpp: editData.kpp || '',
        ogrn: editData.ogrn || '', address: editData.address || '',
        factAddress: editData.factAddress || '', phone: editData.phone || '',
        email: editData.email || '', director: editData.director || '',
        type: editData.type || 'owner',
      })
    } else {
      setForm({ type: 'owner' })
    }
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
      <DialogContent className="sm:max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-5" /> : <Plus className="size-5" />}
            {editData ? 'Редактирование компании' : 'Новая компания'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>Название *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} /></div>
            <div><Label>ИНН</Label><Input value={f('inn')} onChange={e => setF('inn', e.target.value)} /></div>
            <div><Label>КПП</Label><Input value={f('kpp')} onChange={e => setF('kpp', e.target.value)} /></div>
            <div><Label>ОГРН</Label><Input value={f('ogrn')} onChange={e => setF('ogrn', e.target.value)} /></div>
            <div><Label>Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMPANY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>Юридический адрес</Label><Input value={f('address')} onChange={e => setF('address', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Фактический адрес</Label><Input value={f('factAddress')} onChange={e => setF('factAddress', e.target.value)} /></div>
            <div><Label>Телефон</Label><Input value={f('phone')} onChange={e => setF('phone', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>ФИО директора</Label><Input value={f('director')} onChange={e => setF('director', e.target.value)} /></div>
          </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {editData ? 'Сохранить' : 'Добавить'}
          </Button>
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
      setForm({
        name: editData.name || '',
        description: editData.description || '',
        status: editData.status || 'pending',
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : '',
        endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
        performer: editData.performer || '',
        cost: editData.cost?.toString() || '',
        sortOrder: editData.sortOrder?.toString() || '0',
      })
    } else {
      setForm({ status: 'pending', sortOrder: '0' })
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название этапа'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: f('name'),
        description: f('description') || null,
        status: f('status'),
        startDate: f('startDate') || null,
        endDate: f('endDate') || null,
        performer: f('performer') || null,
        cost: f('cost') ? parseFloat(f('cost')) : null,
        sortOrder: parseInt(f('sortOrder') || '0'),
      }
      if (editData) {
        body.stageId = editData.id
      }
      const res = await fetch(`/api/repairs/${repairId}/stages`, {
        method: editData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
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
          <DialogTitle>{editData ? 'Редактирование этапа' : 'Новый этап ремонта'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>Название *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Описание</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} /></div>
          <div><Label>Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Исполнитель</Label><Input value={f('performer')} onChange={e => setF('performer', e.target.value)} /></div>
          <div><Label>Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
          <div><Label>Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
          <div><Label>Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {editData ? 'Сохранить' : 'Добавить'}
          </Button>
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

  useEffect(() => {
    if (!open) { setFile(null); setDescription(''); setCategory('general') }
  }, [open])

  const handleUpload = async () => {
    if (!file) { toast.error('Выберите файл'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', description)
      formData.append('category', category)
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
          <DialogTitle className="flex items-center gap-2"><Upload className="size-5" />Загрузка фото</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Файл *</Label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <Button variant="outline" className="w-full gap-2 mt-1" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="size-4" />{file ? file.name : 'Выбрать файл'}
            </Button>
          </div>
          <div><Label>Описание</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><Label>Категория</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PHOTO_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          {file && (
            <div className="rounded-lg overflow-hidden border bg-muted aspect-video">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Загрузить
          </Button>
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

  useEffect(() => {
    if (!open) { setFile(null); setDescription(''); setStageId('') }
  }, [open])

  const handleUpload = async () => {
    if (!file) { toast.error('Выберите файл'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', description)
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
          <DialogTitle className="flex items-center gap-2"><Upload className="size-5" />Загрузка фото ремонта</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Файл *</Label>
            <input type="file" ref={fileInputRef} accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <Button variant="outline" className="w-full gap-2 mt-1" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="size-4" />{file ? file.name : 'Выбрать файл'}
            </Button>
          </div>
          <div><Label>Описание</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          {stages.length > 0 && (
            <div><Label>Привязка к этапу</Label><Select value={stageId || '_none'} onValueChange={v => setStageId(v === '_none' ? '' : v)}><SelectTrigger className="w-full"><SelectValue placeholder="Без привязки" /></SelectTrigger><SelectContent><SelectItem value="_none">Без привязки</SelectItem>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          {file && (
            <div className="rounded-lg overflow-hidden border bg-muted aspect-video">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Загрузить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
