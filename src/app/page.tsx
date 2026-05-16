'use client'

/* ═══════════════════════════════════════════════════════════════
   УЧЁТ ТЕХНИКИ — Комплексная система учёта оборудования
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

const TrackerMap = dynamic(() => import('@/components/tracker-map'), { ssr: false })

// Refresh interval options for map auto-update
const REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '1 мин' },
  { value: 120, label: '2 мин' },
  { value: 300, label: '5 мин' },
] as const

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
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover'
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
  Route, Package, Weight, UserCircle, IdCard, ClipboardCheck, Map, Bell,
  Car, Bus, Bike, Tractor, Ship, Container, Wrench as Settings, CircuitBoard, Cable,
  UserPlus, UserCheck, Download, Cpu, BarChart3, Compass, Mountain,
  ArrowDownToLine, ArrowUpFromLine
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

interface RepairEmployee {
  id: string; repairId: string; employeeId: string; role: string;
  assignedAt: string; notes?: string | null;
  employee: { id: string; fullName: string; position: string; phone?: string | null; status: string; licenseCat?: string | null };
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
  masters?: RepairEmployee[];
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
  employees?: { id: string; fullName: string; position: string; phone?: string | null; status: string; licenseCat?: string | null }[];
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
  id: string; crewId: string; employeeId?: string | null; fullName: string; role: string;
  phone?: string | null; licenseNum?: string | null; licenseCat?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; fullName: string; position: string; phone?: string | null; status: string } | null;
}

interface Employee {
  id: string; fullName: string; position: string; phone?: string | null; email?: string | null;
  birthDate?: string | null; hireDate?: string | null; fireDate?: string | null;
  licenseNum?: string | null; licenseCat?: string | null; licenseExpiry?: string | null;
  passportSeries?: string | null; passportNum?: string | null; address?: string | null;
  status: string; salary?: number | null; notes?: string | null; crewId?: string | null;
  equipmentId?: string | null;
  createdAt: string; updatedAt: string;
  crew?: { id: string; name: string; type: string; status: string } | null;
  equipment?: { id: string; name: string; registrationNum?: string | null; type: string } | null;
  repairAssignments?: { id: string; repairId: string; role: string; assignedAt: string; repair: { id: string; description: string; status: string; equipment: { id: string; name: string } } }[];
}

interface Crew {
  id: string; name: string; description?: string | null; type: string;
  status: string; notes?: string | null; createdAt: string; updatedAt: string;
  members?: CrewMember[]; employees?: Employee[]; _count?: { trips: number };
}

interface Trip {
  id: string; equipmentId: string; crewId?: string | null;
  route: string; startPoint?: string | null; endPoint?: string | null;
  cargo?: string | null; cargoWeight?: number | null; distance?: number | null;
  startDate: string; endDate?: string | null; plannedEndDate?: string | null;
  status: string; fuelStart?: number | null; fuelEnd?: number | null;
  mileageStart?: number | null; mileageEnd?: number | null;
  cost?: number | null; revenue?: number | null; notes?: string | null;
  // ── Аналитика трекера ──
  avgSpeed?: number | null; maxSpeed?: number | null; fuelConsumed?: number | null;
  tripDuration?: number | null; engineHours?: number | null; avgFuelRate?: number | null;
  refuelVolume?: number | null; plumVolume?: number | null; idleTime?: number | null;
  parkingsDuration?: number | null; trackerSnapshot?: string | null;
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

interface EquipmentTypeInfo {
  label: string
  icon: React.ReactNode
  color: string
  darkColor: string
  category: string
}

const EQUIPMENT_TYPE_MAP: Record<string, EquipmentTypeInfo> = {
  // Легковой транспорт
  'автомобиль': { label: 'Автомобиль', icon: <Car className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400', category: 'Легковой транспорт' },
  'кроссовер': { label: 'Кроссовер', icon: <Car className="size-3.5" />, color: 'bg-indigo-100 text-indigo-700', darkColor: 'dark:bg-indigo-900/40 dark:text-indigo-400', category: 'Легковой транспорт' },
  'внедорожник': { label: 'Внедорожник', icon: <Car className="size-3.5" />, color: 'bg-teal-100 text-teal-700', darkColor: 'dark:bg-teal-900/40 dark:text-teal-400', category: 'Легковой транспорт' },
  'мототехника': { label: 'Мототехника', icon: <Bike className="size-3.5" />, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/40 dark:text-orange-400', category: 'Легковой транспорт' },
  // Грузовой транспорт
  'грузовик': { label: 'Грузовик', icon: <Truck className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400', category: 'Грузовой транспорт' },
  'фургон': { label: 'Фургон', icon: <Truck className="size-3.5" />, color: 'bg-yellow-100 text-yellow-700', darkColor: 'dark:bg-yellow-900/40 dark:text-yellow-400', category: 'Грузовой транспорт' },
  'прицеп': { label: 'Прицеп', icon: <Container className="size-3.5" />, color: 'bg-stone-100 text-stone-700', darkColor: 'dark:bg-stone-900/40 dark:text-stone-400', category: 'Грузовой транспорт' },
  'полуприцеп': { label: 'Полуприцеп', icon: <Container className="size-3.5" />, color: 'bg-neutral-100 text-neutral-700', darkColor: 'dark:bg-neutral-900/40 dark:text-neutral-400', category: 'Грузовой транспорт' },
  'рефрижератор': { label: 'Рефрижератор', icon: <Truck className="size-3.5" />, color: 'bg-cyan-100 text-cyan-700', darkColor: 'dark:bg-cyan-900/40 dark:text-cyan-400', category: 'Грузовой транспорт' },
  // Пассажирский транспорт
  'автобус': { label: 'Автобус', icon: <Bus className="size-3.5" />, color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/40 dark:text-purple-400', category: 'Пассажирский транспорт' },
  'микроавтобус': { label: 'Микроавтобус', icon: <Bus className="size-3.5" />, color: 'bg-violet-100 text-violet-700', darkColor: 'dark:bg-violet-900/40 dark:text-violet-400', category: 'Пассажирский транспорт' },
  // Спецтехника
  'спецтехника': { label: 'Спецтехника', icon: <Wrench className="size-3.5" />, color: 'bg-red-100 text-red-700', darkColor: 'dark:bg-red-900/40 dark:text-red-400', category: 'Спецтехника' },
  'экскаватор': { label: 'Экскаватор', icon: <Tractor className="size-3.5" />, color: 'bg-yellow-100 text-yellow-700', darkColor: 'dark:bg-yellow-900/40 dark:text-yellow-400', category: 'Спецтехника' },
  'бульдозер': { label: 'Бульдозер', icon: <Tractor className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400', category: 'Спецтехника' },
  'кран': { label: 'Кран', icon: <Tractor className="size-3.5" />, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/40 dark:text-orange-400', category: 'Спецтехника' },
  'погрузчик': { label: 'Погрузчик', icon: <Tractor className="size-3.5" />, color: 'bg-lime-100 text-lime-700', darkColor: 'dark:bg-lime-900/40 dark:text-lime-400', category: 'Спецтехника' },
  'самосвал': { label: 'Самосвал', icon: <Truck className="size-3.5" />, color: 'bg-rose-100 text-rose-700', darkColor: 'dark:bg-rose-900/40 dark:text-rose-400', category: 'Спецтехника' },
  'автовышка': { label: 'Автовышка', icon: <Tractor className="size-3.5" />, color: 'bg-fuchsia-100 text-fuchsia-700', darkColor: 'dark:bg-fuchsia-900/40 dark:text-fuchsia-400', category: 'Спецтехника' },
  'ямобур': { label: 'Ямобур', icon: <Tractor className="size-3.5" />, color: 'bg-pink-100 text-pink-700', darkColor: 'dark:bg-pink-900/40 dark:text-pink-400', category: 'Спецтехника' },
  // Сельхозтехника
  'сельхозтехника': { label: 'Сельхозтехника', icon: <Tractor className="size-3.5" />, color: 'bg-green-100 text-green-700', darkColor: 'dark:bg-green-900/40 dark:text-green-400', category: 'Сельхозтехника' },
  'трактор': { label: 'Трактор', icon: <Tractor className="size-3.5" />, color: 'bg-emerald-100 text-emerald-700', darkColor: 'dark:bg-emerald-900/40 dark:text-emerald-400', category: 'Сельхозтехника' },
  'комбайн': { label: 'Комбайн', icon: <Tractor className="size-3.5" />, color: 'bg-lime-100 text-lime-700', darkColor: 'dark:bg-lime-900/40 dark:text-lime-400', category: 'Сельхозтехника' },
  // Строительная техника
  'строительная техника': { label: 'Строительная техника', icon: <Wrench className="size-3.5" />, color: 'bg-slate-100 text-slate-700', darkColor: 'dark:bg-slate-900/40 dark:text-slate-400', category: 'Строительная техника' },
  'бетономешалка': { label: 'Бетономешалка', icon: <Truck className="size-3.5" />, color: 'bg-gray-100 text-gray-700', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Строительная техника' },
  'каток': { label: 'Каток', icon: <Tractor className="size-3.5" />, color: 'bg-zinc-100 text-zinc-700', darkColor: 'dark:bg-zinc-900/40 dark:text-zinc-400', category: 'Строительная техника' },
  // Водный транспорт
  'водный транспорт': { label: 'Водный транспорт', icon: <Ship className="size-3.5" />, color: 'bg-sky-100 text-sky-700', darkColor: 'dark:bg-sky-900/40 dark:text-sky-400', category: 'Водный транспорт' },
  'катер': { label: 'Катер', icon: <Ship className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400', category: 'Водный транспорт' },
  'баржа': { label: 'Баржа', icon: <Ship className="size-3.5" />, color: 'bg-indigo-100 text-indigo-700', darkColor: 'dark:bg-indigo-900/40 dark:text-indigo-400', category: 'Водный транспорт' },
  // Другое
  'другое': { label: 'Другое', icon: <Package className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Другое' },
}

// Backward compatibility: flat list of type keys
const EQUIPMENT_TYPES = Object.keys(EQUIPMENT_TYPE_MAP)

// Grouped types for Select with categories
const EQUIPMENT_TYPE_GROUPS = (() => {
  const groups: Record<string, Array<{ value: string; label: string }>> = {}
  for (const [key, info] of Object.entries(EQUIPMENT_TYPE_MAP)) {
    if (!groups[info.category]) groups[info.category] = []
    groups[info.category].push({ value: key, label: info.label })
  }
  return groups
})()

// Helper to get type info with fallback
function getTypeInfo(type: string): EquipmentTypeInfo {
  return EQUIPMENT_TYPE_MAP[type] || { label: type, icon: <Package className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Другое' }
}

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const info = getTypeInfo(type)
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${info.color} ${info.darkColor}`}>
      {info.icon}{info.label}
    </span>
  )
}

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

const EMPLOYEE_POSITION_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; darkColor: string }> = {
  driver: { label: 'Водитель', icon: <Car className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400' },
  mechanic: { label: 'Механик', icon: <Wrench className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400' },
  assistant: { label: 'Помощник', icon: <UserCircle className="size-3.5" />, color: 'bg-sky-100 text-sky-700', darkColor: 'dark:bg-sky-900/40 dark:text-sky-400' },
  loader: { label: 'Грузчик', icon: <Weight className="size-3.5" />, color: 'bg-stone-100 text-stone-700', darkColor: 'dark:bg-stone-900/40 dark:text-stone-400' },
  other: { label: 'Другой', icon: <User className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400' },
}

const EMPLOYEE_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'Работает', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  dismissed: { label: 'Уволен', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
  vacation: { label: 'Отпуск', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  sick: { label: 'Больничный', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
}

const REPAIR_MASTER_ROLE_MAP: Record<string, { label: string; color: string }> = {
  master: { label: 'Мастер', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  assistant: { label: 'Помощник', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  supervisor: { label: 'Ответственный', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400' },
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

// Convert Date to local datetime string for <input type="datetime-local">
// toISOString() returns UTC which is WRONG for input values — we need local time
function toLocalDatetime(d: Date | string): string {
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Convert Date to local date string for <input type="date">
function toLocalDate(d: Date | string): string {
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'equipment' | 'repair' | 'company' | 'trip' | 'crew' | 'employee'; id: string; name: string }>({
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
  const [crewFormOpen, setCrewFormOpen] = useState(false)
  const [crewFormEdit, setCrewFormEdit] = useState<Crew | null>(null)
  const [crewFormSaving, setCrewFormSaving] = useState(false)
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

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmployees(data)
    } catch { toast.error('Ошибка загрузки сотрудников') }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchEquipment(), fetchCompanies(), fetchRepairs(), fetchTrips(), fetchCrews(), fetchEmployees()])
    setLoading(false)
  }, [fetchEquipment, fetchCompanies, fetchRepairs, fetchTrips, fetchCrews, fetchEmployees])

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

  const openEquipmentDetail = (eq: Equipment) => {
    setEqDetailTab('info')
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
      if (type === 'employee') apiUrl = `/api/employees/${id}`
      const res = await fetch(apiUrl, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Удалено успешно')
      if (type === 'equipment') { setEqDetailOpen(false); setSelectedEq(null) }
      if (type === 'repair') { setRepairDetailOpen(false); setSelectedRepair(null) }
      if (type === 'trip') { setTripDetailOpen(false); setSelectedTrip(null) }
      if (type === 'employee') { setEmpDetailOpen(false); setSelectedEmp(null) }
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
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Truck className="size-3.5" /></div>
            <h1 className="text-sm font-bold shrink-0 hidden sm:block">Учёт техники</h1>
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              {[0,1,2,3].map(i => <div key={i} className="h-5 w-12 rounded-md bg-muted animate-pulse" />)}
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center justify-between gap-2">
          {/* Left: logo + title + stats */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Truck className="size-3.5" /></div>
            <h1 className="text-sm font-bold tracking-tight shrink-0 hidden sm:block">Учёт техники</h1>
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-primary"><Truck className="size-3" />{stats.total}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3" />{stats.active}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"><Wrench className="size-3" />{stats.repair}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"><Users className="size-3" />{stats.rented}</span>
            </div>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Mobile stats as compact text */}
            <div className="sm:hidden flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
              <span className="text-primary font-bold">{stats.total}</span>
              <span>/</span>
              <span className="text-emerald-600">{stats.active}</span>
              <span>/</span>
              <span className="text-amber-600">{stats.repair}</span>
              <span>/</span>
              <span className="text-sky-600">{stats.rented}</span>
            </div>
            {/* Auto-refresh toggle */}
            <Button variant="ghost" size="icon" className={`size-7 ${autoRefreshEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)} aria-label="Автообновление" title={autoRefreshEnabled ? 'Автообновление вкл' : 'Автообновление выкл'}>
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
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setSettingsOpen(true)} aria-label="Настройки"><Cog className="size-3.5" /></Button>
            {mounted && (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Тема">
                {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            )}
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
            <TabsTrigger value="employees" className="gap-1.5"><Users className="size-4" />Сотрудники</TabsTrigger>
            <TabsTrigger value="companies" className="gap-1.5"><Building2 className="size-4" />Компании</TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5"><Map className="size-4" />Карта</TabsTrigger>
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
          <TabsContent value="employees">
            <EmployeesTab employees={employees} crews={crews} empSearch={empSearch} setEmpSearch={setEmpSearch} empPositionFilter={empPositionFilter} setEmpPositionFilter={setEmpPositionFilter} empStatusFilter={empStatusFilter} setEmpStatusFilter={setEmpStatusFilter} onOpenDetail={openEmployeeDetail} onAdd={() => { setEmpFormEdit(null); setEmpFormOpen(true) }} onEdit={(emp) => { setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName })} />
          </TabsContent>
          <TabsContent value="companies">
            <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />
          </TabsContent>
          <TabsContent value="map">
            <MapTab equipment={equipment} onOpenDetail={openEquipmentDetailById} onSync={async () => { try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка'); fetchEquipment() } catch { toast.error('Ошибка синхронизации') } }} />
          </TabsContent>
        </Tabs>

        {/* Mobile: show active tab content directly */}
        <div className="md:hidden">
          {mainTab === 'equipment' && <EquipmentTab equipment={equipment} companies={companies} eqSearch={eqSearch} setEqSearch={setEqSearch} eqStatusFilter={eqStatusFilter} setEqStatusFilter={setEqStatusFilter} eqTypeFilter={eqTypeFilter} setEqTypeFilter={setEqTypeFilter} onOpenDetail={openEquipmentDetail} onAdd={() => { setEqFormEdit(null); setEqFormStep(0); setEqFormOpen(true) }} onEdit={(eq) => { setEqFormEdit(eq); setEqFormStep(0); setEqFormOpen(true) }} onDelete={(eq) => setDeleteDialog({ open: true, type: 'equipment', id: eq.id, name: eq.name })} />}
          {mainTab === 'repairs' && <RepairsTab repairs={repairs} equipment={equipment} onOpenDetail={openRepairDetail} onAdd={(eqId) => { setRepairFormEdit(null); setRepairFormEquipmentId(eqId || ''); setRepairFormOpen(true) }} onDelete={(r) => setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description })} />}
          {mainTab === 'trips' && <TripsTab trips={trips} equipment={equipment} crews={crews} onOpenDetail={openTripDetail} onAdd={(eqId) => { setTripFormEdit(null); setTripFormEquipmentId(eqId || ''); setTripFormOpen(true) }} onDelete={(t) => setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route })} onAddCrew={() => { setCrewFormEdit(null); setCrewFormOpen(true) }} onEditCrew={(c) => { setCrewFormEdit(c); setCrewFormOpen(true) }} onDeleteCrew={(c) => setDeleteDialog({ open: true, type: 'crew', id: c.id, name: c.name })} />}
          {mainTab === 'employees' && <EmployeesTab employees={employees} crews={crews} empSearch={empSearch} setEmpSearch={setEmpSearch} empPositionFilter={empPositionFilter} setEmpPositionFilter={setEmpPositionFilter} empStatusFilter={empStatusFilter} setEmpStatusFilter={setEmpStatusFilter} onOpenDetail={openEmployeeDetail} onAdd={() => { setEmpFormEdit(null); setEmpFormOpen(true) }} onEdit={(emp) => { setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName })} />}
          {mainTab === 'companies' && <CompaniesTab companies={companies} onAdd={() => { setCompanyFormEdit(null); setCompanyFormOpen(true) }} onEdit={(c) => { setCompanyFormEdit(c); setCompanyFormOpen(true) }} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', id: c.id, name: c.name })} />}
          {mainTab === 'map' && <MapTab equipment={equipment} onOpenDetail={openEquipmentDetailById} onSync={async () => { try { const res = await fetch('/api/glonass/sync', { method: 'POST' }); const data = await res.json(); if (data.synced !== undefined) toast.success(`Синхронизация: ${data.synced} из ${data.totalTrackers}`); else toast.error(data.error || 'Ошибка'); fetchEquipment() } catch { toast.error('Ошибка синхронизации') } }} />}
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm">
        <div className="grid grid-cols-6 h-14">
          {[
            { value: 'equipment', icon: <Truck className="size-5" />, label: 'Техника' },
            { value: 'repairs', icon: <Wrench className="size-5" />, label: 'Ремонты' },
            { value: 'trips', icon: <Route className="size-5" />, label: 'Рейсы' },
            { value: 'employees', icon: <Users className="size-5" />, label: 'Сотрудники' },
            { value: 'companies', icon: <Building2 className="size-5" />, label: 'Компании' },
            { value: 'map', icon: <Map className="size-5" />, label: 'Карта' },
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
      <RepairDetailDialog open={repairDetailOpen} onOpenChange={setRepairDetailOpen} repair={selectedRepair} loading={repairDetailLoading} fullPhoto={fullPhoto} setFullPhoto={setFullPhoto} onEdit={(r) => { setRepairDetailOpen(false); setRepairFormEdit(r); setRepairFormEquipmentId(r.equipmentId); setRepairFormOpen(true) }} onDelete={(r) => { setRepairDetailOpen(false); setDeleteDialog({ open: true, type: 'repair', id: r.id, name: r.description }) }} onComplete={async (r) => { try { const res = await fetch(`/api/repairs/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...r, status: 'completed', endDate: new Date().toISOString() }) }); if (!res.ok) throw new Error(); toast.success('Ремонт завершён'); fetchRepairDetail(r.id); fetchAll() } catch { toast.error('Ошибка завершения ремонта') } }} onAddStage={(repairId) => { setStageFormRepairId(repairId); setStageFormEdit(null); setStageFormOpen(true) }} onEditStage={(stage, repairId) => { setStageFormRepairId(repairId); setStageFormEdit(stage); setStageFormOpen(true) }} onDeleteStage={async (stageId, repairId) => { try { const res = await fetch(`/api/repairs/${repairId}/stages?stageId=${stageId}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); toast.success('Этап удалён'); fetchRepairDetail(repairId); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } catch { toast.error('Ошибка удаления этапа') } }} onUploadPhoto={(repairId) => setPhotoUploadRepair(repairId)} onRefresh={() => { if (selectedRepair) { fetchRepairDetail(selectedRepair.id); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } }} employees={employees} />
      <RepairFormDialog open={repairFormOpen} onOpenChange={setRepairFormOpen} editData={repairFormEdit} equipmentId={repairFormEquipmentId} equipmentList={equipment} saving={repairFormSaving} setSaving={setRepairFormSaving} onSaved={() => { setRepairFormOpen(false); fetchAll() }} employees={employees} />
      <CompanyFormDialog open={companyFormOpen} onOpenChange={setCompanyFormOpen} editData={companyFormEdit} saving={companyFormSaving} setSaving={setCompanyFormSaving} onSaved={() => { setCompanyFormOpen(false); fetchAll() }} />
      <StageFormDialog open={stageFormOpen} onOpenChange={setStageFormOpen} repairId={stageFormRepairId} editData={stageFormEdit} saving={stageFormSaving} setSaving={setStageFormSaving} onSaved={() => { setStageFormOpen(false); if (selectedRepair) { fetchRepairDetail(selectedRepair.id); fetchRepairs(); if (selectedEq) fetchEquipmentDetail(selectedEq.id) } }} />
      <PhotoUploadDialog open={!!photoUploadEq} onOpenChange={(v) => { if (!v) setPhotoUploadEq(null) }} targetId={photoUploadEq || ''} targetType="equipment" onUploaded={() => { setPhotoUploadEq(null); if (selectedEq) fetchEquipmentDetail(selectedEq.id); fetchAll() }} />
      <RepairPhotoUploadDialog open={!!photoUploadRepair} onOpenChange={(v) => { if (!v) setPhotoUploadRepair(null) }} targetId={photoUploadRepair || ''} stages={selectedRepair?.stages || []} onUploaded={() => { setPhotoUploadRepair(null); if (selectedRepair) fetchRepairDetail(selectedRepair.id) }} />
      <TripDetailDialog open={tripDetailOpen} onOpenChange={setTripDetailOpen} trip={selectedTrip} loading={tripDetailLoading} crews={crews} onEdit={(t) => { setTripDetailOpen(false); setTripFormEdit(t); setTripFormEquipmentId(t.equipmentId); setTripFormOpen(true) }} onDelete={(t) => { setTripDetailOpen(false); setDeleteDialog({ open: true, type: 'trip', id: t.id, name: t.route }) }} onStart={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) }); if (!res.ok) throw new Error(); toast.success('Рейс начат'); fetchTripDetail(t.id); fetchAll() } catch { toast.error('Ошибка') } }} onComplete={async (t) => { try { const res = await fetch(`/api/trips/${t.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete' }) }); if (!res.ok) { const errData = await res.json().catch(() => null); throw new Error(errData?.error || 'Ошибка') } toast.success('Рейс завершён'); fetchTripDetail(t.id); fetchAll() } catch (e: any) { toast.error(e.message || 'Ошибка завершения рейса') } }} onRefresh={() => selectedTrip && fetchTripDetail(selectedTrip.id)} />
      <TripFormDialog open={tripFormOpen} onOpenChange={setTripFormOpen} editData={tripFormEdit} equipmentId={tripFormEquipmentId} equipmentList={equipment} crews={crews} saving={tripFormSaving} setSaving={setTripFormSaving} onSaved={() => { setTripFormOpen(false); fetchAll() }} />
      <CrewFormDialog open={crewFormOpen} onOpenChange={setCrewFormOpen} editData={crewFormEdit} saving={crewFormSaving} setSaving={setCrewFormSaving} onSaved={() => { setCrewFormOpen(false); fetchAll() }} employees={employees} />
      <EmployeeDetailSheet open={empDetailOpen} onOpenChange={setEmpDetailOpen} employee={selectedEmp} loading={empDetailLoading} crews={crews} onEdit={(emp) => { setEmpDetailOpen(false); setEmpFormEdit(emp); setEmpFormOpen(true) }} onDelete={(emp) => { setEmpDetailOpen(false); setDeleteDialog({ open: true, type: 'employee', id: emp.id, name: emp.fullName }) }} onRefresh={() => selectedEmp && fetchEmployeeDetail(selectedEmp.id)} />
      <EmployeeFormDialog open={empFormOpen} onOpenChange={setEmpFormOpen} editData={empFormEdit} crews={crews} equipment={equipment} saving={empFormSaving} setSaving={setEmpFormSaving} onSaved={() => { setEmpFormOpen(false); fetchAll() }} />

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
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (
                <React.Fragment key={category}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</div>
                  {types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </React.Fragment>
              ))}
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
                    <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${getTypeInfo(eq.type).color} ${getTypeInfo(eq.type).darkColor}`}>{getTypeInfo(eq.type).icon}</div>
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
                  <div><span className="text-muted-foreground">Тип:</span> <TypeBadge type={eq.type} /></div>
                  <div><span className="text-muted-foreground">Владелец:</span> <span className="font-medium truncate">{eq.owner?.name || '—'}</span></div>
                  <div><span className="text-muted-foreground">Арендатор:</span> <span className="font-medium truncate">{eq.renter?.name || '—'}</span></div>
                </div>
                {eq.employees && eq.employees.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {eq.employees.map(emp => (
                      <span key={emp.id} className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[10px] font-medium ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || ''}`}>
                        {EMPLOYEE_POSITION_MAP[emp.position]?.icon}{emp.fullName.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-0.5"><Wrench className="size-3" />{eq._count?.repairs || 0}</span>
                  <span className="flex items-center gap-0.5"><Camera className="size-3" />{eq._count?.photos || 0}</span>
                  {eq.employees && eq.employees.length > 0 && <span className="flex items-center gap-0.5"><Users className="size-3" />{eq.employees.length}</span>}
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

function AssignEmployeeSelect({ eqId, assignedIds, onAssigned }: { eqId: string; assignedIds: string[]; onAssigned: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/employees?status=active&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then((data: Employee[]) => setResults(data.filter(e => !assignedIds.includes(e.id))))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [open, search, assignedIds])

  const handleAssign = async (empId: string) => {
    setAssigning(empId)
    try {
      await fetch(`/api/employees/${empId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipmentId: eqId }) })
      toast.success('Сотрудник назначен')
      onAssigned()
    } catch { toast.error('Ошибка назначения') }
    setAssigning(null)
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 gap-1.5 text-xs"><Plus className="size-3" />Назначить сотрудника</Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-[320px]" align="start">
          <div className="space-y-2">
            <Input placeholder="Поиск по ФИО..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {loading ? <div className="text-center py-2"><Loader2 className="size-4 animate-spin mx-auto text-muted-foreground" /></div> :
                results.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Нет доступных сотрудников</p> :
                results.map(emp => (
                  <button key={emp.id} className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent text-left" onClick={() => { handleAssign(emp.id); setOpen(false) }} disabled={assigning === emp.id}>
                    <div className={`size-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || ''}`}>
                      {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{emp.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position}{emp.equipment ? ` • ${emp.equipment.name}` : ''}</p>
                    </div>
                    {assigning === emp.id && <Loader2 className="size-3 animate-spin" />}
                  </button>
                ))
              }
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

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
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)

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
    setHistoryDateFrom(toLocalDatetime(from))
    setHistoryDateTo(toLocalDatetime(to))
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
              <TabsTrigger value="employees" className="gap-1 text-xs"><Users className="size-3" /><span className="hidden sm:inline">Сотрудники</span></TabsTrigger>
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
                      <DetailRow label="Тип" value={<TypeBadge type={eq.type} />} />
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
                      <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-shadow overflow-hidden" onClick={() => onOpenRepairDetail(r)}>
                        <CardContent className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium break-words min-w-0 flex-1">{r.description}</p>
                            <span className="shrink-0">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                            <span>{formatDate(r.startDate)}</span>{r.cost != null && <span>{formatPrice(r.cost)}</span>}
                          </div>
                          {r.masters && r.masters.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.masters.map(m => (
                                <span key={m.id} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${REPAIR_MASTER_ROLE_MAP[m.role]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                  <User className="size-2.5" />{m.employee.fullName}
                                </span>
                              ))}
                            </div>
                          )}
                          {r.stages && r.stages.length > 0 && (() => {
                            const completed = r.stages.filter(s => s.status === 'completed').length
                            const inProgress = r.stages.filter(s => s.status === 'in_progress').length
                            return (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>Этапы: {completed}/{r.stages.length} {inProgress > 0 && <span className="text-amber-600 dark:text-amber-400">({inProgress} в работе)</span>}</span>
                                  <span className="font-medium">{getStageProgress(r.stages)}%</span>
                                </div>
                                <Progress value={getStageProgress(r.stages)} className="h-1.5" />
                              </div>
                            )
                          })()}
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
                                    ? allEquipment.flatMap(e => (e.trackers || []).filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: e.name, registrationNum: e.registrationNum, equipmentId: e.id })))
                                    : eq.trackers!.filter(t => t.lastLatitude != null && t.lastLongitude != null).map(t => ({ ...t, equipmentName: eq.name, registrationNum: eq.registrationNum, equipmentId: eq.id }))
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
                                <DetailRow label="Топливо" value={tracker.lastFuelLevel != null ? `${tracker.lastFuelLevel} л` : undefined} />
                                <DetailRow label="Пробег" value={tracker.lastMileage != null ? `${tracker.lastMileage?.toLocaleString('ru-RU')} км` : undefined} />
                                {tracker.lastEngineTemp != null && <DetailRow label="Темп. двигателя" value={`${tracker.lastEngineTemp}°C`} />}
                                {tracker.sensorData && (() => {
                                  // Filter: only sensors with values, exclude types already shown above (fuel, ignition, mileage, temperature)
                                  const alreadyShownTypes = ['fuel', 'ignition', 'temperature', 'temp', 'odometer', 'mileage']
                                  const alreadyShownNames = ['топлив', 'зажиган', 'пробег', 'темпер', 'бак']
                                  const extraSensors = getUniqueSensors(
                                    tracker.sensorData.filter(s => {
                                      if (s.value == null && (s.stringValue == null || s.stringValue === '')) return false
                                      const type = (s.sensorType || '').toLowerCase()
                                      const name = (s.sensorName || '').toLowerCase()
                                      if (alreadyShownTypes.some(t => type.includes(t))) return false
                                      if (alreadyShownNames.some(n => name.includes(n))) return false
                                      return true
                                    })
                                  )
                                  if (extraSensors.length === 0) return null
                                  return (
                                    <>
                                      <div className="col-span-2 mt-1 pt-1 border-t border-dashed border-border/40">
                                        <p className="text-[10px] font-medium text-muted-foreground mb-1">Доп. датчики</p>
                                      </div>
                                      {extraSensors.map((s, i) => {
                                        const isIgnition = s.sensorType === 'ignition' || /зажиган/i.test(s.sensorName || '')
                                        const isFuel = s.sensorType === 'fuel' || /топлив|бак/i.test(s.sensorName || '')
                                        let displayVal: string
                                        if (isIgnition && s.value != null) {
                                          displayVal = s.value > 0 ? 'On' : 'Off'
                                        } else if (isFuel) {
                                          displayVal = `${s.value ?? s.stringValue ?? '—'} л`
                                        } else {
                                          displayVal = `${(s.value ?? s.stringValue) || '—'}${s.unit ? ` ${s.unit}` : ''}`
                                        }
                                        return <DetailRow key={i} label={s.sensorName || s.sensorType} value={displayVal} />
                                      })}
                                    </>
                                  )
                                })()}
                                {(!tracker.sensorData || getUniqueSensors(
                                  tracker.sensorData.filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
                                ).length === 0) && tracker.lastEngineTemp == null && (
                                  <p className="text-[10px] text-muted-foreground col-span-2">Нет данных датчиков</p>
                                )}
                              </DetailSection>
                              <DetailSection title="Связь" icon={<Clock className="size-3.5" />}>
                                <DetailRow label="Выход на связь" value={formatDateTime(tracker.lastSeenAt)} />
                                <DetailRow label="Позиция" value={formatDateTime(tracker.lastPositionAt)} />
                              </DetailSection>

                              {/* Date range for historical data — collapsible */}
                              <div>
                                <button className="flex items-center gap-1.5 text-xs font-semibold w-full text-left" onClick={() => setHistoryPanelOpen(prev => !prev)}>
                                  <Calendar className="size-3.5 text-muted-foreground" />
                                  <span>Запрос данных за период</span>
                                  <ChevronDown className={`size-3 text-muted-foreground transition-transform ${historyPanelOpen ? '' : '-rotate-90'}`} />
                                </button>
                                {historyPanelOpen && (
                                  <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-[10px]">С</Label>
                                        <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} />
                                      </div>
                                      <div>
                                        <Label className="text-[10px]">По</Label>
                                        <Input type="datetime-local" className="h-7 text-[11px]" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} />
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                                        <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyDatePreset(preset)}>{preset}</Button>
                                      ))}
                                    </div>
                                    <Button size="sm" className="h-7 text-[11px] w-full gap-1" disabled={!historyDateFrom || !historyDateTo || historyLoading} onClick={() => fetchHistoricalData(tracker)}>
                                      {historyLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                                      Запросить данные
                                    </Button>
                                  </div>
                                )}
                              </div>

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
                                <Button size="icon" variant="ghost" className="size-6 text-muted-foreground hover:text-destructive" onClick={() => {
                                  if (confirm('Отключить трекер от этой техники?')) {
                                    fetch(`/api/glonass/${tracker.id}`, { method: 'DELETE' }).then(() => {
                                      toast.success('Трекер отключён')
                                      onRefresh()
                                      onRefreshAll()
                                    }).catch(() => toast.error('Ошибка'))
                                  }
                                }}><Trash2 className="size-3" /></Button>
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

                {detailTab === 'employees' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    {/* Assigned employees */}
                    {(!eq.employees || eq.employees.length === 0) ? (
                      <div className="text-center py-6 text-muted-foreground"><Users className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет назначенных сотрудников</p></div>
                    ) : (
                      <div className="space-y-2">
                        {eq.employees.map(emp => (
                          <div key={emp.id} className="flex items-center gap-2.5 p-2 rounded-lg border bg-card">
                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || 'dark:bg-gray-900/40 dark:text-gray-400'}`}>
                              {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{emp.fullName}</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] h-4 px-1">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position}</Badge>
                                {emp.licenseCat && <span className="text-[10px] text-muted-foreground">Кат. {emp.licenseCat}</span>}
                                <Badge className={`text-[10px] h-4 px-1 ${EMPLOYEE_STATUS_MAP[emp.status]?.color || ''}`}>{EMPLOYEE_STATUS_MAP[emp.status]?.label || emp.status}</Badge>
                              </div>
                            </div>
                            {emp.phone && <a href={`tel:${emp.phone}`} className="text-muted-foreground hover:text-foreground"><Phone className="size-3.5" /></a>}
                            <Button variant="ghost" size="sm" className="size-7 h-auto w-auto p-1 text-muted-foreground hover:text-destructive" onClick={async () => { await fetch(`/api/employees/${emp.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipmentId: '' }) }); onRefresh(); toast.success('Сотрудник откреплён') }}><X className="size-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Assign employee */}
                    <AssignEmployeeSelect eqId={eq.id} assignedIds={(eq.employees || []).map(e => e.id)} onAssigned={onRefresh} />
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

function DetailRow({ label, value }: { label: string; value?: React.ReactNode | string | null }) {
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
  const [createMode, setCreateMode] = useState<'manual' | 'axenta'>('manual')
  const [axentaObjects, setAxentaObjects] = useState<Array<{ id: number; name: string; uniqueId: string; connectedStatus: boolean; isLinked: boolean; lastMessage: { time: string; posTime: string; position: { x: number; y: number; s: number; c: number } } | null }>>([])
  const [axentaLoading, setAxentaLoading] = useState(false)
  const [selectedAxentaId, setSelectedAxentaId] = useState<string>('')

  useEffect(() => {
    if (editData) {
      setCreateMode('manual')
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
        purchaseDate: editData.purchaseDate ? toLocalDate(editData.purchaseDate) : '',
        purchasePrice: editData.purchasePrice?.toString() || '', currentPrice: editData.currentPrice?.toString() || '',
        insuranceNumber: editData.insuranceNumber || '',
        insuranceExpiry: editData.insuranceExpiry ? toLocalDate(editData.insuranceExpiry) : '',
        inspectionDate: editData.inspectionDate ? toLocalDate(editData.inspectionDate) : '',
        inspectionExpiry: editData.inspectionExpiry ? toLocalDate(editData.inspectionExpiry) : '',
        status: editData.status || 'active', notes: editData.notes || '',
        ownerId: editData.ownerId || '', renterId: editData.renterId || '',
      })
    } else {
      setCreateMode('manual')
      setSelectedAxentaId('')
      setForm({ type: 'автомобиль', status: 'active' })
    }
    setStep(0)
  }, [editData, open, setStep])

  // Load Axenta objects when switching to axenta mode
  const loadAxentaObjects = useCallback(async () => {
    setAxentaLoading(true)
    try {
      const res = await fetch('/api/glonass/objects')
      if (res.ok) {
        const data = await res.json()
        setAxentaObjects(data.objects || [])
      } else {
        toast.error('Ошибка получения объектов Axenta')
      }
    } catch {
      toast.error('Ошибка подключения к Axenta')
    }
    setAxentaLoading(false)
  }, [])

  useEffect(() => {
    if (createMode === 'axenta' && axentaObjects.length === 0) {
      loadAxentaObjects()
    }
  }, [createMode, axentaObjects.length, loadAxentaObjects])

  // When selecting an Axenta object, fill form fields
  const handleSelectAxentaObject = (objId: string) => {
    setSelectedAxentaId(objId)
    const obj = axentaObjects.find(o => String(o.id) === objId)
    if (obj) {
      setForm(prev => ({
        ...prev,
        name: obj.name || prev.name,
        serialNumber: obj.uniqueId || prev.serialNumber,
      }))
    }
  }

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
      const savedEquipment = await res.json()

      // If creating from Axenta object, also link the tracker
      if (!editData && createMode === 'axenta' && selectedAxentaId) {
        const obj = axentaObjects.find(o => String(o.id) === selectedAxentaId)
        if (obj) {
          try {
            await fetch('/api/glonass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                equipmentId: savedEquipment.id,
                trackerId: String(obj.uniqueId || obj.id),
                trackerName: obj.name,
                axentaCloudId: String(obj.id),
              }),
            })
          } catch {
            toast.warning('Техника добавлена, но не удалось подключить трекер')
          }
        }
      }

      toast.success(editData ? 'Техника обновлена' : 'Техника добавлена')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  const unlinkedAxentaObjects = axentaObjects.filter(o => !o.isLinked)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editData ? <Edit className="size-4" /> : <Plus className="size-4" />}
            {editData ? 'Редактирование техники' : 'Добавление техники'}
          </DialogTitle>
          <DialogDescription>{editData ? `Шаг ${step + 1} из ${steps.length}: ${steps[step].title}` : createMode === 'axenta' ? 'Выберите объект из Axenta для автоматического добавления' : `Шаг ${step + 1} из ${steps.length}: ${steps[step].title}`}</DialogDescription>
        </DialogHeader>

        {/* Mode selector — only when creating new */}
        {!editData && (
          <div className="flex gap-2 px-4 sm:px-5">
            <Button size="sm" variant={createMode === 'manual' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1.5" onClick={() => setCreateMode('manual')}>
              <Plus className="size-3" />Создать новую
            </Button>
            <Button size="sm" variant={createMode === 'axenta' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1.5" onClick={() => setCreateMode('axenta')}>
              <Satellite className="size-3" />Из Axenta
            </Button>
          </div>
        )}

        {/* Step indicator — compact */}
        <div className="flex items-center gap-0.5 px-4 sm:px-5 overflow-x-auto shrink-0">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {s.icon}<span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Axenta object selection */}
        {!editData && createMode === 'axenta' ? (
          <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 py-2">
            {axentaLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Загрузка объектов...</span></div>
            ) : unlinkedAxentaObjects.length === 0 ? (
              <div className="text-center py-12">
                <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{axentaObjects.length === 0 ? 'Нет объектов в Axenta. Проверьте настройки интеграции.' : 'Все объекты Axenta уже привязаны к технике'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unlinkedAxentaObjects.map(obj => {
                    const isSelected = String(obj.id) === selectedAxentaId
                    const lastTime = obj.lastMessage?.posTime || obj.lastMessage?.time
                    return (
                      <Card key={obj.id} className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:shadow-sm'}`} onClick={() => handleSelectAxentaObject(String(obj.id))}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`size-6 rounded flex items-center justify-center ${obj.connectedStatus ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                              <Satellite className={`size-3 ${obj.connectedStatus ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                            </div>
                            <p className="text-xs font-medium truncate flex-1">{obj.name}</p>
                            {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <p>IMEI: {obj.uniqueId}</p>
                            {obj.lastMessage?.position && (
                              <p>Скорость: {obj.lastMessage.position.s || 0} км/ч</p>
                            )}
                            {lastTime && (
                              <p>Последняя связь: {formatDateTime(lastTime)}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {selectedAxentaId && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-[11px] font-medium text-muted-foreground">Данные техники (можно отредактировать)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2"><Label className="text-xs">Наименование *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} /></div>
                      <div><Label className="text-xs">Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (<React.Fragment key={category}><div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</div>{types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</React.Fragment>))}</SelectContent></Select></div>
                      <div><Label className="text-xs">Гос. номер</Label><Input value={f('registrationNum')} onChange={e => setF('registrationNum', e.target.value)} placeholder="А000АА 00" /></div>
                      <div><Label className="text-xs">Марка</Label><Input value={f('brand')} onChange={e => setF('brand', e.target.value)} /></div>
                      <div><Label className="text-xs">Модель</Label><Input value={f('model')} onChange={e => setF('model', e.target.value)} /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">VIN номер</Label><Input value={f('vin')} onChange={e => setF('vin', e.target.value)} placeholder="17 символов" /></div>
                      <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Компания-владелец</Label><Select value={f('ownerId') || '_none'} onValueChange={v => setF('ownerId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не указан" /></SelectTrigger><SelectContent><SelectItem value="_none">Не указан</SelectItem>{companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 py-2">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Наименование *</Label><Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Грузовой автомобиль ГАЗель" autoFocus /></div>
              <div><Label className="text-xs">Тип</Label><Select value={f('type')} onValueChange={v => setF('type', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (<React.Fragment key={category}><div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</div>{types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</React.Fragment>))}</SelectContent></Select></div>
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
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!editData && createMode === 'axenta' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setCreateMode('manual'); setSelectedAxentaId('') }}><ChevronLeft className="size-3.5" />Назад</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !selectedAxentaId || !f('name').trim()}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}Добавить с трекером</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="size-3.5" />Назад</Button>
              {step < steps.length - 1 ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !f('name').trim()}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
                  <Button size="sm" onClick={() => setStep(step + 1)}>Далее<ChevronRight className="size-3.5" /></Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleSave} disabled={saving || !f('name').trim()}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
              )}
            </>
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
            <Card key={r.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-3 overflow-hidden ${r.status === 'in_progress' ? 'border-l-amber-500' : r.status === 'completed' ? 'border-l-emerald-500' : 'border-l-red-500'}`} onClick={() => onOpenDetail(r)}>
              <CardHeader className="pb-1.5 pt-3 px-3">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0"><Wrench className="size-3.5 text-amber-600 dark:text-amber-400" /></div>
                    <div className="min-w-0 overflow-hidden">
                      <CardTitle className="text-sm font-semibold break-words line-clamp-2">{r.description}</CardTitle>
                      <p className="text-[11px] text-muted-foreground truncate">{r.equipment?.name}</p>
                    </div>
                  </div>
                  <span className="shrink-0">{statusBadge(r.status, REPAIR_STATUS_MAP)}</span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
                <Separator />
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  <div className="overflow-hidden"><span className="text-muted-foreground">Начало:</span> <span className="font-medium">{formatDate(r.startDate)}</span></div>
                  <div className="overflow-hidden"><span className="text-muted-foreground">Стоимость:</span> <span className="font-medium">{formatPrice(r.cost)}</span></div>
                  <div className="overflow-hidden"><span className="text-muted-foreground">Подрядчик:</span> <span className="font-medium truncate block">{r.contractor || '—'}</span></div>
                  <div className="overflow-hidden"><span className="text-muted-foreground">Причина:</span> <span className="font-medium truncate block">{r.reason || '—'}</span></div>
                </div>
                {r.masters && r.masters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {r.masters.map(m => (
                      <span key={m.id} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${REPAIR_MASTER_ROLE_MAP[m.role]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <User className="size-2.5" />{m.employee.fullName}
                      </span>
                    ))}
                  </div>
                )}
                {r.stages && r.stages.length > 0 && (() => {
                  const completed = r.stages.filter(s => s.status === 'completed').length
                  const inProgress = r.stages.filter(s => s.status === 'in_progress').length
                  return (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Этапы: {completed}/{r.stages.length} {inProgress > 0 && <span className="text-amber-600 dark:text-amber-400">({inProgress} в работе)</span>}</span>
                        <span className="font-medium">{getStageProgress(r.stages)}%</span>
                      </div>
                      <Progress value={getStageProgress(r.stages)} className="h-1.5" />
                    </div>
                  )
                })()}
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
// REPAIR MASTERS SECTION — НАЗНАЧЕННЫЕ МАСТЕРА
// ═══════════════════════════════════════════════════════════════

function RepairMastersSection({ repair, employees, onRefresh }: {
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
                  <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {m.employee.phone && <span>{m.employee.phone}</span>}
                    {m.employee.position && <span>{EMPLOYEE_POSITION_MAP[m.employee.position]?.label || m.employee.position}</span>}
                  </div>
                </div>
                {repair.status === 'in_progress' && (
                  <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => handleRemove(m.employeeId)} aria-label="Снять с ремонта">
                    <X className="size-3" />
                  </Button>
                )}
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

function RepairDetailDialog({ open, onOpenChange, repair, loading, fullPhoto, setFullPhoto, onEdit, onDelete, onComplete, onAddStage, onEditStage, onDeleteStage, onUploadPhoto, onRefresh, employees }: {
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

              {/* Assigned Masters */}
              <RepairMastersSection repair={r} employees={employees} onRefresh={onRefresh} />

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

function RepairFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, saving, setSaving, onSaved, employees }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Repair | null; equipmentId: string; equipmentList: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
  employees: Employee[];
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [stages, setStages] = useState<{ name: string; description: string }[]>([])
  const [selectedMasters, setSelectedMasters] = useState<{ employeeId: string; role: string }[]>([])

  useEffect(() => {
    if (editData) {
      setForm({
        equipmentId: editData.equipmentId, description: editData.description || '', reason: editData.reason || '',
        startDate: editData.startDate ? toLocalDate(editData.startDate) : toLocalDate(new Date()),
        endDate: editData.endDate ? toLocalDate(editData.endDate) : '',
        status: editData.status || 'in_progress', cost: editData.cost?.toString() || '',
        contractor: editData.contractor || '', contractorPhone: editData.contractorPhone || '',
        workPerformed: editData.workPerformed || '', spareParts: editData.spareParts || '',
        nextInspection: editData.nextInspection ? toLocalDate(editData.nextInspection) : '',
        notes: editData.notes || '',
      })
      // Pre-fill existing masters
      setSelectedMasters(editData.masters?.map(m => ({ employeeId: m.employeeId, role: m.role })) || [])
      setStages([])
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: toLocalDate(new Date()), status: 'in_progress' })
      setSelectedMasters([])
      setStages([])
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const addMaster = (employeeId: string) => {
    if (!employeeId || selectedMasters.some(m => m.employeeId === employeeId)) return
    setSelectedMasters([...selectedMasters, { employeeId, role: 'master' }])
  }

  const removeMaster = (employeeId: string) => {
    setSelectedMasters(selectedMasters.filter(m => m.employeeId !== employeeId))
  }

  const updateMasterRole = (employeeId: string, role: string) => {
    setSelectedMasters(selectedMasters.map(m => m.employeeId === employeeId ? { ...m, role } : m))
  }

  const availableEmployees = employees.filter(e => e.status === 'active' && !selectedMasters.some(m => m.employeeId === e.id))

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('description').trim()) { toast.error('Укажите описание ремонта'); return }
    setSaving(true)
    try {
      const body = { ...form, stages: editData ? undefined : stages.filter(s => s.name.trim()), masters: selectedMasters }
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

          {/* Masters assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs flex items-center gap-1"><Users className="size-3" />Назначить мастеров</Label>
              {availableEmployees.length > 0 && (
                <Select onValueChange={addMaster}>
                  <SelectTrigger className="h-6 w-auto gap-1 text-[11px] border-dashed"><Plus className="size-3" /><SelectValue placeholder="Добавить" /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.fullName} — {EMPLOYEE_POSITION_MAP[e.position]?.label || e.position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedMasters.length > 0 ? (
              <div className="space-y-1">
                {selectedMasters.map(m => {
                  const emp = employees.find(e => e.id === m.employeeId)
                  if (!emp) return null
                  return (
                    <div key={m.employeeId} className="flex items-center gap-2 p-1.5 rounded-md border bg-card/50">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="size-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{emp.fullName}</p>
                      </div>
                      <Select value={m.role} onValueChange={v => updateMasterRole(m.employeeId, v)}>
                        <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(REPAIR_MASTER_ROLE_MAP).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => removeMaster(m.employeeId)} aria-label="Удалить">
                        <X className="size-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Мастера не выбраны</p>
            )}
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
      setForm({ name: editData.name || '', description: editData.description || '', status: editData.status || 'pending', startDate: editData.startDate ? toLocalDate(editData.startDate) : '', endDate: editData.endDate ? toLocalDate(editData.endDate) : '', performer: editData.performer || '', cost: editData.cost?.toString() || '', sortOrder: editData.sortOrder?.toString() || '0' })
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
                            {m.employeeId ? <UserCheck className="size-3 text-primary" /> : <UserCircle className="size-3 text-muted-foreground" />}
                            <span className={m.employeeId ? 'font-medium' : ''}>{m.fullName}</span>
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
                  <div><span className="text-muted-foreground">Начало:</span> <span className="font-medium">{formatDateTime(t.startDate)}</span></div>
                  <div><span className="text-muted-foreground">Груз:</span> <span className="font-medium truncate">{t.cargo || '—'}</span></div>
                  <div><span className="text-muted-foreground">Расстояние:</span> <span className="font-medium">{t.distance != null ? `${t.distance} км` : '—'}</span></div>
                  <div><span className="text-muted-foreground">Экипаж:</span> <span className="font-medium truncate">{t.crew?.name || '—'}</span></div>
                  {t.status === 'completed' && t.fuelConsumed != null && (
                    <div><span className="text-muted-foreground">Топливо:</span> <span className="font-medium text-amber-600 dark:text-amber-400">{t.fuelConsumed} л</span></div>
                  )}
                  {t.status === 'completed' && t.mileageStart != null && t.mileageEnd != null && (
                    <div><span className="text-muted-foreground">Пробег:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">{(t.mileageEnd - t.mileageStart).toLocaleString('ru-RU')} км</span></div>
                  )}
                  {t.endDate && (
                    <div><span className="text-muted-foreground">Окончание:</span> <span className="font-medium">{formatDateTime(t.endDate)}</span></div>
                  )}
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
  const [trackData, setTrackData] = useState<Record<string, unknown> | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [trackDateFrom, setTrackDateFrom] = useState<string>('')
  const [trackDateTo, setTrackDateTo] = useState<string>('')
  const [sensorData, setSensorData] = useState<Record<string, unknown> | null>(null)
  const [sensorLoading, setSensorLoading] = useState(false)
  const [sensorError, setSensorError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  // Reset track and sensor data when trip changes — must be before any early return (Rules of Hooks)
  useEffect(() => {
    setTrackData(null)
    setTrackError(null)
    setTrackDateFrom('')
    setTrackDateTo('')
    setSensorData(null)
    setSensorError(null)
    setApplySuccess(null)
  }, [trip?.id])

  if (!trip) return null
  const t = trip
  const crew = crews.find(c => c.id === t.crewId)
  const isCompleted = t.status === 'completed'

  // Parse tracker snapshot
  let trackerSnapshot: Record<string, unknown> | null = null
  if (t.trackerSnapshot) {
    try { trackerSnapshot = JSON.parse(t.trackerSnapshot) } catch { /* ignore */ }
  }

  // Duration formatter
  const fmtDur = (sec: number | null | undefined) => {
    if (sec == null) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    if (h > 0) return `${h} ч ${m} мин`
    if (m > 0) return `${m} мин ${s} сек`
    return `${s} сек`
  }

  // Calculated distance from mileage
  const calcDistKm = (t.mileageStart != null && t.mileageEnd != null) ? t.mileageEnd - t.mileageStart : null
  const displayDist = t.distance ?? calcDistKm

  // Load track data from Axenta for the trip period (or custom dates)
  const loadTrack = async () => {
    setTrackLoading(true)
    setTrackError(null)
    try {
      // Build URL with optional date overrides
      const params = new URLSearchParams({ action: 'track' })
      const from = trackDateFrom || (t.startDate ? toLocalDatetime(t.startDate) : '')
      const to = trackDateTo || (t.endDate ? toLocalDatetime(t.endDate) : '')
      if (!from || !to) {
        throw new Error('Укажите период для загрузки трека')
      }
      params.set('from', new Date(from).toISOString())
      params.set('to', new Date(to).toISOString())
      const res = await fetch(`/api/trips/${t.id}?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка загрузки трека')
      }
      const data = await res.json()
      setTrackData(data)
    } catch (e: any) {
      setTrackError(e.message || 'Ошибка загрузки трека')
    }
    setTrackLoading(false)
  }

  // Load sensor data from tracker
  const loadSensors = async () => {
    setSensorLoading(true)
    setSensorError(null)
    setApplySuccess(null)
    try {
      const res = await fetch(`/api/trips/${t.id}?action=sensors`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка загрузки датчиков')
      }
      const data = await res.json()
      setSensorData(data)
    } catch (e: any) {
      setSensorError(e.message || 'Ошибка загрузки датчиков')
    }
    setSensorLoading(false)
  }

  // Apply sensor data to trip fields
  const applySensorFields = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/trips/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
      toast.success('Данные датчиков применены')
      setApplySuccess('Данные успешно заполнены из трекера')
      onRefresh()
    } catch {
      toast.error('Ошибка применения данных')
    }
  }

  // Apply start values (fuel + mileage at start)
  const applyStartValues = () => {
    if (!sensorData) return
    const cur = sensorData.current as Record<string, unknown> | undefined
    if (!cur) return
    const fields: Record<string, unknown> = {}
    if (cur.fuelLevel != null && t.fuelStart == null) fields.fuelStart = Number(cur.fuelLevel)
    if (cur.mileage != null && t.mileageStart == null) fields.mileageStart = Math.round(Number(cur.mileage))
    if (Object.keys(fields).length === 0) {
      toast.info('Нет данных для заполнения или поля уже заполнены')
      return
    }
    applySensorFields(fields)
  }

  // Apply end values (fuel + mileage at end) + trip stats
  const applyEndValues = () => {
    if (!sensorData) return
    const cur = sensorData.current as Record<string, unknown> | undefined
    const stats = sensorData.tripStats as Record<string, unknown> | null | undefined
    const fields: Record<string, unknown> = {}
    if (cur?.fuelLevel != null && t.fuelEnd == null) fields.fuelEnd = Number(cur.fuelLevel)
    if (cur?.mileage != null && t.mileageEnd == null) fields.mileageEnd = Math.round(Number(cur.mileage))
    if (stats) {
      if (stats.mileage != null && t.distance == null) fields.distance = Number(stats.mileage)
      if (stats.avgSpeed != null && t.avgSpeed == null) fields.avgSpeed = Number(stats.avgSpeed)
      if (stats.maxSpeed != null && t.maxSpeed == null) fields.maxSpeed = Number(stats.maxSpeed)
      if (stats.fuelConsumption != null && t.fuelConsumed == null) fields.fuelConsumed = Number(stats.fuelConsumption)
      if (stats.avgFuelConsumption != null && t.avgFuelRate == null) fields.avgFuelRate = Number(stats.avgFuelConsumption)
      if (stats.refuelVolume != null && t.refuelVolume == null) fields.refuelVolume = Number(stats.refuelVolume)
      if (stats.plumVolume != null && t.plumVolume == null) fields.plumVolume = Number(stats.plumVolume)
      if (stats.tripsDuration != null && t.tripDuration == null) fields.tripDuration = Number(stats.tripsDuration)
      if (stats.parkingsDuration != null && t.parkingsDuration == null) fields.parkingsDuration = Number(stats.parkingsDuration)
      if (stats.engineHours != null && t.engineHours == null) fields.engineHours = Number(stats.engineHours)
      if (stats.idleTime != null && t.idleTime == null) fields.idleTime = Number(stats.idleTime)
    }
    // Calculate derived values
    if (fields.fuelEnd != null && t.fuelStart != null && !fields.fuelConsumed) {
      fields.fuelConsumed = Math.round((t.fuelStart! - (fields.fuelEnd as number)) * 100) / 100
      if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
    }
    if (fields.mileageEnd != null && t.mileageStart != null && !fields.distance) {
      fields.distance = (fields.mileageEnd as number) - t.mileageStart!
    }
    if (Object.keys(fields).length === 0) {
      toast.info('Нет данных для заполнения или поля уже заполнены')
      return
    }
    applySensorFields(fields)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
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
                <DetailRow label="Расстояние" value={displayDist != null ? `${displayDist.toFixed(1)} км` : undefined} />
              </DetailSection>
              <DetailSection title="Груз" icon={<Package className="size-3.5" />}>
                <DetailRow label="Груз" value={t.cargo} />
                <DetailRow label="Вес (т)" value={t.cargoWeight?.toString()} />
              </DetailSection>
              <DetailSection title="Время" icon={<Calendar className="size-3.5" />}>
                <DetailRow label="Начало рейса" value={formatDateTime(t.startDate)} />
                <DetailRow label="Планируемое окончание" value={formatDateTime(t.plannedEndDate)} />
                <DetailRow label="Окончание рейса" value={formatDateTime(t.endDate)} />
                {isCompleted && t.tripDuration != null && (
                  <DetailRow label="Длительность" value={fmtDur(t.tripDuration)} />
                )}
                {isCompleted && t.parkingsDuration != null && (
                  <DetailRow label="Время стоянок" value={fmtDur(t.parkingsDuration)} />
                )}
              </DetailSection>
              <DetailSection title="Экипаж" icon={<Users className="size-3.5" />}>
                <DetailRow label="Экипаж" value={crew?.name || t.crew?.name} />
                {crew?.members && crew.members.length > 0 && (
                  <div className="col-span-2 space-y-0.5 pl-2">
                    {crew.members.map(m => (
                      <div key={m.id} className="flex items-center gap-1 text-[10px]">
                        {m.employeeId ? <UserCheck className="size-3 text-primary" /> : <UserCircle className="size-3 text-muted-foreground" />}
                        <span className={m.employeeId ? 'font-medium' : ''}>{m.fullName}</span>
                        <span className="text-muted-foreground">({MEMBER_ROLE_MAP[m.role] || m.role})</span>
                        {m.phone && <span className="text-muted-foreground">• {m.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </DetailSection>

              {/* ── ТОПЛИВО И ПРОБЕГ ── */}
              <DetailSection title="Топливо и пробег" icon={<Fuel className="size-3.5" />}>
                <DetailRow label="Топливо на старте (л)" value={t.fuelStart?.toString()} />
                <DetailRow label="Топливо на финише (л)" value={t.fuelEnd?.toString()} />
                {isCompleted && t.fuelConsumed != null && (
                  <DetailRow label="Израсходовано (л)" value={
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{t.fuelConsumed} л</span> as any
                  } />
                )}
                {isCompleted && t.avgFuelRate != null && (
                  <DetailRow label="Средний расход (л/100км)" value={`${t.avgFuelRate}`} />
                )}
                {isCompleted && t.refuelVolume != null && t.refuelVolume > 0 && (
                  <DetailRow label="Заправки (л)" value={`${t.refuelVolume}`} />
                )}
                {isCompleted && t.plumVolume != null && t.plumVolume > 0 && (
                  <DetailRow label="Сливы (л)" value={
                    <span className="font-semibold text-red-600 dark:text-red-400">{t.plumVolume}</span> as any
                  } />
                )}
                <DetailRow label="Пробег на старте (км)" value={t.mileageStart?.toLocaleString('ru-RU')} />
                <DetailRow label="Пробег на финише (км)" value={t.mileageEnd?.toLocaleString('ru-RU')} />
                {(t.mileageStart != null && t.mileageEnd != null) && (
                  <DetailRow label="Пройдено (км)" value={
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{(t.mileageEnd! - t.mileageStart!).toLocaleString('ru-RU')} км</span> as any
                  } />
                )}
              </DetailSection>

              {/* ── АНАЛИТИКА ТРЕКЕРА (для завершённых рейсов) ── */}
              {isCompleted && (
                <DetailSection title="Аналитика трекера" icon={<Gauge className="size-3.5" />}>
                  {t.avgSpeed != null && <DetailRow label="Средняя скорость (км/ч)" value={t.avgSpeed.toString()} />}
                  {t.maxSpeed != null && <DetailRow label="Макс. скорость (км/ч)" value={t.maxSpeed.toString()} />}
                  {t.engineHours != null && <DetailRow label="Моточасы" value={t.engineHours.toString()} />}
                  {t.idleTime != null && <DetailRow label="Холостой ход" value={fmtDur(t.idleTime)} />}
                  {!t.avgSpeed && !t.maxSpeed && !t.engineHours && !t.fuelConsumed && !trackerSnapshot && (
                    <p className="text-xs text-muted-foreground col-span-2">Данные трекера отсутствуют. Завершите рейс с подключённым трекером для получения аналитики.</p>
                  )}
                </DetailSection>
              )}

              {/* ── ДАННЫЕ ДАТЧИКОВ ИЗ СНАПШОТА ── */}
              {isCompleted && trackerSnapshot && (trackerSnapshot as any).sensors && (trackerSnapshot as any).sensors.length > 0 && (
                <DetailSection title="Датчики (на момент завершения)" icon={<CircuitBoard className="size-3.5" />}>
                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-1">
                      {(trackerSnapshot as any).sensors.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5 px-1.5 rounded bg-muted/50">
                          <span className="text-muted-foreground">{s.name || s.type}</span>
                          <span className="font-medium ml-auto">{s.value != null ? `${s.value}${s.unit ? ' ' + s.unit : ''}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </DetailSection>
              )}

              {/* ── ЗАГРУЗКА ДАННЫХ ДАТЧИКОВ ИЗ ТРЕКЕРА ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><CircuitBoard className="size-3.5" />Данные датчиков</h4>
                  {!sensorData && !sensorLoading && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={loadSensors}>
                      <Download className="size-3" />Загрузить из трекера
                    </Button>
                  )}
                </div>

                {sensorLoading && (
                  <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">Загрузка данных датчиков...</span>
                  </div>
                )}

                {sensorError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="size-3.5 shrink-0" />{sensorError}
                  </div>
                )}

                {applySuccess && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5 shrink-0" />{applySuccess}
                  </div>
                )}

                {sensorData && !sensorLoading && (
                  <div className="space-y-3">
                    {/* Tracker info */}
                    {sensorData.tracker && (
                      <div className="flex items-center gap-2 text-[10px] px-2 py-1 bg-muted/30 rounded">
                        <span className="text-muted-foreground">Трекер:</span>
                        <span className="font-medium">{(sensorData.tracker as any).name}</span>
                        {(sensorData.tracker as any).imei && <span className="text-muted-foreground">IMEI: {(sensorData.tracker as any).imei}</span>}
                        <span className={`ml-auto px-1.5 py-0.5 rounded ${(sensorData.tracker as any).isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {(sensorData.tracker as any).isActive ? 'Онлайн' : 'Офлайн'}
                        </span>
                      </div>
                    )}

                    {/* Current sensor values */}
                    {sensorData.current && (
                      <div className="rounded-lg border p-2.5 space-y-2">
                        <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Activity className="size-3" />Текущие показания
                          {sensorData.current.lastSeenAt && (
                            <span className="font-normal ml-auto">
                              обновлено {new Date(sensorData.current.lastSeenAt as string).toLocaleString('ru-RU')}
                            </span>
                          )}
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {(() => {
                            const cur = sensorData.current as Record<string, unknown>
                            const items: { label: string; value: string | null; icon: React.ReactNode; highlight?: boolean }[] = [
                              { label: 'Топливо', value: cur.fuelLevel != null ? `${Number(cur.fuelLevel).toFixed(1)} л` : null, icon: <Fuel className="size-3" /> },
                              { label: 'Пробег', value: cur.mileage != null ? `${Math.round(Number(cur.mileage)).toLocaleString('ru-RU')} км` : null, icon: <Gauge className="size-3" /> },
                              { label: 'Скорость', value: cur.speed != null ? `${Number(cur.speed).toFixed(0)} км/ч` : null, icon: <Navigation className="size-3" /> },
                              { label: 'Зажигание', value: cur.ignition != null ? (cur.ignition ? 'Вкл' : 'Выкл') : null, icon: <Zap className="size-3" />, highlight: cur.ignition === true },
                              { label: 'Темп. двигателя', value: cur.engineTemp != null ? `${Number(cur.engineTemp).toFixed(1)} °C` : null, icon: <Thermometer className="size-3" /> },
                              { label: 'Курс', value: cur.course != null ? `${Number(cur.course).toFixed(0)}°` : null, icon: <Compass className="size-3" /> },
                              { label: 'Высота', value: cur.altitude != null ? `${Number(cur.altitude).toFixed(0)} м` : null, icon: <Mountain className="size-3" /> },
                              { label: 'Адрес', value: (cur.address as string) || null, icon: <MapPin className="size-3" /> },
                            ]
                            return items.filter(it => it.value != null).map((it, i) => (
                              <div key={i} className={`flex items-center gap-1.5 text-[10px] py-1 px-2 rounded ${it.highlight ? 'bg-emerald-50 dark:bg-emerald-900/20 font-medium' : 'bg-muted/50'}`}>
                                <span className="text-muted-foreground shrink-0">{it.icon}</span>
                                <span className="text-muted-foreground truncate">{it.label}</span>
                                <span className="font-medium ml-auto truncate">{it.value}</span>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}

                    {/* All sensors list */}
                    {sensorData.sensors && Array.isArray(sensorData.sensors) && (sensorData.sensors as any[]).length > 0 && (
                      <div className="rounded-lg border p-2.5 space-y-2">
                        <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Cpu className="size-3" />Все датчики ({(sensorData.sensors as any[]).length})
                        </h5>
                        <div className="grid grid-cols-2 gap-1">
                          {(sensorData.sensors as any[]).map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5 px-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground truncate">{s.name || s.type}</span>
                              <span className="font-medium ml-auto shrink-0">
                                {s.value != null ? `${Number(s.value).toFixed(s.unit === 'л' || s.unit === 'L' ? 1 : 0)}${s.unit ? ' ' + s.unit : ''}` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trip stats from Axenta */}
                    {sensorData.tripStats && (
                      <div className="rounded-lg border p-2.5 space-y-2">
                        <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <BarChart3 className="size-3" />Статистика за период рейса
                        </h5>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(() => {
                            const st = sensorData.tripStats as Record<string, unknown>
                            const items: { label: string; value: string | null }[] = [
                              { label: 'Пробег', value: st.mileage != null ? `${Number(st.mileage).toFixed(1)} км` : null },
                              { label: 'Ср. скорость', value: st.avgSpeed != null ? `${Number(st.avgSpeed).toFixed(1)} км/ч` : null },
                              { label: 'Макс. скорость', value: st.maxSpeed != null ? `${Number(st.maxSpeed).toFixed(0)} км/ч` : null },
                              { label: 'Расход топлива', value: st.fuelConsumption != null ? `${Number(st.fuelConsumption).toFixed(1)} л` : null },
                              { label: 'Ср. расход', value: st.avgFuelConsumption != null ? `${Number(st.avgFuelConsumption).toFixed(1)} л/100км` : null },
                              { label: 'Заправки', value: st.refuelVolume != null ? `${Number(st.refuelVolume).toFixed(1)} л` : null },
                              { label: 'Сливы', value: st.plumVolume != null ? `${Number(st.plumVolume).toFixed(1)} л` : null },
                              { label: 'Длительность поездок', value: st.tripsDuration != null ? fmtDur(Number(st.tripsDuration)) : null },
                              { label: 'Время стоянок', value: st.parkingsDuration != null ? fmtDur(Number(st.parkingsDuration)) : null },
                              { label: 'Моточасы', value: st.engineHours != null ? `${Number(st.engineHours).toFixed(1)}` : null },
                              { label: 'Холостой ход', value: st.idleTime != null ? fmtDur(Number(st.idleTime)) : null },
                            ]
                            return items.filter(it => it.value != null).map((it, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5 px-1.5 rounded bg-muted/50">
                                <span className="text-muted-foreground">{it.label}</span>
                                <span className="font-medium ml-auto">{it.value}</span>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Apply buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {(t.status === 'planned' || t.status === 'in_progress') && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyStartValues}>
                          <ArrowDownToLine className="size-3" />Заполнить начало рейса
                        </Button>
                      )}
                      {(t.status === 'in_progress' || t.status === 'completed') && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyEndValues}>
                          <ArrowUpFromLine className="size-3" />Заполнить финиш рейса
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setSensorData(null); setSensorError(null); setApplySuccess(null) }}>
                        <X className="size-3" />Скрыть
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── ТРЕК НА КАРТЕ ── */}
              {t.startDate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><Map className="size-3.5" />Трек на карте</h4>
                    {trackData && !trackLoading && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setTrackData(null); setTrackError(null) }}>
                        <X className="size-3" />Скрыть
                      </Button>
                    )}
                  </div>
                  {!trackData && !trackLoading && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">От</Label>
                          <Input
                            type="datetime-local"
                            className="h-7 text-[11px]"
                            value={trackDateFrom || (t.startDate ? toLocalDatetime(t.startDate) : '')}
                            onChange={e => setTrackDateFrom(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">До</Label>
                          <Input
                            type="datetime-local"
                            className="h-7 text-[11px]"
                            value={trackDateTo || (t.endDate ? toLocalDatetime(t.endDate) : '')}
                            onChange={e => setTrackDateTo(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 w-full" onClick={loadTrack} disabled={trackLoading}>
                        <Navigation className="size-3" />Загрузить трек из Axenta
                      </Button>
                    </div>
                  )}
                  {trackLoading && (
                    <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Загрузка трека...</span>
                    </div>
                  )}
                  {trackError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="size-3.5 shrink-0" />{trackError}
                    </div>
                  )}
                  {trackData && !trackLoading && (
                    <div className="h-64 rounded-lg overflow-hidden border">
                      <TrackerMap trackers={[]} trackData={trackData as any} />
                    </div>
                  )}
                </div>
              )}

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
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={loadSensors} disabled={sensorLoading}><CircuitBoard className="size-3.5" />Датчики</Button>
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
        startDate: editData.startDate ? toLocalDatetime(editData.startDate) : toLocalDatetime(new Date()),
        endDate: editData.endDate ? toLocalDatetime(editData.endDate) : '',
        plannedEndDate: editData.plannedEndDate ? toLocalDatetime(editData.plannedEndDate) : '',
        status: editData.status || 'planned', crewId: editData.crewId || '',
        fuelStart: editData.fuelStart?.toString() || '', fuelEnd: editData.fuelEnd?.toString() || '',
        mileageStart: editData.mileageStart?.toString() || '', mileageEnd: editData.mileageEnd?.toString() || '',
        cost: editData.cost?.toString() || '', revenue: editData.revenue?.toString() || '', notes: editData.notes || '',
      })
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: toLocalDatetime(new Date()), status: 'planned' })
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
            <div><Label className="text-xs">Дата и время начала</Label><Input type="datetime-local" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
            <div><Label className="text-xs">Планируемое окончание</Label><Input type="datetime-local" value={f('plannedEndDate')} onChange={e => setF('plannedEndDate', e.target.value)} /></div>
            <div><Label className="text-xs">Дата и время окончания</Label><Input type="datetime-local" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
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

function CrewFormDialog({ open, onOpenChange, editData, saving, setSaving, onSaved, employees }: {
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

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES TAB — Сотрудники (водители, техники)
// ═══════════════════════════════════════════════════════════════

function EmployeesTab({ employees, crews, empSearch, setEmpSearch, empPositionFilter, setEmpPositionFilter, empStatusFilter, setEmpStatusFilter, onOpenDetail, onAdd, onEdit, onDelete }: {
  employees: Employee[]; crews: Crew[];
  empSearch: string; setEmpSearch: (v: string) => void;
  empPositionFilter: string; setEmpPositionFilter: (v: string) => void;
  empStatusFilter: string; setEmpStatusFilter: (v: string) => void;
  onOpenDetail: (emp: Employee) => void; onAdd: () => void;
  onEdit: (emp: Employee) => void; onDelete: (emp: Employee) => void;
}) {
  const debouncedSearch = useDebounce(empSearch, 300)

  const filtered = useMemo(() => employees.filter(e => {
    if (empPositionFilter !== 'all' && e.position !== empPositionFilter) return false
    if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!e.fullName.toLowerCase().includes(q) && !(e.phone || '').toLowerCase().includes(q) && !(e.licenseNum || '').toLowerCase().includes(q) && !(e.email || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [employees, empPositionFilter, empStatusFilter, debouncedSearch])

  const driverCount = employees.filter(e => e.position === 'driver' && e.status === 'active').length
  const mechanicCount = employees.filter(e => e.position === 'mechanic' && e.status === 'active').length
  const activeCount = employees.filter(e => e.status === 'active').length

  const getPositionIcon = (pos: string) => EMPLOYEE_POSITION_MAP[pos]?.icon || <User className="size-3.5" />
  const getPositionColor = (pos: string) => {
    const p = EMPLOYEE_POSITION_MAP[pos]
    return p ? `${p.color} ${p.darkColor}` : 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400'
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-none bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><Car className="size-4 text-blue-600 dark:text-blue-400" /></div>
            <div><p className="text-lg font-bold text-blue-700 dark:text-blue-400">{driverCount}</p><p className="text-[10px] text-muted-foreground">Водителей</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Wrench className="size-4 text-amber-600 dark:text-amber-400" /></div>
            <div><p className="text-lg font-bold text-amber-700 dark:text-amber-400">{mechanicCount}</p><p className="text-[10px] text-muted-foreground">Техников</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Users className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</p><p className="text-[10px] text-muted-foreground">Всего активных</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО, телефону, ВУ..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={empPositionFilter} onValueChange={setEmpPositionFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Должность" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все должности</SelectItem>
            {Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={empStatusFilter} onValueChange={setEmpStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5"><Plus className="size-3.5" />Сотрудник</Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length} из {employees.length}</p>

      {/* Employee list */}
      {filtered.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Users className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Сотрудники не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте водителей и техников для управления персоналом</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(emp => {
            const posInfo = EMPLOYEE_POSITION_MAP[emp.position]
            const statusInfo = EMPLOYEE_STATUS_MAP[emp.status]
            const crew = emp.crewId ? crews.find(c => c.id === emp.crewId) : null
            // Check for expiring license (within 30 days)
            const licenseExpiring = emp.licenseExpiry && new Date(emp.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(emp.licenseExpiry) >= new Date()
            const licenseExpired = emp.licenseExpiry && new Date(emp.licenseExpiry) < new Date()
            return (
              <Card key={emp.id} className={`cursor-pointer hover:shadow-md transition-shadow border-l-3 ${statusInfo?.border || 'border-l-gray-300'}`} onClick={() => onOpenDetail(emp)}>
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${getPositionColor(emp.position)}`}>
                        {getPositionIcon(emp.position)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">{emp.fullName}</CardTitle>
                        <p className="text-[11px] text-muted-foreground">
                          <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[10px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                          {crew && <span className="ml-1">• {crew.name}</span>}
                        </p>
                      </div>
                    </div>
                    {statusInfo && <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${statusInfo.color}`}>{statusInfo.label}</span>}
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 space-y-1">
                  <Separator />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                    {emp.phone && <div><span className="text-muted-foreground">Телефон:</span> <span className="font-medium">{emp.phone}</span></div>}
                    {emp.licenseNum && <div><span className="text-muted-foreground">ВУ:</span> <span className="font-medium">{emp.licenseNum}</span></div>}
                    {emp.licenseCat && <div><span className="text-muted-foreground">Кат. ВУ:</span> <span className="font-medium">{emp.licenseCat}</span></div>}
                    {emp.salary != null && <div><span className="text-muted-foreground">Зарплата:</span> <span className="font-medium">{formatPrice(emp.salary)}</span></div>}
                    {emp.equipment && <div className="col-span-2"><span className="text-muted-foreground">Техника:</span> <span className="font-medium inline-flex items-center gap-0.5"><Truck className="size-3" />{emp.equipment.name}{emp.equipment.registrationNum ? ` (${emp.equipment.registrationNum})` : ''}</span></div>}
                  </div>
                  {licenseExpired && (
                    <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium mt-1"><AlertTriangle className="size-3" />ВУ истекло!</div>
                  )}
                  {licenseExpiring && !licenseExpired && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1"><Clock className="size-3" />ВУ истекает скоро</div>
                  )}
                  <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEdit(emp)}><Edit className="size-3" />Изменить</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDelete(emp)}><Trash2 className="size-3" />Удалить</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL SHEET
// ═══════════════════════════════════════════════════════════════

function EmployeeDetailSheet({ open, onOpenChange, employee, loading, crews, onEdit, onDelete, onRefresh }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  employee: Employee | null; loading: boolean; crews: Crew[];
  onEdit: (emp: Employee) => void; onDelete: (emp: Employee) => void;
  onRefresh: () => void;
}) {
  if (!employee) return null
  const e = employee
  const posInfo = EMPLOYEE_POSITION_MAP[e.position]
  const statusInfo = EMPLOYEE_STATUS_MAP[e.status]
  const crew = e.crewId ? crews.find(c => c.id === e.crewId) : null
  const licenseExpired = e.licenseExpiry && new Date(e.licenseExpiry) < new Date()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center size-12 rounded-xl shrink-0 ${posInfo ? `${posInfo.color} ${posInfo.darkColor}` : 'bg-gray-100 dark:bg-gray-900/40'}`}>
              {posInfo?.icon || <User className="size-5" />}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">{e.fullName}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${posInfo ? `${posInfo.color} ${posInfo.darkColor}` : ''}`}>{posInfo?.label || e.position}</span>
                {statusInfo && <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>{statusInfo.label}</span>}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Contact info */}
              <DetailSection title="Контакты" icon={<Phone className="size-3.5" />}>
                <DetailRow label="Телефон" value={e.phone} />
                <DetailRow label="Email" value={e.email} />
                <DetailRow label="Адрес" value={e.address} />
              </DetailSection>

              {/* Work info */}
              <DetailSection title="Трудовая информация" icon={<IdCard className="size-3.5" />}>
                <DetailRow label="Дата приёма" value={formatDate(e.hireDate)} />
                <DetailRow label="Дата увольнения" value={formatDate(e.fireDate)} />
                <DetailRow label="Зарплата" value={e.salary != null ? formatPrice(e.salary) : undefined} />
                <DetailRow label="Экипаж" value={crew?.name} />
              </DetailSection>

              {/* Assigned equipment */}
              <DetailSection title="Назначенная техника" icon={<Truck className="size-3.5" />}>
                {e.equipment ? (
                  <>
                    <DetailRow label="Наименование" value={e.equipment.name} />
                    <DetailRow label="Гос. номер" value={e.equipment.registrationNum} />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground col-span-2">Не назначена</p>
                )}
              </DetailSection>

              {/* Repair assignments */}
              {e.repairAssignments && e.repairAssignments.length > 0 && (
                <DetailSection title="Назначения на ремонт" icon={<Wrench className="size-3.5" />}>
                  <div className="col-span-2 space-y-1.5">
                    {e.repairAssignments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                        <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Wrench className="size-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{a.repair.description}</p>
                          <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{a.repair.equipment?.name || '—'}</span>
                            <span>{formatDate(a.assignedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          {statusBadge(a.role, REPAIR_MASTER_ROLE_MAP)}
                          {statusBadge(a.repair.status, REPAIR_STATUS_MAP)}
                        </div>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* License info */}
              <DetailSection title="Водительское удостоверение" icon={<ClipboardCheck className="size-3.5" />}>
                <DetailRow label="Номер ВУ" value={e.licenseNum} />
                <DetailRow label="Категория" value={e.licenseCat} />
                <DetailRow label="Срок действия" value={formatDate(e.licenseExpiry)} />
                {licenseExpired && (
                  <div className="col-span-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/30 rounded px-2 py-1.5">
                    <AlertTriangle className="size-3.5" />Водительское удостоверение истекло!
                  </div>
                )}
              </DetailSection>

              {/* Passport info */}
              {(e.passportSeries || e.passportNum) && (
                <DetailSection title="Паспортные данные" icon={<Shield className="size-3.5" />}>
                  <DetailRow label="Серия" value={e.passportSeries} />
                  <DetailRow label="Номер" value={e.passportNum} />
                </DetailSection>
              )}

              {/* Personal info */}
              <DetailSection title="Личные данные" icon={<User className="size-3.5" />}>
                <DetailRow label="Дата рождения" value={formatDate(e.birthDate)} />
              </DetailSection>

              {e.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{e.notes}</p></DetailSection>}
            </>
          )}
        </div>
        <div className="border-t px-4 py-3 flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(e)}><Edit className="size-3.5" />Редактировать</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><RefreshCw className="size-3.5" />Обновить</Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDelete(e)}><Trash2 className="size-3.5" />Удалить</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function EmployeeFormDialog({ open, onOpenChange, editData, crews, equipment, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Employee | null; crews: Crew[]; equipment: Equipment[];
  saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editData) {
      setForm({
        fullName: editData.fullName || '',
        position: editData.position || 'driver',
        phone: editData.phone || '',
        email: editData.email || '',
        birthDate: editData.birthDate ? toLocalDate(editData.birthDate) : '',
        hireDate: editData.hireDate ? toLocalDate(editData.hireDate) : '',
        fireDate: editData.fireDate ? toLocalDate(editData.fireDate) : '',
        licenseNum: editData.licenseNum || '',
        licenseCat: editData.licenseCat || '',
        licenseExpiry: editData.licenseExpiry ? toLocalDate(editData.licenseExpiry) : '',
        passportSeries: editData.passportSeries || '',
        passportNum: editData.passportNum || '',
        address: editData.address || '',
        status: editData.status || 'active',
        salary: editData.salary?.toString() || '',
        notes: editData.notes || '',
        crewId: editData.crewId || '',
        equipmentId: editData.equipmentId || '',
      })
    } else {
      setForm({ position: 'driver', status: 'active', hireDate: toLocalDate(new Date()) })
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!f('fullName').trim()) { toast.error('Укажите ФИО сотрудника'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/employees/${editData.id}` : '/api/employees'
      const method = editData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Сотрудник обновлён' : 'Сотрудник добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">ФИО *</Label><Input value={f('fullName')} onChange={e => setF('fullName', e.target.value)} placeholder="Иванов Иван Иванович" autoFocus /></div>
            <div><Label className="text-xs">Должность</Label><Select value={f('position')} onValueChange={v => setF('position', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EMPLOYEE_POSITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EMPLOYEE_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Телефон</Label><Input value={f('phone')} onChange={e => setF('phone', e.target.value)} placeholder="+7 (999) 123-45-67" /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={f('email')} onChange={e => setF('email', e.target.value)} placeholder="ivan@company.ru" /></div>
          </div>

          <Separator />

          {/* Work info */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><IdCard className="size-3.5" />Трудовая информация</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата приёма</Label><Input type="date" value={f('hireDate')} onChange={e => setF('hireDate', e.target.value)} /></div>
              <div><Label className="text-xs">Дата увольнения</Label><Input type="date" value={f('fireDate')} onChange={e => setF('fireDate', e.target.value)} /></div>
              <div><Label className="text-xs">Зарплата (₽)</Label><Input type="number" value={f('salary')} onChange={e => setF('salary', e.target.value)} /></div>
              <div><Label className="text-xs">Экипаж</Label><Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger><SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.filter(c => c.status === 'active').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Назначенная техника</Label><Select value={f('equipmentId') || '_none'} onValueChange={v => setF('equipmentId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не назначена" /></SelectTrigger><SelectContent><SelectItem value="_none">Не назначена</SelectItem>{equipment.filter(eq => eq.status === 'active' || eq.status === 'rented').map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}{eq.registrationNum ? ` (${eq.registrationNum})` : ''}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>

          <Separator />

          {/* License */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><ClipboardCheck className="size-3.5" />Водительское удостоверение</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs">Номер ВУ</Label><Input value={f('licenseNum')} onChange={e => setF('licenseNum', e.target.value)} placeholder="99 99 999999" /></div>
              <div><Label className="text-xs">Категория</Label><Input value={f('licenseCat')} onChange={e => setF('licenseCat', e.target.value)} placeholder="B, C, D, CE" /></div>
              <div><Label className="text-xs">Срок действия</Label><Input type="date" value={f('licenseExpiry')} onChange={e => setF('licenseExpiry', e.target.value)} /></div>
            </div>
          </div>

          <Separator />

          {/* Personal info */}
          <div>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><User className="size-3.5" />Личные данные</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата рождения</Label><Input type="date" value={f('birthDate')} onChange={e => setF('birthDate', e.target.value)} /></div>
              <div><Label className="text-xs">Адрес</Label><Input value={f('address')} onChange={e => setF('address', e.target.value)} /></div>
              <div><Label className="text-xs">Серия паспорта</Label><Input value={f('passportSeries')} onChange={e => setF('passportSeries', e.target.value)} placeholder="9999" /></div>
              <div><Label className="text-xs">Номер паспорта</Label><Input value={f('passportNum')} onChange={e => setF('passportNum', e.target.value)} placeholder="999999" /></div>
            </div>
          </div>

          <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAP TAB — Карта всей техники
// ═══════════════════════════════════════════════════════════════

function MapTab({ equipment, onSync, onOpenDetail }: {
  equipment: Equipment[]
  onSync: () => void
  onOpenDetail?: (equipmentId: string) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof REFRESH_OPTIONS[number]['value']>>(60) // seconds, default 1 min
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'notracker'>('all')
  const [subTab, setSubTab] = useState<'map' | 'notifications'>('map')
  const [notifRules, setNotifRules] = useState<Array<{
    id: string; equipmentId: string; conditionType: string; thresholdValue: number | null;
    isActive: boolean; lastTriggeredAt?: string | null; description?: string | null;
    equipment?: { id: string; name: string; registrationNum?: string | null };
  }>>([])
  const [addRuleOpen, setAddRuleOpen] = useState(false)
  const [newRuleEqId, setNewRuleEqId] = useState('')
  const [newRuleType, setNewRuleType] = useState('offline')
  const [newRuleThreshold, setNewRuleThreshold] = useState('')
  const [newRuleDesc, setNewRuleDesc] = useState('')
  const [savingRule, setSavingRule] = useState(false)

  // ─── Track viewing state ────────────────────────────────────
  const [trackEqId, setTrackEqId] = useState<string>('')
  const [trackDateFrom, setTrackDateFrom] = useState<string>('')
  const [trackDateTo, setTrackDateTo] = useState<string>('')
  const [trackPoints, setTrackPoints] = useState<Array<{ lat: number; lng: number }>>([])
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackStats, setTrackStats] = useState<Record<string, unknown> | null>(null)
  const [showTrackPanel, setShowTrackPanel] = useState(false)
  const [trackData, setTrackData] = useState<{
    track?: { distance: number; startDate: string; endDate: string; count: number };
    trips?: Array<{
      distance: number; startDate: string; endDate: string;
      points: Array<{ lat: number; lng: number; speed: number; time: string }>;
    }>;
    parkings?: Array<{ startDate: string; endDate: string; lat: number; lng: number; duration: number; ignitionTime?: number }>;
    stops?: Array<{ startDate: string; endDate: string; lat: number; lng: number; duration: number }>;
  } | null>(null)
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null)

  // ─── Report export state ───────────────────────────────────
  const [reportOpen, setReportOpen] = useState(false)
  const [reportEqIds, setReportEqIds] = useState<string[]>([])
  const [reportDateFrom, setReportDateFrom] = useState<string>('')
  const [reportDateTo, setReportDateTo] = useState<string>('')
  const [reportSensorTypes, setReportSensorTypes] = useState<string[]>([])
  const [reportIncludeStats, setReportIncludeStats] = useState(true)
  const [reportIncludeTracks, setReportIncludeTracks] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // Equipment that has trackers for track selection
  const trackedEquipment = useMemo(() =>
    equipment.filter(e => e.trackers && e.trackers.length > 0),
  [equipment])

  // Apply date preset for tracks
  const applyTrackDatePreset = (preset: string) => {
    const now = new Date()
    let from = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        now.setDate(now.getDate() - 1); now.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
    }
    setTrackDateFrom(toLocalDatetime(from))
    setTrackDateTo(toLocalDatetime(now))
  }

  // Fetch track for selected equipment
  const fetchTrack = async () => {
    if (!trackEqId || !trackDateFrom || !trackDateTo) return
    const eq = equipment.find(e => e.id === trackEqId)
    if (!eq || !eq.trackers || eq.trackers.length === 0) return

    const tracker = eq.trackers[0]
    const axentaId = tracker.axentaCloudId || tracker.trackerId

    setTrackLoading(true)
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setSelectedTripIndex(null)

    try {
      // Fetch track + stats in parallel
      const [tracksRes, statsRes] = await Promise.all([
        fetch('/api/glonass/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          })
        }),
        fetch('/api/glonass/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId: axentaId,
            startDate: new Date(trackDateFrom).toISOString(),
            endDate: new Date(trackDateTo).toISOString(),
          })
        })
      ])

      // Parse stats
      if (statsRes.ok) {
        setTrackStats(await statsRes.json())
      }

      // Parse tracks
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json()

        // Axenta returns: { track, trips, parkings, stops, ... }
        // trips[].messagesCoordinates = [[lat, lng, speed, time], ...]
        const parsedTrips: Array<{
          distance: number; startDate: string; endDate: string;
          points: Array<{ lat: number; lng: number; speed: number; time: string }>;
        }> = []

        if (tracksData.trips && Array.isArray(tracksData.trips)) {
          for (const trip of tracksData.trips) {
            const points: Array<{ lat: number; lng: number; speed: number; time: string }> = []
            if (trip.messagesCoordinates && Array.isArray(trip.messagesCoordinates)) {
              for (const mc of trip.messagesCoordinates) {
                if (Array.isArray(mc) && mc.length >= 2) {
                  points.push({
                    lat: mc[0],
                    lng: mc[1],
                    speed: mc[2] || 0,
                    time: mc[3] || '',
                  })
                }
              }
            }
            if (points.length > 0) {
              parsedTrips.push({
                distance: trip.distance || 0,
                startDate: trip.startDate,
                endDate: trip.endDate,
                points,
              })
            }
          }
        }

        // Parse parkings
        const parsedParkings = (tracksData.parkings || []).map((p: Record<string, unknown>) => ({
          startDate: p.startDate as string,
          endDate: p.endDate as string,
          lat: p.lat as number,
          lng: p.lng as number,
          duration: p.duration as number,
          ignitionTime: p.ignitionTime as number | undefined,
        }))

        // Parse stops
        const parsedStops = (tracksData.stops || []).map((s: Record<string, unknown>) => ({
          startDate: s.startDate as string,
          endDate: s.endDate as string,
          lat: s.lat as number,
          lng: s.lng as number,
          duration: s.duration as number,
        }))

        // Also build simple trackPoints for backwards compat
        const simplePoints: Array<{ lat: number; lng: number }> = []
        for (const trip of parsedTrips) {
          for (const p of trip.points) {
            simplePoints.push({ lat: p.lat, lng: p.lng })
          }
        }
        setTrackPoints(simplePoints)

        // Store enriched data
        setTrackData({
          track: tracksData.track ? {
            distance: tracksData.track.distance,
            startDate: tracksData.track.startDate,
            endDate: tracksData.track.endDate,
            count: tracksData.track.count,
          } : undefined,
          trips: parsedTrips,
          parkings: parsedParkings,
          stops: parsedStops,
        })

        const totalPoints = simplePoints.length
        const tripCount = parsedTrips.length
        const parkingCount = parsedParkings.length
        toast.success(`Трек загружен: ${tripCount} поездок, ${totalPoints} точек, ${parkingCount} стоянок`)
      } else {
        toast.error('Ошибка загрузки трека')
      }
    } catch {
      toast.error('Ошибка загрузки трека')
    }
    setTrackLoading(false)
  }

  const clearTrack = () => {
    setTrackPoints([])
    setTrackStats(null)
    setTrackData(null)
    setTrackEqId('')
    setTrackDateFrom('')
    setTrackDateTo('')
    setSelectedTripIndex(null)
  }

  // ─── Report export ──────────────────────────────────────────
  const applyReportDatePreset = (preset: string) => {
    const now = new Date()
    let from = new Date()
    switch (preset) {
      case 'Сегодня':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'Вчера':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        now.setDate(now.getDate() - 1); now.setHours(23, 59, 59)
        break
      case 'Неделя':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'Месяц':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
    }
    setReportDateFrom(toLocalDatetime(from))
    setReportDateTo(toLocalDatetime(now))
  }

  const exportReport = async () => {
    if (reportEqIds.length === 0 || !reportDateFrom || !reportDateTo) {
      toast.error('Выберите технику и период')
      return
    }
    setReportLoading(true)
    try {
      const res = await fetch('/api/glonass/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentIds: reportEqIds,
          startDate: new Date(reportDateFrom).toISOString(),
          endDate: new Date(reportDateTo).toISOString(),
          sensorTypes: reportSensorTypes.length > 0 ? reportSensorTypes : undefined,
          includeStats: reportIncludeStats,
          includeTrackSummary: reportIncludeTracks,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Ошибка' }))
        throw new Error(errData.error || 'Ошибка генерации отчёта')
      }
      // Download the file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?(.+?)"?$/)
      a.download = match ? decodeURIComponent(match[1]) : 'report.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Отчёт скачан')
      setReportOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка экспорта отчёта')
    }
    setReportLoading(false)
  }

  // Collect all unique sensor types from equipment
  const allSensorTypes = useMemo(() => {
    const types = new Set<string>()
    for (const eq of equipment) {
      for (const tracker of eq.trackers || []) {
        for (const s of tracker.sensorData || []) {
          if (s.sensorType) types.add(s.sensorType)
        }
      }
    }
    return Array.from(types).sort()
  }, [equipment])

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h} ч ${m} мин` : `${m} мин`
  }

  function formatTime(d?: string | null): string {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/rules')
      if (res.ok) setNotifRules(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadRules() }, [loadRules])

  const addRule = async () => {
    if (!newRuleEqId || !newRuleType) return
    setSavingRule(true)
    try {
      const res = await fetch('/api/notifications/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: newRuleEqId,
          conditionType: newRuleType,
          thresholdValue: newRuleThreshold ? parseFloat(newRuleThreshold) : null,
          description: newRuleDesc || null,
          isActive: true,
        }),
      })
      if (res.ok) {
        toast.success('Правило добавлено')
        setAddRuleOpen(false)
        setNewRuleEqId('')
        setNewRuleType('offline')
        setNewRuleThreshold('')
        setNewRuleDesc('')
        loadRules()
      } else {
        toast.error('Ошибка добавления правила')
      }
    } catch { toast.error('Ошибка') }
    setSavingRule(false)
  }

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/notifications/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) loadRules()
    } catch { /* ignore */ }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/notifications/rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) { loadRules(); toast.success('Правило удалено') }
    } catch { toast.error('Ошибка удаления') }
  }

  const CONDITION_LABELS: Record<string, string> = {
    offline: 'Не в сети',
    not_synced: 'Нет синхронизации (ч)',
    not_moving: 'Не движется (ч)',
    speed_exceeded: 'Превышение скорости (км/ч)',
    fuel_low: 'Низкое топливо (%)',
    zone_exit: 'Выход из зоны',
  }

  // Prepare tracker data for map — include sensor data
  const trackersForMap = useMemo(() => {
    return equipment.flatMap(eq =>
      (eq.trackers || [])
        .filter(t => t.lastLatitude != null && t.lastLongitude != null)
        .map(t => ({
          ...t,
          equipmentName: eq.name,
          registrationNum: eq.registrationNum,
          equipmentType: eq.type,
          equipmentStatus: eq.status,
          equipmentId: eq.id,
          sensorData: (t.sensorData || []).filter(s => s.value != null || (s.stringValue != null && s.stringValue !== '')),
        }))
    )
  }, [equipment])

  const onlineCount = trackersForMap.filter(t => t.isActive).length
  const offlineCount = trackersForMap.filter(t => !t.isActive).length
  const noTrackerCount = equipment.filter(e => !e.trackers || e.trackers.length === 0).length

  const filteredTrackers = useMemo(() => {
    switch (filter) {
      case 'online': return trackersForMap.filter(t => t.isActive)
      case 'offline': return trackersForMap.filter(t => !t.isActive)
      default: return trackersForMap
    }
  }, [filter, trackersForMap])

  // When viewing a track, only show the tracked vehicle on the map
  const mapTrackers = useMemo(() => {
    if ((trackPoints.length > 0 || trackData) && trackEqId) {
      return filteredTrackers.filter(t => t.equipmentId === trackEqId)
    }
    return filteredTrackers
  }, [filteredTrackers, trackPoints, trackData, trackEqId])

  // When a specific trip is selected, only show that trip's data on the map
  const mapTrackData = useMemo(() => {
    if (!trackData) return null
    if (selectedTripIndex != null && trackData.trips) {
      const selectedTrip = trackData.trips[selectedTripIndex]
      if (selectedTrip) {
        return {
          track: trackData.track,
          trips: [selectedTrip],
          parkings: [],  // hide parkings when viewing specific trip
          stops: [],     // hide stops when viewing specific trip
        }
      }
    }
    return trackData
  }, [trackData, selectedTripIndex])

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Map / Notifications */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={subTab === 'map' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('map')}>
          <Map className="size-3" />Карта
        </Button>
        <Button size="sm" variant={subTab === 'notifications' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setSubTab('notifications')}>
          <Bell className="size-3" />Уведомления
          {notifRules.filter(r => r.isActive).length > 0 && (
            <span className="ml-1 bg-primary/20 rounded-full px-1.5 text-[9px]">{notifRules.filter(r => r.isActive).length}</span>
          )}
        </Button>
      </div>

      {subTab === 'map' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('all')}>
                <MapPin className="size-3" />Все ({trackersForMap.length})
              </Button>
              <Button size="sm" variant={filter === 'online' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('online')}>
                <Wifi className="size-3" />Онлайн ({onlineCount})
              </Button>
              <Button size="sm" variant={filter === 'offline' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('offline')}>
                <WifiOff className="size-3" />Оффлайн ({offlineCount})
              </Button>
              <Button size="sm" variant={filter === 'notracker' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setFilter('notracker')}>
                <Satellite className="size-3" />Без трекера ({noTrackerCount})
              </Button>
            </div>
            <div className="flex-1" />
            <Button size="sm" variant={showTrackPanel ? 'default' : 'outline'} className="h-7 text-[11px] gap-1" onClick={() => setShowTrackPanel(!showTrackPanel)}>
              <Route className="size-3" />Трек
              {trackPoints.length > 0 && <span className="ml-0.5 bg-primary/20 rounded-full px-1.5 text-[9px]">{trackPoints.length}</span>}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { setReportEqIds(trackersForMap.map(t => t.equipmentId!).filter(Boolean)); setReportOpen(true) }}>
              <FileText className="size-3" />Отчёт XLSX
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" disabled={syncing} onClick={async () => { setSyncing(true); await onSync(); setSyncing(false) }}>
              {syncing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Синхронизировать
            </Button>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${refreshInterval > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`}></span>
              <Select value={String(refreshInterval)} onValueChange={v => setRefreshInterval(Number(v) as any)}>
                <SelectTrigger className="h-5 w-auto border-0 p-0 text-[9px] text-muted-foreground gap-0.5 shadow-none focus:ring-0" style={{ minWidth: 0 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[100px]">
                  {REFRESH_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-[11px]">
                      {refreshInterval > 0 && opt.value === refreshInterval ? '🔄 ' : ''}{opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          </div>

          {/* Track panel */}
          {showTrackPanel && (
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <Route className="size-3.5" />Просмотр трека за период
                  </h3>
                  {trackPoints.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={clearTrack}>
                      <X className="size-3" />Очистить
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    <Label className="text-[10px]">Техника</Label>
                    <Select value={trackEqId} onValueChange={setTrackEqId}>
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue placeholder="Выберите..." />
                      </SelectTrigger>
                      <SelectContent>
                        {trackedEquipment.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name} {eq.registrationNum ? `(${eq.registrationNum})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">С</Label>
                    <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateFrom} onChange={e => setTrackDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">По</Label>
                    <Input type="datetime-local" className="h-7 text-[11px]" value={trackDateTo} onChange={e => setTrackDateTo(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" className="h-7 text-[11px] w-full gap-1" disabled={!trackEqId || !trackDateFrom || !trackDateTo || trackLoading} onClick={fetchTrack}>
                      {trackLoading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                      Загрузить
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                    <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTrackDatePreset(preset)}>{preset}</Button>
                  ))}
                </div>
                {/* Track stats */}
                {trackStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 border-t border-dashed">
                    {trackStats.mileage != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Пробег</p><p className="text-[11px] font-semibold">{Number(trackStats.mileage).toFixed(1)} км</p></div>}
                    {trackStats.avgSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Ср. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.avgSpeed).toFixed(1)} км/ч</p></div>}
                    {trackStats.maxSpeed != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Макс. скорость</p><p className="text-[11px] font-semibold">{Number(trackStats.maxSpeed).toFixed(1)} км/ч</p></div>}
                    {trackStats.fuelConsumption != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Расход топлива</p><p className="text-[11px] font-semibold">{Number(trackStats.fuelConsumption).toFixed(1)} л</p></div>}
                    {trackStats.tripsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Время поездок</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.tripsDuration))}</p></div>}
                    {trackStats.parkingsDuration != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Стоянки</p><p className="text-[11px] font-semibold">{formatDuration(Number(trackStats.parkingsDuration))}</p></div>}
                    {trackStats.refuelVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Заправки</p><p className="text-[11px] font-semibold">{Number(trackStats.refuelVolume).toFixed(1)} л</p></div>}
                    {trackStats.plumVolume != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Сливы</p><p className="text-[11px] font-semibold">{Number(trackStats.plumVolume).toFixed(1)} л</p></div>}
                    {trackStats.engineHours != null && <div className="text-center"><p className="text-[9px] text-muted-foreground">Моточасы</p><p className="text-[11px] font-semibold">{Number(trackStats.engineHours).toFixed(1)} ч</p></div>}
                  </div>
                )}
                {trackPoints.length > 0 && trackData && (
                  <div className="space-y-2 pt-1 border-t border-dashed">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500 rounded" />{trackPoints.length} точек</span>
                      {trackData.trips && <span>🚗 {trackData.trips.length} поездок</span>}
                      {trackData.parkings && <span>🅿️ {trackData.parkings.length} стоянок</span>}
                      {trackData.stops && <span>⏸ {trackData.stops.length} остановок</span>}
                      {trackData.track?.distance != null && <span>📏 {trackData.track.distance.toFixed(1)} км</span>}
                    </div>
                    {/* Speed legend */}
                    <div className="flex flex-wrap items-center gap-2 text-[9px]">
                      <span className="text-muted-foreground font-medium">Скорость:</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#9ca3af'}} />0</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#22c55e'}} />≤20</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#eab308'}} />≤60</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#f97316'}} />≤80</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#ef4444'}} />&gt;80</span>
                      <span className="text-muted-foreground">км/ч</span>
                    </div>
                    {/* Trips summary */}
                    {trackData.trips && trackData.trips.length > 0 && (
                      <div className="space-y-1">
                        {trackData.trips.map((trip, i) => (
                          <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${selectedTripIndex === i ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setSelectedTripIndex(selectedTripIndex === i ? null : i)}>
                            <span className="font-semibold text-emerald-600">🟢 A</span>
                            <span>{formatTime(trip.startDate)}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-red-500">🔴 B</span>
                            <span>{formatTime(trip.endDate)}</span>
                            <span className="text-muted-foreground ml-auto">{trip.distance.toFixed(1)} км • {trip.points.length} т.</span>
                            {selectedTripIndex === i && <X className="size-3 text-muted-foreground shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {filter === 'notracker' ? (
            <div className="space-y-2">
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Satellite className="size-4 text-muted-foreground" />
                    Техника без ГЛОНАСС трекера
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {equipment.filter(e => !e.trackers || e.trackers.length === 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Вся техника подключена к трекерам</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {equipment.filter(e => !e.trackers || e.trackers.length === 0).map(eq => (
                        <Card key={eq.id} className="border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenDetail?.(eq.id)}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`size-8 rounded-md flex items-center justify-center ${getTypeInfo(eq.type).color} ${getTypeInfo(eq.type).darkColor}`}>
                                {getTypeInfo(eq.type).icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate hover:text-primary hover:underline transition-colors">{eq.name}</p>
                                <p className="text-[10px] text-muted-foreground">{eq.registrationNum || '—'} • <TypeBadge type={eq.type} /></p>
                              </div>
                              {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-220px)] min-h-[400px] rounded-lg overflow-hidden relative z-0">
                  {trackersForMap.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Satellite className="size-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">Нет техники с трекерами</p>
                      <p className="text-xs mt-1">Подключите ГЛОНАСС трекеры к технике для отображения на карте</p>
                    </div>
                  ) : (
                    <TrackerMap trackers={mapTrackers} trackPoints={trackPoints} trackData={mapTrackData} onEquipmentClick={onOpenDetail} refreshInterval={refreshInterval} onRefresh={onSync} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment list below map */}
          {filter !== 'notracker' && mapTrackers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Техника на карте ({mapTrackers.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mapTrackers.map(t => (
                  <Card key={t.id} className={`border-l-4 ${t.isActive ? 'border-l-emerald-500' : 'border-l-red-400'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`size-8 rounded-md flex items-center justify-center ${t.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                          {t.isActive ? <Wifi className="size-4 text-emerald-600 dark:text-emerald-400" /> : <WifiOff className="size-4 text-red-600 dark:text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate cursor-pointer hover:text-primary hover:underline transition-colors" onClick={() => onOpenDetail?.(t.equipmentId!)}>{t.equipmentName}</p>
                          <p className="text-[10px] text-muted-foreground">{t.registrationNum || '—'} • <TypeBadge type={t.equipmentType || 'другое'} /></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        {t.lastSpeed != null && <div className="flex items-center gap-1"><Gauge className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastSpeed} км/ч</span></div>}
                        {t.lastIgnition != null && <div className="flex items-center gap-1"><Zap className="size-3 text-muted-foreground" /><span className={t.lastIgnition ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{t.lastIgnition ? 'Зажигание' : 'Выключено'}</span></div>}
                        {t.lastFuelLevel != null && <div className="flex items-center gap-1"><Fuel className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastFuelLevel} л</span></div>}
                        {t.lastMileage != null && <div className="flex items-center gap-1"><Navigation className="size-3 text-muted-foreground" /><span className="font-medium">{t.lastMileage} км</span></div>}
                        {t.lastAddress && <div className="col-span-2 flex items-start gap-1"><MapPin className="size-3 text-muted-foreground mt-0.5 shrink-0" /><span className="truncate">{t.lastAddress}</span></div>}
                        {t.lastSeenAt && <div className="flex items-center gap-1"><Clock className="size-3 text-muted-foreground" /><span className="text-muted-foreground">{formatDateTime(t.lastSeenAt)}</span></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ─── NOTIFICATION RULES TAB ──────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="size-4" />Правила уведомлений</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Настройте условия для получения важных уведомлений о технике</p>
            </div>
            <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setAddRuleOpen(true)}>
              <Plus className="size-3" />Добавить правило
            </Button>
          </div>

          {notifRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Нет правил уведомлений</p>
                <p className="text-xs text-muted-foreground mt-1">Создайте правила для отслеживания состояния техники</p>
                <Button size="sm" className="mt-3 h-7 text-[11px] gap-1" onClick={() => setAddRuleOpen(true)}>
                  <Plus className="size-3" />Создать первое правило
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {notifRules.map(rule => (
                <Card key={rule.id} className={`border-l-4 ${rule.isActive ? 'border-l-sky-500' : 'border-l-gray-300'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{rule.equipment?.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{rule.equipment?.registrationNum || '—'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleRule(rule.id, rule.isActive)} className={`p-1 rounded transition-colors ${rule.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}>
                          {rule.isActive ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className={`size-3 ${rule.isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] font-medium">{CONDITION_LABELS[rule.conditionType] || rule.conditionType}</span>
                      {rule.thresholdValue != null && (
                        <span className="text-[11px] text-muted-foreground">: {rule.thresholdValue}</span>
                      )}
                    </div>
                    {rule.description && <p className="text-[10px] text-muted-foreground">{rule.description}</p>}
                    {rule.lastTriggeredAt && (
                      <p className="text-[9px] text-muted-foreground mt-1">Сработало: {formatDateTime(rule.lastTriggeredAt)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick add presets */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Быстрые шаблоны</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { type: 'offline', label: 'Не в сети', desc: 'Уведомление если трекер оффлайн', threshold: null },
                  { type: 'not_synced', label: 'Нет данных 1 час', desc: 'Нет синхронизации более 1 часа', threshold: 1 },
                  { type: 'not_synced', label: 'Нет данных 3 часа', desc: 'Нет синхронизации более 3 часов', threshold: 3 },
                  { type: 'not_moving', label: 'Не движется 2 часа', desc: 'Скорость 0 более 2 часов', threshold: 2 },
                  { type: 'speed_exceeded', label: 'Скорость > 90 км/ч', desc: 'Превышение лимита скорости', threshold: 90 },
                  { type: 'fuel_low', label: 'Топливо < 15%', desc: 'Низкий уровень топлива', threshold: 15 },
                ].map((preset, i) => (
                  <button key={i} onClick={async () => {
                    // Add rule for all equipment with trackers
                    const eqsWithTrackers = equipment.filter(e => e.trackers && e.trackers.length > 0)
                    if (eqsWithTrackers.length === 0) {
                      toast.error('Нет техники с трекерами')
                      return
                    }
                    setSavingRule(true)
                    let created = 0
                    for (const eq of eqsWithTrackers) {
                      try {
                        const res = await fetch('/api/notifications/rules', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            equipmentId: eq.id,
                            conditionType: preset.type,
                            thresholdValue: preset.threshold,
                            description: preset.desc,
                            isActive: true,
                          }),
                        })
                        if (res.ok) created++
                      } catch { /* ignore */ }
                    }
                    toast.success(`Добавлено ${created} правил`)
                    setSavingRule(false)
                    loadRules()
                  }} className="flex items-center gap-2 p-2 rounded-md border text-left hover:bg-muted/50 transition-colors" disabled={savingRule}>
                    <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium">{preset.label}</p>
                      <p className="text-[9px] text-muted-foreground">{preset.desc} • для всей техники</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add rule dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="size-4" />Новое правило уведомления</DialogTitle>
            <DialogDescription>Настройте условие, при котором вы получите важное уведомление</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Техника</Label>
              <Select value={newRuleEqId} onValueChange={setNewRuleEqId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выберите технику" /></SelectTrigger>
                <SelectContent>
                  {equipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.registrationNum || '—'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Условие</Label>
              <Select value={newRuleType} onValueChange={setNewRuleType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Не в сети</SelectItem>
                  <SelectItem value="not_synced">Нет синхронизации</SelectItem>
                  <SelectItem value="not_moving">Не движется</SelectItem>
                  <SelectItem value="speed_exceeded">Превышение скорости</SelectItem>
                  <SelectItem value="fuel_low">Низкое топливо</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newRuleType === 'not_synced' || newRuleType === 'not_moving' || newRuleType === 'speed_exceeded' || newRuleType === 'fuel_low') && (
              <div>
                <Label className="text-xs">
                  {newRuleType === 'not_synced' || newRuleType === 'not_moving' ? 'Порог (часы)' : newRuleType === 'speed_exceeded' ? 'Порог (км/ч)' : 'Порог (%)'}
                </Label>
                <Input type="number" value={newRuleThreshold} onChange={e => setNewRuleThreshold(e.target.value)} className="h-8 text-xs" placeholder={newRuleType === 'speed_exceeded' ? '90' : newRuleType === 'fuel_low' ? '15' : '1'} />
              </div>
            )}
            <div>
              <Label className="text-xs">Описание (необязательно)</Label>
              <Input value={newRuleDesc} onChange={e => setNewRuleDesc(e.target.value)} className="h-8 text-xs" placeholder="Описание правила" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddRuleOpen(false)}>Отмена</Button>
            <Button size="sm" className="h-7 text-xs" onClick={addRule} disabled={savingRule || !newRuleEqId}>
              {savingRule ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Export Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="size-4" />Экспорт отчёта XLSX</DialogTitle>
            <DialogDescription>Выгрузка отчёта по датчикам и статистике за указанный период</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Equipment selection */}
            <div>
              <Label className="text-xs font-medium">Техника</Label>
              <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {trackedEquipment.map(eq => (
                  <label key={eq.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                    <input
                      type="checkbox"
                      checked={reportEqIds.includes(eq.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setReportEqIds(prev => [...prev, eq.id])
                        } else {
                          setReportEqIds(prev => prev.filter(id => id !== eq.id))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="truncate">{eq.name}</span>
                    {eq.registrationNum && <span className="text-muted-foreground">({eq.registrationNum})</span>}
                  </label>
                ))}
                {trackedEquipment.length > 0 && (
                  <div className="flex gap-2 pt-1 border-t">
                    <button className="text-[10px] text-primary hover:underline" onClick={() => setReportEqIds(trackedEquipment.map(e => e.id))}>Выбрать все</button>
                    <button className="text-[10px] text-muted-foreground hover:underline" onClick={() => setReportEqIds([])}>Очистить</button>
                  </div>
                )}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">С</Label>
                <Input type="datetime-local" className="h-8 text-xs" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium">По</Label>
                <Input type="datetime-local" className="h-8 text-xs" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Сегодня', 'Вчера', 'Неделя', 'Месяц'].map(preset => (
                <Button key={preset} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyReportDatePreset(preset)}>{preset}</Button>
              ))}
            </div>

            {/* Sensor types filter */}
            {allSensorTypes.length > 0 && (
              <div>
                <Label className="text-xs font-medium">Типы датчиков (пусто = все)</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {allSensorTypes.map(type => (
                    <label key={type} className="flex items-center gap-1 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportSensorTypes.includes(type)}
                        onChange={e => {
                          if (e.target.checked) {
                            setReportSensorTypes(prev => [...prev, type])
                          } else {
                            setReportSensorTypes(prev => prev.filter(t => t !== type))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIncludeStats}
                  onChange={e => setReportIncludeStats(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Включить статистику (пробег, расход, скорости)
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportIncludeTracks}
                  onChange={e => setReportIncludeTracks(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Включить данные треков (поездки, стоянки, заправки)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReportOpen(false)}>Отмена</Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={exportReport} disabled={reportLoading || reportEqIds.length === 0 || !reportDateFrom || !reportDateTo}>
              {reportLoading ? <Loader2 className="size-3 animate-spin" /> : <FileText className="size-3" />}
              Скачать XLSX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
