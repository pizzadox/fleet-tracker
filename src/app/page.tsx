'use client'

/* ═══════════════════════════════════════════════════════════════
   УЧЁТ ТЕХНИКИ — Комплексная система учёта оборудования
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useRef, useMemo, useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'

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
  ArrowDownToLine, ArrowUpFromLine, Save, Printer,
  TrendingUp, TrendingDown, Copy, Timer, Droplets, Zap as Lightning,
  Hash, Calculator, StickyNote, CircleDot, FileBadge, Fuel as FuelIcon,
  Armchair, Anchor, TimerReset, MoveRight, Tag, BadgeCheck,
  ScanLine, Receipt, Truck as TruckIcon, Flame,
  ArrowUp, ArrowDown, GripVertical, MapPinned, ToggleRight,
  LogOut, Globe, Database, Palette, LayoutGrid, List, FileDown, CheckCheck,
  ArrowUpCircle, MousePointerClick, Layers, Terminal, Send,
  Pause, Play, MessageSquare, Flag, CalendarDays, Kanban, LayoutDashboard,
  CopyPlus, RefreshCw as RefreshCwIcon, ExternalLink, ImageOff, SortAsc, SortDesc,
  PauseCircle, ShieldCheck, FileBadge2, GaugeDashboard, BookmarkCheck, MessageCircle,
  HeartPulse
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
  estimatedDuration?: number | null; notes?: string | null;
}

interface RepairPhoto {
  id: string; repairId: string; url: string;
  description?: string | null; stageId?: string | null;
  category: string;
}

interface RepairEmployee {
  id: string; repairId: string; employeeId: string; role: string;
  assignedAt: string; notes?: string | null;
  employee: { id: string; fullName: string; position: string; phone?: string | null; status: string; licenseCat?: string | null };
}

interface RepairComment {
  id: string; repairId: string; text: string; author?: string | null; createdAt: string;
}

interface Repair {
  id: string; equipmentId: string; description: string;
  reason?: string | null; startDate: string; endDate?: string | null;
  status: string; cost?: number | null; contractor?: string | null;
  contractorPhone?: string | null; workPerformed?: string | null;
  spareParts?: string | null; nextInspection?: string | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  priority: string; repairType: string;
  estimatedEndDate?: string | null; estimatedCost?: number | null;
  contractorEmail?: string | null; location?: string | null;
  mileageStart?: number | null; mileageEnd?: number | null;
  downtimeHours?: number | null; warrantyRepair: boolean;
  insuranceClaim: boolean; insuranceNumber?: string | null;
  comments?: RepairComment[];
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null; type?: string | null };
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
  condition?: string; location?: string | null; depot?: string | null;
  lastMaintenanceDate?: string | null; nextMaintenanceDate?: string | null;
  maintenanceInterval?: number | null; fuelConsumptionNorm?: number | null;
  tireSize?: string | null; tireReplacementDate?: string | null;
  oilChangeDate?: string | null; oilChangeMileage?: number | null;
  oilChangeInterval?: number | null; assignedDriver?: string | null;
  garageNumber?: string | null; unitNumber?: string | null;
  rentalStartDate?: string | null; rentalEndDate?: string | null;
  rentalCost?: number | null; decommissionDate?: string | null;
  decommissionReason?: string | null;
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

interface RoutePoint {
  id: string; tripId: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; sortOrder: number;
  plannedArrival?: string | null; plannedDeparture?: string | null;
  actualArrival?: string | null; distanceFromPrev?: number | null;
  notes?: string | null; createdAt: string; updatedAt: string;
}

interface RouteTemplatePoint {
  id: string; routeTemplateId: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; sortOrder: number;
  plannedArrival?: string | null; plannedDeparture?: string | null;
  distanceFromPrev?: number | null; notes?: string | null;
  createdAt: string; updatedAt: string;
}

interface RouteTemplate {
  id: string; name: string; description?: string | null;
  startPoint?: string | null; endPoint?: string | null;
  totalDistance?: number | null; estimatedDuration?: number | null;
  notes?: string | null; createdAt: string; updatedAt: string;
  points: RouteTemplatePoint[];
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
  parkingsDuration?: number | null; trackerSnapshot?: string | null; trackerSnapshotStart?: string | null;
  trackDataJson?: string | null; trackDataLoadedAt?: string | null;
  hasCachedTrack?: boolean;
  routeTemplateId?: string | null;
  createdAt: string; updatedAt: string;
  equipment?: { id: string; name: string; registrationNum?: string | null; brand?: string | null; model?: string | null };
  crew?: { id: string; name: string; members?: { fullName: string; role: string }[] } | null;
  routePoints?: RoutePoint[];
  routeTemplate?: { id: string; name: string; points: RouteTemplatePoint[] } | null;
}

// ─── Auth Types ─────────────────────────────────────────────────
interface AppUserType {
  id: string; name: string; role: string; isActive: boolean; avatar: string | null;
  createdAt?: string; updatedAt?: string;
}

type RoleKey = 'admin' | 'manager' | 'trip_master' | 'repair_worker' | 'worker'

const ROLE_LABELS: Record<RoleKey, string> = {
  admin: 'Администратор',
  manager: 'Управляющий',
  trip_master: 'Мастер рейсов',
  repair_worker: 'Работник ремонта',
  worker: 'Работник',
}

// Default permissions (used as fallback when DB has no entries)
const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  admin: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map', 'settings', 'users'],
  manager: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map'],
  trip_master: ['trips', 'crews', 'map', 'equipment_read'],
  repair_worker: ['repairs', 'equipment_read'],
  worker: ['equipment_read', 'map'],
}

// All available permissions with labels and categories
const ALL_PERMISSIONS: { key: string; label: string; category: string }[] = [
  { key: 'equipment', label: 'Техника (полный доступ)', category: 'Техника' },
  { key: 'equipment_read', label: 'Техника (просмотр)', category: 'Техника' },
  { key: 'repairs', label: 'Ремонты (полный доступ)', category: 'Ремонты' },
  { key: 'repairs_read', label: 'Ремонты (просмотр)', category: 'Ремонты' },
  { key: 'trips', label: 'Рейсы (полный доступ)', category: 'Рейсы' },
  { key: 'trips_read', label: 'Рейсы (просмотр)', category: 'Рейсы' },
  { key: 'employees', label: 'Сотрудники', category: 'Управление' },
  { key: 'companies', label: 'Компании', category: 'Управление' },
  { key: 'crews', label: 'Экипажи', category: 'Управление' },
  { key: 'map', label: 'Карта и трекеры', category: 'Мониторинг' },
  { key: 'settings', label: 'Настройки системы', category: 'Система' },
  { key: 'users', label: 'Управление пользователями', category: 'Система' },
]

// Dynamic permissions map — will be loaded from DB
let dynamicPermissions: Record<string, string[]> = { ...DEFAULT_ROLE_PERMISSIONS }

function setDynamicPermissions(perms: Record<string, string[]>) {
  dynamicPermissions = perms
}

function hasPermission(role: string, perm: string): boolean {
  // Admin always has all permissions
  if (role === 'admin') return true
  const perms = dynamicPermissions[role] || DEFAULT_ROLE_PERMISSIONS[role as RoleKey] || []
  return perms.includes(perm) || perms.includes('equipment') && perm === 'equipment_read'
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7', '#d946ef',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'В эксплуатации', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  repair: { label: 'На ремонте', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
  decommissioned: { label: 'Списана', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
  rented: { label: 'В аренде', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  reserved: { label: 'Зарезервирована', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400', border: 'border-l-violet-500' },
}

const REPAIR_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  paused: { label: 'Приостановлен', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
}

const STAGE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидание', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  paused: { label: 'Пауза', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
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

const EQUIPMENT_CONDITION_MAP: Record<string, { label: string; color: string; icon: string }> = {
  excellent: { label: 'Отличное', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', icon: '✓' },
  good: { label: 'Хорошее', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', icon: '○' },
  fair: { label: 'Удовлетворительное', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', icon: '△' },
  poor: { label: 'Плохое', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', icon: '✗' },
}

const FUEL_TYPE_MAP: Record<string, string> = {
  diesel: 'Дизель', petrol: 'Бензин', gas: 'Газ', electric: 'Электро', hybrid: 'Гибрид',
}

const ENGINE_TYPE_MAP: Record<string, string> = {
  internal_combustion: 'ДВС', electric: 'Электрический', hybrid: 'Гибридный',
}

const MAINTENANCE_WARN_DAYS = 30

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

const REPAIR_PRIORITY_MAP: Record<string, { label: string; color: string; icon?: string }> = {
  low: { label: 'Низкий', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  medium: { label: 'Средний', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  high: { label: 'Высокий', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  critical: { label: 'Критический', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
}

const REPAIR_TYPE_MAP: Record<string, { label: string; color: string }> = {
  planned: { label: 'Плановый', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  emergency: { label: 'Аварийный', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  warranty: { label: 'Гарантийный', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400' },
  preventive: { label: 'Профилактический', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
}

const REPAIR_PHOTO_CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  before: { label: 'До ремонта', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  during: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  after: { label: 'После ремонта', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  document: { label: 'Документы', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  other: { label: 'Другое', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
}

const STAGE_TEMPLATES = [
  { name: 'Диагностика', description: 'Проведение диагностики неисправности' },
  { name: 'Разборка', description: 'Демонтаж и разборка узлов' },
  { name: 'Закупка запчастей', description: 'Заказ и получение запчастей' },
  { name: 'Ремонт/замена', description: 'Выполнение ремонтных работ' },
  { name: 'Сборка', description: 'Обратная сборка узлов' },
  { name: 'Тестирование', description: 'Проверка работоспособности' },
  { name: 'Покраска', description: 'Подготовка и покраска' },
  { name: 'Сдача заказчику', description: 'Проверка качества и сдача' },
]

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

// Convert datetime-local string (from <input>) to ISO string with correct timezone offset
// e.g. "2026-05-18T14:14" (local time in Moscow UTC+3) → "2026-05-18T11:14:00.000Z" (UTC)
// IMPORTANT: We use the Date(year, month, day, hour, minute) constructor which ALWAYS
// interprets arguments as local time, avoiding the inconsistent behavior of new Date(string)
// which may interpret "2026-05-18T14:14" as UTC in some environments.
function localDatetimeToISO(dtLocal: string | null | undefined): string | null {
  if (!dtLocal) return null
  // Try manual parsing first for reliability
  const match = dtLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hour, minute] = match.map(Number)
    const d = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  // Fallback: try standard Date parsing
  const d = new Date(dtLocal)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
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

function formatTime(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
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

function formatDaysUntil(d?: string | null): { text: string; className: string } | null {
  if (!d) return null
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { text: `Истекло ${Math.abs(days)} дн. назад (${formatDate(d)})`, className: 'text-red-600 dark:text-red-400 font-medium' }
  if (days < 30) return { text: `${days} дн. (${formatDate(d)})`, className: 'text-amber-600 dark:text-amber-400 font-medium' }
  return { text: `${days} дн. (${formatDate(d)})`, className: '' }
}

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 24) { const d = Math.floor(h / 24); return `${d}д ${h % 24}ч` }
  return h > 0 ? `${h}ч ${m}мин` : `${m}мин`
}

// Format duration from seconds to human-readable string (used in TripDetailDialog and auto-populate logic)
function fmtDuration(sec: number | null | undefined): string | null {
  if (sec == null) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
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
// API URL CONSTANTS
// ═══════════════════════════════════════════════════════════════

const API = {
  equipment: '/api/equipment',
  companies: '/api/companies',
  repairs: '/api/repairs',
  trips: '/api/trips',
  crews: '/api/crews',
  employees: '/api/employees',
  routeTemplates: '/api/route-templates',
  glonass: '/api/glonass',
  sync: '/api/glonass/sync',
  settings: '/api/glonass/settings',
  users: '/api/users',
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    users: '/api/auth/users',
  },
  notifications: {
    rules: '/api/notifications/rules',
    check: '/api/notifications/check',
  },
  permissions: '/api/permissions',
} as const

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Centralized error handler
function handleApiError(error: unknown, message: string = 'Ошибка') {
  console.error(message, error)
  toast.error(message)
}

// CSV Export utility
function downloadCSV(data: Record<string, unknown>[], filename: string) {
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

// Copy to clipboard helper
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Скопировано')
    return true
  } catch {
    toast.error('Ошибка копирования')
    return false
  }
}

// Section divider component
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Separator className="flex-1" />
    </div>
  )
}

// Pagination component
function PaginationControls({ page, totalPages, total, pageSize, onPageChange }: {
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

// ═══════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════

// Online/offline hook
function useOnlineStatus() {
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

// Scroll position hook (for scroll-to-top button)
function useScrollPosition() {
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

// Reduced motion hook
function useReducedMotion() {
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

// Filter persistence hook
function usePersistedFilter<T>(key: string, defaultValue: T): [T, (v: T) => void] {
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

// Auto-refresh countdown hook
function useAutoRefreshCountdown(intervalMs: number, enabled: boolean) {
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
// PIN LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════

function PinLoginScreen({ onLogin, users: allUsers, fetchUsers }: {
  onLogin: (user: AppUserType) => void
  users: AppUserType[]
  fetchUsers: () => void
}) {
  const [selectedUser, setSelectedUser] = useState<AppUserType | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usersList, setUsersList] = useState<AppUserType[]>(allUsers)

  useEffect(() => { setUsersList(allUsers) }, [allUsers])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Remember last login
  useEffect(() => {
    const lastUserId = localStorage.getItem('fleet_lastUserId')
    if (lastUserId && !selectedUser) {
      const last = usersList.find(u => u.id === lastUserId && u.isActive)
      if (last) setSelectedUser(last)
    }
  }, [usersList, selectedUser])

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
      setError('')
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleSubmit = async () => {
    if (!selectedUser || pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('fleet_lastUserId', selectedUser.id)
        onLogin(data.user)
      } else {
        setError(data.error || 'Ошибка входа')
        setPin('')
      }
    } catch {
      setError('Ошибка подключения')
      setPin('')
    }
    setLoading(false)
  }

  // Auto-submit when PIN is 4+ digits
  useEffect(() => {
    if (pin.length >= 4 && selectedUser) {
      handleSubmit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selectedUser])

  const activeUsers = usersList.filter(u => u.isActive)

  if (!selectedUser) {
    // User selection screen
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
              <Truck className="size-8" />
            </div>
            <h1 className="text-2xl font-bold">Учёт техники</h1>
            <p className="text-muted-foreground text-sm mt-1">Выберите пользователя для входа</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {activeUsers.map(user => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); setPin(''); setError('') }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors group"
              >
                <div
                  className="size-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: user.avatar || '#6366f1' }}
                >
                  {getInitials(user.name)}
                </div>
                <span className="text-xs font-medium text-center leading-tight max-w-[80px] truncate">{user.name}</span>
                <span className="text-[9px] text-muted-foreground">{ROLE_LABELS[user.role as RoleKey] || user.role}</span>
              </button>
            ))}
          </div>
          {activeUsers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <User className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Нет активных пользователей</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // PIN entry screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs">
        <button
          onClick={() => { setSelectedUser(null); setPin(''); setError('') }}
          className="flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />Назад
        </button>

        <div className="text-center mb-6">
          <div
            className="size-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg mx-auto mb-3"
            style={{ backgroundColor: selectedUser.avatar || '#6366f1' }}
          >
            {getInitials(selectedUser.name)}
          </div>
          <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[selectedUser.role as RoleKey] || selectedUser.role}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`size-3 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-primary scale-125'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mb-3 animate-pulse">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center mb-3">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} />
            if (key === '⌫') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center active:scale-95 transition-transform text-lg"
                >
                  <X className="size-5" />
                </button>
              )
            }
            return (
              <button
                key={i}
                onClick={() => handlePinInput(key)}
                className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center active:scale-95 transition-transform text-xl font-medium"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Enter button for 5-6 digit PINs */}
        {pin.length >= 4 && !loading && (
          <button
            onClick={handleSubmit}
            className="w-full mt-4 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="size-5" />Войти
          </button>
        )}
      </div>
    </div>
  )
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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <div className="min-h-screen flex flex-col bg-background">
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
    <div className="min-h-screen flex flex-col bg-background pb-16 md:pb-0" role="application" aria-label="Система учёта техники">
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
          {fullPhoto && <img src={fullPhoto} alt="Фото" className="w-full h-auto rounded-md object-contain max-h-[70vh]" loading="lazy" />}
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
          <div className="max-h-[50vh] overflow-y-auto">
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

// ═══════════════════════════════════════════════════════════════
// STAT CARD (compact)
// ═══════════════════════════════════════════════════════════════

const StatCard = React.memo(function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="py-2 gap-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="flex items-center gap-2 px-3 pt-0">
        <div className={`flex items-center justify-center size-7 rounded-md bg-muted ${color}`}>{icon}</div>
        <div>
          <p className="text-lg sm:text-xl font-bold leading-none animate-counter">{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
})

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT TAB
// ═══════════════════════════════════════════════════════════════

const EquipmentTab = React.memo(function EquipmentTab({ equipment, companies, eqSearch, setEqSearch, eqStatusFilter, setEqStatusFilter, eqTypeFilter, setEqTypeFilter, onOpenDetail, onAdd, onEdit, onDelete, onGoToMap, onCreateTrip, readOnly }: {
  equipment: Equipment[]; companies: Company[];
  eqSearch: string; setEqSearch: (v: string) => void;
  eqStatusFilter: string; setEqStatusFilter: (v: string) => void;
  eqTypeFilter: string; setEqTypeFilter: (v: string) => void;
  onOpenDetail: (eq: Equipment) => void;
  onAdd: () => void; onEdit: (eq: Equipment) => void; onDelete: (eq: Equipment) => void;
  onGoToMap: (eq: Equipment) => void;
  onCreateTrip: (eq: Equipment) => void;
  readOnly?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>('cards')
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [conditionFilter, setConditionFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [renterFilter, setRenterFilter] = useState('all')
  const [quickFilter, setQuickFilter] = useState<'all' | 'needs_maintenance' | 'insurance_expired' | 'to_expired' | 'poor_condition' | 'no_tracker' | 'rented'>('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [batchStatusDialog, setBatchStatusDialog] = useState(false)
  const [batchNewStatus, setBatchNewStatus] = useState('active')
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; onConfirm: () => void }>({ open: false, title: '', desc: '', onConfirm: () => {} })
  const PAGE_SIZE = 20

  const daysUntil = (d?: string | null) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const fmtKm = (km?: number | null) => {
    if (km == null) return '—'
    if (km >= 1000) return `${(km / 1000).toFixed(1)} тыс.км`
    return `${km.toLocaleString('ru-RU')} км`
  }

  const getEngineIcon = (type?: string | null) => {
    if (!type) return null
    const t = type.toLowerCase()
    if (t.includes('дизел') || t.includes('diesel')) return <Droplets className="size-3 text-amber-600 dark:text-amber-400" />
    if (t.includes('бензин') || t.includes('gas') || t.includes('petrol')) return <Flame className="size-3 text-red-500" />
    if (t.includes('электр') || t.includes('electric')) return <Zap className="size-3 text-blue-500" />
    if (t.includes('газ') || t.includes('lpg') || t.includes('cng')) return <Flame className="size-3 text-green-500" />
    return <Cog className="size-3 text-muted-foreground" />
  }

  const getFuelColor = (type?: string | null) => {
    if (!type) return ''
    const t = type.toLowerCase()
    if (t.includes('дизел') || t.includes('diesel')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    if (t.includes('бензин') || t.includes('gas') || t.includes('petrol')) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    if (t.includes('электр') || t.includes('electric')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    if (t.includes('газ') || t.includes('lpg') || t.includes('cng')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const copyRegNum = (regNum: string, eqId: string) => {
    copyToClipboard(regNum).then(ok => {
      if (ok) { setCopiedId(eqId); setTimeout(() => setCopiedId(null), 1500) }
    })
  }

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortIcon = (field: string) => {
    if (sortField !== field) return <ArrowDown className="size-3 text-muted-foreground/40" />
    return sortDir === 'asc' ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
  }

  // ── Statistics ──
  const stats = useMemo(() => {
    const total = equipment.length
    const active = equipment.filter(e => e.status === 'active').length
    const repair = equipment.filter(e => e.status === 'repair').length
    const rented = equipment.filter(e => e.status === 'rented').length
    const decommissioned = equipment.filter(e => e.status === 'decommissioned').length
    const reserved = equipment.filter(e => e.status === 'reserved').length
    const totalPurchase = equipment.reduce((s, e) => s + (e.purchasePrice || 0), 0)
    const totalCurrent = equipment.reduce((s, e) => s + (e.currentPrice || 0), 0)
    const conditions: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 }
    for (const eq of equipment) {
      if (eq.condition && conditions[eq.condition] !== undefined) conditions[eq.condition]++
    }
    const activeDays = equipment.filter(e => e.purchaseDate).reduce((s, e) => s + Math.max(1, Math.floor((Date.now() - new Date(e.purchaseDate!).getTime()) / (1000*60*60*24))), 0)
    const repairDays = equipment.reduce((s, e) => s + (e.repairs || []).filter(r => r.status === 'completed' && r.startDate && r.endDate).reduce((rs, r) => rs + Math.max(1, Math.ceil((new Date(r.endDate!).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24))), 0), 0)
    const utilization = activeDays > 0 ? Math.round(((activeDays - repairDays) / activeDays) * 100) : null
    const eqRepairCount: Record<string, number> = {}
    for (const eq of equipment) { if (eq._count?.repairs) eqRepairCount[eq.id] = eq._count.repairs }
    const topRepaired = Object.entries(eqRepairCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => equipment.find(e => e.id === id)).filter(Boolean) as Equipment[]
    return { total, active, repair, rented, decommissioned, reserved, totalPurchase, totalCurrent, conditions, utilization, topRepaired }
  }, [equipment])

  // ── Filtering & Sorting ──
  const filteredEquipment = useMemo(() => {
    let result = equipment.filter(eq => {
      if (conditionFilter !== 'all' && eq.condition !== conditionFilter) return false
      if (ownerFilter !== 'all' && eq.ownerId !== ownerFilter) return false
      if (renterFilter !== 'all' && eq.renterId !== renterFilter) return false
      const insDays = daysUntil(eq.insuranceExpiry)
      const inspDays = daysUntil(eq.inspectionExpiry)
      const maintDays = daysUntil(eq.nextMaintenanceDate)
      if (quickFilter === 'needs_maintenance' && !(maintDays != null && maintDays < MAINTENANCE_WARN_DAYS)) return false
      if (quickFilter === 'insurance_expired' && !(insDays != null && insDays < 0)) return false
      if (quickFilter === 'to_expired' && !(inspDays != null && inspDays < 0)) return false
      if (quickFilter === 'poor_condition' && eq.condition !== 'poor' && eq.condition !== 'fair') return false
      if (quickFilter === 'no_tracker' && eq.trackers && eq.trackers.length > 0) return false
      if (quickFilter === 'rented' && eq.status !== 'rented') return false
      return true
    })
    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break
        case 'status': { const so: Record<string, number> = { active: 1, repair: 2, rented: 3, reserved: 4, decommissioned: 5 }; aVal = so[a.status] || 0; bVal = so[b.status] || 0; break }
        case 'year': aVal = a.year || 0; bVal = b.year || 0; break
        case 'mileage': aVal = a.mileage || 0; bVal = b.mileage || 0; break
        case 'condition': { const co: Record<string, number> = { excellent: 1, good: 2, fair: 3, poor: 4 }; aVal = co[a.condition || ''] || 5; bVal = co[b.condition || ''] || 5; break }
        default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [equipment, conditionFilter, ownerFilter, renterFilter, quickFilter, sortField, sortDir])

  // Группировка по статусу для визуальной организации
  const statusOrder = ['active', 'repair', 'rented', 'reserved', 'decommissioned']
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Equipment[]> = {}
    for (const eq of filteredEquipment) {
      const s = eq.status || 'active'
      if (!groups[s]) groups[s] = []
      groups[s].push(eq)
    }
    return groups
  }, [filteredEquipment])

  const paginatedEquipment = filteredEquipment.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* ── Statistics Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Truck className="size-4 text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-lg font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Всего</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-lg font-bold">{stats.active}</p><p className="text-[10px] text-muted-foreground">В эксплуатации</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Wrench className="size-4 text-amber-600 dark:text-amber-400" /></div><div><p className="text-lg font-bold">{stats.repair}</p><p className="text-[10px] text-muted-foreground">На ремонте</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center"><Users className="size-4 text-sky-600 dark:text-sky-400" /></div><div><p className="text-lg font-bold">{stats.rented}</p><p className="text-[10px] text-muted-foreground">В аренде</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><BookmarkCheck className="size-4 text-violet-600 dark:text-violet-400" /></div><div><p className="text-lg font-bold">{stats.reserved}</p><p className="text-[10px] text-muted-foreground">Зарезервирована</p></div></div></Card>
        <Card className="p-3"><div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center"><XCircle className="size-4 text-red-600 dark:text-red-400" /></div><div><p className="text-lg font-bold">{stats.decommissioned}</p><p className="text-[10px] text-muted-foreground">Списана</p></div></div></Card>
      </div>

      {/* ── Fleet Value + Condition + Utilization ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Стоимость парка</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold">{stats.totalPurchase.toLocaleString('ru-RU')} ₽</span>
            <span className="text-[10px] text-muted-foreground">покупка</span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-sm font-medium text-muted-foreground">{stats.totalCurrent.toLocaleString('ru-RU')} ₽</span>
            <span className="text-[10px] text-muted-foreground">текущая</span>
            {stats.totalPurchase > 0 && (
              <span className={`text-[10px] font-medium ${((1 - stats.totalCurrent / stats.totalPurchase) * 100) > 50 ? 'text-red-500' : ((1 - stats.totalCurrent / stats.totalPurchase) * 100) > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                износ {Math.round((1 - stats.totalCurrent / stats.totalPurchase) * 100)}%
              </span>
            )}
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Состояние парка</p>
          <div className="flex items-center gap-1.5">
            {Object.entries(EQUIPMENT_CONDITION_MAP).map(([key, info]) => (
              <div key={key} className="flex-1 text-center">
                <div className={`rounded px-1.5 py-1 text-[10px] font-medium ${info.color}`}>{stats.conditions[key] || 0}</div>
                <p className="text-[8px] text-muted-foreground mt-0.5">{info.label}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Использование парка</p>
          <div className="flex items-center gap-2">
            {stats.utilization != null ? (
              <>
                <Progress value={Math.min(100, stats.utilization)} className="flex-1 h-2" />
                <span className={`text-sm font-bold ${stats.utilization > 80 ? 'text-emerald-600 dark:text-emerald-400' : stats.utilization > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{stats.utilization}%</span>
              </>
            ) : <span className="text-xs text-muted-foreground">Нет данных</span>}
          </div>
          {stats.topRepaired.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Wrench className="size-3" />Чаще в ремонте: {stats.topRepaired.map(e => e.name).join(', ')}
            </div>
          )}
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию, номеру, VIN, гаражный №, водитель..." value={eqSearch} onChange={e => { setEqSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={eqStatusFilter} onValueChange={v => { setEqStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eqTypeFilter} onValueChange={v => { setEqTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
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
          <Select value={conditionFilter} onValueChange={v => { setConditionFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Состояние" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любое состояние</SelectItem>
              {Object.entries(EQUIPMENT_CONDITION_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={v => { setOwnerFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Владелец" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все владельцы</SelectItem>
              {companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={renterFilter} onValueChange={v => { setRenterFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Арендатор" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все арендаторы</SelectItem>
              {companies.filter(c => c.type === 'renter' || c.type === 'both').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Quick Filters ── */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'all' as const, label: 'Все', icon: <List className="size-3" /> },
          { key: 'needs_maintenance' as const, label: 'Требует ТО', icon: <Wrench className="size-3" /> },
          { key: 'insurance_expired' as const, label: 'Просрочена страховка', icon: <Shield className="size-3" /> },
          { key: 'to_expired' as const, label: 'Просрочен ТО', icon: <ClipboardCheck className="size-3" /> },
          { key: 'poor_condition' as const, label: 'Слабое состояние', icon: <AlertTriangle className="size-3" /> },
          { key: 'no_tracker' as const, label: 'Без трекера', icon: <WifiOff className="size-3" /> },
          { key: 'rented' as const, label: 'В аренде', icon: <Users className="size-3" /> },
        ].map(f => (
          <Button key={f.key} variant={quickFilter === f.key ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setQuickFilter(f.key); setPage(1) }}>
            {f.icon}{f.label}
          </Button>
        ))}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить</Button>
        <div className="flex gap-0.5">
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('cards')} title="Карточки"><LayoutGrid className="size-3.5" /></Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('table')} title="Таблица"><List className="size-3.5" /></Button>
          <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => setViewMode('kanban')} title="Канбан"><Kanban className="size-3.5" /></Button>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-2" onClick={() => downloadCSV(filteredEquipment.map(eq => ({
          Название: eq.name, Тип: eq.type, Госномер: eq.registrationNum || '', VIN: eq.vin || '', Бренд: eq.brand || '', Модель: eq.model || '',
          Год: eq.year?.toString() || '', Статус: EQUIPMENT_STATUS_MAP[eq.status]?.label || eq.status, Состояние: EQUIPMENT_CONDITION_MAP[eq.condition || '']?.label || '',
          Пробег: eq.mileage?.toString() || '', Гаражный_номер: eq.garageNumber || '', Сменный_номер: eq.unitNumber || '',
          Водитель: eq.assignedDriver || '', Владелец: eq.owner?.name || '', Арендатор: eq.renter?.name || '',
          Покупка_руб: eq.purchasePrice?.toString() || '', Текущая_руб: eq.currentPrice?.toString() || '',
          ОСАГО_до: eq.insuranceExpiry ? formatDate(eq.insuranceExpiry) : '', ТО_до: eq.inspectionExpiry ? formatDate(eq.inspectionExpiry) : '',
          След_ТО: eq.nextMaintenanceDate ? formatDate(eq.nextMaintenanceDate) : '', Расход_топлива: eq.fuelConsumptionNorm?.toString() || '',
          Аренда_от: eq.rentalStartDate ? formatDate(eq.rentalStartDate) : '', Аренда_до: eq.rentalEndDate ? formatDate(eq.rentalEndDate) : '',
          Аренда_руб_мес: eq.rentalCost?.toString() || '', Местоположение: eq.location || '', Депо: eq.depot || '',
        })), 'equipment')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
        {!readOnly && (
          <Button variant={bulkMode ? 'default' : 'outline'} size="sm" className="h-9 px-2" onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }} title="Выделение" aria-label="Выделение">
            <CheckCheck className="size-3.5" />
          </Button>
        )}
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">Найдено: {filteredEquipment.length}</p>
      </div>

      {/* ── Bulk actions bar ── */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted animate-in fade-in duration-200">
          <span className="text-xs font-medium">Выбрано: {selectedIds.size}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBatchStatusDialog(true)}>
            <Activity className="size-3" />Изменить статус
          </Button>
          <Button variant="destructive" size="sm" className="h-7 text-xs gap-1 active:scale-95 transition-transform" onClick={() => setConfirmDialog({ open: true, title: 'Удалить выбранное', desc: `Удалить ${selectedIds.size} единиц техники? Это действие необратимо.`, onConfirm: async () => {
            for (const id of selectedIds) { try { await fetch(`/api/equipment/${id}`, { method: 'DELETE' }) } catch {} }
            toast.success(`Удалено: ${selectedIds.size}`)
            setSelectedIds(new Set()); setBulkMode(false)
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }})}>
            <Trash2 className="size-3" />Удалить
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedIds(new Set()); setBulkMode(false) }}>Отмена</Button>
        </div>
      )}

      {/* Batch status change dialog */}
      <Dialog open={batchStatusDialog} onOpenChange={setBatchStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Изменить статус</DialogTitle><DialogDescription>Выберите новый статус для {selectedIds.size} единиц техники</DialogDescription></DialogHeader>
          <Select value={batchNewStatus} onValueChange={setBatchNewStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBatchStatusDialog(false)}>Отмена</Button>
            <Button size="sm" onClick={async () => {
              for (const id of selectedIds) { try { await fetch(`/api/equipment/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: batchNewStatus }) }) } catch {} }
              toast.success(`Статус изменён для ${selectedIds.size} единиц`)
              setSelectedIds(new Set()); setBulkMode(false); setBatchStatusDialog(false)
            }}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(v) => setConfirmDialog(prev => ({ ...prev, open: v }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle><AlertDialogDescription>{confirmDialog.desc}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={confirmDialog.onConfirm}>Подтвердить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Status quick filter chips ── */}
      <div className="flex gap-1">
        {statusOrder.map(s => {
          const cnt = groupedByStatus[s]?.length || 0
          if (cnt === 0) return null
          const info = EQUIPMENT_STATUS_MAP[s]
          return (
            <button key={s} onClick={() => setEqStatusFilter(eqStatusFilter === s ? 'all' : s)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${eqStatusFilter === s ? 'ring-1 ring-primary' : ''} ${info?.color || 'bg-muted'}`}>
              {cnt} {info?.label || s}
            </button>
          )
        })}
      </div>

      {filteredEquipment.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Truck className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Техника не найдена</p>
            <p className="text-xs text-muted-foreground mt-1">Измените фильтры или добавьте новую технику</p>
            {!readOnly && <Button variant="outline" size="sm" className="mt-3 gap-1.5 active:scale-95 transition-transform" onClick={onAdd}><Plus className="size-3.5" />Добавить технику</Button>}
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* ── Kanban View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {(['active', 'repair', 'rented', 'reserved', 'decommissioned'] as const).map(status => {
            const info = EQUIPMENT_STATUS_MAP[status]
            const items = groupedByStatus[status] || []
            return (
              <div key={status} className="space-y-2">
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${info?.color || 'bg-muted'}`}>
                  <span className="text-xs font-semibold">{info?.label || status}</span>
                  <span className="ml-auto text-[10px] font-medium">{items.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {items.map(eq => {
                    const typeInfo = getTypeInfo(eq.type)
                    const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
                    const tracker = eq.trackers?.[0]
                    const trackerOnline = eq.trackers?.some(t => t.isActive)
                    return (
                      <Card key={eq.id} className="cursor-pointer hover:shadow-sm transition-shadow p-2.5" onClick={() => onOpenDetail(eq)}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {condInfo && <span className={`size-2 rounded-full shrink-0 ${condInfo.color.includes('emerald') ? 'bg-emerald-500' : condInfo.color.includes('sky') ? 'bg-sky-500' : condInfo.color.includes('amber') ? 'bg-amber-500' : 'bg-red-500'}`} title={condInfo.label} />}
                          <span className="text-xs font-medium truncate flex-1">{eq.name}</span>
                          {tracker && <span className={`size-1.5 rounded-full ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} />}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{eq.registrationNum || '—'}{eq.garageNumber ? ` • Г${eq.garageNumber}` : ''}</p>
                        {(eq.brand || eq.model) && <p className="text-[10px] text-muted-foreground">{[eq.brand, eq.model].filter(Boolean).join(' ')}{eq.year ? ` ${eq.year}` : ''}</p>}
                        {eq.assignedDriver && <p className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</p>}
                      </Card>
                    )
                  })}
                  {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Пусто</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {bulkMode && <TableHead className="w-10 text-xs"></TableHead>}
                  <TableHead className="text-xs">Сост.</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort('status')}>Статус {sortIcon('status')}</TableHead>
                  <TableHead className="text-xs">Тип</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none min-w-[140px]" onClick={() => toggleSort('name')}>Название {sortIcon('name')}</TableHead>
                  <TableHead className="text-xs">Госномер</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Бренд / Модель</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('year')}>Год {sortIcon('year')}</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('mileage')}>Пробег {sortIcon('mileage')}</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hidden xl:table-cell" onClick={() => toggleSort('condition')}>Сост. {sortIcon('condition')}</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Владелец</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Арендатор</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">ОСАГО</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">ТО</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Трекер</TableHead>
                  <TableHead className="text-xs text-right w-[120px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEquipment.map((eq) => {
                  const typeInfo = getTypeInfo(eq.type)
                  const statusInfo = EQUIPMENT_STATUS_MAP[eq.status]
                  const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
                  const insDays = daysUntil(eq.insuranceExpiry)
                  const inspDays = daysUntil(eq.inspectionExpiry)
                  const maintDays = daysUntil(eq.nextMaintenanceDate)
                  const tracker = eq.trackers?.[0]
                  const trackerOnline = eq.trackers?.some(t => t.isActive)
                  const brandModel = [eq.brand, eq.model].filter(Boolean).join(' ')
                  const depreciation = eq.purchasePrice && eq.currentPrice ? Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100) : null
                  const age = eq.year ? new Date().getFullYear() - eq.year : null
                  return (
                    <TableRow key={eq.id} className={`cursor-pointer group ${eq.status === 'repair' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`} onClick={() => onOpenDetail(eq)}>
                      {bulkMode && (
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(eq.id)} onCheckedChange={() => {
                            const next = new Set(selectedIds)
                            if (next.has(eq.id)) next.delete(eq.id); else next.add(eq.id)
                            setSelectedIds(next)
                          }} aria-label={`Выбрать ${eq.name}`} />
                        </TableCell>
                      )}
                      <TableCell>
                        {condInfo && <span className={`size-2.5 rounded-full inline-block ${condInfo.color.includes('emerald') ? 'bg-emerald-500' : condInfo.color.includes('sky') ? 'bg-sky-500' : condInfo.color.includes('amber') ? 'bg-amber-500' : 'bg-red-500'}`} title={condInfo.label} />}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${statusInfo?.color || ''} ${eq.status === 'repair' ? 'animate-status-pulse' : ''}`}>
                          {statusInfo?.label || eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center justify-center size-7 rounded-md shrink-0 ${typeInfo.color} ${typeInfo.darkColor}`}>
                          {React.cloneElement(typeInfo.icon as React.ReactElement, { className: 'size-3.5' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {tracker && (
                            <span className={`size-2 rounded-full shrink-0 ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} title={trackerOnline ? 'Онлайн' : 'Офлайн'} />
                          )}
                          <span className="font-medium text-sm truncate">{eq.name}</span>
                          {(insDays != null && insDays < 0) || (inspDays != null && inspDays < 0) || (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS) ? (
                            <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                          ) : null}
                          {depreciation != null && <span className={`text-[9px] font-medium shrink-0 ${depreciation > 50 ? 'text-red-500' : depreciation > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>{depreciation}%</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {eq.registrationNum ? (
                          <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary inline-flex items-center gap-0.5"
                            onClick={(e) => { e.stopPropagation(); copyRegNum(eq.registrationNum!, eq.id) }}
                            title={copiedId === eq.id ? 'Скопировано!' : 'Копировать госномер'}>
                            {eq.registrationNum}
                            <Copy className="size-3" />
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{brandModel || '—'}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{eq.year || '—'}{age != null && age > 0 ? <span className="text-[9px] text-muted-foreground/60 ml-0.5">({age}л)</span> : null}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{fmtKm(eq.mileage)}</span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {condInfo ? (
                          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${condInfo.color}`}>{condInfo.icon} {condInfo.label}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {eq.owner ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={eq.owner.name}>{eq.owner.name}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {eq.renter ? (
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium truncate max-w-[120px] block" title={eq.renter.name}>{eq.renter.name}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {insDays != null ? (
                          <span className={`text-xs font-medium ${insDays < 0 ? 'text-red-600 dark:text-red-400' : insDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {insDays < 0 ? `${Math.abs(insDays)}д` : `${insDays}д`}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {inspDays != null ? (
                          <span className={`text-xs font-medium ${inspDays < 0 ? 'text-red-600 dark:text-red-400' : inspDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {inspDays < 0 ? `${Math.abs(inspDays)}д` : `${inspDays}д`}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {tracker ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${trackerOnline ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {tracker.lastSpeed != null && tracker.lastSpeed > 0 ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{tracker.lastSpeed} км/ч</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{trackerOnline ? 'Стоит' : 'Офлайн'}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onOpenDetail(eq)} title="Подробнее"><Eye className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onGoToMap(eq)} title="Карта"><MapPin className="size-3.5" /></Button>
                          {!readOnly && (<>
                            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(eq)} title="Редактировать"><Edit className="size-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(eq)} title="Удалить"><Trash2 className="size-3.5" /></Button>
                          </>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={page} totalPages={Math.ceil(filteredEquipment.length / PAGE_SIZE)} total={filteredEquipment.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      ) : (
        /* ── Cards View ── */
        <div className="space-y-1">
          {paginatedEquipment.map((eq, idx) => {
            const typeInfo = getTypeInfo(eq.type)
            const statusInfo = EQUIPMENT_STATUS_MAP[eq.status]
            const condInfo = EQUIPMENT_CONDITION_MAP[eq.condition || '']
            const insDays = daysUntil(eq.insuranceExpiry)
            const inspDays = daysUntil(eq.inspectionExpiry)
            const maintDays = daysUntil(eq.nextMaintenanceDate)
            const tracker = eq.trackers?.[0]
            const trackerOnline = eq.trackers?.some(t => t.isActive)
            const age = eq.year ? new Date().getFullYear() - eq.year : (eq.purchaseDate ? Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
            const depreciation = eq.purchasePrice && eq.currentPrice ? Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100) : null
            const hasWarnings = (insDays != null && insDays < 30) || (inspDays != null && inspDays < 30) || (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS)
            const brandModel = [eq.brand, eq.model].filter(Boolean).join(' ')
            const isExpanded = expandedId === eq.id

            return (
              <Card
                key={eq.id}
                className={`group relative transition-all duration-200 overflow-hidden border-l-[3px] animate-card-in ${statusInfo?.border || ''} ${isExpanded ? 'shadow-md border-primary/30' : 'hover:shadow-sm hover:border-primary/20'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {bulkMode && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center z-10">
                    <Checkbox checked={selectedIds.has(eq.id)} onCheckedChange={() => {
                      const next = new Set(selectedIds)
                      if (next.has(eq.id)) next.delete(eq.id); else next.add(eq.id)
                      setSelectedIds(next)
                    }} aria-label={`Выбрать ${eq.name}`} />
                  </div>
                )}
                <div
                  className={`flex items-center gap-2.5 px-3 pt-2 pb-0.5 cursor-pointer select-none ${bulkMode ? 'pl-10' : ''}`}
                  onClick={() => { if (!bulkMode) setExpandedId(isExpanded ? null : eq.id) }}
                >
                  <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${typeInfo.color} ${typeInfo.darkColor}`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {condInfo && <span className={`size-2.5 rounded-full shrink-0 ${condInfo.color.includes('emerald') ? 'bg-emerald-500' : condInfo.color.includes('sky') ? 'bg-sky-500' : condInfo.color.includes('amber') ? 'bg-amber-500' : 'bg-red-500'}`} title={condInfo.label} />}
                        {tracker && (
                          <span className={`size-3 rounded-full shrink-0 ${trackerOnline ? 'bg-emerald-500 animate-pulse animate-online-ring' : 'bg-red-400'}`} title={trackerOnline ? 'Онлайн' : 'Офлайн'} />
                        )}
                        <span className="font-semibold text-sm truncate">{eq.name}</span>
                        {hasWarnings && <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />}
                        {maintDays != null && maintDays < MAINTENANCE_WARN_DAYS && <Wrench className="size-3 text-orange-500 shrink-0" title={`ТО через ${maintDays}д`} />}
                      </div>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${statusInfo?.color || ''} ${eq.status === 'repair' ? 'animate-status-pulse' : ''}`}>
                        {statusInfo?.label || eq.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {eq.registrationNum && (
                        <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary shrink-0 inline-flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); copyRegNum(eq.registrationNum!, eq.id) }}
                          title={copiedId === eq.id ? 'Скопировано!' : 'Копировать госномер'}>
                          {eq.registrationNum}
                          <Copy className="size-3" />
                        </span>
                      )}
                      {eq.garageNumber && <span className="text-[10px] text-muted-foreground">Г#{eq.garageNumber}</span>}
                      {eq.unitNumber && <span className="text-[10px] text-muted-foreground">С#{eq.unitNumber}</span>}
                      {eq.assignedDriver && <span className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</span>}
                      {tracker?.lastSpeed != null && tracker.lastSpeed > 0 && (
                        <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                          <Navigation className="size-3" />{tracker.lastSpeed} км/ч
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {brandModel && <span className="text-xs text-muted-foreground truncate">{brandModel}</span>}
                      {eq.year && <span className="text-xs text-muted-foreground">{eq.year} г.{age != null ? ` (${age}л)` : ''}</span>}
                      {eq.category && <span className="text-xs text-muted-foreground font-medium">кат. {eq.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {eq.owner && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" />{eq.owner.name}</span>}
                      {eq.renter && <span className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium"><Users className="size-3" />{eq.renter.name}</span>}
                    </div>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-3 pt-0 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
                      {eq.engineType && <span className="inline-flex items-center gap-0.5">{getEngineIcon(eq.engineType)}</span>}
                      {eq.fuelType && <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getFuelColor(eq.fuelType)}`}>{eq.fuelType}</span>}
                      {eq.fuelConsumptionNorm && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><FuelIcon className="size-3" />{eq.fuelConsumptionNorm} л/100км</span>}
                      {eq.engineVolume && <span className="text-xs text-muted-foreground">{eq.engineVolume} л</span>}
                      {eq.enginePower && <span className="text-xs text-muted-foreground">{eq.enginePower} л.с.</span>}
                      {eq.mileage != null && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Gauge className="size-3" />{fmtKm(eq.mileage)}</span>}
                      {eq.loadCapacity && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Weight className="size-3.5" />{eq.loadCapacity} т</span>}
                      {eq.passengerSeats && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{eq.passengerSeats} мест</span>}
                      {eq.color && <span className="text-xs text-muted-foreground">Цвет: {eq.color}</span>}
                      {eq.location && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><MapPinned className="size-3" />{eq.location}</span>}
                      {eq.depot && <span className="text-xs text-muted-foreground">Депо: {eq.depot}</span>}
                    </div>

                    {tracker && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 px-3 py-2 rounded bg-muted/50 text-xs">
                        {tracker.lastSpeed != null && (<span className="inline-flex items-center gap-1"><Navigation className="size-3.5" /><span className={tracker.lastSpeed > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{tracker.lastSpeed} км/ч</span></span>)}
                        {tracker.lastFuelLevel != null && (<span className="inline-flex items-center gap-1"><Fuel className="size-3.5 text-amber-600 dark:text-amber-400" />{tracker.lastFuelLevel} л</span>)}
                        {tracker.lastMileage != null && (<span className="inline-flex items-center gap-1 text-muted-foreground"><Gauge className="size-3.5" />{(tracker.lastMileage / 1000).toFixed(1)} тыс.км</span>)}
                        {tracker.lastIgnition != null && (<span className={`inline-flex items-center gap-1 ${tracker.lastIgnition ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}><Zap className="size-3.5" />{tracker.lastIgnition ? 'Зажигание ВКЛ' : 'Зажигание ВЫКЛ'}</span>)}
                        {tracker.lastEngineTemp != null && (<span className="inline-flex items-center gap-1 text-muted-foreground"><Thermometer className="size-3.5" />{tracker.lastEngineTemp}°C</span>)}
                      </div>
                    )}

                    {tracker && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                        {tracker.trackerName && <span className="inline-flex items-center gap-1"><Cpu className="size-3" />{tracker.trackerName}</span>}
                        {tracker.imei && <span className="font-mono" title="IMEI">IMEI: {tracker.imei}</span>}
                        {tracker.phoneNumber && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{tracker.phoneNumber}</span>}
                        {tracker.lastAddress && <span className="inline-flex items-center gap-1 truncate max-w-[300px]" title={tracker.lastAddress}><MapPin className="size-3 shrink-0" />{tracker.lastAddress}</span>}
                        {tracker.lastSeenAt && (<span className="inline-flex items-center gap-1" title={`Последняя активность: ${formatDateTime(tracker.lastSeenAt)}`}><Clock className="size-3" />{new Date(tracker.lastSeenAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(tracker.lastSeenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>)}
                      </div>
                    )}

                    {(eq.vin || eq.stsNumber || eq.ptsNumber || eq.serialNumber) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                        {eq.vin && <span className="font-mono cursor-pointer hover:text-primary" title={`VIN: ${eq.vin} (нажмите чтобы скопировать)`} onClick={(e) => { e.stopPropagation(); copyToClipboard(eq.vin!) }}><span className="font-medium text-foreground">VIN:</span> {eq.vin}</span>}
                        {eq.stsNumber && <span className="inline-flex items-center gap-1" title={`СТС: ${eq.stsNumber}`}><FileBadge className="size-3" />СТС: {eq.stsNumber}</span>}
                        {eq.ptsNumber && <span className="inline-flex items-center gap-1" title={`ПТС: ${eq.ptsNumber}`}><FileBadge className="size-3" />ПТС: {eq.ptsNumber}</span>}
                        {eq.serialNumber && <span className="inline-flex items-center gap-1" title={`Сер. №: ${eq.serialNumber}`}><Hash className="size-3" />С/Н: {eq.serialNumber}</span>}
                      </div>
                    )}

                    {(eq.insuranceNumber || eq.insuranceExpiry || eq.inspectionExpiry) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.insuranceNumber && (<span className="inline-flex items-center gap-1 text-muted-foreground" title={`Полис: ${eq.insuranceNumber}`}><Shield className="size-3" />Полис: {eq.insuranceNumber}</span>)}
                        {insDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${insDays < 0 ? 'text-red-600 dark:text-red-400' : insDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><Shield className="size-3" />ОСАГО {insDays < 0 ? `истекло ${Math.abs(insDays)}д` : `${insDays}д`}</span>)}
                        {inspDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${inspDays < 0 ? 'text-red-600 dark:text-red-400' : inspDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><ClipboardCheck className="size-3" />ТО {inspDays < 0 ? `истекло ${Math.abs(inspDays)}д` : `${inspDays}д`}</span>)}
                        {maintDays != null && (<span className={`inline-flex items-center gap-1 font-medium ${maintDays < 0 ? 'text-red-600 dark:text-red-400' : maintDays < MAINTENANCE_WARN_DAYS ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}><Wrench className="size-3" />След. ТО {maintDays < 0 ? `просрочено ${Math.abs(maintDays)}д` : `через ${maintDays}д`}</span>)}
                      </div>
                    )}

                    {(eq.owner || eq.renter) && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {eq.owner && (<span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-muted" title={`Владелец: ${eq.owner.name}${eq.owner.inn ? ` (ИНН: ${eq.owner.inn})` : ''}`}><Building2 className="size-3.5 shrink-0" />{eq.owner.name}</span>)}
                        {eq.renter && (<span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400" title={`Арендатор: ${eq.renter.name}`}><Users className="size-3.5 shrink-0" />{eq.renter.name}</span>)}
                      </div>
                    )}

                    {(eq.purchasePrice || eq.currentPrice || age != null || depreciation != null) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.purchasePrice != null && (<span className="text-muted-foreground">Покупка: {eq.purchasePrice.toLocaleString('ru-RU')} ₽</span>)}
                        {eq.currentPrice != null && (<span className="text-muted-foreground">Текущая: {eq.currentPrice.toLocaleString('ru-RU')} ₽</span>)}
                        {depreciation != null && (<span className={`font-medium ${depreciation > 50 ? 'text-red-500' : depreciation > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>Износ {depreciation}%</span>)}
                        {age != null && (<span className="text-muted-foreground">Возраст {age} л.</span>)}
                      </div>
                    )}

                    {/* Rental info */}
                    {(eq.rentalStartDate || eq.rentalEndDate || eq.rentalCost) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.rentalStartDate && <span className="text-muted-foreground">Аренда с: {formatDate(eq.rentalStartDate)}</span>}
                        {eq.rentalEndDate && <span className="text-muted-foreground">по: {formatDate(eq.rentalEndDate)}</span>}
                        {eq.rentalCost != null && <span className="text-muted-foreground">{eq.rentalCost.toLocaleString('ru-RU')} ₽/мес</span>}
                        {eq.rentalEndDate && (() => { const rd = daysUntil(eq.rentalEndDate); return rd != null ? <span className={`font-medium ${rd < 0 ? 'text-red-500' : rd < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>{rd < 0 ? `Истекла ${Math.abs(rd)}д назад` : `Осталось ${rd}д`}</span> : null })()}
                      </div>
                    )}

                    {/* Maintenance info */}
                    {(eq.lastMaintenanceDate || eq.nextMaintenanceDate || eq.maintenanceInterval) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.lastMaintenanceDate && <span className="text-muted-foreground">Последнее ТО: {formatDate(eq.lastMaintenanceDate)}</span>}
                        {eq.nextMaintenanceDate && <span className="text-muted-foreground">Следующее ТО: {formatDate(eq.nextMaintenanceDate)}</span>}
                        {eq.maintenanceInterval && <span className="text-muted-foreground">Интервал: {eq.maintenanceInterval.toLocaleString('ru-RU')} км</span>}
                      </div>
                    )}

                    {/* Oil / Tires */}
                    {(eq.oilChangeDate || eq.oilChangeMileage || eq.oilChangeInterval || eq.tireSize || eq.tireReplacementDate) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs">
                        {eq.oilChangeDate && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Droplets className="size-3" />Масло: {formatDate(eq.oilChangeDate)}</span>}
                        {eq.oilChangeMileage && <span className="text-muted-foreground">Замена масла на: {fmtKm(eq.oilChangeMileage)}</span>}
                        {eq.oilChangeInterval && <span className="text-muted-foreground">Интервал масла: {fmtKm(eq.oilChangeInterval)}</span>}
                        {eq.tireSize && <span className="text-muted-foreground">Шины: {eq.tireSize}</span>}
                        {eq.tireReplacementDate && <span className="text-muted-foreground">Замена шин: {formatDate(eq.tireReplacementDate)}</span>}
                      </div>
                    )}

                    {eq.notes && (<div className="mb-2 text-xs text-muted-foreground italic" title={eq.notes}><StickyNote className="inline size-3 mr-0.5" />{eq.notes}</div>)}

                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                      {eq.employees && eq.employees.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title="Водители"><Users className="size-3.5" />{eq.employees.length}</button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 w-[280px]" align="start">
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Водители ({eq.employees.length})</p>
                              {eq.employees.map(emp => (
                                <div key={emp.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent">
                                  <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${EMPLOYEE_POSITION_MAP[emp.position]?.color || 'bg-gray-100 text-gray-600'} ${EMPLOYEE_POSITION_MAP[emp.position]?.darkColor || ''}`}>
                                    {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{emp.fullName}</p>
                                    <p className="text-[10px] text-muted-foreground">{EMPLOYEE_POSITION_MAP[emp.position]?.label || emp.position || ''}{emp.phone ? ` • ${emp.phone}` : ''}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      {eq._count?.repairs != null && eq._count.repairs > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Ремонтов"><Wrench className="size-3.5" />{eq._count.repairs}</span>)}
                      {eq._count?.photos != null && eq._count.photos > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Фотографий"><Camera className="size-3.5" />{eq._count.photos}</span>)}
                      {eq.documents && eq.documents.length > 0 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Документов"><FileText className="size-3.5" />{eq.documents.length}</span>)}
                      {eq.trackers && eq.trackers.length > 1 && (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={`Трекеров: ${eq.trackers.length}`}><Cpu className="size-3.5" />{eq.trackers.length}</span>)}
                      <div className="ml-auto flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onOpenDetail(eq)} title="Подробнее"><Eye className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onGoToMap(eq)} title="Карта"><MapPin className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onCreateTrip(eq)} title="Создать рейс"><Route className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => onEdit(eq)} title="Редактировать"><Edit className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(eq)} title="Удалить"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          <PaginationControls page={page} totalPages={Math.ceil(filteredEquipment.length / PAGE_SIZE)} total={filteredEquipment.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
})

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
  onAddTrip: (eqId: string) => void; onOpenTripDetail: (t: Trip, focusTrack?: boolean) => void;
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

  // Axenta live sensor data
  const [axentaSensors, setAxentaSensors] = useState<{
    sensors: Array<{ id: number | string; name: string; type: string; category: string; value: number | null; stringValue: string | null; unit: string | null; hasValue: boolean; description?: string }>;
    grouped: Array<{ key: string; label: string; sensors: Array<{ id: number | string; name: string; type: string; category: string; value: number | null; stringValue: string | null; unit: string | null; hasValue: boolean; description?: string }> }>;
    totalSensors: number;
    sensorsWithValues: number;
    trackerFields: Record<string, unknown>;
  } | null>(null)
  const [axentaSensorsLoading, setAxentaSensorsLoading] = useState(false)
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(true)

  // Axenta tracker commands
  const [trackerCommands, setTrackerCommands] = useState<{
    commands: Array<{ id: number | string; name: string; type: string; params: string | null; isVisible: boolean }>;
    deviceCanSendCommands: boolean;
    connectedStatus: boolean;
    lastSeenAt: string | null;
    trackerName: string;
    axentaId: string;
    recentCommands: Array<{ id: string; description: string; date: string; performedBy: string | null }>;
  } | null>(null)
  const [commandsLoading, setCommandsLoading] = useState(false)
  const [commandSending, setCommandSending] = useState<string | null>(null)
  const [customCommandText, setCustomCommandText] = useState('')
  const [commandsPanelOpen, setCommandsPanelOpen] = useState(false)

  // Command execution log — tracks status of each sent command
  const [commandLog, setCommandLog] = useState<Array<{
    id: string;
    command: string;
    status: 'sending' | 'sent' | 'delivered' | 'confirmed' | 'error' | 'timeout';
    sentAt: Date;
    trackerOnline?: boolean;
    statusText: string;
  }>>([])

  const fetchTrackerCommands = async (trackerId: string) => {
    setCommandsLoading(true)
    try {
      const res = await fetch(`/api/glonass/commands?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setTrackerCommands(data)
      }
    } catch { /* ignore */ }
    setCommandsLoading(false)
  }

  const checkCommandStatus = async (trackerId: string, logEntryId: string, sentAt: Date) => {
    // Poll tracker status to see if it has responded since command was sent
    try {
      const res = await fetch(`/api/glonass/commands?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.lastSeenAt) {
          const lastSeen = new Date(data.lastSeenAt)
          if (lastSeen > sentAt || data.connectedStatus) {
            // Tracker has been seen since command was sent — confirmed delivery
            setCommandLog(prev => prev.map(l =>
              l.id === logEntryId && (l.status === 'sent' || l.status === 'delivered')
                ? { ...l, status: 'confirmed', statusText: 'Трекер подтвердил получение', trackerOnline: true }
                : l
            ))
            return true
          }
        }
        // Tracker hasn't responded yet
        setCommandLog(prev => prev.map(l =>
          l.id === logEntryId && l.status === 'sent'
            ? { ...l, status: 'delivered', statusText: 'Доставлено на сервер, ожидание трекера', trackerOnline: data.connectedStatus }
            : l
        ))
      }
    } catch { /* ignore */ }
    return false
  }

  const sendTrackerCommand = async (trackerId: string, params: string | null, customParams?: string) => {
    const cmdText = customParams || params || 'custom'
    const cmdKey = customParams || params || 'custom'
    const logId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Add to log with "sending" status
    setCommandLog(prev => [{
      id: logId,
      command: cmdText,
      status: 'sending',
      sentAt: new Date(),
      statusText: 'Отправка команды...',
    }, ...prev])

    setCommandSending(cmdKey)
    try {
      const res = await fetch('/api/glonass/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, params, customParams }),
      })
      const data = await res.json()

      if (data.success) {
        const apiStatus = data.status as string
        const trackerOnline = data.trackerOnline as boolean

        let status: 'sent' | 'delivered' | 'confirmed' | 'error'
        let statusText: string

        if (apiStatus === 'delivered' || trackerOnline) {
          status = 'confirmed'
          statusText = 'Трекер подтвердил получение'
        } else if (apiStatus === 'sent') {
          status = 'sent'
          statusText = 'Отправлено на сервер Axenta, ожидание трекера...'
        } else {
          status = 'delivered'
          statusText = 'Доставлено на сервер'
        }

        setCommandLog(prev => prev.map(l =>
          l.id === logId ? { ...l, status, statusText, trackerOnline } : l
        ))

        toast.success(data.message)

        // Start polling for status if not yet confirmed
        if (status !== 'confirmed') {
          let pollCount = 0
          const pollInterval = setInterval(async () => {
            pollCount++
            const confirmed = await checkCommandStatus(trackerId, logId, new Date(data.sentAt))
            if (confirmed || pollCount >= 6) {
              clearInterval(pollInterval)
              if (!confirmed && pollCount >= 6) {
                setCommandLog(prev => prev.map(l =>
                  l.id === logId && l.status !== 'confirmed' && l.status !== 'error'
                    ? { ...l, status: 'timeout', statusText: 'Таймаут — трекер не ответил (30с)' }
                    : l
                ))
              }
            }
          }, 5000)
        }
      } else {
        setCommandLog(prev => prev.map(l =>
          l.id === logId ? { ...l, status: 'error', statusText: data.error || 'Ошибка отправки' } : l
        ))
        toast.error(data.error || 'Ошибка отправки команды')
      }
    } catch {
      setCommandLog(prev => prev.map(l =>
        l.id === logId ? { ...l, status: 'error', statusText: 'Сетевая ошибка' } : l
      ))
      toast.error('Ошибка отправки команды')
    }
    setCommandSending(null)
  }

  const fetchAxentaSensors = async (trackerId: string) => {
    setAxentaSensorsLoading(true)
    try {
      const res = await fetch(`/api/glonass/sensors?trackerId=${trackerId}`)
      if (res.ok) {
        const data = await res.json()
        setAxentaSensors(data)
      }
    } catch { /* ignore */ }
    setAxentaSensorsLoading(false)
  }

  useEffect(() => {
    if (open && eq && detailTab === 'trips') {
      fetch(`/api/trips?equipmentId=${eq.id}`).then(r => r.json()).then(setLocalTrips).catch(() => {})
    }
  }, [open, eq, detailTab])

  // Reset Axenta sensor data when equipment changes or sheet closes
  useEffect(() => {
    if (!open) {
      setAxentaSensors(null)
      setShowOnlyWithValues(true)
      setTrackerCommands(null)
      setCommandsPanelOpen(false)
      setCustomCommandText('')
      setCommandLog([])
    }
  }, [open, eq?.id])

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
          <SheetDescription className="text-xs">{[eq.brand, eq.model, eq.year].filter(Boolean).join(' • ')} — {eq.registrationNum || 'без номера'}{eq.garageNumber ? ` • Г#${eq.garageNumber}` : ''}{eq.unitNumber ? ` • С#${eq.unitNumber}` : ''}</SheetDescription>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {statusBadge(eq.status, EQUIPMENT_STATUS_MAP)}
            {eq.condition && EQUIPMENT_CONDITION_MAP[eq.condition] && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${EQUIPMENT_CONDITION_MAP[eq.condition].color}`}>{EQUIPMENT_CONDITION_MAP[eq.condition].icon} {EQUIPMENT_CONDITION_MAP[eq.condition].label}</span>
            )}
            {eq.assignedDriver && <span className="text-[10px] text-muted-foreground">🧑 {eq.assignedDriver}</span>}
            <span className="text-[10px] text-muted-foreground">создано {formatDate(eq.createdAt)}</span>
            {eq.trackers && eq.trackers.length > 0 && (
              <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium ${eq.trackers.some(t => t.isActive) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                {eq.trackers.some(t => t.isActive) ? <><Wifi className="size-2" />Онлайн</> : <><WifiOff className="size-2" />Офлайн</>}
              </span>
            )}
            {eq.documents && eq.documents.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><FileText className="size-2" />{eq.documents.length} док.</span>
            )}
          </div>
          {/* Document expiry warnings */}
          {(() => {
            const warnings: React.ReactNode[] = []
            const insDays = eq.insuranceExpiry ? Math.ceil((new Date(eq.insuranceExpiry).getTime() - Date.now()) / (1000*60*60*24)) : null
            const inspDays = eq.inspectionExpiry ? Math.ceil((new Date(eq.inspectionExpiry).getTime() - Date.now()) / (1000*60*60*24)) : null
            const maintDays = eq.nextMaintenanceDate ? Math.ceil((new Date(eq.nextMaintenanceDate).getTime() - Date.now()) / (1000*60*60*24)) : null
            if (insDays != null && insDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="ins" className="text-[9px] text-amber-600 dark:text-amber-400"><Shield className="inline size-2 mr-0.5" />ОСАГО {insDays < 0 ? 'истекло!' : `истекает через ${insDays} дн.`}</span>)
            if (inspDays != null && inspDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="insp" className="text-[9px] text-amber-600 dark:text-amber-400"><ClipboardCheck className="inline size-2 mr-0.5" />ТО {inspDays < 0 ? 'истекло!' : `истекает через ${inspDays} дн.`}</span>)
            if (maintDays != null && maintDays < MAINTENANCE_WARN_DAYS) warnings.push(<span key="maint" className="text-[9px] text-amber-600 dark:text-amber-400"><Wrench className="inline size-2 mr-0.5" />ТО оборудования {maintDays < 0 ? 'просрочено!' : `через ${maintDays} дн.`}</span>)
            if (warnings.length > 0) return <div className="flex flex-wrap gap-2 mt-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-1.5">{warnings}</div>
            return null
          })()}
          {/* Quick actions */}
          <div className="flex flex-wrap gap-1 pt-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onAddRepair(eq.id)}><Wrench className="size-2.5" />Ремонт</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onAddTrip(eq.id)}><Route className="size-2.5" />Рейс</Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onUploadPhoto(eq.id)}><Camera className="size-2.5" />Фото</Button>
          </div>
        </SheetHeader>

        <Tabs value={detailTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="px-3 sm:px-5 border-b shrink-0 overflow-x-auto">
            <TabsList className="w-full min-w-max h-9">
              <TabsTrigger value="info" className="gap-1 text-xs"><Info className="size-3" /><span className="hidden sm:inline">Информация</span></TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-1 text-xs"><Wrench className="size-3" /><span className="hidden sm:inline">ТО</span></TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs"><FileText className="size-3" /><span className="hidden sm:inline">Документы</span></TabsTrigger>
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
                      <DetailRow label="Возраст" value={eq.year ? (() => { const age = new Date().getFullYear() - eq.year; return age <= 0 ? 'Новый' : `${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}` })() : undefined} />
                      <DetailRow label="Категория" value={eq.category} />
                      <DetailRow label="Цвет" value={eq.color} />
                      <DetailRow label="Гаражный номер" value={eq.garageNumber} />
                      <DetailRow label="Сменный номер" value={eq.unitNumber} />
                      <DetailRow label="Назначенный водитель" value={eq.assignedDriver} />
                    </DetailSection>
                    <DetailSection title="Состояние" icon={<HeartPulse className="size-3.5" />}>
                      <DetailRow label="Состояние" value={eq.condition && EQUIPMENT_CONDITION_MAP[eq.condition] ? <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${EQUIPMENT_CONDITION_MAP[eq.condition].color}`}>{EQUIPMENT_CONDITION_MAP[eq.condition].icon} {EQUIPMENT_CONDITION_MAP[eq.condition].label}</span> : undefined} />
                      <DetailRow label="Местоположение" value={eq.location} />
                      <DetailRow label="Депо" value={eq.depot} />
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
                      {eq.trackers?.[0]?.lastMileage != null && <DetailRow label="Пробег трекера" value={`${eq.trackers[0].lastMileage?.toLocaleString('ru-RU')} км`} />}
                      <DetailRow label="Топливо" value={eq.fuelType} />
                      <DetailRow label="Расход топлива" value={eq.fuelConsumptionNorm ? `${eq.fuelConsumptionNorm} л/100км` : undefined} />
                      <DetailRow label="Грузоподъёмность" value={eq.loadCapacity} />
                      <DetailRow label="Мест" value={eq.passengerSeats?.toString()} />
                    </DetailSection>
                    <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                      <DetailRow label="Дата покупки" value={formatDate(eq.purchaseDate)} />
                      <DetailRow label="Цена покупки" value={formatPrice(eq.purchasePrice)} />
                      <DetailRow label="Текущая стоимость" value={formatPrice(eq.currentPrice)} />
                      {eq.purchasePrice && eq.currentPrice && (
                        <DetailRow label="Амортизация" value={<span className={`font-medium ${eq.currentPrice < eq.purchasePrice * 0.5 ? 'text-red-500' : eq.currentPrice < eq.purchasePrice * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.round((1 - eq.currentPrice / eq.purchasePrice) * 100)}%</span>} />
                      )}
                      {eq.purchaseDate && (
                        <DetailRow label="Возраст" value={`${Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} лет`} />
                      )}
                    </DetailSection>
                    <DetailSection title="Страхование и ТО" icon={<Shield className="size-3.5" />}>
                      <DetailRow label="Полис" value={eq.insuranceNumber} />
                      <DetailRow label="Страховка до" value={(() => { const d = formatDaysUntil(eq.insuranceExpiry); return <span className={d?.className}>{d?.text || formatDate(eq.insuranceExpiry)}</span> })()} />
                      <DetailRow label="ТО дата" value={formatDate(eq.inspectionDate)} />
                      <DetailRow label="ТО до" value={(() => { const d = formatDaysUntil(eq.inspectionExpiry); return <span className={d?.className}>{d?.text || formatDate(eq.inspectionExpiry)}</span> })()} />
                    </DetailSection>
                    {/* Maintenance section */}
                    {(eq.lastMaintenanceDate || eq.nextMaintenanceDate || eq.maintenanceInterval) && (
                      <DetailSection title="Обслуживание" icon={<Wrench className="size-3.5" />}>
                        <DetailRow label="Последнее ТО" value={formatDate(eq.lastMaintenanceDate)} />
                        <DetailRow label="Следующее ТО" value={(() => { const d = formatDaysUntil(eq.nextMaintenanceDate); return d ? <span className={d.className}>{d.text}</span> : <span>{formatDate(eq.nextMaintenanceDate)}</span> })()} />
                        <DetailRow label="Интервал ТО" value={eq.maintenanceInterval ? `${eq.maintenanceInterval.toLocaleString('ru-RU')} км` : undefined} />
                      </DetailSection>
                    )}
                    {/* Oil & Tires section */}
                    {(eq.oilChangeDate || eq.oilChangeMileage || eq.oilChangeInterval || eq.tireSize || eq.tireReplacementDate) && (
                      <DetailSection title="Масло и шины" icon={<Droplets className="size-3.5" />}>
                        <DetailRow label="Замена масла" value={formatDate(eq.oilChangeDate)} />
                        <DetailRow label="Пробег при замене" value={eq.oilChangeMileage ? `${eq.oilChangeMileage.toLocaleString('ru-RU')} км` : undefined} />
                        <DetailRow label="Интервал замены" value={eq.oilChangeInterval ? `${eq.oilChangeInterval.toLocaleString('ru-RU')} км` : undefined} />
                        {eq.oilChangeInterval && eq.oilChangeMileage && eq.mileage && (
                          <DetailRow label="До замены масла" value={<span className={`font-medium ${(eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval ? 'text-red-500' : (eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.max(0, eq.oilChangeInterval - (eq.mileage - eq.oilChangeMileage)).toLocaleString('ru-RU')} км</span>} />
                        )}
                        <DetailRow label="Размер шин" value={eq.tireSize} />
                        <DetailRow label="Замена шин" value={formatDate(eq.tireReplacementDate)} />
                      </DetailSection>
                    )}
                    {/* Rental section */}
                    {(eq.rentalStartDate || eq.rentalEndDate || eq.rentalCost) && (
                      <DetailSection title="Аренда" icon={<Users className="size-3.5" />}>
                        <DetailRow label="Начало аренды" value={formatDate(eq.rentalStartDate)} />
                        <DetailRow label="Конец аренды" value={formatDate(eq.rentalEndDate)} />
                        <DetailRow label="Стоимость аренды" value={eq.rentalCost ? `${eq.rentalCost.toLocaleString('ru-RU')} ₽/мес` : undefined} />
                        {eq.rentalEndDate && (() => { const rd = Math.ceil((new Date(eq.rentalEndDate).getTime() - Date.now()) / (1000*60*60*24)); return rd >= 0 ? <DetailRow label="Дней до окончания" value={<span className={`font-medium ${rd < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{rd} дн.</span>} /> : <DetailRow label="Аренда истекла" value={<span className="text-red-600 dark:text-red-400 font-medium">{Math.abs(rd)} дн. назад</span>} /> })()}
                      </DetailSection>
                    )}
                    {/* Decommission section */}
                    {eq.status === 'decommissioned' && (eq.decommissionDate || eq.decommissionReason) && (
                      <DetailSection title="Списание" icon={<XCircle className="size-3.5" />}>
                        <DetailRow label="Дата списания" value={formatDate(eq.decommissionDate)} />
                        <DetailRow label="Причина списания" value={eq.decommissionReason} />
                      </DetailSection>
                    )}
                    <DetailSection title="Компания" icon={<Building2 className="size-3.5" />}>
                      <DetailRow label="Владелец" value={eq.owner?.name} />
                      <DetailRow label="Арендатор" value={eq.renter?.name} />
                    </DetailSection>
                    {eq.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{eq.notes}</p></DetailSection>}

                    {/* Utilization & stats */}
                    {(() => {
                      const lastRepair = eq.repairs && eq.repairs.length > 0
                        ? eq.repairs.reduce((latest, r) => { const d = new Date(r.startDate).getTime(); return d > latest ? d : latest }, 0)
                        : null
                      const daysSinceRepair = lastRepair ? Math.floor((Date.now() - lastRepair) / (1000*60*60*24)) : null
                      const totalRepairCost = eq.repairs ? eq.repairs.reduce((s, r) => s + (r.cost || 0), 0) : null
                      const avgRepairCost = eq.repairs && eq.repairs.length > 0 ? (totalRepairCost || 0) / eq.repairs.length : null
                      const activeDays = eq.purchaseDate ? Math.max(1, Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (1000*60*60*24))) : null
                      const repairDays = eq.repairs ? eq.repairs.reduce((s, r) => {
                        if (r.status !== 'completed' || !r.startDate || !r.endDate) return s
                        return s + Math.max(1, Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24)))
                      }, 0) : 0
                      const utilization = activeDays ? Math.round(((activeDays - repairDays) / activeDays) * 100) : null

                      if (daysSinceRepair == null && avgRepairCost == null && utilization == null && totalRepairCost == null) return null
                      return (
                        <DetailSection title="Эксплуатация" icon={<Activity className="size-3.5" />}>
                          {daysSinceRepair != null && <DetailRow label="Дней с последнего ремонта" value={<span className={daysSinceRepair > 90 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>{daysSinceRepair} дн.</span>} />}
                          {totalRepairCost != null && totalRepairCost > 0 && <DetailRow label="Общая стоимость ремонтов" value={formatPrice(totalRepairCost)} />}
                          {avgRepairCost != null && <DetailRow label="Средняя стоимость ремонта" value={formatPrice(avgRepairCost)} />}
                          <DetailRow label="Ремонтов" value={`${eq.repairs?.length || 0}`} />
                          <DetailRow label="Фотографий" value={`${eq._count?.photos || 0}`} />
                          {utilization != null && <DetailRow label="Коэффициент использования" value={<span className={`font-medium ${utilization > 80 ? 'text-emerald-600 dark:text-emerald-400' : utilization > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{utilization}%</span>} />}
                        </DetailSection>
                      )
                    })()}

                    {/* Quick ID reference */}
                    <div className="rounded-md border border-border/50 p-2.5 text-[10px] text-muted-foreground">
                      <p>ID: <span className="font-mono">{eq.id.slice(0, 8)}</span></p>
                    </div>
                  </div>
                )}

                {detailTab === 'maintenance' && (
                  <div className="px-4 sm:px-5 py-3 space-y-4">
                    <DetailSection title="Обслуживание" icon={<Wrench className="size-3.5" />}>
                      <DetailRow label="Последнее ТО" value={formatDate(eq.lastMaintenanceDate)} />
                      <DetailRow label="Следующее ТО" value={(() => { const d = formatDaysUntil(eq.nextMaintenanceDate); return d ? <span className={d.className}>{d.text}</span> : <span>{formatDate(eq.nextMaintenanceDate)}</span> })()} />
                      <DetailRow label="Интервал ТО" value={eq.maintenanceInterval ? `${eq.maintenanceInterval.toLocaleString('ru-RU')} км` : undefined} />
                      {eq.maintenanceInterval && eq.mileage && eq.lastMaintenanceDate && (() => {
                        const daysSince = Math.floor((Date.now() - new Date(eq.lastMaintenanceDate).getTime()) / (1000*60*60*24))
                        return <DetailRow label="Дней с последнего ТО" value={<span className={daysSince > 180 ? 'text-red-600 dark:text-red-400 font-medium' : daysSince > 90 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>{daysSince} дн.</span>} />
                      })()}
                    </DetailSection>
                    <DetailSection title="Масло" icon={<Droplets className="size-3.5" />}>
                      <DetailRow label="Дата замены" value={formatDate(eq.oilChangeDate)} />
                      <DetailRow label="Пробег при замене" value={eq.oilChangeMileage ? `${eq.oilChangeMileage.toLocaleString('ru-RU')} км` : undefined} />
                      <DetailRow label="Интервал замены" value={eq.oilChangeInterval ? `${eq.oilChangeInterval.toLocaleString('ru-RU')} км` : undefined} />
                      {eq.oilChangeInterval && eq.oilChangeMileage && eq.mileage && (
                        <DetailRow label="До замены масла" value={<span className={`font-medium ${(eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval ? 'text-red-500' : (eq.mileage - eq.oilChangeMileage) > eq.oilChangeInterval * 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.max(0, eq.oilChangeInterval - (eq.mileage - eq.oilChangeMileage)).toLocaleString('ru-RU')} км</span>} />
                      )}
                    </DetailSection>
                    <DetailSection title="Шины" icon={<Cog className="size-3.5" />}>
                      <DetailRow label="Размер шин" value={eq.tireSize} />
                      <DetailRow label="Дата замены" value={formatDate(eq.tireReplacementDate)} />
                    </DetailSection>
                    <DetailSection title="Расход топлива" icon={<FuelIcon className="size-3.5" />}>
                      <DetailRow label="Норма расхода" value={eq.fuelConsumptionNorm ? `${eq.fuelConsumptionNorm} л/100км` : undefined} />
                      <DetailRow label="Тип топлива" value={eq.fuelType} />
                    </DetailSection>
                    {(!eq.lastMaintenanceDate && !eq.nextMaintenanceDate && !eq.maintenanceInterval && !eq.oilChangeDate && !eq.tireSize && !eq.fuelConsumptionNorm) && (
                      <div className="text-center py-8 text-muted-foreground"><Wrench className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Данные об обслуживании не заполнены</p></div>
                    )}
                  </div>
                )}

                {detailTab === 'documents' && (
                  <div className="px-4 sm:px-5 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Документы ({eq.documents?.length || 0})</p>
                    </div>
                    {(!eq.documents || eq.documents.length === 0) ? (
                      <div className="text-center py-8 text-muted-foreground"><FileText className="size-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Нет документов</p></div>
                    ) : (
                      <div className="space-y-2">
                        {eq.documents.map(doc => (
                          <Card key={doc.id} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0"><FileText className="size-4 text-muted-foreground" /></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{doc.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{doc.type}{doc.notes ? ` • ${doc.notes}` : ''}</p>
                                </div>
                              </div>
                              {doc.expiryDate && (() => { const d = formatDaysUntil(doc.expiryDate); return d ? <span className={`text-[10px] font-medium shrink-0 ${d.className}`}>{d.text.split('(')[0].trim()}</span> : null })()}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
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
                    <div className="flex items-center justify-between">
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onAddRepair(eq.id)}><Plus className="size-3" />Новый ремонт</Button>
                      {eq.repairs && eq.repairs.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Всего: {eq.repairs.length}</span>
                          <span>Стоимость: {formatPrice(eq.repairs.reduce((s, r) => s + (r.cost || 0), 0))}</span>
                        </div>
                      )}
                    </div>
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
                              {/* ── All sensors from Axenta ── */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Gauge className="size-3.5 text-muted-foreground" />
                                    <span className="text-xs font-semibold">Датчики</span>
                                    {axentaSensors && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({axentaSensors.sensorsWithValues}/{axentaSensors.totalSensors})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {axentaSensors && (
                                      <button
                                        onClick={() => setShowOnlyWithValues(!showOnlyWithValues)}
                                        className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 hover:bg-accent/50 transition-colors"
                                      >
                                        {showOnlyWithValues ? 'Все' : 'Только с данными'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => fetchAxentaSensors(tracker.id)}
                                      disabled={axentaSensorsLoading}
                                      className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      <RefreshCw className={`size-2.5 ${axentaSensorsLoading ? 'animate-spin' : ''}`} />
                                      {axentaSensors ? 'Обновить' : 'Загрузить из Axenta'}
                                    </button>
                                  </div>
                                </div>

                                {/* Before loading from Axenta: show basic cached data */}
                                {!axentaSensors && (
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                                    <DetailRow label="Зажигание" value={tracker.lastIgnition != null ? (tracker.lastIgnition ? 'Вкл' : 'Выкл') : undefined} />
                                    <DetailRow label="Топливо" value={tracker.lastFuelLevel != null ? `${tracker.lastFuelLevel} л` : undefined} />
                                    <DetailRow label="Пробег" value={tracker.lastMileage != null ? `${tracker.lastMileage?.toLocaleString('ru-RU')} км` : undefined} />
                                    {tracker.lastEngineTemp != null && <DetailRow label="Темп. двигателя" value={`${tracker.lastEngineTemp}°C`} />}
                                    {tracker.sensorData && (() => {
                                      const cached = getUniqueSensors(
                                        tracker.sensorData.filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
                                      )
                                      const shownTypes = new Set(['ignition', 'fuel', 'mileage', 'temperature'])
                                      const extra = cached.filter(s => {
                                        const t = (s.sensorType || '').toLowerCase()
                                        const n = (s.sensorName || '').toLowerCase()
                                        if (shownTypes.has('ignition') && (t.includes('ignition') || n.includes('зажиган'))) return false
                                        if (shownTypes.has('fuel') && (t.includes('fuel') || n.includes('топлив') || n.includes('бак'))) return false
                                        if (shownTypes.has('mileage') && (t.includes('odometer') || t.includes('mileage') || n.includes('пробег') || n.includes('одометр'))) return false
                                        if (shownTypes.has('temperature') && (t.includes('temp') || n.includes('темпер'))) return false
                                        return true
                                      })
                                      if (extra.length === 0) return null
                                      return extra.map((s, i) => {
                                        const displayVal = `${(s.value ?? s.stringValue) || '—'}${s.unit ? ` ${s.unit}` : ''}`
                                        return <DetailRow key={i} label={s.sensorName || s.sensorType} value={displayVal} />
                                      })
                                    })()}
                                    {(!tracker.sensorData || getUniqueSensors(
                                      tracker.sensorData.filter(s => s.value != null || (s.stringValue != null && s.stringValue !== ''))
                                    ).length === 0) && tracker.lastEngineTemp == null && tracker.lastFuelLevel == null && tracker.lastMileage == null && (
                                      <p className="text-[10px] text-muted-foreground col-span-2">Нажмите «Загрузить из Axenta» для просмотра всех датчиков</p>
                                    )}
                                  </div>
                                )}

                                {/* After loading: show grouped sensors from Axenta */}
                                {axentaSensors && (
                                  <div className="space-y-2">
                                    {axentaSensors.grouped.map(group => {
                                      const filteredSensors = showOnlyWithValues
                                        ? group.sensors.filter(s => s.hasValue)
                                        : group.sensors
                                      if (filteredSensors.length === 0) return null

                                      const categoryIcons: Record<string, string> = {
                                        position: '📍',
                                        ignition: '🔑',
                                        fuel: '⛽',
                                        temperature: '🌡',
                                        mileage: '🛣',
                                        voltage: '⚡',
                                        digital: '📡',
                                        custom: '🔧',
                                      }

                                      return (
                                        <div key={group.key} className="rounded-md border border-border/40 overflow-hidden">
                                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30">
                                            <span className="text-xs">{categoryIcons[group.key] || '📊'}</span>
                                            <span className="text-[11px] font-semibold">{group.label}</span>
                                            <span className="text-[9px] text-muted-foreground ml-auto">
                                              {group.sensors.filter(s => s.hasValue).length}/{group.sensors.length}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-2.5 py-1.5 text-[11px]">
                                            {filteredSensors.map(s => {
                                              const valueColor = s.hasValue
                                                ? (s.category === 'ignition'
                                                  ? (s.stringValue === 'Вкл' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400')
                                                  : 'text-foreground')
                                                : 'text-muted-foreground/50'

                                              const valueText = s.hasValue
                                                ? (s.stringValue || `${s.value}${s.unit ? ` ${s.unit}` : ''}`)
                                                : '—'

                                              return (
                                                <div key={s.id} className="contents">
                                                  <span className="text-muted-foreground truncate" title={s.name + (s.description ? ` — ${s.description}` : '')}>
                                                    {s.name}
                                                  </span>
                                                  <span className={`${valueColor} text-right font-mono truncate`}>
                                                    {valueText}
                                                  </span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Summary bar */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                      <span>
                                        Датчиков с данными: {axentaSensors.sensorsWithValues} из {axentaSensors.totalSensors}
                                      </span>
                                      <span>
                                        {!showOnlyWithValues
                                          ? `${axentaSensors.totalSensors - axentaSensors.sensorsWithValues} без данных`
                                          : `${axentaSensors.totalSensors - axentaSensors.sensorsWithValues} скрыто`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Tracker identification */}
                              <DetailSection title="Идентификация" icon={<Cpu className="size-3.5" />}>
                                {tracker.trackerName && <DetailRow label="Название" value={tracker.trackerName} />}
                                <DetailRow label="ID трекера" value={tracker.trackerId} />
                                {tracker.axentaCloudId && <DetailRow label="Axenta ID" value={tracker.axentaCloudId} />}
                                {tracker.imei && <DetailRow label="IMEI" value={<span className="font-mono cursor-pointer hover:text-primary" onClick={() => copyToClipboard(tracker.imei!)} title="Копировать">{tracker.imei}</span> as any} />}
                                {tracker.phoneNumber && <DetailRow label="Телефон" value={tracker.phoneNumber} />}
                              </DetailSection>
                              <DetailSection title="Связь" icon={<Clock className="size-3.5" />}>
                                <DetailRow label="Выход на связь" value={formatDateTime(tracker.lastSeenAt)} />
                                <DetailRow label="Позиция" value={formatDateTime(tracker.lastPositionAt)} />
                                {tracker.lastSeenAt && (() => {
                                  const diffMs = Date.now() - new Date(tracker.lastSeenAt).getTime()
                                  const diffMin = Math.floor(diffMs / 60000)
                                  const diffHrs = Math.floor(diffMin / 60)
                                  const diffDays = Math.floor(diffHrs / 24)
                                  let ago: string
                                  if (diffMin < 1) ago = 'только что'
                                  else if (diffMin < 60) ago = `${diffMin} мин назад`
                                  else if (diffHrs < 24) ago = `${diffHrs} ч назад`
                                  else ago = `${diffDays} дн назад`
                                  return <DetailRow label="Последняя активность" value={<span className={diffMin < 5 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : diffHrs > 24 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}>{ago}</span> as any} />
                                })()}
                              </DetailSection>

                              {/* ── Tracker Commands ── */}
                              <div className="space-y-2">
                                <button className="flex items-center gap-1.5 text-xs font-semibold w-full text-left" onClick={() => {
                                  if (!commandsPanelOpen && !trackerCommands) {
                                    fetchTrackerCommands(tracker.id)
                                  }
                                  setCommandsPanelOpen(prev => !prev)
                                }}>
                                  <Terminal className="size-3.5 text-muted-foreground" />
                                  <span>Команды трекера</span>
                                  {trackerCommands && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({trackerCommands.commands.length} команд)
                                    </span>
                                  )}
                                  {commandLog.length > 0 && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                      {commandLog.filter(l => l.status === 'sending' || l.status === 'sent' || l.status === 'delivered').length} в процессе
                                    </span>
                                  )}
                                  <ChevronDown className={`size-3 text-muted-foreground transition-transform ml-auto ${commandsPanelOpen ? '' : '-rotate-90'}`} />
                                </button>

                                {commandsPanelOpen && (
                                  <div className="space-y-2">
                                    {/* Device capability indicator */}
                                    {trackerCommands && (
                                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] ${trackerCommands.deviceCanSendCommands ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                                        {trackerCommands.deviceCanSendCommands
                                          ? <><Wifi className="size-3" /> Устройство поддерживает команды</>
                                          : <><WifiOff className="size-3" /> Устройство может не поддерживать команды</>
                                        }
                                      </div>
                                    )}

                                    {/* ── Command execution log ── */}
                                    {commandLog.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground font-medium">Журнал выполнения:</p>
                                        {commandLog.slice(0, 5).map(log => {
                                          const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
                                            sending: {
                                              icon: <Loader2 className="size-3 animate-spin" />,
                                              color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300',
                                              label: 'Отправка...',
                                            },
                                            sent: {
                                              icon: <RefreshCw className="size-3 animate-spin" />,
                                              color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-300',
                                              label: 'Отправлено',
                                            },
                                            delivered: {
                                              icon: <CheckCircle2 className="size-3" />,
                                              color: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/40 text-sky-700 dark:text-sky-300',
                                              label: 'На сервере',
                                            },
                                            confirmed: {
                                              icon: <CheckCheck className="size-3" />,
                                              color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
                                              label: 'Подтверждено',
                                            },
                                            timeout: {
                                              icon: <Clock className="size-3" />,
                                              color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
                                              label: 'Таймаут',
                                            },
                                            error: {
                                              icon: <XCircle className="size-3" />,
                                              color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300',
                                              label: 'Ошибка',
                                            },
                                          }
                                          const cfg = statusConfig[log.status] || statusConfig.error
                                          const timeAgo = Math.floor((Date.now() - log.sentAt.getTime()) / 1000)
                                          const timeStr = timeAgo < 5 ? 'только что' : timeAgo < 60 ? `${timeAgo}с назад` : `${Math.floor(timeAgo / 60)}м назад`

                                          return (
                                            <div key={log.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${cfg.color} transition-all`}>
                                              {cfg.icon}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[11px] font-medium truncate">{log.command}</span>
                                                  <span className="text-[9px] opacity-70">{timeStr}</span>
                                                </div>
                                                <p className="text-[10px] opacity-80 truncate">{log.statusText}</p>
                                              </div>
                                              <span className="text-[9px] font-semibold shrink-0">{cfg.label}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {/* Loading state */}
                                    {commandsLoading && (
                                      <div className="flex items-center justify-center py-3">
                                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                        <span className="text-[11px] text-muted-foreground ml-2">Загрузка команд...</span>
                                      </div>
                                    )}

                                    {/* Available commands list */}
                                    {trackerCommands && trackerCommands.commands.length > 0 && (
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] text-muted-foreground font-medium">Доступные команды:</p>
                                        {trackerCommands.commands.map((cmd) => (
                                          <div key={cmd.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/40 hover:bg-accent/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-medium truncate">{cmd.name}</p>
                                              {cmd.params && (
                                                <p className="text-[10px] text-muted-foreground truncate">Параметры: {cmd.params}</p>
                                              )}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-[10px] gap-1 shrink-0"
                                              disabled={commandSending !== null}
                                              onClick={() => sendTrackerCommand(tracker.id, cmd.params)}
                                            >
                                              {commandSending === (cmd.params || String(cmd.id))
                                                ? <Loader2 className="size-2.5 animate-spin" />
                                                : <Send className="size-2.5" />
                                              }
                                              Отправить
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* No predefined commands */}
                                    {trackerCommands && trackerCommands.commands.length === 0 && (
                                      <p className="text-[10px] text-muted-foreground">Нет предустановленных команд для этого трекера</p>
                                    )}

                                    {/* Custom command input */}
                                    <div className="space-y-1.5 pt-1 border-t border-border/30">
                                      <p className="text-[10px] text-muted-foreground font-medium">Произвольная команда:</p>
                                      <div className="flex gap-1.5">
                                        <Input
                                          className="h-7 text-[11px] flex-1"
                                          placeholder="Например: restart, position, output1:on"
                                          value={customCommandText}
                                          onChange={e => setCustomCommandText(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter' && customCommandText.trim()) {
                                              sendTrackerCommand(tracker.id, null, customCommandText.trim())
                                              setCustomCommandText('')
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-7 text-[10px] gap-1 shrink-0"
                                          disabled={!customCommandText.trim() || commandSending !== null}
                                          onClick={() => {
                                            sendTrackerCommand(tracker.id, null, customCommandText.trim())
                                            setCustomCommandText('')
                                          }}
                                        >
                                          {commandSending === customCommandText.trim()
                                            ? <Loader2 className="size-2.5 animate-spin" />
                                            : <Send className="size-2.5" />
                                          }
                                          Отправить
                                        </Button>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {[
                                          { label: 'Перезагрузка', cmd: 'restart' },
                                          { label: 'Запрос позиции', cmd: 'position' },
                                          { label: 'Запрос статуса', cmd: 'status' },
                                          { label: 'Блокировка', cmd: 'block_engine' },
                                          { label: 'Разблокировка', cmd: 'unblock_engine' },
                                        ].map(preset => (
                                          <button
                                            key={preset.cmd}
                                            className="text-[9px] px-1.5 py-0.5 rounded border border-border/60 hover:bg-accent/50 transition-colors"
                                            onClick={() => setCustomCommandText(preset.cmd)}
                                          >
                                            {preset.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Refresh commands button */}
                                    {trackerCommands && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-[10px] w-full gap-1"
                                        disabled={commandsLoading}
                                        onClick={() => fetchTrackerCommands(tracker.id)}
                                      >
                                        <RefreshCw className={`size-2.5 ${commandsLoading ? 'animate-spin' : ''}`} />
                                        Обновить список команд
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

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
                    <div className="flex items-center justify-between">
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => onAddTrip(eq.id)}><Plus className="size-3" />Новый рейс</Button>
                      {localTrips.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Всего: {localTrips.length}</span>
                          <span>Расст.: {localTrips.reduce((s, t) => s + (t.distance || 0), 0).toLocaleString('ru-RU')} км</span>
                          <span>Топливо: {Math.round(localTrips.reduce((s, t) => s + (t.fuelConsumed || 0), 0) * 10) / 10} л</span>
                        </div>
                      )}
                    </div>
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
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => { navigator.clipboard.writeText(eq.name).then(() => toast.success('Скопировано')).catch(() => {}) }}><Copy className="size-3" />Копировать</Button>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-muted-foreground self-center mr-1"><kbd className="rounded border bg-muted px-1 py-0.5">Esc</kbd> закрыть</span>
          <Button variant="destructive" size="sm" className="h-8 text-[11px] gap-1" onClick={() => onDelete(eq)}><Trash2 className="size-3" />Удалить</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailSection({ title, icon, children, extra }: { title: string; icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-xs font-semibold">{title}</h3>
        {extra && <div className="ml-auto">{extra}</div>}
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
  const [axentaSearch, setAxentaSearch] = useState('')
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [stepDirection, setStepDirection] = useState<1 | -1>(1)

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
        condition: editData.condition || 'good', location: editData.location || '', depot: editData.depot || '',
        garageNumber: editData.garageNumber || '', unitNumber: editData.unitNumber || '', assignedDriver: editData.assignedDriver || '',
        lastMaintenanceDate: editData.lastMaintenanceDate ? toLocalDate(editData.lastMaintenanceDate) : '',
        nextMaintenanceDate: editData.nextMaintenanceDate ? toLocalDate(editData.nextMaintenanceDate) : '',
        maintenanceInterval: editData.maintenanceInterval?.toString() || '',
        fuelConsumptionNorm: editData.fuelConsumptionNorm?.toString() || '',
        tireSize: editData.tireSize || '',
        tireReplacementDate: editData.tireReplacementDate ? toLocalDate(editData.tireReplacementDate) : '',
        oilChangeDate: editData.oilChangeDate ? toLocalDate(editData.oilChangeDate) : '',
        oilChangeMileage: editData.oilChangeMileage?.toString() || '',
        oilChangeInterval: editData.oilChangeInterval?.toString() || '',
        rentalStartDate: editData.rentalStartDate ? toLocalDate(editData.rentalStartDate) : '',
        rentalEndDate: editData.rentalEndDate ? toLocalDate(editData.rentalEndDate) : '',
        rentalCost: editData.rentalCost?.toString() || '',
        decommissionDate: editData.decommissionDate ? toLocalDate(editData.decommissionDate) : '',
        decommissionReason: editData.decommissionReason || '',
      })
    } else {
      setCreateMode('manual')
      setSelectedAxentaId('')
      setForm({ type: 'автомобиль', status: 'active' })
    }
    setStep(0)
    setValidationAttempted(false)
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
    { title: 'Основные', icon: <Settings2 className="size-3.5" />, desc: 'Название, тип, статус' },
    { title: 'Регистрация', icon: <FileText className="size-3.5" />, desc: 'VIN, номера, документы' },
    { title: 'Тех. характеристики', icon: <Gauge className="size-3.5" />, desc: 'Двигатель, пробег, топливо' },
    { title: 'Финансы', icon: <DollarSign className="size-3.5" />, desc: 'Стоимость, страховка, ТО' },
    { title: 'Назначение', icon: <Building2 className="size-3.5" />, desc: 'Владелец, арендатор, заметки' },
  ]

  // #11 Vehicle age auto-calc
  const vehicleAge = useMemo(() => {
    const yr = parseInt(f('year'))
    if (!yr || yr < 1900 || yr > new Date().getFullYear() + 1) return null
    const age = new Date().getFullYear() - yr
    return age
  }, [form.year])

  // #12 Depreciation preview
  const depreciation = useMemo(() => {
    const purchase = parseFloat(f('purchasePrice'))
    const current = parseFloat(f('currentPrice'))
    if (!purchase || purchase <= 0 || !current || current < 0) return null
    const dep = ((purchase - current) / purchase) * 100
    return Math.max(0, Math.min(100, dep))
  }, [form.purchasePrice, form.currentPrice])

  // #10 Insurance/TO warning
  const getExpiryWarning = (dateStr: string) => {
    if (!dateStr) return null
    const expiry = new Date(dateStr)
    const now = new Date()
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { type: 'expired' as const, days: Math.abs(daysLeft) }
    if (daysLeft <= 30) return { type: 'warning' as const, days: daysLeft }
    return null
  }

  // #16 & #21 Count filled fields
  const filledCount = useMemo(() => {
    return Object.values(form).filter(v => v && v.trim()).length
  }, [form])

  const totalFields = 27

  // #21 Validation
  const requiredFields = ['name']
  const missingRequired = validationAttempted
    ? requiredFields.filter(k => !f(k).trim())
    : []

  // #4 Step completion check — a step is "completed" if it has at least one non-empty field
  const isStepCompleted = (idx: number) => {
    const stepFields: Record<number, string[]> = {
      0: ['name', 'type', 'brand', 'model', 'year', 'category', 'color', 'status'],
      1: ['vin', 'serialNumber', 'registrationNum', 'stsNumber', 'ptsNumber'],
      2: ['engineType', 'engineVolume', 'enginePower', 'mileage', 'fuelType', 'loadCapacity', 'passengerSeats'],
      3: ['purchaseDate', 'purchasePrice', 'currentPrice', 'insuranceNumber', 'insuranceExpiry', 'inspectionDate', 'inspectionExpiry'],
      4: ['ownerId', 'renterId', 'notes'],
    }
    return (stepFields[idx] || []).some(k => f(k).trim())
  }

  // #20 Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA') return
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault()
        if (step < steps.length - 1) {
          setStepDirection(1)
          setStep(step + 1)
        }
      }
    }
  }, [step, steps.length, setStep])

  const handleSave = async () => {
    setValidationAttempted(true)
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

  const goToStep = (idx: number) => {
    setStepDirection(idx > step ? 1 : -1)
    setStep(idx)
  }

  const unlinkedAxentaObjects = axentaObjects.filter(o => !o.isLinked)
  // #18 Search/filter for Axenta
  const filteredAxentaObjects = useMemo(() => {
    if (!axentaSearch.trim()) return unlinkedAxentaObjects
    const q = axentaSearch.toLowerCase()
    return unlinkedAxentaObjects.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.uniqueId.toLowerCase().includes(q)
    )
  }, [unlinkedAxentaObjects, axentaSearch])

  // #7 Status preview badge
  const currentStatusInfo = EQUIPMENT_STATUS_MAP[f('status')] || EQUIPMENT_STATUS_MAP.active

  // #8 Type category icons mapping
  const categoryIcons: Record<string, React.ReactNode> = {
    'Легковой транспорт': <Car className="size-3" />,
    'Грузовой транспорт': <Truck className="size-3" />,
    'Пассажирский транспорт': <Bus className="size-3" />,
    'Спецтехника': <Wrench className="size-3" />,
    'Сельхозтехника': <Tractor className="size-3" />,
    'Строительная техника': <Wrench className="size-3" />,
    'Водный транспорт': <Ship className="size-3" />,
    'Другое': <Package className="size-3" />,
  }

  // #13 Required field indicator component
  const ReqStar = () => <span className="text-red-500 ml-0.5">*</span>

  // #6 Field hint component
  const FieldHint = ({ text }: { text: string }) => (
    <span className="text-[10px] text-muted-foreground/70 ml-1">— {text}</span>
  )

  // #14 Field group header component
  const GroupHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="sm:col-span-2 flex items-center gap-1.5 pt-2 pb-1">
      <span className="text-muted-foreground/60">{icon}</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      <div className="flex-1 h-px bg-border/50 ml-2" />
    </div>
  )

  // #24 Company badge helper
  const companyTypeBadge = (type: string) => {
    if (type === 'owner') return <span className="ml-1.5 inline-flex items-center rounded px-1 py-0 text-[8px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Вл</span>
    if (type === 'renter') return <span className="ml-1.5 inline-flex items-center rounded px-1 py-0 text-[8px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">Ар</span>
    if (type === 'both') return <span className="ml-1.5 inline-flex items-center rounded px-1 py-0 text-[8px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">В+А</span>
    return null
  }

  // #15 Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" onKeyDown={handleKeyDown}>
        {/* #1 Gradient header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              {editData ? <Edit className="size-4 text-emerald-600 dark:text-emerald-400" /> : <Plus className="size-4 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <div>
              <span>{editData ? 'Редактирование техники' : 'Добавление техники'}</span>
              {!editData && createMode !== 'axenta' && (
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Шаг {step + 1} из {steps.length}: {steps[step].title}
                </p>
              )}
              {!editData && createMode === 'axenta' && (
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Выберите объект из Axenta для автоматического добавления
                </p>
              )}
              {editData && (
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Шаг {step + 1} из {steps.length}: {steps[step].title}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* #2 Progress bar */}
        {!editData && createMode !== 'axenta' && (
          <div className="px-6 pt-3 pb-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">Прогресс заполнения</span>
              <span className="text-[10px] font-medium text-muted-foreground">{Math.round((filledCount / totalFields) * 100)}%</span>
            </div>
            <Progress value={(filledCount / totalFields) * 100} className="h-1.5" />
          </div>
        )}

        {/* Mode selector — only when creating new */}
        {!editData && (
          <div className="flex gap-2 px-6 pt-2">
            <Button size="sm" variant={createMode === 'manual' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1.5" onClick={() => setCreateMode('manual')}>
              <Plus className="size-3" />Создать новую
            </Button>
            <Button size="sm" variant={createMode === 'axenta' ? 'default' : 'outline'} className="h-7 text-[11px] gap-1.5" onClick={() => setCreateMode('axenta')}>
              <Satellite className="size-3" />Из Axenta
            </Button>
          </div>
        )}

        {/* #3 Step indicator — stepped timeline with connecting lines & #4 completion indicators */}
        {createMode !== 'axenta' && (
          <div className="px-6 pt-3 pb-1">
            <div className="flex items-center">
              {steps.map((s, i) => (
                <React.Fragment key={i}>
                  <button
                    onClick={() => goToStep(i)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] transition-all whitespace-nowrap ${
                      i === step
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : i < step
                          ? 'bg-primary/15 text-primary dark:bg-primary/20'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {/* #4 Show checkmark on completed steps, or step icon */}
                    {i < step && isStepCompleted(i) ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      s.icon
                    )}
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                  {/* #3 Connecting line between steps */}
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${
                      i < step ? 'bg-primary/40' : 'bg-border'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* #21 Validation summary */}
        {validationAttempted && missingRequired.length > 0 && (
          <div className="mx-6 mt-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 flex items-center gap-2">
            <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
            <span className="text-[11px] text-red-700 dark:text-red-400">Заполните обязательные поля: {missingRequired.map(k => {
              const labels: Record<string, string> = { name: 'Наименование' }
              return labels[k] || k
            }).join(', ')}</span>
          </div>
        )}

        {/* Axenta object selection */}
        {!editData && createMode === 'axenta' ? (
          <div className="space-y-3 px-6 overflow-y-auto flex-1 min-h-0 py-3 max-h-[60vh]">
            {/* #18 Search/filter for Axenta */}
            {unlinkedAxentaObjects.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={axentaSearch}
                  onChange={e => setAxentaSearch(e.target.value)}
                  placeholder="Поиск по названию или IMEI..."
                  className="h-8 text-xs pl-8"
                />
              </div>
            )}

            {axentaLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Загрузка объектов...</span>
              </div>
            ) : filteredAxentaObjects.length === 0 ? (
              <div className="text-center py-12">
                <Satellite className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {axentaSearch.trim()
                    ? 'Ничего не найдено по запросу'
                    : axentaObjects.length === 0
                      ? 'Нет объектов в Axenta. Проверьте настройки интеграции.'
                      : 'Все объекты Axenta уже привязаны к технике'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* #17 Better card design for Axenta objects with status indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredAxentaObjects.map(obj => {
                    const isSelected = String(obj.id) === selectedAxentaId
                    const lastTime = obj.lastMessage?.posTime || obj.lastMessage?.time
                    const speed = obj.lastMessage?.position?.s || 0
                    return (
                      <Card
                        key={obj.id}
                        className={`cursor-pointer transition-all relative overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-primary border-primary shadow-md'
                            : 'hover:shadow-sm hover:border-muted-foreground/30'
                        }`}
                        onClick={() => handleSelectAxentaObject(String(obj.id))}
                      >
                        {/* Status indicator strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${obj.connectedStatus ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <CardContent className="p-3 pl-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`size-7 rounded-md flex items-center justify-center ${obj.connectedStatus ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                              <Satellite className={`size-3.5 ${obj.connectedStatus ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                            </div>
                            <p className="text-xs font-medium truncate flex-1">{obj.name}</p>
                            {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                          </div>
                          {/* #19 Tracker preview info — more details */}
                          <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Hash className="size-2.5" />
                              <span>IMEI: {obj.uniqueId}</span>
                            </div>
                            {obj.lastMessage?.position && (
                              <div className="flex items-center gap-1">
                                <Navigation className="size-2.5" />
                                <span>Скорость: {speed} км/ч</span>
                                {speed > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">● в движении</span>}
                              </div>
                            )}
                            {obj.lastMessage?.position && (obj.lastMessage.position.x !== 0 || obj.lastMessage.position.y !== 0) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="size-2.5" />
                                <span>{obj.lastMessage.position.y.toFixed(4)}, {obj.lastMessage.position.x.toFixed(4)}</span>
                              </div>
                            )}
                            {lastTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="size-2.5" />
                                <span>Связь: {formatDateTime(lastTime)}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {selectedAxentaId && (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Edit className="size-3" />Данные техники (можно отредактировать)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Label className="text-xs flex items-center gap-1"><FileText className="size-3 text-muted-foreground" />Наименование <ReqStar /></Label>
                        <Input value={f('name')} onChange={e => setF('name', e.target.value)} className={`h-9 ${validationAttempted && !f('name').trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Settings2 className="size-3 text-muted-foreground" />Тип</Label>
                        <Select value={f('type')} onValueChange={v => setF('type', v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (
                              <React.Fragment key={category}>
                                {/* #8 Type category icons */}
                                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  {categoryIcons[category]}{category}
                                </div>
                                {types.map(t => (
                                  <SelectItem key={t.value} value={t.value}>
                                    <span className="flex items-center gap-1.5">{EQUIPMENT_TYPE_MAP[t.value]?.icon}{t.label}</span>
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1"><IdCard className="size-3 text-muted-foreground" />Гос. номер</Label>
                        {/* #9 Registration field formatting hint */}
                        <Input value={f('registrationNum')} onChange={e => setF('registrationNum', e.target.value)} placeholder="А000АА 00" className="h-9" />
                        <span className="text-[9px] text-muted-foreground/60 mt-0.5 block">Формат: А000АА 00 (регион)</span>
                      </div>
                      <div>
                        <Label className="text-xs">Марка</Label>
                        <Input value={f('brand')} onChange={e => setF('brand', e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <Label className="text-xs">Модель</Label>
                        <Input value={f('model')} onChange={e => setF('model', e.target.value)} className="h-9" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs flex items-center gap-1"><ScanLine className="size-3 text-muted-foreground" />VIN номер</Label>
                        {/* #9 VIN formatting hint */}
                        <Input value={f('vin')} onChange={e => setF('vin', e.target.value)} placeholder="17 символов" maxLength={17} className={`h-9 font-mono text-sm ${f('vin') && f('vin').length !== 17 ? 'border-amber-400' : ''}`} />
                        {f('vin') && (
                          <span className={`text-[9px] mt-0.5 block ${f('vin').length === 17 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {f('vin').length}/17 символов {f('vin').length === 17 ? '✓' : '— VIN должен содержать 17 символов'}
                          </span>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">Статус</Label>
                        {/* #7 Status preview badge */}
                        <div className="flex items-center gap-2">
                          <Select value={f('status')} onValueChange={v => setF('status', v)}>
                            <SelectTrigger className="h-9 text-sm flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className={`text-[9px] h-6 whitespace-nowrap ${currentStatusInfo.color}`}>
                            {currentStatusInfo.label}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />Компания-владелец</Label>
                        <Select value={f('ownerId') || '_none'} onValueChange={v => setF('ownerId', v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Не указан" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Не указан</SelectItem>
                            {companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center">{c.name}{companyTypeBadge(c.type)}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
        <div className="px-6 overflow-y-auto flex-1 min-h-0 py-3 max-h-[55vh]" key={step}>
          {/* #15 Animate step transitions */}
          <AnimatePresence mode="wait" custom={stepDirection}>
            <motion.div
              key={step}
              custom={stepDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {step === 0 && (
                <>
                  {/* #14 Group header */}
                  <GroupHeader icon={<Settings2 className="size-3" />} title="Общая информация" />

                  <div className="sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1">
                      <FileText className="size-3 text-muted-foreground" />Наименование <ReqStar />
                    </Label>
                    {/* #6 Field description */}
                    <Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Грузовой автомобиль ГАЗель" autoFocus className={`h-9 w-full ${validationAttempted && !f('name').trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                    <FieldHint text="Обязательное поле" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Settings2 className="size-3 text-muted-foreground" />Тип</Label>
                    <Select value={f('type')} onValueChange={v => setF('type', v)}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EQUIPMENT_TYPE_GROUPS).map(([category, types]) => (
                          <React.Fragment key={category}>
                            {/* #8 Type category icons */}
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              {categoryIcons[category]}{category}
                            </div>
                            {types.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                <span className="flex items-center gap-1.5">{EQUIPMENT_TYPE_MAP[t.value]?.icon}{t.label}</span>
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Марка</Label>
                    <Input value={f('brand')} onChange={e => setF('brand', e.target.value)} placeholder="ГАЗ, КАМАЗ, УАЗ..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Модель</Label>
                    <Input value={f('model')} onChange={e => setF('model', e.target.value)} placeholder="ГАЗель NEXT, 4326..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Calendar className="size-3 text-muted-foreground" />Год выпуска</Label>
                    <Input type="number" value={f('year')} onChange={e => setF('year', e.target.value)} placeholder="2024" min={1900} max={new Date().getFullYear() + 1} className="h-9 w-full" />
                    {/* #11 Vehicle age auto-calc */}
                    {vehicleAge !== null && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        {vehicleAge === 0 ? 'Новый транспорт' : `${vehicleAge} ${vehicleAge === 1 ? 'год' : vehicleAge < 5 ? 'года' : 'лет'} в эксплуатации`}
                      </span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Категория</Label>
                    <Input value={f('category')} onChange={e => setF('category', e.target.value)} placeholder="B, C, D, CE..." className="h-9 w-full" />
                    <FieldHint text="Категория водительских прав" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Palette className="size-3 text-muted-foreground" />Цвет</Label>
                    <Input value={f('color')} onChange={e => setF('color', e.target.value)} placeholder="Белый, Серебристый..." className="h-9 w-full" />
                  </div>

                  {/* #14 Group header */}
                  <GroupHeader icon={<Activity className="size-3" />} title="Статус" />

                  <div>
                    <Label className="text-xs flex items-center gap-1">Статус</Label>
                    <div className="flex items-center gap-2">
                      <Select value={f('status')} onValueChange={v => setF('status', v)}>
                        <SelectTrigger className="h-9 text-sm flex-1 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(EQUIPMENT_STATUS_MAP).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* #7 Status preview badge */}
                      <Badge variant="outline" className={`text-[9px] h-6 whitespace-nowrap ${currentStatusInfo.color}`}>
                        {currentStatusInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><HeartPulse className="size-3 text-muted-foreground" />Состояние</Label>
                    <Select value={f('condition')} onValueChange={v => setF('condition', v)}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EQUIPMENT_CONDITION_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <GroupHeader icon={<MapPin className="size-3" />} title="Размещение и водитель" />

                  <div>
                    <Label className="text-xs">Местоположение</Label>
                    <Input value={f('location')} onChange={e => setF('location', e.target.value)} placeholder="Цех, площадка..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Депо / Гараж</Label>
                    <Input value={f('depot')} onChange={e => setF('depot', e.target.value)} placeholder="Гараж №3..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Гаражный номер</Label>
                    <Input value={f('garageNumber')} onChange={e => setF('garageNumber', e.target.value)} placeholder="Г-001" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Сменный номер</Label>
                    <Input value={f('unitNumber')} onChange={e => setF('unitNumber', e.target.value)} placeholder="Б-05" className="h-9 w-full" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><User className="size-3 text-muted-foreground" />Назначенный водитель</Label>
                    <Input value={f('assignedDriver')} onChange={e => setF('assignedDriver', e.target.value)} placeholder="Иванов И.И." className="h-9 w-full" />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {/* #14 Group header */}
                  <GroupHeader icon={<FileText className="size-3" />} title="Документы" />

                  <div className="sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><ScanLine className="size-3 text-muted-foreground" />VIN номер</Label>
                    {/* #9 VIN formatting hint */}
                    <Input value={f('vin')} onChange={e => setF('vin', e.target.value)} placeholder="17 символов" maxLength={17} className={`h-9 w-full font-mono text-sm ${f('vin') && f('vin').length !== 17 ? 'border-amber-400' : ''}`} />
                    {f('vin') && (
                      <span className={`text-[9px] mt-0.5 block ${f('vin').length === 17 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {f('vin').length}/17 символов {f('vin').length === 17 ? '✓' : '— VIN должен содержать 17 символов'}
                      </span>
                    )}
                    <FieldHint text="Уникальный идентификационный номер кузова" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Hash className="size-3 text-muted-foreground" />Серийный номер</Label>
                    <Input value={f('serialNumber')} onChange={e => setF('serialNumber', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><IdCard className="size-3 text-muted-foreground" />Гос. номер</Label>
                    {/* #9 Registration field formatting */}
                    <Input value={f('registrationNum')} onChange={e => setF('registrationNum', e.target.value)} placeholder="А000АА 00" className="h-9 w-full" />
                    <span className="text-[9px] text-muted-foreground/60 mt-0.5 block">Формат: А000АА 00 (регион)</span>
                  </div>

                  {/* #14 Group header */}
                  <GroupHeader icon={<ClipboardCheck className="size-3" />} title="Документы ТС" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><FileBadge className="size-3 text-muted-foreground" />Номер СТС</Label>
                    <Input value={f('stsNumber')} onChange={e => setF('stsNumber', e.target.value)} placeholder="00 АА 000000" className="h-9 w-full" />
                    <FieldHint text="Свидетельство о регистрации ТС" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><FileText className="size-3 text-muted-foreground" />Номер ПТС</Label>
                    <Input value={f('ptsNumber')} onChange={e => setF('ptsNumber', e.target.value)} placeholder="00 АА 000000" className="h-9 w-full" />
                    <FieldHint text="Паспорт транспортного средства" />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {/* #14 Group header */}
                  <GroupHeader icon={<Cog className="size-3" />} title="Двигатель" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Cog className="size-3 text-muted-foreground" />Тип двигателя</Label>
                    <Input value={f('engineType')} onChange={e => setF('engineType', e.target.value)} placeholder="Бензин, Дизель, Гибрид..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Gauge className="size-3 text-muted-foreground" />Объём двигателя</Label>
                    <Input value={f('engineVolume')} onChange={e => setF('engineVolume', e.target.value)} placeholder="2.0 л" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Zap className="size-3 text-muted-foreground" />Мощность (л.с.)</Label>
                    <Input value={f('enginePower')} onChange={e => setF('enginePower', e.target.value)} placeholder="150" className="h-9 w-full" />
                  </div>

                  {/* #14 Group header */}
                  <GroupHeader icon={<Navigation className="size-3" />} title="Эксплуатация" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Route className="size-3 text-muted-foreground" />Пробег (км)</Label>
                    <Input type="number" value={f('mileage')} onChange={e => setF('mileage', e.target.value)} placeholder="50000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><FuelIcon className="size-3 text-muted-foreground" />Тип топлива</Label>
                    <Input value={f('fuelType')} onChange={e => setF('fuelType', e.target.value)} placeholder="АИ-95, ДТ, Газ..." className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Weight className="size-3 text-muted-foreground" />Грузоподъёмность</Label>
                    <Input value={f('loadCapacity')} onChange={e => setF('loadCapacity', e.target.value)} placeholder="1500 кг" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Users className="size-3 text-muted-foreground" />Пассажирских мест</Label>
                    <Input type="number" value={f('passengerSeats')} onChange={e => setF('passengerSeats', e.target.value)} placeholder="5" className="h-9 w-full" />
                  </div>

                  <GroupHeader icon={<FuelIcon className="size-3" />} title="Расход топлива и обслуживание" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><FuelIcon className="size-3 text-muted-foreground" />Норма расхода (л/100км)</Label>
                    <Input type="number" step="0.1" value={f('fuelConsumptionNorm')} onChange={e => setF('fuelConsumptionNorm', e.target.value)} placeholder="12.5" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Wrench className="size-3 text-muted-foreground" />Интервал ТО (км)</Label>
                    <Input type="number" value={f('maintenanceInterval')} onChange={e => setF('maintenanceInterval', e.target.value)} placeholder="15000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Дата последнего ТО</Label>
                    <Input type="date" value={f('lastMaintenanceDate')} onChange={e => setF('lastMaintenanceDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Дата следующего ТО</Label>
                    <Input type="date" value={f('nextMaintenanceDate')} onChange={e => setF('nextMaintenanceDate', e.target.value)} className="h-9 w-full" />
                  </div>

                  <GroupHeader icon={<Droplets className="size-3" />} title="Масло и шины" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Droplets className="size-3 text-muted-foreground" />Дата замены масла</Label>
                    <Input type="date" value={f('oilChangeDate')} onChange={e => setF('oilChangeDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Пробег при замене масла (км)</Label>
                    <Input type="number" value={f('oilChangeMileage')} onChange={e => setF('oilChangeMileage', e.target.value)} placeholder="40000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Интервал замены масла (км)</Label>
                    <Input type="number" value={f('oilChangeInterval')} onChange={e => setF('oilChangeInterval', e.target.value)} placeholder="10000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Размер шин</Label>
                    <Input value={f('tireSize')} onChange={e => setF('tireSize', e.target.value)} placeholder="205/55 R16" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Дата замены шин</Label>
                    <Input type="date" value={f('tireReplacementDate')} onChange={e => setF('tireReplacementDate', e.target.value)} className="h-9 w-full" />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  {/* #14 Group header */}
                  <GroupHeader icon={<DollarSign className="size-3" />} title="Стоимость" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Calendar className="size-3 text-muted-foreground" />Дата приобретения</Label>
                    <Input type="date" value={f('purchaseDate')} onChange={e => setF('purchaseDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="size-3 text-muted-foreground" />Цена приобретения (₽)</Label>
                    <Input type="number" value={f('purchasePrice')} onChange={e => setF('purchasePrice', e.target.value)} placeholder="1 500 000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><TrendingDown className="size-3 text-muted-foreground" />Текущая стоимость (₽)</Label>
                    <Input type="number" value={f('currentPrice')} onChange={e => setF('currentPrice', e.target.value)} placeholder="1 200 000" className="h-9 w-full" />
                    {/* #12 Depreciation preview */}
                    {depreciation !== null && (
                      <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${depreciation > 50 ? 'text-red-600 dark:text-red-400' : depreciation > 20 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <TrendingDown className="size-2.5" />
                        Износ: {depreciation.toFixed(1)}%
                        {depreciation > 50 && ' — высокая амортизация'}
                      </div>
                    )}
                  </div>

                  {/* #14 Group header */}
                  <GroupHeader icon={<Shield className="size-3" />} title="Страхование и ТО" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Shield className="size-3 text-muted-foreground" />Номер полиса</Label>
                    <Input value={f('insuranceNumber')} onChange={e => setF('insuranceNumber', e.target.value)} placeholder="ССС 0000000000" className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">Страховка до</Label>
                    <Input type="date" value={f('insuranceExpiry')} onChange={e => setF('insuranceExpiry', e.target.value)} className="h-9 w-full" />
                    {/* #10 Insurance/TO warning */}
                    {getExpiryWarning(f('insuranceExpiry')) && (
                      <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${getExpiryWarning(f('insuranceExpiry'))!.type === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <AlertTriangle className="size-2.5" />
                        {getExpiryWarning(f('insuranceExpiry'))!.type === 'expired'
                          ? `Просрочена на ${getExpiryWarning(f('insuranceExpiry'))!.days} дн.`
                          : `Истекает через ${getExpiryWarning(f('insuranceExpiry'))!.days} дн.`}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><ClipboardCheck className="size-3 text-muted-foreground" />Дата ТО</Label>
                    <Input type="date" value={f('inspectionDate')} onChange={e => setF('inspectionDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">ТО до</Label>
                    <Input type="date" value={f('inspectionExpiry')} onChange={e => setF('inspectionExpiry', e.target.value)} className="h-9 w-full" />
                    {/* #10 Insurance/TO warning */}
                    {getExpiryWarning(f('inspectionExpiry')) && (
                      <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${getExpiryWarning(f('inspectionExpiry'))!.type === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <AlertTriangle className="size-2.5" />
                        {getExpiryWarning(f('inspectionExpiry'))!.type === 'expired'
                          ? `Просрочено на ${getExpiryWarning(f('inspectionExpiry'))!.days} дн.`
                          : `Истекает через ${getExpiryWarning(f('inspectionExpiry'))!.days} дн.`}
                      </div>
                    )}
                  </div>

                  <GroupHeader icon={<Users className="size-3" />} title="Аренда" />

                  <div>
                    <Label className="text-xs">Начало аренды</Label>
                    <Input type="date" value={f('rentalStartDate')} onChange={e => setF('rentalStartDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Конец аренды</Label>
                    <Input type="date" value={f('rentalEndDate')} onChange={e => setF('rentalEndDate', e.target.value)} className="h-9 w-full" />
                  </div>
                  <div>
                    <Label className="text-xs">Стоимость аренды (₽/мес)</Label>
                    <Input type="number" value={f('rentalCost')} onChange={e => setF('rentalCost', e.target.value)} placeholder="50000" className="h-9 w-full" />
                  </div>

                  {f('status') === 'decommissioned' && (
                    <>
                      <GroupHeader icon={<XCircle className="size-3" />} title="Списание" />
                      <div>
                        <Label className="text-xs">Дата списания</Label>
                        <Input type="date" value={f('decommissionDate')} onChange={e => setF('decommissionDate', e.target.value)} className="h-9 w-full" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Причина списания</Label>
                        <Textarea value={f('decommissionReason')} onChange={e => setF('decommissionReason', e.target.value)} rows={2} />
                      </div>
                    </>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  {/* #14 Group header */}
                  <GroupHeader icon={<Building2 className="size-3" />} title="Компании" />

                  <div>
                    <Label className="text-xs flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />Компания-владелец</Label>
                    {/* #24 Owner/Renter inline info */}
                    <Select value={f('ownerId') || '_none'} onValueChange={v => setF('ownerId', v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Не указан" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не указан</SelectItem>
                        {companies.filter(c => c.type === 'owner' || c.type === 'both').map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center">{c.name}{companyTypeBadge(c.type)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />Компания-арендатор</Label>
                    {/* #24 Owner/Renter inline info */}
                    <Select value={f('renterId') || '_none'} onValueChange={v => setF('renterId', v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Не указан" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не указан</SelectItem>
                        {companies.filter(c => c.type === 'renter' || c.type === 'both').map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center">{c.name}{companyTypeBadge(c.type)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* #14 Group header */}
                  <GroupHeader icon={<StickyNote className="size-3" />} title="Заметки" />

                  {/* #23 Notes field richer — larger with character count */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><StickyNote className="size-3 text-muted-foreground" />Заметки</Label>
                    <Textarea
                      value={f('notes')}
                      onChange={e => setF('notes', e.target.value)}
                      rows={4}
                      placeholder="Дополнительная информация о технике, особенности эксплуатации..."
                      className="w-full resize-y min-h-[80px]"
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-muted-foreground/60">Shift+Enter для новой строки</span>
                      <span className="text-[9px] text-muted-foreground/60">{f('notes').length} символов</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        )}

        {/* #16 Better footer with summary */}
        <DialogFooter className="gap-2 sm:gap-0 px-6 py-3 border-t bg-muted/20">
          {/* Filled fields count */}
          <div className="flex-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Заполнено: {filledCount} из {totalFields}</span>
            <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(filledCount / totalFields) * 100}%` }} />
            </div>
          </div>

          {!editData && createMode === 'axenta' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setCreateMode('manual'); setSelectedAxentaId('') }}><ChevronLeft className="size-3.5" />Назад</Button>
              {/* #22 Save button states — different for axenta mode */}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving || !selectedAxentaId || !f('name').trim()}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Satellite className="size-3.5" />}Добавить с трекером
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setStepDirection(-1); setStep(Math.max(0, step - 1)) }} disabled={step === 0}><ChevronLeft className="size-3.5" />Назад</Button>
              {step < steps.length - 1 ? (
                <div className="flex gap-2">
                  {/* #22 Save button states — outline for quick save during steps */}
                  <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !f('name').trim()}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}{editData ? 'Сохранить' : 'Добавить'}
                  </Button>
                  <Button size="sm" onClick={() => { setStepDirection(1); setStep(step + 1) }}>Далее<ChevronRight className="size-3.5" /></Button>
                </div>
              ) : (
                /* #22 Save button states — primary green for create, default for edit */
                <Button
                  size="sm"
                  className={editData ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                  onClick={handleSave}
                  disabled={saving || !f('name').trim()}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  {editData ? 'Сохранить' : 'Добавить технику'}
                </Button>
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

const RepairsTab = React.memo(function RepairsTab({ repairs, equipment, onOpenDetail, onAdd, onDelete, readOnly }: {
  repairs: Repair[]; equipment: Equipment[];
  onOpenDetail: (r: Repair) => void; onAdd: (eqId?: string) => void;
  onDelete: (r: Repair) => void;
  readOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'expensive' | 'critical' | 'warranty' | 'noContractor' | 'paused'>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortField, setSortField] = useState<string>('startDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [batchAction, setBatchAction] = useState<string>('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    let result = repairs.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (eqFilter !== 'all' && r.equipmentId !== eqFilter) return false
      if (debouncedSearch && !r.description.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(r.equipment?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()))) return false
      if (quickFilter === 'overdue') { if (r.status !== 'in_progress' || !r.estimatedEndDate || new Date(r.estimatedEndDate) >= new Date()) return false }
      else if (quickFilter === 'expensive' && (r.cost || 0) < 50000) return false
      else if (quickFilter === 'critical') { if (r.priority !== 'critical') return false }
      else if (quickFilter === 'warranty') { if (!r.warrantyRepair) return false }
      else if (quickFilter === 'noContractor') { if (r.contractor) return false }
      else if (quickFilter === 'paused') { if (r.status !== 'paused') return false }
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
      if (typeFilter !== 'all' && r.repairType !== typeFilter) return false
      return true
    })
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'startDate': aVal = new Date(a.startDate).getTime(); bVal = new Date(b.startDate).getTime(); break
        case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break
        case 'description': aVal = a.description.toLowerCase(); bVal = b.description.toLowerCase(); break
        case 'priority': { const po: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }; aVal = po[a.priority] || 0; bVal = po[b.priority] || 0; break }
        case 'status': { const so: Record<string, number> = { in_progress: 4, paused: 3, completed: 2, cancelled: 1 }; aVal = so[a.status] || 0; bVal = so[b.status] || 0; break }
        default: aVal = new Date(a.startDate).getTime(); bVal = new Date(b.startDate).getTime()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [repairs, statusFilter, eqFilter, debouncedSearch, quickFilter, priorityFilter, typeFilter, sortField, sortDir])

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0)
  const avgCost = filtered.length > 0 ? totalCost / filtered.length : 0
  const inProgress = filtered.filter(r => r.status === 'in_progress').length
  const completedThisMonth = filtered.filter(r => r.status === 'completed' && r.endDate && new Date(r.endDate).getMonth() === new Date().getMonth()).length
  const avgDuration = filtered.filter(r => r.status === 'completed' && r.endDate).reduce((sum, r) => {
    return sum + Math.ceil((new Date(r.endDate!).getTime() - new Date(r.startDate).getTime()) / (1000*60*60*24))
  }, 0) / Math.max(1, filtered.filter(r => r.status === 'completed' && r.endDate).length)

  // Most repaired equipment top-3
  const eqRepairCount: Record<string, number> = {}
  for (const r of filtered) { if (r.equipmentId) eqRepairCount[r.equipmentId] = (eqRepairCount[r.equipmentId] || 0) + 1 }
  const topRepaired = Object.entries(eqRepairCount).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const getRepairDays = (startDate: string, endDate?: string | null) => {
    const end = endDate ? new Date(endDate) : new Date()
    return Math.ceil((end.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDaysColor = (days: number) => {
    if (days < 7) return 'text-emerald-600 dark:text-emerald-400'
    if (days <= 14) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(r => r.id)))
  }

  const handleBatchAction = async () => {
    if (selectedIds.size === 0 || !batchAction) return
    try {
      if (batchAction === 'delete') {
        for (const id of selectedIds) { await fetch(`/api/repairs/${id}`, { method: 'DELETE' }) }
        toast.success(`Удалено ${selectedIds.size} ремонтов`)
      } else {
        for (const id of selectedIds) { await fetch(`/api/repairs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: batchAction }) }) }
        toast.success(`Статус изменён для ${selectedIds.size} ремонтов`)
      }
      setSelectedIds(new Set())
      setBatchAction('')
      // Refresh
      window.location.reload()
    } catch { toast.error('Ошибка пакетной операции') }
  }

  const priorityDotColor: Record<string, string> = { low: 'bg-gray-400', medium: 'bg-sky-500', high: 'bg-amber-500', critical: 'bg-red-500' }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left py-1.5 px-2 font-medium cursor-pointer hover:bg-muted/80 transition-colors select-none" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{children}{sortField === field && (sortDir === 'asc' ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />)}</span>
    </th>
  )

  return (
    <div className="space-y-3">
      {/* Statistics dashboard */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Всего</p><p className="text-sm font-bold">{filtered.length}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-900/20 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">В процессе</p><p className="text-sm font-bold text-amber-600 dark:text-amber-400">{inProgress}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-900/20 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Завершено (мес.)</p><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{completedThisMonth}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Общая стоимость</p><p className="text-xs font-bold">{formatPrice(totalCost)}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Ср. стоимость</p><p className="text-xs font-bold">{formatPrice(avgCost)}</p></CardContent></Card>
          <Card className="border-0 shadow-none bg-muted/30 py-2"><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Ср. длит. (дн.)</p><p className="text-sm font-bold">{avgDuration > 0 ? avgDuration.toFixed(1) : '—'}</p></CardContent></Card>
        </div>
      )}

      {/* Top repaired equipment */}
      {topRepaired.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Чаще в ремонте:</span>
          {topRepaired.map(([eqId, count], i) => {
            const eq = equipment.find(e => e.id === eqId)
            return eq ? <span key={eqId} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-muted">{i + 1}. {eq.name} ({count})</span> : null
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по описанию..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eqFilter} onValueChange={setEqFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm"><SelectValue placeholder="Техника" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Вся техника</SelectItem>
            {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm"><SelectValue placeholder="Приоритет" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {Object.entries(REPAIR_PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(REPAIR_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => onAdd()} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(r => ({ Описание: r.description, Причина: r.reason || '', Техника: r.equipment?.name || '', Статус: REPAIR_STATUS_MAP[r.status]?.label || r.status, Приоритет: REPAIR_PRIORITY_MAP[r.priority]?.label || '', Тип: REPAIR_TYPE_MAP[r.repairType]?.label || '', 'Дата начала': formatDate(r.startDate), 'Дата окончания': formatDate(r.endDate), Стоимость: r.cost || 0, Подрядчик: r.contractor || '' })), 'repairs')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setQuickFilter('all')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Все</button>
        <button onClick={() => setQuickFilter('overdue')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'overdue' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200'}`}><AlertTriangle className="size-2.5" />Просроченные</button>
        <button onClick={() => setQuickFilter('critical')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}><Flag className="size-2.5" />Срочные</button>
        <button onClick={() => setQuickFilter('warranty')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'warranty' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'}`}><ShieldCheck className="size-2.5" />Гарантийные</button>
        <button onClick={() => setQuickFilter('paused')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'paused' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}><Pause className="size-2.5" />Приостановленные</button>
        <button onClick={() => setQuickFilter('noContractor')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'noContractor' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400'}`}>Без подрядчика</button>
        <button onClick={() => setQuickFilter('expensive')} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${quickFilter === 'expensive' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}><DollarSign className="size-2.5" />&gt;50к ₽</button>
        {/* View mode toggle */}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setViewMode('table')} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><List className="size-3" /></button>
          <button onClick={() => setViewMode('kanban')} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] transition-colors ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><LayoutGrid className="size-3" /></button>
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
          <span className="text-xs font-medium">Выбрано: {selectedIds.size}</span>
          <Select value={batchAction} onValueChange={setBatchAction}>
            <SelectTrigger className="h-7 w-[150px] text-[11px]"><SelectValue placeholder="Действие..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Завершить</SelectItem>
              <SelectItem value="paused">Приостановить</SelectItem>
              <SelectItem value="cancelled">Отменить</SelectItem>
              <SelectItem value="delete">Удалить</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-[11px] gap-1" onClick={handleBatchAction} disabled={!batchAction}><CheckCircle2 className="size-3" />Применить</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSelectedIds(new Set())}>Снять</Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {/* Kanban view */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['in_progress', 'paused', 'completed', 'cancelled'] as const).map(status => {
            const items = filtered.filter(r => r.status === status)
            const info = REPAIR_STATUS_MAP[status]
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${info?.color || ''}`}>{info?.label || status}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {items.map(r => (
                    <div key={r.id} className="rounded-lg border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onOpenDetail(r)}>
                      <div className="flex items-start gap-1.5 mb-1">
                        {r.priority && priorityDotColor[r.priority] && <span className={`mt-1 size-2 rounded-full shrink-0 ${priorityDotColor[r.priority]}`} />}
                        <p className="text-xs font-medium line-clamp-2">{r.description}</p>
                      </div>
                      {r.equipment?.name && <p className="text-[10px] text-muted-foreground truncate">{r.equipment.name}</p>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                        <span>{formatDate(r.startDate)}</span>
                        {r.cost != null && <span className="font-medium text-foreground">₽{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span>}
                        {r.repairType && REPAIR_TYPE_MAP[r.repairType] && <span className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-medium ${REPAIR_TYPE_MAP[r.repairType].color}`}>{REPAIR_TYPE_MAP[r.repairType].label}</span>}
                      </div>
                      {r.estimatedEndDate && r.status === 'in_progress' && new Date(r.estimatedEndDate) < new Date() && <span className="flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium mt-0.5"><AlertTriangle className="size-2" />Просрочен</span>}
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">Пусто</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <>
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Wrench className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Ремонты не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Измените фильтры или добавьте новый ремонт</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-2">
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(r => {
              const repairDays = getRepairDays(r.startDate, r.endDate)
              const isOverdue = r.status === 'in_progress' && r.estimatedEndDate && new Date(r.estimatedEndDate) < new Date()
              return (
                <div key={r.id} className="rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px]"
                  style={{ borderLeftColor: r.status === 'in_progress' ? '#f59e0b' : r.status === 'completed' ? '#10b981' : r.status === 'paused' ? '#3b82f6' : '#ef4444' }}
                  onClick={() => onOpenDetail(r)}>
                  <div className="flex items-start gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} onClick={e => e.stopPropagation()} className="size-4" />
                      <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {r.priority && priorityDotColor[r.priority] && <span className={`size-2 rounded-full ${priorityDotColor[r.priority]}`} />}
                        <p className="text-sm font-medium truncate">{r.description}</p>
                      </div>
                      {r.equipment?.name && <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1"><Truck className="size-3" />{r.equipment.name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge(r.status, REPAIR_STATUS_MAP)}
                      {r.repairType && REPAIR_TYPE_MAP[r.repairType] && <span className="mt-0.5">{statusBadge(r.repairType, REPAIR_TYPE_MAP)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-[44px] text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(r.startDate)}</span>
                    {r.cost != null && <span className="flex items-center gap-0.5 font-medium text-foreground"><span className="text-[9px]">₽</span>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span>}
                    <span className={`flex items-center gap-1 font-medium ${r.status === 'in_progress' ? getDaysColor(repairDays) : ''}`}><Clock className="size-3" />{repairDays} дн.</span>
                    {isOverdue && <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-3" />Просрочен</span>}
                    {r.stages && r.stages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span>{r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                        <Progress value={getStageProgress(r.stages)} className="h-1 w-12 inline-flex" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="py-1.5 px-2 w-8"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></th>
                    <SortHeader field="description">Описание</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Техника</th>
                    <SortHeader field="status">Статус</SortHeader>
                    <SortHeader field="priority">Приоритет</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Тип</th>
                    <SortHeader field="startDate">Начало</SortHeader>
                    <SortHeader field="cost">Стоимость</SortHeader>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Дней</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Подрядчик</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Этапы</th>
                    <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r, idx) => {
                    const borderColor = r.status === 'in_progress' ? 'border-l-amber-500' : r.status === 'completed' ? 'border-l-emerald-500' : r.status === 'paused' ? 'border-l-blue-500' : 'border-l-red-500'
                    const repairDays = getRepairDays(r.startDate, r.endDate)
                    const isOverdue = r.status === 'in_progress' && r.estimatedEndDate && new Date(r.estimatedEndDate) < new Date()
                    const costDeviation = r.estimatedCost && r.cost ? Math.round(((r.cost - r.estimatedCost) / r.estimatedCost) * 100) : null
                    return (
                      <tr key={r.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${borderColor} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(r)}>
                        <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="size-4" />
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                            {r.priority && priorityDotColor[r.priority] && <span className={`size-2 rounded-full shrink-0 ${priorityDotColor[r.priority]}`} title={REPAIR_PRIORITY_MAP[r.priority]?.label} />}
                            <div className="font-medium truncate max-w-[200px]">{r.description}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {r.reason && <span className="text-[9px] text-muted-foreground truncate max-w-[200px]">{r.reason}</span>}
                            {r.masters && r.masters.length > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="size-2" />{r.masters.length}</span>}
                            {r.photos && r.photos.length > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Camera className="size-2" />{r.photos.length}</span>}
                            {isOverdue && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-2" />Просрочен</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">{r.equipment?.name || '—'}</td>
                        <td className="py-1.5 px-2">{statusBadge(r.status, REPAIR_STATUS_MAP)}</td>
                        <td className="py-1.5 px-2">{r.priority && REPAIR_PRIORITY_MAP[r.priority] ? statusBadge(r.priority, REPAIR_PRIORITY_MAP as any) : '—'}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">{r.repairType && REPAIR_TYPE_MAP[r.repairType] ? statusBadge(r.repairType, REPAIR_TYPE_MAP) : '—'}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">{formatDate(r.startDate)}</td>
                        <td className="py-1.5 px-2 hidden md:table-cell">
                          <div>
                            {r.cost != null ? <span className="inline-flex items-center gap-0.5 font-medium"><span className="text-[9px]">₽</span>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(r.cost)}</span> : '—'}
                            {costDeviation != null && costDeviation !== 0 && <span className={`block text-[9px] ${costDeviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{costDeviation > 0 ? '+' : ''}{costDeviation}%</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 hidden lg:table-cell">
                          <span className={`font-medium ${r.status === 'in_progress' ? getDaysColor(repairDays) : ''}`}>{repairDays} дн.</span>
                        </td>
                        <td className="py-1.5 px-2 hidden lg:table-cell">
                          {r.contractor ? (
                            <div className="truncate max-w-[100px]">
                              <span className="text-muted-foreground">{r.contractor}</span>
                              {r.contractorPhone && <span className="block text-[9px] text-muted-foreground"><Phone className="inline size-2 mr-0.5" />{r.contractorPhone}</span>}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 px-2 hidden sm:table-cell">
                          {r.stages && r.stages.length > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{r.stages.filter(s => s.status === 'completed').length}/{r.stages.length}</span>
                                <span className="font-medium">{getStageProgress(r.stages)}%</span>
                              </div>
                              <Progress value={getStageProgress(r.stages)} className="h-1" />
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(r)}><Trash2 className="size-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </>
      )}
      {filtered.length > PAGE_SIZE && (
        <PaginationControls page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  )
})

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

function RepairDetailDialog({ open, onOpenChange, repair, loading, fullPhoto, setFullPhoto, onEdit, onDelete, onComplete, onAddStage, onEditStage, onDeleteStage, onUploadPhoto, onRefresh, employees, onDuplicate, onPause, onResume }: {
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
      const sd = editData.startDate ? toLocalDate(editData.startDate) : toLocalDate(new Date())
      // Auto-calculate estimatedEndDate = startDate + 7 days if not set
      const autoEstEnd = editData.estimatedEndDate ? toLocalDate(editData.estimatedEndDate) : toLocalDate(new Date(new Date(sd).getTime() + 7 * 24 * 60 * 60 * 1000))
      setForm({
        equipmentId: editData.equipmentId, description: editData.description || '', reason: editData.reason || '',
        startDate: sd,
        endDate: editData.endDate ? toLocalDate(editData.endDate) : '',
        estimatedEndDate: autoEstEnd,
        status: editData.status || 'in_progress', cost: editData.cost?.toString() || '',
        estimatedCost: editData.estimatedCost?.toString() || '',
        contractor: editData.contractor || '', contractorPhone: editData.contractorPhone || '',
        contractorEmail: editData.contractorEmail || '',
        location: editData.location || '',
        mileageStart: editData.mileageStart?.toString() || '',
        mileageEnd: editData.mileageEnd?.toString() || '',
        downtimeHours: editData.downtimeHours?.toString() || '',
        warrantyRepair: editData.warrantyRepair ? 'true' : 'false',
        insuranceClaim: editData.insuranceClaim ? 'true' : 'false',
        insuranceNumber: editData.insuranceNumber || '',
        priority: editData.priority || 'medium',
        repairType: editData.repairType || 'planned',
        workPerformed: editData.workPerformed || '', spareParts: editData.spareParts || '',
        nextInspection: editData.nextInspection ? toLocalDate(editData.nextInspection) : '',
        notes: editData.notes || '',
      })
      setSelectedMasters(editData.masters?.map(m => ({ employeeId: m.employeeId, role: m.role })) || [])
      setStages([])
    } else {
      const sd = toLocalDate(new Date())
      const autoEstEnd = toLocalDate(new Date(new Date(sd).getTime() + 7 * 24 * 60 * 60 * 1000))
      setForm({ equipmentId: equipmentId || '', startDate: sd, estimatedEndDate: autoEstEnd, status: 'in_progress', priority: 'medium', repairType: 'planned', warrantyRepair: 'false', insuranceClaim: 'false' })
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

  // Calculate cost from stages
  const calcCostFromStages = () => {
    const stageCosts = stages.reduce((sum, s) => sum + (parseFloat((s as any).cost) || 0), 0)
    if (stageCosts > 0) setF('cost', stageCosts.toString())
  }

  // Copy from last repair
  const copyFromLastRepair = async () => {
    if (!f('equipmentId')) { toast.error('Сначала выберите технику'); return }
    try {
      const res = await fetch(`/api/repairs?equipmentId=${f('equipmentId')}&limit=1`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const lastRepair = Array.isArray(data) ? data[0] : null
      if (!lastRepair) { toast.error('Нет предыдущих ремонтов для этой техники'); return }
      setForm(prev => ({
        ...prev,
        contractor: lastRepair.contractor || prev.contractor,
        contractorPhone: lastRepair.contractorPhone || prev.contractorPhone,
        contractorEmail: lastRepair.contractorEmail || prev.contractorEmail,
        location: lastRepair.location || prev.location,
        priority: lastRepair.priority || prev.priority,
        repairType: lastRepair.repairType || prev.repairType,
      }))
      toast.success('Данные скопированы из предыдущего ремонта')
    } catch { toast.error('Ошибка загрузки данных') }
  }

  // Add stage templates
  const addStageTemplate = (template: typeof STAGE_TEMPLATES[number]) => {
    setStages([...stages, { name: template.name, description: template.description }])
  }

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('description').trim()) { toast.error('Укажите описание ремонта'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        ...form,
        cost: f('cost') ? parseFloat(f('cost')) : null,
        estimatedCost: f('estimatedCost') ? parseFloat(f('estimatedCost')) : null,
        mileageStart: f('mileageStart') ? parseFloat(f('mileageStart')) : null,
        mileageEnd: f('mileageEnd') ? parseFloat(f('mileageEnd')) : null,
        downtimeHours: f('downtimeHours') ? parseFloat(f('downtimeHours')) : null,
        warrantyRepair: f('warrantyRepair') === 'true',
        insuranceClaim: f('insuranceClaim') === 'true',
        stages: editData ? undefined : stages.filter(s => s.name.trim()),
        masters: selectedMasters,
      }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование ремонта' : 'Новый ремонт'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          {/* Основная информация */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ClipboardList className="size-3.5 text-muted-foreground" />Основная информация</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label className="text-xs">Описание *</Label><Textarea value={f('description')} onChange={e => setF('description', e.target.value)} rows={2} autoFocus /></div>
              <div><Label className="text-xs">Причина</Label><Input value={f('reason')} onChange={e => setF('reason', e.target.value)} /></div>
              <div><Label className="text-xs">Местоположение</Label><Input value={f('location')} onChange={e => setF('location', e.target.value)} placeholder="Цех, участок..." /></div>
              <div><Label className="text-xs">Приоритет</Label><Select value={f('priority')} onValueChange={v => setF('priority', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Тип ремонта</Label><Select value={f('repairType')} onValueChange={v => setF('repairType', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REPAIR_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>

          {/* Сроки и стоимость */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" />Сроки и стоимость</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Дата начала</Label><Input type="date" value={f('startDate')} onChange={e => { setF('startDate', e.target.value); if (!editData) { setF('estimatedEndDate', toLocalDate(new Date(new Date(e.target.value).getTime() + 7 * 24 * 60 * 60 * 1000))) } }} /></div>
              <div><Label className="text-xs">Дата окончания</Label><Input type="date" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
              <div><Label className="text-xs">Плановая дата окончания</Label><Input type="date" value={f('estimatedEndDate')} onChange={e => setF('estimatedEndDate', e.target.value)} /></div>
              <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
              <div><Label className="text-xs">Плановая стоимость (₽)</Label><Input type="number" value={f('estimatedCost')} onChange={e => setF('estimatedCost', e.target.value)} /></div>
              {f('cost') && f('estimatedCost') && (
                <div className="flex items-end">
                  <div className="text-[10px] text-muted-foreground">
                    Отклонение: {Math.round(((parseFloat(f('cost')) - parseFloat(f('estimatedCost'))) / parseFloat(f('estimatedCost'))) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Пробег и простой */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Gauge className="size-3.5 text-muted-foreground" />Пробег и простой</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Пробег начало (км)</Label><Input type="number" value={f('mileageStart')} onChange={e => setF('mileageStart', e.target.value)} /></div>
              <div><Label className="text-xs">Пробег конец (км)</Label><Input type="number" value={f('mileageEnd')} onChange={e => setF('mileageEnd', e.target.value)} disabled={!editData} /></div>
              <div><Label className="text-xs">Время простоя (ч)</Label><Input type="number" step="0.5" value={f('downtimeHours')} onChange={e => setF('downtimeHours', e.target.value)} /></div>
            </div>
          </div>

          {/* Подрядчик */}
          <div className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold flex items-center gap-1.5"><Building2 className="size-3.5 text-muted-foreground" />Подрядчик</h4>
              {!editData && <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px]" onClick={copyFromLastRepair}><Copy className="size-3" />Из предыдущего</Button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Подрядчик</Label><Input value={f('contractor')} onChange={e => setF('contractor', e.target.value)} /></div>
              <div><Label className="text-xs">Телефон подрядчика</Label><Input value={f('contractorPhone')} onChange={e => setF('contractorPhone', e.target.value)} /></div>
              <div><Label className="text-xs">Email подрядчика</Label><Input type="email" value={f('contractorEmail')} onChange={e => setF('contractorEmail', e.target.value)} /></div>
            </div>
          </div>

          {/* Гарантия и страховка */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Shield className="size-3.5 text-muted-foreground" />Гарантия и страховка</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="warrantyRepair" checked={f('warrantyRepair') === 'true'} onCheckedChange={v => setF('warrantyRepair', v ? 'true' : 'false')} />
                <Label htmlFor="warrantyRepair" className="text-xs">Гарантийный ремонт</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="insuranceClaim" checked={f('insuranceClaim') === 'true'} onCheckedChange={v => setF('insuranceClaim', v ? 'true' : 'false')} />
                <Label htmlFor="insuranceClaim" className="text-xs">Страховой случай</Label>
              </div>
              {f('insuranceClaim') === 'true' && (
                <div className="sm:col-span-2"><Label className="text-xs">Номер страховки</Label><Input value={f('insuranceNumber')} onChange={e => setF('insuranceNumber', e.target.value)} /></div>
              )}
            </div>
          </div>

          {/* Результат */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><ClipboardCheck className="size-3.5 text-muted-foreground" />Результат</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Выполненные работы</Label><Textarea value={f('workPerformed')} onChange={e => setF('workPerformed', e.target.value)} rows={2} /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Запчасти</Label><Textarea value={f('spareParts')} onChange={e => setF('spareParts', e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Дата следующего ТО</Label><Input type="date" value={f('nextInspection')} onChange={e => setF('nextInspection', e.target.value)} /></div>
            </div>
          </div>

          {/* Заметки */}
          <div className="border rounded-md p-3 space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><StickyNote className="size-3.5 text-muted-foreground" />Заметки</h4>
            <Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} />
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
                <Label className="text-xs flex items-center gap-1"><Settings2 className="size-3" />Начальные этапы</Label>
                <div className="flex gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]"><BookmarkCheck className="size-3" />Шаблоны</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {STAGE_TEMPLATES.map((t, i) => (
                        <DropdownMenuItem key={i} onClick={() => addStageTemplate(t)}>{t.name}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStages(STAGE_TEMPLATES.map(t => ({ name: t.name, description: t.description })))}>Добавить все шаблоны</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={() => setStages([...stages, { name: '', description: '' }])}><Plus className="size-3" />Добавить</Button>
                </div>
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

const CompaniesTab = React.memo(function CompaniesTab({ companies, onAdd, onEdit, onDelete }: {
  companies: Company[];
  onAdd: () => void; onEdit: (c: Company) => void; onDelete: (c: Company) => void;
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => companies.filter(c => {
    if (debouncedSearch && !c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !(c.inn || '').includes(debouncedSearch)) return false
    return true
  }), [companies, debouncedSearch])

  const formatINN = (inn?: string | null) => {
    if (!inn) return '—'
    if (inn.length === 10) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6)}`
    if (inn.length === 12) return `${inn.slice(0, 2)}-${inn.slice(2, 4)}-${inn.slice(4, 6)}-${inn.slice(6, 8)}-${inn.slice(8)}`
    return inn
  }

  const getTypeIcon = (type: string) => {
    if (type === 'owner') return <Shield className="size-3 text-emerald-600 dark:text-emerald-400" />
    if (type === 'renter') return <Users className="size-3 text-sky-600 dark:text-sky-400" />
    return <Building2 className="size-3 text-violet-600 dark:text-violet-400" />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Поиск по названию или ИНН..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Добавить компанию</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(c => ({ Название: c.name, ИНН: c.inn || '', КПП: c.kpp || '', ОГРН: c.ogrn || '', Тип: COMPANY_TYPES[c.type] || c.type, Телефон: c.phone || '', Email: c.email || '', 'Юр. адрес': c.address || '', 'Факт. адрес': c.factAddress || '', Директор: c.director || '' })), 'companies')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length}</p>

      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0"><Building2 className="size-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Компании не найдены</p><p className="text-xs text-muted-foreground mt-1">Добавьте компанию для управления контрагентами</p></CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
            {filtered.map(c => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatINN(c.inn)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-muted-foreground">Тел.:</span> {c.phone ? <a href={`tel:${c.phone}`} className="font-medium hover:text-primary">{c.phone}</a> : <span className="text-muted-foreground">—</span>}</div>
                    <div><span className="text-muted-foreground">Email:</span> {c.email ? <a href={`mailto:${c.email}`} className="font-medium hover:text-primary truncate">{c.email}</a> : <span className="text-muted-foreground">—</span>}</div>
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
                  <TableHead className="text-xs hidden sm:table-cell">ИНН/КПП</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Тип</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Контакты</TableHead>
                  <TableHead className="text-xs text-center">Вл.</TableHead>
                  <TableHead className="text-xs text-center">Ар.</TableHead>
                  <TableHead className="text-xs text-right w-20">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, idx) => (
                  <TableRow key={c.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                    <TableCell className="font-medium py-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{c.name[0]}</div>
                        <div><p className="text-xs font-medium">{c.name}</p><p className="text-[10px] text-muted-foreground sm:hidden">{formatINN(c.inn)}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs py-2">
                      <span className="font-mono">{formatINN(c.inn)}</span>
                      {c.kpp && <span className="block text-[9px] text-muted-foreground font-mono">КПП: {c.kpp}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.type === 'owner' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : c.type === 'renter' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400'}`}>{getTypeIcon(c.type)}{COMPANY_TYPES[c.type] || c.type}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs py-2">
                      <div className="space-y-0.5">
                        {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-0.5 hover:text-primary transition-colors"><Phone className="size-2.5" />{c.phone}</a> : <span className="text-muted-foreground">—</span>}
                        {c.email && <a href={`mailto:${c.email}`} className="block text-[9px] text-muted-foreground hover:text-primary transition-colors"><Mail className="inline size-2 mr-0.5" />{c.email}</a>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs py-2 font-medium">{c._count?.ownedEquipment || 0}</TableCell>
                    <TableCell className="text-center text-xs py-2 font-medium">{c._count?.rentedEquipment || 0}</TableCell>
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
})

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

// ═══════════════════════════════════════════════════════════════
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════

const TripsTab = React.memo(function TripsTab({ trips, equipment, crews, routeTemplates, onOpenDetail, onAdd, onDelete, onAddCrew, onEditCrew, onDeleteCrew, onAddRouteTemplate, onEditRouteTemplate, onDeleteRouteTemplate, readOnly }: {
  trips: Trip[]; equipment: Equipment[]; crews: Crew[]; routeTemplates: RouteTemplate[];
  onOpenDetail: (t: Trip, focusTrack?: boolean) => void; onAdd: (eqId?: string) => void;
  onDelete: (t: Trip) => void;
  onAddCrew: () => void; onEditCrew: (c: Crew) => void; onDeleteCrew: (c: Crew) => void;
  onAddRouteTemplate: () => void; onEditRouteTemplate: (rt: RouteTemplate) => void; onDeleteRouteTemplate: (rt: RouteTemplate) => void;
  readOnly?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [eqFilter, setEqFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showCrews, setShowCrews] = useState(false)
  const [showRoutes, setShowRoutes] = useState(false)
  const [routeMapTemplate, setRouteMapTemplate] = useState<RouteTemplate | null>(null)
  const [routeMapData, setRouteMapData] = useState<any>(null)
  const [routeMapLoading, setRouteMapLoading] = useState(false)

  const showRouteOnMap = async (rt: RouteTemplate) => {
    if (routeMapTemplate?.id === rt.id) { setRouteMapTemplate(null); setRouteMapData(null); return }
    const pts = (rt.points || []).filter(p => p.latitude && p.longitude)
    if (pts.length < 2) { toast.error('Недостаточно точек с координатами'); return }
    setRouteMapTemplate(rt)
    setRouteMapLoading(true)
    try {
      const coords = pts.map(p => `${p.longitude},${p.latitude}`).join(';')
      // Use backend proxy to avoid CORS issues
      const res = await fetch(`/api/osrm-route?coords=${encodeURIComponent(coords)}`)
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const routeCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
        setRouteMapData({ trips: [{ distance: route.distance / 1000, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
      } else {
        const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
        setRouteMapData({ trips: [{ distance: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
      }
    } catch (err) {
      console.error('[Route Map] OSRM fetch failed:', err)
      const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
      setRouteMapData({ trips: [{ distance: 0, startDate: new Date().toISOString(), endDate: new Date().toISOString(), points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() })) }], parkings: [], stops: [] })
    }
    setRouteMapLoading(false)
  }

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
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowRoutes(!showRoutes)}>
          <Route className="size-3" />{showRoutes ? 'Скрыть маршруты' : 'Маршруты'}
          {showRoutes ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
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

      {/* Route Templates section (toggleable) */}
      {showRoutes && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5"><Route className="size-3.5" />Маршруты ({routeTemplates.length})</h3>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onAddRouteTemplate}><Plus className="size-3" />Создать</Button>
          </div>
          {routeTemplates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Маршруты не созданы</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {routeTemplates.map(rt => (
                <Card key={rt.id}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-md bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0"><Route className="size-3.5 text-sky-600 dark:text-sky-400" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{rt.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rt.points?.length || 0} точек{rt.totalDistance ? ` • ${rt.totalDistance.toFixed(1)} км` : ''}</p>
                      </div>
                    </div>
                    {(rt.startPoint || rt.endPoint) && (
                      <div className="text-[10px] text-muted-foreground space-y-0.5 pl-2">
                        {rt.startPoint && <div className="flex items-center gap-0.5"><MapPin className="size-2 text-emerald-500" />{rt.startPoint}</div>}
                        {rt.endPoint && <div className="flex items-center gap-0.5"><MapPin className="size-2 text-red-500" />{rt.endPoint}</div>}
                      </div>
                    )}
                    {rt.points && rt.points.length > 0 && (
                      <div className="space-y-0 pl-2">
                        {rt.points.slice(0, 4).map((p, i) => (
                          <div key={p.id} className="flex items-center gap-1 text-[10px]">
                            <span className={`inline-flex items-center justify-center size-3.5 rounded-full text-[8px] font-bold ${
                              i === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              i === rt.points.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                              'bg-primary/10 text-primary'
                            }`}>{i + 1}</span>
                            <span className="truncate">{p.name}</span>
                            {p.plannedArrival && <span className="text-muted-foreground text-[9px] ml-auto shrink-0">{p.plannedArrival}</span>}
                            {p.distanceFromPrev != null && p.distanceFromPrev > 0 && <span className="text-sky-600 dark:text-sky-400 shrink-0">+{p.distanceFromPrev.toFixed(1)}км</span>}
                          </div>
                        ))}
                        {rt.points.length > 4 && <div className="text-[9px] text-muted-foreground pl-4">...ещё {rt.points.length - 4} точек</div>}
                      </div>
                    )}
                    {rt.estimatedDuration && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-2">
                        <Clock className="size-2.5" />
                        {rt.estimatedDuration >= 60 ? `${Math.floor(rt.estimatedDuration / 60)} ч ${rt.estimatedDuration % 60 > 0 ? (rt.estimatedDuration % 60) + ' мин' : ''}` : `${rt.estimatedDuration} мин`}
                      </div>
                    )}
                    <div className="flex gap-1 pt-0.5">
                      {rt.points && rt.points.some(p => p.latitude && p.longitude) && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => showRouteOnMap(rt)}>
                          <Map className="size-3" />{routeMapTemplate?.id === rt.id ? 'Скрыть' : 'Карта'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5" onClick={() => onEditRouteTemplate(rt)}><Edit className="size-3" />Изменить</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-0.5 text-destructive hover:text-destructive" onClick={() => onDeleteRouteTemplate(rt)}><Trash2 className="size-3" />Удалить</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Inline route map */}
          {routeMapTemplate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Map className="size-3.5 text-sky-500" />
                <span className="text-xs font-medium">Маршрут: {routeMapTemplate.name}</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto" onClick={() => { setRouteMapTemplate(null); setRouteMapData(null) }}>
                  <X className="size-3" />Закрыть
                </Button>
              </div>
              <div className="h-72 rounded-lg overflow-hidden border">
                {routeMapLoading ? (
                  <div className="h-full flex items-center justify-center bg-muted/30">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">Расчёт маршрута...</span>
                  </div>
                ) : routeMapData ? (
                  <TrackerMap trackers={[]} trackData={routeMapData} />
                ) : null}
              </div>
            </div>
          )}
          <Separator />
        </div>
      )}

      {/* Trips list */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Route className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Рейсы не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Создайте новый рейс или измените фильтры</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="rounded-xl border p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px]"
                style={{ borderLeftColor: t.status === 'completed' ? '#10b981' : t.status === 'in_progress' ? '#3b82f6' : t.status === 'cancelled' ? '#ef4444' : '#f59e0b' }}
                onClick={() => onOpenDetail(t)}>
                <div className="flex items-start gap-2.5">
                  <div className="size-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                    <Route className="size-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.route}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin className="size-2.5 text-emerald-500" />{t.startPoint}</span>}
                      {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2.5 text-red-500" />{t.endPoint}</span>}
                    </div>
                  </div>
                  {statusBadge(t.status, TRIP_STATUS_MAP)}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pl-[44px] text-[10px] text-muted-foreground">
                  {t.equipment?.name && <span className="flex items-center gap-1"><Truck className="size-3" />{t.equipment.name}</span>}
                  {t.startDate && <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(t.startDate)}</span>}
                  {t.distance != null && <span className="flex items-center gap-0.5 font-medium text-foreground"><Navigation className="size-3 text-sky-500" />{t.distance} км</span>}
                  {t.fuelConsumed != null && <span className="flex items-center gap-0.5"><Fuel className="size-3 text-amber-500" />{t.fuelConsumed} л</span>}
                  {t.cargo && <span className="flex items-center gap-1"><Package className="size-3" />{t.cargo}</span>}
                  {t.crew && <span className="flex items-center gap-1"><Users className="size-3" />{t.crew.name}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="text-left py-1.5 px-2 font-medium w-8"></th>
                    <th className="text-left py-1.5 px-2 font-medium">Маршрут</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Техника</th>
                    <th className="text-left py-1.5 px-2 font-medium">Статус</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Начало</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Расст./Скор.</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Топливо</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden xl:table-cell">Доп.</th>
                    <th className="text-right py-1.5 px-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <tr key={t.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${TRIP_STATUS_MAP[t.status]?.border || ''} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(t)}>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center justify-center size-6 rounded bg-sky-100 dark:bg-sky-900/30">
                          <Route className="size-3 text-sky-600 dark:text-sky-400" />
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium truncate max-w-[200px]">{t.route}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {t.startPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><MapPin className="size-2 text-emerald-500" />{t.startPoint}</span>}
                          {t.endPoint && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><ArrowRight className="size-2" /><MapPin className="size-2 text-red-500" />{t.endPoint}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {t.cargo && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Package className="size-2" />{t.cargo}{t.cargoWeight != null ? ` • ${t.cargoWeight} т` : ''}</span>}
                          {t.crew && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="size-2" />{t.crew.name}</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden sm:table-cell text-muted-foreground">
                        <div className="truncate max-w-[120px]">{t.equipment?.name || '—'}</div>
                        {t.equipment?.registrationNum && <div className="text-[10px] font-mono">{t.equipment.registrationNum}</div>}
                      </td>
                      <td className="py-1.5 px-2">{statusBadge(t.status, TRIP_STATUS_MAP)}</td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <span className="cursor-pointer hover:text-primary hover:underline" onClick={(e) => { e.stopPropagation(); onOpenDetail(t) }}>{formatDateTime(t.startDate)}</span>
                          {t.startDate && t.equipmentId && (
                            <Button size="sm" variant="ghost" className="size-5 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onOpenDetail(t, true) }} title="Показать трек">
                              <Map className="size-3 text-sky-500" />
                            </Button>
                          )}
                        </div>
                        {t.tripDuration != null && <div className="text-[9px] text-muted-foreground"><Timer className="inline size-2 mr-0.5" />{formatDurationShort(t.tripDuration)}</div>}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        {t.distance != null ? <span className="inline-flex items-center gap-0.5 font-medium"><Navigation className="size-2 text-sky-500" />{t.distance} км</span> : <span className="text-muted-foreground">—</span>}
                        <div className="flex gap-1 mt-0.5">
                          {t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && <span className="text-[9px] text-muted-foreground"><Gauge className="inline size-2 mr-0.5" />{t.avgSpeed.toFixed(1)} км/ч</span>}
                          {t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300 && <span className={`text-[9px] ${t.maxSpeed > 90 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>макс: {t.maxSpeed}</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden lg:table-cell">
                        {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 ? (
                          <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400"><Fuel className="size-2" />{t.fuelConsumed.toFixed(1)} л</span>
                        ) : (t.fuelConsumed != null && Math.abs(t.fuelConsumed) >= 10000) ? <span className="text-[9px] text-yellow-500" title="Некорректные данные">⚠</span> : '—'}
                        <div className="flex gap-1 mt-0.5">
                          {t.refuelVolume != null && t.refuelVolume > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400"><ArrowUpFromLine className="size-2" />+{t.refuelVolume}л</span>}
                          {t.plumVolume != null && t.plumVolume > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400"><ArrowDownToLine className="size-2" />-{t.plumVolume}л</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden xl:table-cell">
                        <div className="space-y-0.5">
                          {t.idleTime != null && t.idleTime > 0 && t.idleTime < 8640000 && <span className="text-[9px] text-muted-foreground"><Clock className="inline size-2 mr-0.5" />Простой: {formatDurationShort(t.idleTime)}</span>}
                          {(t.cost != null || t.revenue != null) && (
                            <div className="flex gap-1">
                              {t.cost != null && <span className="text-[9px] text-red-500">−{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(t.cost)}₽</span>}
                              {t.revenue != null && <span className="text-[9px] text-emerald-500">+{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(t.revenue)}₽</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {t.startDate && t.equipmentId && (
                            <Button size="sm" variant="ghost" className="size-6 p-0 text-sky-500 hover:text-sky-600" onClick={() => onOpenDetail(t, true)} title="Показать трек на карте">
                              <MapPinned className="size-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(t)}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════
// TRIP DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════

function TripDetailDialog({ open, onOpenChange, trip, loading, crews, onEdit, onDelete, onStart, onComplete, onRefresh, focusTrack }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  trip: Trip | null; loading: boolean; crews: Crew[];
  onEdit: (t: Trip) => void; onDelete: (t: Trip) => void;
  onStart: (t: Trip) => void; onComplete: (t: Trip) => void;
  onRefresh: () => void;
  focusTrack?: boolean;
}) {
  const [trackData, setTrackData] = useState<Record<string, unknown> | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [trackDateFrom, setTrackDateFrom] = useState<string>('')
  const [trackDateTo, setTrackDateTo] = useState<string>('')
  const [compareData, setCompareData] = useState<Record<string, unknown> | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [discrepancyDialog, setDiscrepancyDialog] = useState<{
    open: boolean;
    diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }>;
    autoFields: Record<string, unknown>;
  }>({ open: false, diffs: [], autoFields: {} })
  const [tripSaved, setTripSaved] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null) // track which trip's data is loaded
  const [showRouteMap, setShowRouteMap] = useState(false)
  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(null)
  const [routeMapLoading, setRouteMapLoading] = useState(false)
  const [routeMapTrackData, setRouteMapTrackData] = useState<any>(null)
  const [focusedPoint, setFocusedPoint] = useState<{ lat: number; lng: number; type: 'parking' | 'stop' | 'refuel' | 'plum'; label?: string } | null>(null)
  const [routePointsCollapsed, setRoutePointsCollapsed] = useState(true)

  // ─── Complete trip dialog with refuel detection ─────────────
  const [completeDialog, setCompleteDialog] = useState<{
    open: boolean
    loading: boolean
    fuelEnd: string
    mileageEnd: string
    refuelVolume: string
    refuelDetected: boolean
    sensorRefuelVolume: number | null
    fuelStart: number | null
    fuelConsumed: string
    notes: string
  }>({
    open: false, loading: false, fuelEnd: '', mileageEnd: '', refuelVolume: '',
    refuelDetected: false, sensorRefuelVolume: null, fuelStart: null,
    fuelConsumed: '', notes: '',
  })

  // Ref for scrolling to track section
  const trackSectionRef = useRef<HTMLDivElement>(null)

  // Reset all data when trip changes — must be before any early return (Rules of Hooks)
  // Keep trackData if same trip is reopened (avoid re-fetching)
  useEffect(() => {
    if (trip?.id !== loadedTripId) {
      setTrackData(null)
      setTrackError(null)
      setTrackDateFrom('')
      setTrackDateTo('')
      setTripSaved(false)
    }
    setCompareData(null)
    setCompareError(null)
    setApplySuccess(null)
    setShowRouteMap(false)
    setRouteMapTrackData(null)
    setSelectedTripIndex(null)
    setFocusedPoint(null)
    setStatsApplied(null)
  }, [trip?.id])

  // ─── Auto-populate trip card fields from statistics when loaded ───
  // When tripStats is loaded/refreshed, compare with existing trip fields.
  // Null fields → auto-fill. Different values → show discrepancy dialog.
  const [statsApplied, setStatsApplied] = useState<string | null>(null) // track which stats version was applied
  useEffect(() => {
    if (!compareData?.tripStats || !trip) return
    const stats = compareData.tripStats as Record<string, unknown>
    // Use a version key to avoid re-triggering on same data
    const versionKey = `${stats.mileage}_${stats.fuelConsumption}_${stats.tripsDuration}_${stats.parkingsDuration}_${stats.engineHours}_${stats.refuelVolume}_${stats.avgFuelConsumption}`
    if (versionKey === statsApplied) return

    const t = trip
    const autoFields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Map stats fields to trip fields with comparison logic
    const fieldMappings: Array<{
      statKey: string; tripKey: keyof Trip; label: string;
      formatVal: (v: unknown) => string; transform: (v: unknown) => unknown;
      tolerance?: number
    }> = [
      { statKey: 'tripsDuration', tripKey: 'tripDuration', label: 'Длительность поездок', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'fuelConsumption', tripKey: 'fuelConsumed', label: 'Расход топлива', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'avgFuelConsumption', tripKey: 'avgFuelRate', label: 'Ср. расход', formatVal: v => `${Number(v).toFixed(1)} л/100км`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'refuelVolume', tripKey: 'refuelVolume', label: 'Заправки', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'engineHours', tripKey: 'engineHours', label: 'Моточасы', formatVal: v => fmtDuration(Number(v)) || `${Number(v).toFixed(1)}`, transform: v => Number(v) },
      { statKey: 'parkingsDuration', tripKey: 'parkingsDuration', label: 'Время стоянок', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'mileage', tripKey: 'distance', label: 'Пробег', formatVal: v => `${Number(v).toFixed(1)} км`, transform: v => Number(v) },
      { statKey: 'avgSpeed', tripKey: 'avgSpeed', label: 'Ср. скорость', formatVal: v => `${Number(v).toFixed(1)} км/ч`, transform: v => Math.round(Number(v) * 100) / 100 },
      { statKey: 'maxSpeed', tripKey: 'maxSpeed', label: 'Макс. скорость', formatVal: v => `${Number(v).toFixed(0)} км/ч`, transform: v => Math.round(Number(v)) },
      { statKey: 'idleTime', tripKey: 'idleTime', label: 'Холостой ход', formatVal: v => fmtDuration(Number(v)) || '—', transform: v => Number(v) },
      { statKey: 'plumVolume', tripKey: 'plumVolume', label: 'Сливы', formatVal: v => `${Number(v).toFixed(1)} л`, transform: v => Math.round(Number(v) * 100) / 100 },
    ]

    for (const fm of fieldMappings) {
      const statVal = stats[fm.statKey]
      if (statVal == null || Number(statVal) === 0 && fm.statKey !== 'idleTime' && fm.statKey !== 'parkingsDuration' && fm.statKey !== 'tripsDuration') continue

      const transformedVal = fm.transform(statVal)
      const currentVal = t[fm.tripKey]

      if (currentVal == null) {
        // Auto-fill null fields
        autoFields[fm.tripKey] = transformedVal
      } else {
        // Check if values differ (with tolerance for floating point)
        const numCurrent = Number(currentVal)
        const numNew = Number(transformedVal)
        if (Math.abs(numCurrent - numNew) > 0.1) {
          diffs.push({
            field: fm.label,
            fieldKey: fm.tripKey as string,
            current: fm.formatVal(currentVal),
            tracker: fm.formatVal(statVal),
            selected: true, // default: replace with tracker value
          })
        }
      }
    }

    // Apply auto-fill fields immediately
    if (Object.keys(autoFields).length > 0) {
      fetch(`/api/trips/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoFields),
      }).then(res => {
        if (res.ok) {
          onRefresh()
          const fieldNames = Object.keys(autoFields).map(k => {
            const fm = fieldMappings.find(m => m.tripKey === k)
            return fm?.label || k
          })
          toast.success(`Заполнено: ${fieldNames.join(', ')}`)
        }
      }).catch(() => {})
    }

    // Show discrepancy dialog if there are differences
    if (diffs.length > 0) {
      setDiscrepancyDialog({
        open: true,
        diffs,
        autoFields,
      })
    }

    setStatsApplied(versionKey)
  }, [compareData?.tripStats, trip?.id])

  // Auto-load track data when focusTrack is set and dialog opens with a trip
  useEffect(() => {
    if (open && focusTrack && trip?.id && trip.startDate) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        reloadTrack()
        reloadSensors()
        // Scroll to track section after data loads
        setTimeout(() => {
          trackSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 800)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, focusTrack, trip?.id])

  // Filtered track data: when a specific trip segment is selected, show only that segment on the map
  const mapTrackData = useMemo(() => {
    if (!trackData) return null
    const trips = (trackData as any).trips
    if (selectedTripIndex != null && trips && trips[selectedTripIndex]) {
      return {
        track: (trackData as any).track,
        trips: [trips[selectedTripIndex]],
        parkings: [],
        stops: [],
        refuels: [],
        plums: [],
      }
    }
    return trackData
  }, [trackData, selectedTripIndex])

  // ─── Handle trip completion: fetch sensor data, detect refuels ──
  const handleInitComplete = async () => {
    if (!trip) return
    setCompleteDialog(prev => ({ ...prev, open: true, loading: true }))

    try {
      // Get current tracker data from sensors API
      const trackerRes = await fetch(`/api/trips/${trip.id}?action=sensors`)
      const trackerData = trackerRes.ok ? await trackerRes.json() : null

      // Get Axenta stats for the trip period (need tracker's axentaCloudId)
      let axentaStats: Record<string, unknown> | null = null
      try {
        // Use the trip's own sensor-compare API to get refuel info
        const compareRes = await fetch(`/api/trips/${trip.id}?action=sensor-compare`)
        if (compareRes.ok) {
          const compareJson = await compareRes.json()
          // The sensor-compare response includes Axenta stats with refuelVolume
          if (compareJson.tripStats) axentaStats = compareJson.tripStats
        }
      } catch { /* ignore */ }

      // Current sensor values
      const currentFuel = trackerData?.fuelLevel ?? (trackerData?.sensors as any[])?.find((s: any) => /топлив|бак|fuel/i.test(s.name || s.type))?.value
      const currentMileage = trackerData?.mileage ?? (trackerData?.sensors as any[])?.find((s: any) => /пробег|odometer/i.test(s.name || s.type))?.value

      // Detect refuels from Axenta stats
      const sensorRefuelVolume = axentaStats?.refuelVolume != null ? Number(axentaStats.refuelVolume) : null
      const refuelDetected = (sensorRefuelVolume != null && sensorRefuelVolume > 0) as boolean

      // Calculate fuel consumed considering refuels
      const fuelStart = trip.fuelStart ?? null
      let calculatedConsumed: number | null = null
      if (fuelStart != null && currentFuel != null) {
        calculatedConsumed = Math.round((fuelStart - currentFuel + (sensorRefuelVolume || 0)) * 100) / 100
        if (calculatedConsumed < 0) calculatedConsumed = 0
      }

      setCompleteDialog({
        open: true,
        loading: false,
        fuelEnd: currentFuel != null ? String(Math.round(currentFuel * 10) / 10) : '',
        mileageEnd: currentMileage != null ? String(Math.round(currentMileage)) : '',
        refuelVolume: sensorRefuelVolume != null ? String(Math.round(sensorRefuelVolume * 10) / 10) : '',
        refuelDetected,
        sensorRefuelVolume,
        fuelStart,
        fuelConsumed: calculatedConsumed != null ? String(calculatedConsumed) : '',
        notes: '',
      })
    } catch (err) {
      console.error('[Complete] Init failed:', err)
      // Still show dialog with empty fields
      setCompleteDialog({
        open: true, loading: false,
        fuelEnd: '', mileageEnd: '', refuelVolume: '',
        refuelDetected: false, sensorRefuelVolume: null,
        fuelStart: trip.fuelStart ?? null, fuelConsumed: '', notes: '',
      })
    }
  }

  // Actually complete the trip with confirmed data
  const handleConfirmComplete = async () => {
    if (!trip) return
    setCompleteDialog(prev => ({ ...prev, loading: true }))
    try {
      const payload: Record<string, unknown> = { action: 'complete' }
      // Override sensor data with user-confirmed values
      if (completeDialog.fuelEnd) payload.fuelEnd = parseFloat(completeDialog.fuelEnd)
      if (completeDialog.mileageEnd) payload.mileageEnd = parseInt(completeDialog.mileageEnd)
      if (completeDialog.refuelVolume) payload.refuelVolume = parseFloat(completeDialog.refuelVolume)
      if (completeDialog.fuelConsumed) payload.fuelConsumed = parseFloat(completeDialog.fuelConsumed)
      if (completeDialog.notes) payload.completeNotes = completeDialog.notes

      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка')
      }
      toast.success('Рейс завершён')
      setCompleteDialog(prev => ({ ...prev, open: false }))
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка завершения рейса')
    }
    setCompleteDialog(prev => ({ ...prev, loading: false }))
  }

  // Auto-load track when dialog opens or trip changes
  // Skip if trackData already loaded for this trip (use cached data in state)
  useEffect(() => {
    if (!open || !trip?.id || !trip.startDate) return
    // Already loaded for this trip — no need to re-fetch
    if (loadedTripId === trip.id && trackData) return
    let cancelled = false

    const autoLoad = async () => {
      setTrackLoading(true)
      setTrackError(null)
      try {
        // Use default dates — the API will return cached data if available
        const params = new URLSearchParams({ action: 'track' })
        const res = await fetch(`/api/trips/${trip.id}?${params}`)
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json()
            setTrackData(data)
            setLoadedTripId(trip.id)
          } else {
            const errData = await res.json().catch(() => null)
            setTrackError(errData?.error || 'Не удалось загрузить трек')
          }
        }
      } catch (e: any) {
        if (!cancelled) setTrackError(e.message || 'Ошибка загрузки трека')
      }
      if (!cancelled) setTrackLoading(false)
    }

    autoLoad()
    return () => { cancelled = true }
  }, [trip?.id, open])

  // Reload track (force refresh from Axenta API)
  const reloadTrack = async () => {
    if (!trip) return
    setTrackLoading(true)
    setTrackError(null)
    try {
      const from = trackDateFrom || (trip.startDate ? toLocalDatetime(trip.startDate) : '')
      const to = trackDateTo || (trip.endDate ? toLocalDatetime(trip.endDate) : toLocalDatetime(new Date()))
      if (!from) throw new Error('Укажите дату начала')
      const params = new URLSearchParams({ action: 'track', force: '1' })
      params.set('from', new Date(from).toISOString())
      params.set('to', new Date(to).toISOString())
      const res = await fetch(`/api/trips/${trip.id}?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Ошибка загрузки трека')
      }
      const data = await res.json()
      setTrackData(data)
      setLoadedTripId(trip.id)
    } catch (e: any) {
      setTrackError(e.message || 'Ошибка загрузки трека')
    }
    setTrackLoading(false)
  }

  // Reload sensor comparison data
  const reloadSensors = async () => {
    if (!trip) return
    setCompareLoading(true)
    setCompareError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}?action=sensor-compare`)
      if (res.ok) {
        const data = await res.json()
        setCompareData(data)
      } else {
        const errData = await res.json().catch(() => null)
        setCompareError(errData?.error || 'Не удалось загрузить данные')
      }
    } catch (e: any) {
      setCompareError(e.message || 'Ошибка загрузки')
    }
    setCompareLoading(false)
  }

  // Save all trip data (sensor snapshots, fuel, mileage, stats) to DB
  const saveTripData = async () => {
    if (!trip || !compareData) return
    setSavingTrip(true)
    try {
      const startSnap = compareData.startSnapshot as Record<string, unknown> | null
      const endSnap = compareData.endSnapshot as Record<string, unknown> | null
      const stats = compareData.tripStats as Record<string, unknown> | null
      const fields: Record<string, unknown> = {}

      // Start snapshot data
      if (startSnap) {
        if (startSnap.fuelLevel != null && t.fuelStart == null) fields.fuelStart = Number(startSnap.fuelLevel)
        if (startSnap.mileage != null && t.mileageStart == null) fields.mileageStart = Math.round(Number(startSnap.mileage))
        fields.trackerSnapshotStart = JSON.stringify(startSnap)
      }
      // End snapshot data
      if (endSnap) {
        if (endSnap.fuelLevel != null && t.fuelEnd == null) fields.fuelEnd = Number(endSnap.fuelLevel)
        if (endSnap.mileage != null && t.mileageEnd == null) fields.mileageEnd = Math.round(Number(endSnap.mileage))
        if (t.status === 'completed') fields.trackerSnapshot = JSON.stringify(endSnap)
      }
      // Stats
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
      // Derived calculations
      if (fields.fuelEnd != null && (fields.fuelStart != null || t.fuelStart != null)) {
        const fs = (fields.fuelStart as number) ?? t.fuelStart!
        fields.fuelConsumed = Math.round((fs - (fields.fuelEnd as number)) * 100) / 100
        if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
      }
      if (fields.mileageEnd != null && (fields.mileageStart != null || t.mileageStart != null)) {
        const ms = (fields.mileageStart as number) ?? t.mileageStart!
        fields.distance = (fields.mileageEnd as number) - ms
      }

      // Also save track data to cache so it doesn't need re-fetching
      if (trackData) {
        fields.trackDataJson = JSON.stringify(trackData)
        fields.trackDataLoadedAt = new Date().toISOString()
      }

      if (Object.keys(fields).length > 0) {
        const res = await fetch(`/api/trips/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) throw new Error()
      }

      setTripSaved(true)
      toast.success('Данные рейса сохранены')
      onRefresh()
    } catch {
      toast.error('Ошибка сохранения данных')
    }
    setSavingTrip(false)
  }

  if (!trip) return null
  const t = trip
  const crew = crews.find(c => c.id === t.crewId)
  const isCompleted = t.status === 'completed'

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

  // Apply start values — if fields already filled with different values, ask user
  const applyStartValues = () => {
    if (!compareData) return
    const startSnap = compareData.startSnapshot as Record<string, unknown> | null
    if (!startSnap) return
    const fields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Fuel start
    if (startSnap.fuelLevel != null) {
      const trackerVal = Number(startSnap.fuelLevel)
      if (t.fuelStart == null) {
        fields.fuelStart = trackerVal
      } else if (Math.abs(t.fuelStart - trackerVal) > 0.01) {
        diffs.push({ field: 'Топливо на старте', fieldKey: 'fuelStart', current: `${t.fuelStart} л`, tracker: `${trackerVal.toFixed(1)} л`, selected: true })
      }
    }
    // Mileage start
    if (startSnap.mileage != null) {
      const trackerVal = Math.round(Number(startSnap.mileage))
      if (t.mileageStart == null) {
        fields.mileageStart = trackerVal
      } else if (t.mileageStart !== trackerVal) {
        diffs.push({ field: 'Пробег на старте', fieldKey: 'mileageStart', current: `${t.mileageStart} км`, tracker: `${trackerVal} км`, selected: true })
      }
    }

    if (Object.keys(fields).length === 0 && diffs.length === 0) {
      toast.info('Данные совпадают или нет данных для заполнения')
      return
    }

    // If no conflicts, apply directly
    if (diffs.length === 0) {
      applySensorFields(fields)
      return
    }

    // Show conflict resolution
    setDiscrepancyDialog({
      open: true,
      diffs,
      autoFields: fields,
    })
  }

  // Apply end values — if fields already filled with different values, ask user
  const applyEndValues = () => {
    if (!compareData) return
    const endSnap = compareData.endSnapshot as Record<string, unknown> | null
    const stats = compareData.tripStats as Record<string, unknown> | null
    const fields: Record<string, unknown> = {}
    const diffs: Array<{ field: string; fieldKey: string; current: string; tracker: string; selected: boolean }> = []

    // Fuel end
    if (endSnap?.fuelLevel != null) {
      const trackerVal = Number(endSnap.fuelLevel)
      if (t.fuelEnd == null) {
        fields.fuelEnd = trackerVal
      } else if (Math.abs(t.fuelEnd - trackerVal) > 0.01) {
        diffs.push({ field: 'Топливо на финише', fieldKey: 'fuelEnd', current: `${t.fuelEnd} л`, tracker: `${trackerVal.toFixed(1)} л`, selected: true })
      }
    }
    // Mileage end
    if (endSnap?.mileage != null) {
      const trackerVal = Math.round(Number(endSnap.mileage))
      if (t.mileageEnd == null) {
        fields.mileageEnd = trackerVal
      } else if (t.mileageEnd !== trackerVal) {
        diffs.push({ field: 'Пробег на финише', fieldKey: 'mileageEnd', current: `${t.mileageEnd} км`, tracker: `${trackerVal} км`, selected: true })
      }
    }

    // Stats (only fill if empty)
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

    if (fields.fuelEnd != null && t.fuelStart != null && !fields.fuelConsumed) {
      fields.fuelConsumed = Math.round((t.fuelStart! - (fields.fuelEnd as number)) * 100) / 100
      if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
    }
    if (fields.mileageEnd != null && t.mileageStart != null && !fields.distance) {
      fields.distance = (fields.mileageEnd as number) - t.mileageStart!
    }

    if (Object.keys(fields).length === 0 && diffs.length === 0) {
      toast.info('Данные совпадают или нет данных для заполнения')
      return
    }

    // If no conflicts, apply directly
    if (diffs.length === 0) {
      applySensorFields(fields)
      return
    }

    // Show conflict resolution
    setDiscrepancyDialog({
      open: true,
      diffs,
      autoFields: fields,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
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
              {/* Trip summary dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {t.tripDuration != null && t.tripDuration > 0 && t.tripDuration < 8640000 && <Card className="border-0 shadow-none bg-violet-50 dark:bg-violet-950/20 py-2"><CardContent className="p-2 text-center"><Timer className="size-4 text-violet-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-violet-700 dark:text-violet-400">{fmtDur(t.tripDuration)}</p><p className="text-[9px] text-muted-foreground">Длительность</p></CardContent></Card>}
                {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 && <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20 py-2"><CardContent className="p-2 text-center"><Fuel className="size-4 text-amber-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-amber-700 dark:text-amber-400">{t.fuelConsumed.toFixed(1)} л</p><p className="text-[9px] text-muted-foreground">Расход топлива</p></CardContent></Card>}
                {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && <Card className="border-0 shadow-none bg-orange-50 dark:bg-orange-950/20 py-2"><CardContent className="p-2 text-center"><Droplets className="size-4 text-orange-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-orange-700 dark:text-orange-400">{t.avgFuelRate.toFixed(1)} л/100км</p><p className="text-[9px] text-muted-foreground">Ср. расход</p></CardContent></Card>}
                {t.refuelVolume != null && t.refuelVolume > 0 && <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20 py-2"><CardContent className="p-2 text-center"><ArrowUpFromLine className="size-4 text-emerald-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+{t.refuelVolume.toFixed(1)} л</p><p className="text-[9px] text-muted-foreground">Заправки</p></CardContent></Card>}
                {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && <Card className="border-0 shadow-none bg-sky-50 dark:bg-sky-950/20 py-2"><CardContent className="p-2 text-center"><Cog className="size-4 text-sky-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-sky-700 dark:text-sky-400">{fmtDur(t.engineHours)}</p><p className="text-[9px] text-muted-foreground">Моточасы</p></CardContent></Card>}
                {t.parkingsDuration != null && t.parkingsDuration > 0 && t.parkingsDuration < 8640000 && <Card className="border-0 shadow-none bg-rose-50 dark:bg-rose-950/20 py-2"><CardContent className="p-2 text-center"><Armchair className="size-4 text-rose-500 mx-auto mb-0.5" /><p className="text-xs font-bold text-rose-700 dark:text-rose-400">{fmtDur(t.parkingsDuration)}</p><p className="text-[9px] text-muted-foreground">Время стоянок</p></CardContent></Card>}
              </div>
              {/* Speed profile bar */}
              {t.avgSpeed != null && t.maxSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && t.maxSpeed > 0 && t.maxSpeed < 300 && (
                <div className="rounded-lg border p-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Профиль скорости</span>
                    <span>мин: {0} • ср: {t.avgSpeed.toFixed(1)} • макс: <span className={t.maxSpeed > 90 ? 'text-red-500 font-medium' : ''}>{t.maxSpeed}</span> км/ч</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${Math.min((t.avgSpeed / t.maxSpeed) * 100, 100)}%` }} />
                    <div className="h-full bg-amber-400 flex-1" />
                    <div className={`h-full w-1 rounded-r-full ${t.maxSpeed > 90 ? 'bg-red-500' : 'bg-sky-400'}`} />
                  </div>
                </div>
              )}
              {/* Fuel economy rating */}
              {t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000 && (
                <div className="rounded-lg border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Fuel className="size-3" />Экономичность</span>
                    <span className={`text-[10px] font-medium ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'text-emerald-600 dark:text-emerald-400' : rate < 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' })()}`}>
                      {((t.fuelConsumed! / t.distance!) * 100).toFixed(1)} л/100км — {(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? '✓ Отлично' : rate < 25 ? '• Норма' : '⚠ Высокий' })()}
                    </span>
                  </div>
                </div>
              )}
              <DetailSection title="Маршрут" icon={<Route className="size-3.5" />}>
                <DetailRow label="Маршрут" value={t.route} />
                {t.routeTemplate && (
                  <DetailRow label="Шаблон маршрута" value={t.routeTemplate.name} />
                )}
                <DetailRow label="Пункт отправления" value={t.startPoint} />
                <DetailRow label="Пункт назначения" value={t.endPoint} />
                <DetailRow label="Расстояние" value={displayDist != null ? `${displayDist.toFixed(1)} км` : undefined} />
                {trackData && (trackData as any).trips && (
                  <DetailRow label="По трекеру" value={
                    <span className="font-medium text-sky-600 dark:text-sky-400">
                      {(trackData as any).trips.reduce((s: number, trip: any) => s + (Number(trip.distance) || 0), 0).toFixed(1)} км
                      <span className="text-muted-foreground font-normal ml-1">({(trackData as any).trips.length} сегм.)</span>
                    </span> as any
                  } />
                )}
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
              {/* ── ПОДРОБНЫЕ ПОКАЗАНИЯ (collapsible) ── */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-xs font-semibold hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-muted/50">
                  <CircuitBoard className="size-3.5 text-muted-foreground" />
                  <span>Подробные показания</span>
                  <ChevronRight className="size-3 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {/* ── ТОПЛИВО И ПРОБЕГ ── */}
                    <DetailSection title="Топливо и пробег" icon={<Fuel className="size-3.5" />}>
                      <DetailRow label="Топливо на старте (л)" value={t.fuelStart?.toString()} />
                      <DetailRow label="Топливо на финише (л)" value={t.fuelEnd?.toString()} />
                      <DetailRow label="Пробег на старте (км)" value={t.mileageStart?.toLocaleString('ru-RU')} />
                      <DetailRow label="Пробег на финише (км)" value={t.mileageEnd?.toLocaleString('ru-RU')} />
                      {(t.mileageStart != null && t.mileageEnd != null) && (
                        <DetailRow label="Пройдено (км)" value={
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{(t.mileageEnd! - t.mileageStart!).toLocaleString('ru-RU')} км</span> as any
                        } />
                      )}
                    </DetailSection>

                    {/* ── АНАЛИТИКА ТРЕКЕРА ── */}
                    <DetailSection title="Статистика рейса" icon={<Gauge className="size-3.5" />} extra={
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 px-1.5" onClick={async () => {
                        try {
                          const res = await fetch(`/api/trips/${t.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'recalculate' }) })
                          if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Ошибка') }
                          const data = await res.json()
                          toast.success(data.message || 'Аналитика пересчитана')
                          onRefresh()
                        } catch (e: any) { toast.error(e.message || 'Ошибка пересчёта') }
                      }} title="Пересчитать аналитику из Axenta">
                        <RefreshCw className="size-3" />Пересчитать
                      </Button>
                    }>
                      {/* Quick stats cards */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {t.distance != null && (
                          <Card className="border-0 shadow-none bg-emerald-50 dark:bg-emerald-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Route className="size-4 text-emerald-500 mx-auto mb-0.5" />
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{t.distance.toFixed(1)} км</p>
                              <p className="text-[9px] text-muted-foreground">Расстояние</p>
                            </CardContent>
                          </Card>
                        )}
                        {t.fuelConsumed != null && (
                          <Card className="border-0 shadow-none bg-amber-50 dark:bg-amber-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Fuel className="size-4 text-amber-500 mx-auto mb-0.5" />
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{Math.abs(t.fuelConsumed) < 10000 ? t.fuelConsumed.toFixed(1) : '—'} л</p>
                              <p className="text-[9px] text-muted-foreground">Расход</p>
                            </CardContent>
                          </Card>
                        )}
                        {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && (
                          <Card className="border-0 shadow-none bg-blue-50 dark:bg-blue-950/20 py-2">
                            <CardContent className="p-2 text-center">
                              <Gauge className="size-4 text-blue-500 mx-auto mb-0.5" />
                              <p className={`text-xs font-bold ${t.avgFuelRate < 15 ? 'text-emerald-700 dark:text-emerald-400' : t.avgFuelRate < 30 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>{t.avgFuelRate.toFixed(1)}</p>
                              <p className="text-[9px] text-muted-foreground">л/100км</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      {/* Detail rows */}
                      {t.distance != null && <DetailRow label="Расстояние" value={<span className="font-semibold text-emerald-600 dark:text-emerald-400">{t.distance.toFixed(1)} км</span> as any} />}
                      {t.tripDuration != null && t.tripDuration > 0 && t.tripDuration < 8640000 && <DetailRow label="Время в пути" value={fmtDur(t.tripDuration)} />}
                      {t.parkingsDuration != null && t.parkingsDuration > 0 && t.parkingsDuration < 8640000 && <DetailRow label="Время стоянок" value={fmtDur(t.parkingsDuration)} />}
                      {t.avgSpeed != null && t.avgSpeed > 0 && t.avgSpeed < 200 && <DetailRow label="Средняя скорость" value={`${t.avgSpeed.toFixed(1)} км/ч`} />}
                      {t.maxSpeed != null && t.maxSpeed > 0 && t.maxSpeed < 300 && <DetailRow label="Макс. скорость" value={<span className={t.maxSpeed > 90 ? 'text-red-500 font-medium' : ''}>{t.maxSpeed} км/ч</span> as any} />}
                      {t.engineHours != null && t.engineHours > 0 && t.engineHours < 50000 && <DetailRow label="Моточасы" value={fmtDur(t.engineHours)} />}
                      {t.idleTime != null && t.idleTime > 0 && t.idleTime < 8640000 && <DetailRow label="Холостой ход" value={fmtDur(t.idleTime)} />}
                      {t.fuelConsumed != null && Math.abs(t.fuelConsumed) < 10000 && <DetailRow label="Расход топлива" value={<span className="font-semibold text-amber-600 dark:text-amber-400">{t.fuelConsumed.toFixed(1)} л</span> as any} />}
                      {t.avgFuelRate != null && t.avgFuelRate > 0 && t.avgFuelRate < 200 && <DetailRow label="Средний расход" value={<span className={t.avgFuelRate < 15 ? 'text-emerald-600 dark:text-emerald-400' : t.avgFuelRate < 30 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>{t.avgFuelRate.toFixed(1)} л/100км</span> as any} />}
                      {t.refuelVolume != null && t.refuelVolume > 0 && <DetailRow label="Заправки" value={<span className="text-emerald-600 dark:text-emerald-400">+{t.refuelVolume.toFixed(1)} л</span> as any} />}
                      {t.plumVolume != null && t.plumVolume > 0 && <DetailRow label="Сливы" value={<span className="font-semibold text-red-600 dark:text-red-400">-{t.plumVolume.toFixed(1)} л</span> as any} />}
                      {/* Fuel efficiency indicator */}
                      {t.fuelConsumed != null && t.distance != null && t.distance > 0 && Math.abs(t.fuelConsumed) < 10000 && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Эффективность расхода</span>
                            <span className={`font-medium ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'text-emerald-600 dark:text-emerald-400' : rate < 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' })()}`}>
                              {(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? '✓ Отлично' : rate < 25 ? '• Норма' : '⚠ Высокий' })()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(() => { const rate = (t.fuelConsumed! / t.distance!) * 100; return rate < 15 ? 'bg-emerald-500' : rate < 25 ? 'bg-amber-500' : 'bg-red-500' })()}`} style={{ width: `${Math.min((t.fuelConsumed! / t.distance!) * 100 / 40 * 100, 100)}%` }} />
                          </div>
                        </div>
                      )}
                      {/* Warning for invalid data */}
                      {(t.engineHours != null && (t.engineHours < 0 || t.engineHours > 50000)) && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-[10px] text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3 shrink-0" />Моточасы содержат некорректные данные ({t.engineHours.toFixed(1)} ч). Нажмите «Пересчитать».
                        </div>
                      )}
                      {(t.fuelConsumed != null && Math.abs(t.fuelConsumed) >= 10000) && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-[10px] text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3 shrink-0" />Расход топлива содержит некорректные данные ({t.fuelConsumed.toFixed(0)} л). Нажмите «Пересчитать».
                        </div>
                      )}
                    </DetailSection>

                    {/* ── ФИНАНСЫ ── */}
                    {(t.cost != null || t.revenue != null) && (
                      <DetailSection title="Финансы" icon={<DollarSign className="size-3.5" />}>
                        {t.cost != null && <DetailRow label="Расходы" value={<span className="text-red-600 dark:text-red-400">{formatPrice(t.cost)}</span> as any} />}
                        {t.revenue != null && <DetailRow label="Доходы" value={<span className="text-emerald-600 dark:text-emerald-400">{formatPrice(t.revenue)}</span> as any} />}
                        {t.cost != null && t.revenue != null && <DetailRow label="Прибыль" value={<span className={`font-bold ${t.revenue - t.cost >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatPrice(t.revenue - t.cost)}</span> as any} />}
                        {t.fuelConsumed != null && t.distance != null && t.distance > 0 && t.cost != null && <DetailRow label="Стоимость за км" value={`${(t.cost / t.distance).toFixed(2)} ₽/км`} />}
                      </DetailSection>
                    )}

                    {/* ── СРАВНЕНИЕ ДАТЧИКОВ СТАРТ/ФИНИШ ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5"><CircuitBoard className="size-3.5" />Датчики (старт / финиш)</h4>
                      </div>

                      {compareError && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="size-3.5 shrink-0" />{compareError}
                        </div>
                      )}

                      {applySuccess && (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5 shrink-0" />{applySuccess}
                        </div>
                      )}

                      {compareData && !compareLoading && (
                        <div className="space-y-2">
                          {/* Apply buttons */}
                          <div className="flex flex-wrap gap-1.5">
                            {(t.status === 'planned' || t.status === 'in_progress') && compareData?.startSnapshot && (
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyStartValues}>
                                <ArrowDownToLine className="size-3" />Заполнить начало
                              </Button>
                            )}
                            {(t.status === 'in_progress' || t.status === 'completed') && compareData?.endSnapshot && (
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={applyEndValues}>
                                <ArrowUpFromLine className="size-3" />Заполнить финиш
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ── ROUTE POINTS TIMELINE ── */}
              {t.routePoints && t.routePoints.length > 0 && (
                <div>
                  <div
                    className="flex items-center gap-1.5 mb-1.5 cursor-pointer select-none hover:bg-muted/40 -mx-1 px-1 py-0.5 rounded transition-colors"
                    onClick={() => setRoutePointsCollapsed(!routePointsCollapsed)}
                  >
                    <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${routePointsCollapsed ? '-rotate-90' : ''}`} />
                    <span className="text-muted-foreground"><MapPinned className="size-3.5" /></span>
                    <h3 className="text-xs font-semibold">Точки маршрута</h3>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{t.routePoints.length}</Badge>
                    {(() => {
                      const totalDist = t.routePoints.reduce((s, p) => s + (p.distanceFromPrev || 0), 0)
                      return totalDist > 0 ? (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 ml-auto font-medium">
                          Итого: {totalDist.toFixed(1)} км
                        </span>
                      ) : null
                    })()}
                  </div>
                  <div className={`overflow-hidden transition-all duration-200 ${routePointsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                    <div className="pl-2 space-y-0">
                      {t.routePoints.map((rp, idx) => (
                        <div key={rp.id} className="flex gap-2">
                          {/* Timeline circle + line */}
                          <div className="flex flex-col items-center w-6 shrink-0 pt-1">
                            <div className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                              idx === t.routePoints!.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {idx + 1}
                            </div>
                            {idx < t.routePoints!.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border/60 min-h-[16px]" />
                            )}
                          </div>
                          {/* Point content */}
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium">{rp.name}</span>
                              {rp.distanceFromPrev != null && rp.distanceFromPrev > 0 && (
                                <span className="text-[9px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 px-1 py-0 rounded">
                                  +{rp.distanceFromPrev.toFixed(1)} км
                                </span>
                              )}
                            </div>
                            {rp.address && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="size-2.5 shrink-0" />{rp.address}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0 text-[9px] text-muted-foreground">
                              {rp.plannedArrival && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="size-2.5" />Прибытие: {formatDateTime(rp.plannedArrival)}
                                </span>
                              )}
                              {rp.plannedDeparture && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="size-2.5" />Отправление: {formatDateTime(rp.plannedDeparture)}
                                </span>
                              )}
                              {rp.actualArrival && (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="size-2.5" />Факт: {formatDateTime(rp.actualArrival)}
                                </span>
                              )}
                            </div>
                            {rp.notes && (
                              <div className="text-[9px] text-muted-foreground italic mt-0.5">{rp.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                // Collect all points with coordinates from routePoints or routeTemplate
                const allPoints = [
                  ...(t.routePoints || []).filter(p => p.latitude && p.longitude),
                  ...(!t.routePoints?.length && t.routeTemplate?.points ? t.routeTemplate.points.filter(p => p.latitude && p.longitude) : [])
                ]
                return allPoints.length >= 2 ? (
                <div className="mt-1 space-y-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 w-full" onClick={async () => {
                    if (showRouteMap) { setShowRouteMap(false); setRouteMapTrackData(null); return }
                    const pts = allPoints
                    if (pts.length < 2) return
                    setShowRouteMap(true)
                    setRouteMapLoading(true)
                    try {
                      const coords = pts.map(p => `${p.longitude},${p.latitude}`).join(';')
                      // Use backend proxy to avoid CORS issues
                      const res = await fetch(`/api/osrm-route?coords=${encodeURIComponent(coords)}`)
                      const data = await res.json()
                      if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0]
                        const routeCoords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
                        const fakeTrip = {
                          distance: route.distance / 1000,
                          startDate: t.startDate || new Date().toISOString(),
                          endDate: t.endDate || new Date().toISOString(),
                          points: routeCoords.map((c: any, i: number) => ({
                            ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString()
                          }))
                        }
                        setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                      } else {
                        const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
                        const fakeTrip = {
                          distance: 0, startDate: t.startDate || new Date().toISOString(), endDate: t.endDate || new Date().toISOString(),
                          points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() }))
                        }
                        setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                      }
                    } catch (err) {
                      console.error('[Route Map] OSRM fetch failed:', err)
                      const routeCoords = pts.map(p => ({ lat: p.latitude!, lng: p.longitude! }))
                      const fakeTrip = {
                        distance: 0, startDate: t.startDate || new Date().toISOString(), endDate: t.endDate || new Date().toISOString(),
                        points: routeCoords.map((c: any, i: number) => ({ ...c, speed: 60, time: new Date(Date.now() + i * 60000).toISOString() }))
                      }
                      setRouteMapTrackData({ trips: [fakeTrip], parkings: [], stops: [] })
                    }
                    setRouteMapLoading(false)
                  }}>
                    <Map className="size-3" />{showRouteMap ? 'Скрыть карту маршрута' : 'Показать маршрут на карте'}
                  </Button>
                  {showRouteMap && (
                    <div className="h-64 rounded-lg overflow-hidden border">
                      {routeMapLoading ? (
                        <div className="h-full flex items-center justify-center bg-muted/30">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-xs text-muted-foreground">Расчёт маршрута...</span>
                        </div>
                      ) : routeMapTrackData ? (
                        <TrackerMap trackers={[]} trackData={routeMapTrackData} />
                      ) : null}
                    </div>
                  )}
                </div>
                ) : null
              })()}

              {/* ── СТАТИСТИКА ЗА ПЕРИОД РЕЙСА (always visible) ── */}
              {compareData?.tripStats ? (
                <div className="rounded-lg border p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="size-3" />Статистика за период рейса
                    </h5>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading}>
                      <RefreshCw className={`size-3 ${compareLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(() => {
                      const st = compareData.tripStats as Record<string, unknown>
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
              ) : (
                <div className="flex items-center justify-center py-3 bg-muted/30 rounded-lg">
                  {compareLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Загрузка статистики...</span>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading}>
                      <BarChart3 className="size-3" />Загрузить статистику за период
                    </Button>
                  )}
                </div>
              )}

              {/* ── ТРЕК НА КАРТЕ ── */}
              <div ref={trackSectionRef} />
              {t.startDate && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5"><Map className="size-3.5" />Трек на карте</h4>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadTrack} disabled={trackLoading} title="Обновить трек из API">
                        <RefreshCw className={`size-3 ${trackLoading ? 'animate-spin' : ''}`} />
                        {trackData ? (trackLoading ? 'Обновление...' : 'Обновить') : 'Загрузить'}
                      </Button>
                      {trackData && !trackLoading && (
                        <span className="text-[9px] text-muted-foreground">
                          {(trackData as any)?._cached ? `Кэш ${(() => { try { return (trackData as any)._cachedAt ? new Date((trackData as any)._cachedAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : '' } catch { return '' } })()}` : 'Загружено'}
                        </span>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={reloadSensors} disabled={compareLoading} title="Загрузить показания датчиков">
                        <CircuitBoard className="size-3" />
                        {compareLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                        Датчики
                      </Button>
                    </div>
                  </div>
                  {/* Date range for track */}
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
                      <Label className="text-[10px] text-muted-foreground">До {!t.endDate && <span className="text-amber-500">(сейчас)</span>}</Label>
                      <Input
                        type="datetime-local"
                        className="h-7 text-[11px]"
                        value={trackDateTo || (t.endDate ? toLocalDatetime(t.endDate) : toLocalDatetime(new Date()))}
                        onChange={e => setTrackDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  {trackLoading && (
                    <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Загрузка трека...</span>
                    </div>
                  )}
                  {trackError && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="size-3.5 shrink-0" />{trackError}
                    </div>
                  )}
                  {trackData && !trackLoading && (
                    <>
                      <div className="h-64 rounded-lg overflow-hidden border">
                        <TrackerMap trackers={[]} trackData={mapTrackData as any} focusPoint={focusedPoint} />
                      </div>
                      {/* Track summary badges */}
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        {(trackData as any).trips && <span className="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">🚗 {(trackData as any).trips.length} поездок</span>}
                        {(trackData as any).parkings && <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">🅿️ {(trackData as any).parkings.length} стоянок</span>}
                        {(trackData as any).stops && <span className="inline-flex items-center gap-0.5 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">⏸ {(trackData as any).stops.length} остановок</span>}
                        {(trackData as any).refuels && (trackData as any).refuels.length > 0 && <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">⛽ {(trackData as any).refuels.length} заправок</span>}
                        {(trackData as any).plums && (trackData as any).plums.length > 0 && <span className="inline-flex items-center gap-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">🔻 {(trackData as any).plums.length} сливов</span>}
                        <span className="inline-flex items-center gap-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">
                          📏 {((trackData as any).trips?.reduce((s: number, trip: any) => s + (Number(trip.distance) || 0), 0) ?? 0).toFixed(1)} км
                        </span>
                      </div>
                      {/* Speed legend */}
                      <div className="flex flex-wrap items-center gap-2 text-[9px]">
                        <span className="text-muted-foreground font-medium">Скорость:</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#9ca3af'}} />0</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#22c55e'}} />≤20</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#84cc16'}} />≤40</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#eab308'}} />≤60</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#f97316'}} />≤80</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded" style={{background:'#ef4444'}} />&gt;80</span>
                        <span className="text-muted-foreground">км/ч</span>
                      </div>
                      {/* Collapsible trip segments */}
                      {(trackData as any).trips && (trackData as any).trips.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Сегменты поездок ({(trackData as any).trips.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).trips.map((trip: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${selectedTripIndex === i ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setSelectedTripIndex(selectedTripIndex === i ? null : i)}>
                                  <span className="font-semibold text-emerald-600">🟢 A</span>
                                  <span>{formatTime(trip.startDate)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-semibold text-red-500">🔴 B</span>
                                  <span>{formatTime(trip.endDate)}</span>
                                  <span className="text-muted-foreground ml-auto">{trip.distance != null ? trip.distance.toFixed(1) : '—'} км • {trip.points?.length || 0} т.</span>
                                  {selectedTripIndex === i && <X className="size-3 text-muted-foreground shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible parkings */}
                      {(trackData as any).parkings && (trackData as any).parkings.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Стоянки ({(trackData as any).parkings.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).parkings.map((p: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${focusedPoint?.type === 'parking' && focusedPoint?.lat === p.lat && focusedPoint?.lng === p.lng ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-400' : 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20'}`} onClick={() => { if (p.lat != null && p.lng != null) setFocusedPoint(focusedPoint?.type === 'parking' && focusedPoint?.lat === p.lat && focusedPoint?.lng === p.lng ? null : { lat: p.lat, lng: p.lng, type: 'parking', label: `Стоянка ${formatTime(p.startDate)}` }) }}>
                                  <span>🅿️</span>
                                  <span>{formatTime(p.startDate)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span>{formatTime(p.endDate)}</span>
                                  <span className="text-muted-foreground ml-auto">{p.duration ? `${Math.floor(p.duration / 60)} мин` : '—'}</span>
                                  {p.lat != null && p.lng != null && <MapPin className="size-3 text-blue-400 shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible stops */}
                      {(trackData as any).stops && (trackData as any).stops.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Остановки ({(trackData as any).stops.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).stops.map((s: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1.5 cursor-pointer transition-colors ${focusedPoint?.type === 'stop' && focusedPoint?.lat === s.lat && focusedPoint?.lng === s.lng ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-400' : 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20'}`} onClick={() => { if (s.lat != null && s.lng != null) setFocusedPoint(focusedPoint?.type === 'stop' && focusedPoint?.lat === s.lat && focusedPoint?.lng === s.lng ? null : { lat: s.lat, lng: s.lng, type: 'stop', label: `Остановка ${formatTime(s.startDate)}` }) }}>
                                  <span>⏸</span>
                                  <span>{formatTime(s.startDate)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span>{formatTime(s.endDate)}</span>
                                  <span className="text-muted-foreground ml-auto">{s.duration ? `${Math.floor(s.duration / 60)} мин` : '—'}</span>
                                  {s.lat != null && s.lng != null && <MapPin className="size-3 text-orange-400 shrink-0" />}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible refuels */}
                      {(trackData as any).refuels && (trackData as any).refuels.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Заправки ({(trackData as any).refuels.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).refuels.map((r: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] rounded px-2 py-1.5 bg-emerald-50/50 dark:bg-emerald-900/10">
                                  <span>⛽</span>
                                  <span>{formatTime(r.startDate)}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 ml-auto font-medium">+{r.volume?.toFixed(1) || '?'} л</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {/* Collapsible plums */}
                      {(trackData as any).plums && (trackData as any).plums.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                            <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
                            Сливы ({(trackData as any).plums.length})
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 mt-1">
                              {(trackData as any).plums.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] rounded px-2 py-1.5 bg-red-50/50 dark:bg-red-900/10">
                                  <span>🔻</span>
                                  <span>{formatTime(p.startDate)}</span>
                                  <span className="text-red-600 dark:text-red-400 ml-auto font-medium">-{p.volume?.toFixed(1) || '?'} л</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
                  )}
                </div>
              )}

              {t.notes && <DetailSection title="Заметки" icon={<ClipboardList className="size-3.5" />}><p className="text-xs whitespace-pre-wrap">{t.notes}</p></DetailSection>}
            </div>
          )}

          {/* Footer after content */}
          <div className="sticky bottom-0 bg-card border-t pt-3 pb-2 -mx-4 sm:-mx-5 px-4 sm:px-5 mt-4 z-10">
            <div className="flex flex-wrap gap-1.5 sm:gap-0 justify-end">
              {t.status === 'planned' && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onStart(t)}><Navigation className="size-3.5" />Начать</Button>
              )}
              {t.status === 'in_progress' && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleInitComplete}><CheckCircle2 className="size-3.5" />Завершить</Button>
              )}
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onEdit(t)}><Edit className="size-3.5" />Редактировать</Button>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={onRefresh}><Activity className="size-3.5" />Обновить</Button>
              {compareData && (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={saveTripData} disabled={savingTrip || tripSaved}>
                  {savingTrip ? <Loader2 className="size-3.5 animate-spin" /> : tripSaved ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Save className="size-3.5" />}
                  {tripSaved ? 'Сохранено' : 'Сохранить'}
                </Button>
              )}
              {(t.status === 'in_progress' || t.status === 'completed') && (
                <Button variant="default" size="sm" className="h-8 gap-1 text-xs" onClick={() => window.open(`/api/trips/${t.id}/print`, '_blank')}>
                  <Printer className="size-3.5" />Распечатать
                </Button>
              )}
              <Button variant="destructive" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDelete(t)}><Trash2 className="size-3.5" />Удалить</Button>
            </div>
          </div>
        </div>
      </DialogContent>
      {/* Discrepancy resolution dialog */}
      <AlertDialog open={discrepancyDialog.open} onOpenChange={(v) => setDiscrepancyDialog(d => ({ ...d, open: v }))}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" />Расхождения с данными трекера</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-sm">Обнаружены расхождения между текущими значениями и данными трекера. Отметьте поля, которые нужно заменить:</p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-1.5 px-2 font-medium w-6"></th>
                        <th className="text-left py-1.5 px-2 font-medium">Показатель</th>
                        <th className="text-right py-1.5 px-2 font-medium">Сейчас</th>
                        <th className="text-right py-1.5 px-2 font-medium">Трекер</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancyDialog.diffs.map((d, i) => (
                        <tr key={i} className={`border-b last:border-0 transition-colors ${d.selected ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                          <td className="py-1.5 px-2">
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={() => setDiscrepancyDialog(prev => ({
                                ...prev,
                                diffs: prev.diffs.map((dd, ii) => ii === i ? { ...dd, selected: !dd.selected } : dd)
                              }))}
                              className="rounded border-muted-foreground/30"
                            />
                          </td>
                          <td className="py-1.5 px-2 font-medium">{d.field}</td>
                          <td className={`py-1.5 px-2 text-right ${d.selected ? 'text-muted-foreground line-through' : ''}`}>{d.current}</td>
                          <td className={`py-1.5 px-2 text-right font-semibold ${d.selected ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{d.tracker}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setDiscrepancyDialog(prev => ({ ...prev, diffs: prev.diffs.map(d => ({ ...d, selected: true })) }))}>Выбрать все</Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => setDiscrepancyDialog(prev => ({ ...prev, diffs: prev.diffs.map(d => ({ ...d, selected: false })) }))}>Снять все</Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDiscrepancyDialog(d => ({ ...d, open: false }))}>Оставить текущие</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              // Only apply selected fields
              const selectedDiffs = discrepancyDialog.diffs.filter(d => d.selected)
              if (selectedDiffs.length === 0 || !trip) { setDiscrepancyDialog(d => ({ ...d, open: false })); return }
              const stats = (compareData?.tripStats as Record<string, unknown>) || {}
              const startSnap = compareData?.startSnapshot as Record<string, unknown> | null
              const endSnap = compareData?.endSnapshot as Record<string, unknown> | null
              const fields: Record<string, unknown> = {}
              const keyToStatKey: Record<string, string> = {
                tripDuration: 'tripsDuration', fuelConsumed: 'fuelConsumption', avgFuelRate: 'avgFuelConsumption',
                refuelVolume: 'refuelVolume', engineHours: 'engineHours', parkingsDuration: 'parkingsDuration',
                distance: 'mileage', avgSpeed: 'avgSpeed', maxSpeed: 'maxSpeed', idleTime: 'idleTime', plumVolume: 'plumVolume',
              }
              for (const diff of selectedDiffs) {
                const key = diff.fieldKey
                // Check stat-based keys first
                const statKey = keyToStatKey[key]
                if (statKey && stats[statKey] != null) {
                  const val = Number(stats[statKey])
                  if (key === 'fuelConsumed' || key === 'avgFuelRate' || key === 'refuelVolume' || key === 'plumVolume') {
                    fields[key] = Math.round(val * 100) / 100
                  } else if (key === 'maxSpeed') {
                    fields[key] = Math.round(val)
                  } else {
                    fields[key] = val
                  }
                }
                // Handle snapshot-based keys
                else if (key === 'fuelStart' && startSnap?.fuelLevel != null) {
                  fields.fuelStart = Number(startSnap.fuelLevel)
                } else if (key === 'mileageStart' && startSnap?.mileage != null) {
                  fields.mileageStart = Math.round(Number(startSnap.mileage))
                } else if (key === 'fuelEnd' && endSnap?.fuelLevel != null) {
                  fields.fuelEnd = Number(endSnap.fuelLevel)
                } else if (key === 'mileageEnd' && endSnap?.mileage != null) {
                  fields.mileageEnd = Math.round(Number(endSnap.mileage))
                }
              }
              // Recalculate derived values if fuel or mileage changed
              if (fields.fuelEnd != null && (fields.fuelStart != null || trip.fuelStart != null)) {
                const fs = (fields.fuelStart as number) ?? trip.fuelStart!
                fields.fuelConsumed = Math.round((fs - (fields.fuelEnd as number)) * 100) / 100
                if (fields.fuelConsumed < 0) fields.fuelConsumed = 0
              }
              if (fields.mileageEnd != null && (fields.mileageStart != null || trip.mileageStart != null)) {
                const ms = (fields.mileageStart as number) ?? trip.mileageStart!
                fields.distance = (fields.mileageEnd as number) - ms
              }
              if (Object.keys(fields).length > 0) {
                fetch(`/api/trips/${trip.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fields),
                }).then(res => {
                  if (res.ok) {
                    toast.success(`Заменено: ${selectedDiffs.map(d => d.field).join(', ')}`)
                    onRefresh()
                  } else {
                    toast.error('Ошибка сохранения')
                  }
                }).catch(() => toast.error('Ошибка сохранения'))
              }
              setDiscrepancyDialog(d => ({ ...d, open: false }))
            }} className="bg-amber-600 text-white hover:bg-amber-700">
              Заменить выбранные ({discrepancyDialog.diffs.filter(d => d.selected).length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Complete Trip Dialog with Refuel Detection ─── */}
      <Dialog open={completeDialog.open} onOpenChange={(v) => !completeDialog.loading && setCompleteDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {/* Gradient header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span>Завершение рейса</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Проверьте и подтвердите данные перед завершением
                </p>
              </div>
            </DialogTitle>
            {completeDialog.refuelDetected && (
              <div className="mt-2 p-2 rounded-md bg-amber-100/80 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 flex items-center gap-2">
                <Fuel className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Обнаружены заправки!</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">По данным датчиков во время рейса была заправка</p>
                </div>
              </div>
            )}
          </DialogHeader>

          {completeDialog.loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
                <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Получение данных с датчиков...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Запрос показаний трекера</p>
            </div>
          ) : (
            <div className="space-y-4 px-6 py-4">
              {/* Trip summary bar */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-muted-foreground">Маршрут</p>
                  <p className="text-xs font-semibold truncate">{t.route || '—'}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Топливо начало</p>
                  <p className="text-xs font-semibold">{completeDialog.fuelStart != null ? `${completeDialog.fuelStart} л` : '—'}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Старт</p>
                  <p className="text-xs font-semibold">{t.mileageStart != null ? `${t.mileageStart.toLocaleString('ru-RU')} км` : '—'}</p>
                </div>
              </div>

              {/* Fuel data section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Fuel className="size-3.5" /> Показания топлива
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-sky-500" />Топливо начало (л)
                    </Label>
                    <div className="text-lg font-bold mt-1">{completeDialog.fuelStart != null ? completeDialog.fuelStart : '—'}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-emerald-500" />Топливо конец (л)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={completeDialog.fuelEnd}
                      onChange={e => {
                        const val = e.target.value
                        setCompleteDialog(prev => {
                          const fuelEnd = parseFloat(val) || 0
                          const refuel = parseFloat(prev.refuelVolume) || 0
                          const fuelStart = prev.fuelStart
                          let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                          if (consumed != null && consumed < 0) consumed = 0
                          return { ...prev, fuelEnd: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                        })
                      }}
                      placeholder="Показание датчика"
                      className="h-9 text-sm font-semibold mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Refuel section */}
              {completeDialog.refuelDetected ? (
                <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <div className="size-6 rounded-md bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center">
                      <FuelIcon className="size-3.5" />
                    </div>
                    Заправка обнаружена!
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 ml-8">
                    Подтвердите объём заправки или введите вручную.
                  </p>
                  <div className="ml-8">
                    <Label className="text-[10px] text-amber-700 dark:text-amber-400">Объём заправки (л)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={completeDialog.refuelVolume}
                        onChange={e => {
                          const val = e.target.value
                          setCompleteDialog(prev => {
                            const refuel = parseFloat(val) || 0
                            const fuelStart = prev.fuelStart
                            const fuelEnd = parseFloat(prev.fuelEnd) || 0
                            let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                            if (consumed != null && consumed < 0) consumed = 0
                            return { ...prev, refuelVolume: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                          })
                        }}
                        placeholder="0"
                        className="h-8 text-xs w-28"
                      />
                      {completeDialog.sensorRefuelVolume != null && (
                        <Badge variant="outline" className="text-[10px] h-6 bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                          Датчик: {completeDialog.sensorRefuelVolume.toFixed(1)} л
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <FuelIcon className="size-3" /> Была ли заправка во время рейса?
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 text-[11px] flex-1 gap-1.5 ${completeDialog.refuelVolume ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' : ''}`}
                      onClick={() => setCompleteDialog(prev => ({ ...prev, refuelVolume: prev.refuelVolume || '0' }))}
                    >
                      <Fuel className="size-3" />Да, была
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 text-[11px] flex-1 gap-1.5 ${!completeDialog.refuelVolume && completeDialog.refuelVolume !== '' ? '' : 'bg-muted/50'}`}
                      onClick={() => setCompleteDialog(prev => ({ ...prev, refuelVolume: '', fuelConsumed: prev.fuelStart != null && prev.fuelEnd ? String(Math.round((prev.fuelStart - (parseFloat(prev.fuelEnd) || 0)) * 100) / 100) : '' }))}
                    >
                      <X className="size-3" />Нет заправок
                    </Button>
                  </div>
                  {completeDialog.refuelVolume !== '' && (
                    <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                      <Label className="text-[10px] text-muted-foreground">Объём заправки (л)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={completeDialog.refuelVolume}
                        onChange={e => {
                          const val = e.target.value
                          setCompleteDialog(prev => {
                            const refuel = parseFloat(val) || 0
                            const fuelStart = prev.fuelStart
                            const fuelEnd = parseFloat(prev.fuelEnd) || 0
                            let consumed = fuelStart != null ? Math.round((fuelStart - fuelEnd + refuel) * 100) / 100 : null
                            if (consumed != null && consumed < 0) consumed = 0
                            return { ...prev, refuelVolume: val, fuelConsumed: consumed != null ? String(consumed) : '' }
                          })
                        }}
                        placeholder="0"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Calculated section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/30 border">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Flame className="size-2.5" />Расход топлива (л)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={completeDialog.fuelConsumed}
                    onChange={e => setCompleteDialog(prev => ({ ...prev, fuelConsumed: e.target.value }))}
                    className="h-8 text-xs font-bold mt-1"
                    placeholder="Авто-расчёт"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Gauge className="size-2.5" />Пробег конец (км)
                  </Label>
                  <Input
                    type="number"
                    value={completeDialog.mileageEnd}
                    onChange={e => setCompleteDialog(prev => ({ ...prev, mileageEnd: e.target.value }))}
                    className="h-8 text-xs font-bold mt-1"
                    placeholder="Показание одометра"
                  />
                </div>
              </div>

              {/* Trip distance summary if available */}
              {(t.distance || (t.mileageStart != null && completeDialog.mileageEnd)) && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50">
                  <Navigation className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-[11px] text-sky-700 dark:text-sky-400">
                    {t.distance ? `Расстояние по маршруту: ${t.distance.toFixed(1)} км` : ''}
                    {t.distance && completeDialog.mileageEnd && t.mileageStart ? ' • ' : ''}
                    {completeDialog.mileageEnd && t.mileageStart ? `По одометру: ${(parseFloat(completeDialog.mileageEnd) - t.mileageStart).toLocaleString('ru-RU')} км` : ''}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <StickyNote className="size-2.5" />Примечание к завершению
                </Label>
                <Textarea
                  value={completeDialog.notes}
                  onChange={e => setCompleteDialog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Комментарий о заправке, расходе, особенностях рейса..."
                  className="text-xs min-h-[60px] mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 px-6 py-3 border-t bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setCompleteDialog(prev => ({ ...prev, open: false }))}
              disabled={completeDialog.loading}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
              onClick={handleConfirmComplete}
              disabled={completeDialog.loading}
            >
              {completeDialog.loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Завершить рейс
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRIP FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function TripFormDialog({ open, onOpenChange, editData, equipmentId, equipmentList, crews, routeTemplates, saving, setSaving, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editData: Trip | null; equipmentId: string; equipmentList: Equipment[];
  crews: Crew[]; routeTemplates: RouteTemplate[]; saving: boolean; setSaving: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [fetchingStart, setFetchingStart] = useState(false)
  const [fetchingEnd, setFetchingEnd] = useState(false)
  const [routePoints, setRoutePoints] = useState<Array<{
    id?: string; name: string; address: string; latitude: string; longitude: string;
    plannedArrival: string; plannedDeparture: string; distanceFromPrev: string; notes: string;
  }>>([])
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null)
  const [optimizingRoute, setOptimizingRoute] = useState(false)

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
        routeTemplateId: editData.routeTemplateId || '',
      })
      setRoutePoints(
        (editData.routePoints || []).map(p => ({
          id: p.id, name: p.name || '', address: p.address || '',
          latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
          plannedArrival: p.plannedArrival ? toLocalDatetime(p.plannedArrival) : '',
          plannedDeparture: p.plannedDeparture ? toLocalDatetime(p.plannedDeparture) : '',
          distanceFromPrev: p.distanceFromPrev?.toString() || '', notes: p.notes || '',
        }))
      )
    } else {
      setForm({ equipmentId: equipmentId || '', startDate: toLocalDatetime(new Date()), status: 'planned' })
      setRoutePoints([])
    }
  }, [editData, equipmentId, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  // Haversine distance calculation
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Recalculate distances between consecutive points
  const recalcDistances = (points: typeof routePoints) => {
    return points.map((p, i) => {
      if (i === 0) return { ...p, distanceFromPrev: '' }
      const prev = points[i - 1]
      const lat1 = parseFloat(prev.latitude)
      const lng1 = parseFloat(prev.longitude)
      const lat2 = parseFloat(p.latitude)
      const lng2 = parseFloat(p.longitude)
      if (isFinite(lat1) && isFinite(lng1) && isFinite(lat2) && isFinite(lng2)) {
        return { ...p, distanceFromPrev: haversineDistance(lat1, lng1, lat2, lng2).toFixed(1) }
      }
      return p
    })
  }

  // Geocode a single address
  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
    try {
      const res = await fetch(`/api/glonass/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude, address: data.address || address }
      }
    } catch { /* ignore */ }
    return null
  }

  // Geocode a single route point
  const handleGeocodePoint = async (idx: number) => {
    const p = routePoints[idx]
    if (!p.address.trim()) { toast.error('Введите адрес для геокодирования'); return }
    setGeocodingIdx(idx)
    try {
      const result = await geocodeAddress(p.address)
      if (result) {
        const newPoints = [...routePoints]
        newPoints[idx] = { ...newPoints[idx], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        const withDist = recalcDistances(newPoints)
        setRoutePoints(withDist)
        toast.success(`Координаты получены: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`)
      } else {
        toast.error('Не удалось определить координаты по адресу')
      }
    } catch { toast.error('Ошибка геокодирования') }
    setGeocodingIdx(null)
  }

  // Auto-sort route points using nearest neighbor algorithm
  const handleAutoSort = async () => {
    if (routePoints.length < 2) { toast.info('Добавьте минимум 2 точки для оптимизации'); return }
    setOptimizingRoute(true)
    try {
      // Geocode all points without coordinates
      const geocoded = [...routePoints]
      for (let i = 0; i < geocoded.length; i++) {
        if (!geocoded[i].latitude && !geocoded[i].longitude && geocoded[i].address.trim()) {
          const result = await geocodeAddress(geocoded[i].address)
          if (result) {
            geocoded[i] = { ...geocoded[i], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
          }
        }
      }

      // Check we have enough points with coordinates
      const pointsWithCoords = geocoded.filter(p => p.latitude && p.longitude)
      if (pointsWithCoords.length < 2) {
        toast.error('Недостаточно точек с координатами для оптимизации. Используйте кнопку геокодирования.')
        setOptimizingRoute(false)
        return
      }

      // Build index mapping
      const coordIndices: number[] = []
      const coords: { lat: number; lng: number; origIdx: number }[] = []
      for (let i = 0; i < geocoded.length; i++) {
        if (geocoded[i].latitude && geocoded[i].longitude) {
          coordIndices.push(i)
          coords.push({ lat: parseFloat(geocoded[i].latitude), lng: parseFloat(geocoded[i].longitude), origIdx: i })
        }
      }

      // Nearest neighbor starting from first point with coords
      const n = coords.length
      const visited = new Set<number>()
      const order: number[] = [0] // Start from first point
      visited.add(0)
      while (visited.size < n) {
        const current = order[order.length - 1]
        let nearest = -1, nearestDist = Infinity
        for (let i = 0; i < n; i++) {
          if (visited.has(i)) continue
          const dist = haversineDistance(coords[current].lat, coords[current].lng, coords[i].lat, coords[i].lng)
          if (dist < nearestDist) { nearestDist = dist; nearest = i }
        }
        if (nearest >= 0) { order.push(nearest); visited.add(nearest) }
      }

      // Reorder: points with coords in optimized order, points without coords at the end
      const orderedCoords = order.map(i => geocoded[coordIndices[i]])
      const noCoords = geocoded.filter(p => !p.latitude && !p.longitude)
      const result = [...orderedCoords, ...noCoords]

      // Recalculate distances
      const withDist = recalcDistances(result)
      setRoutePoints(withDist)

      // Update startPoint/endPoint from first/last route point
      if (withDist.length > 0) {
        if (withDist[0].address) setF('startPoint', withDist[0].address)
        if (withDist[withDist.length - 1].address) setF('endPoint', withDist[withDist.length - 1].address)
      }

      const totalDist = withDist.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)
      if (totalDist > 0) setF('distance', totalDist.toFixed(1))

      toast.success(`Маршрут оптимизирован. Общее расстояние: ${totalDist.toFixed(1)} км`)
    } catch { toast.error('Ошибка оптимизации маршрута') }
    setOptimizingRoute(false)
  }

  // Route point operations
  const addRoutePoint = () => {
    setRoutePoints(prev => [...prev, { name: `Точка ${prev.length + 1}`, address: '', latitude: '', longitude: '', plannedArrival: '', plannedDeparture: '', distanceFromPrev: '', notes: '' }])
  }
  const removeRoutePoint = (idx: number) => {
    setRoutePoints(prev => recalcDistances(prev.filter((_, i) => i !== idx)))
  }
  const moveRoutePoint = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= routePoints.length) return
    const newPoints = [...routePoints]
    const temp = newPoints[idx]
    newPoints[idx] = newPoints[newIdx]
    newPoints[newIdx] = temp
    setRoutePoints(recalcDistances(newPoints))
  }
  const updateRoutePoint = (idx: number, field: string, value: string) => {
    setRoutePoints(prev => {
      const newPoints = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
      // If coordinates changed, recalculate distances
      if (field === 'latitude' || field === 'longitude') {
        return recalcDistances(newPoints)
      }
      return newPoints
    })
  }

  // Fetch snapshot from GLONASS at a specific time
  const fetchSnapshot = async (type: 'start' | 'end') => {
    const eqId = f('equipmentId')
    const dt = type === 'start' ? f('startDate') : f('endDate')
    if (!eqId) { toast.error('Выберите технику'); return }
    if (!dt) { toast.error(type === 'start' ? 'Укажите дату начала' : 'Укажите дату окончания'); return }

    if (type === 'start') setFetchingStart(true); else setFetchingEnd(true)
    try {
      const res = await fetch(`/api/glonass/snapshot?equipmentId=${eqId}&datetime=${encodeURIComponent(new Date(dt).toISOString())}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Ошибка запроса'); return }

      const updates: Record<string, string> = {}
      if (data.fuel != null) updates[type === 'start' ? 'fuelStart' : 'fuelEnd'] = String(Math.round(data.fuel))
      if (data.mileage != null) updates[type === 'start' ? 'mileageStart' : 'mileageEnd'] = String(Math.round(data.mileage))
      if (data.address) updates[type === 'start' ? 'startPoint' : 'endPoint'] = data.address

      // If no address but we have coordinates, try reverse geocoding
      if (!data.address && data.lat && data.lng) {
        try {
          const geoRes = await fetch(`/api/glonass/geocode?lat=${data.lat}&lng=${data.lng}`)
          const geoData = await geoRes.json()
          if (geoData.address) updates[type === 'start' ? 'startPoint' : 'endPoint'] = geoData.address
        } catch { /* ignore geocoding errors */ }
      }

      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }))
        const sourceLabel = data.source === 'cached' ? ' (последние известные)' : data.source === 'none' ? '' : ''
        toast.success(`Данные получены${sourceLabel}: ${Object.keys(updates).map(k => {
          if (k.includes('fuel')) return 'топливо'
          if (k.includes('mileage')) return 'пробег'
          if (k.includes('Point')) return 'адрес'
          return k
        }).join(', ')}`)
      } else {
        toast.info('Данные трекера не найдены на указанное время')
      }
    } catch { toast.error('Ошибка запроса к ГЛОНАСС') }
    if (type === 'start') setFetchingStart(false); else setFetchingEnd(false)
  }

  const handleSave = async () => {
    if (!f('equipmentId')) { toast.error('Выберите технику'); return }
    if (!f('route').trim()) { toast.error('Укажите маршрут'); return }
    setSaving(true)
    try {
      const url = editData ? `/api/trips/${editData.id}` : '/api/trips'
      const method = editData ? 'PUT' : 'POST'
      const payload = {
        ...form,
        // Convert datetime-local strings to ISO (preserves local time via browser's Date)
        startDate: localDatetimeToISO(f('startDate')),
        endDate: localDatetimeToISO(f('endDate')),
        plannedEndDate: localDatetimeToISO(f('plannedEndDate')),
        routePoints: routePoints.map((p, i) => ({
          id: p.id || undefined,
          name: p.name || `Точка ${i + 1}`,
          address: p.address || null,
          latitude: p.latitude ? parseFloat(p.latitude) : null,
          longitude: p.longitude ? parseFloat(p.longitude) : null,
          sortOrder: i,
          plannedArrival: localDatetimeToISO(p.plannedArrival),
          plannedDeparture: localDatetimeToISO(p.plannedDeparture),
          distanceFromPrev: p.distanceFromPrev ? parseFloat(p.distanceFromPrev) : null,
          notes: p.notes || null,
        })),
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      toast.success(editData ? 'Рейс обновлён' : 'Рейс добавлен')
      onSaved()
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  // Calculate total route distance from points
  const totalRouteDistance = routePoints.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{editData ? <Edit className="size-4" /> : <Plus className="size-4" />}{editData ? 'Редактирование рейса' : 'Новый рейс'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 sm:px-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Техника *</Label><Select value={f('equipmentId')} onValueChange={v => setF('equipmentId', v)} disabled={!!editData}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите технику" /></SelectTrigger><SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.id}>{e.name} {e.registrationNum ? `(${e.registrationNum})` : ''}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label className="text-xs">Маршрут *</Label><Input value={f('route')} onChange={e => setF('route', e.target.value)} placeholder="Москва — Санкт-Петербург" autoFocus /></div>
            {routeTemplates.length > 0 && (
              <div className="sm:col-span-2">
                <Label className="text-xs">Шаблон маршрута</Label>
                <Select value={f('routeTemplateId') || 'none'} onValueChange={(val) => {
                  const effectiveVal = val === 'none' ? '' : val
                  setF('routeTemplateId', effectiveVal)
                  if (effectiveVal) {
                    const tmpl = routeTemplates.find(rt => rt.id === effectiveVal)
                    if (tmpl) {
                      if (tmpl.startPoint) setF('startPoint', tmpl.startPoint)
                      if (tmpl.endPoint) setF('endPoint', tmpl.endPoint)
                      if (tmpl.totalDistance) setF('distance', tmpl.totalDistance.toString())
                      if (tmpl.points.length > 0) {
                        // Convert HH:mm template times to datetime-local format using trip start date
                        const tripStart = f('startDate') || toLocalDatetime(new Date())
                        const tripDate = tripStart.split('T')[0] // "YYYY-MM-DD"
                        const toDatetime = (time: string | null | undefined) => {
                          if (!time) return ''
                          // If already in datetime-local format, return as-is
                          if (time.includes('T')) return time
                          // If HH:mm format, combine with trip date
                          if (/^\d{2}:\d{2}$/.test(time)) return `${tripDate}T${time}`
                          return time
                        }
                        setRoutePoints(tmpl.points.map(p => ({
                          name: p.name, address: p.address || '', latitude: p.latitude?.toString() || '',
                          longitude: p.longitude?.toString() || '',
                          plannedArrival: toDatetime(p.plannedArrival),
                          plannedDeparture: toDatetime(p.plannedDeparture),
                          distanceFromPrev: p.distanceFromPrev?.toString() || '',
                          notes: p.notes || '',
                        })))
                      }
                    }
                  }
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выберите шаблон маршрута" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без шаблона</SelectItem>
                    {routeTemplates.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name} ({rt.points?.length || 0} точек)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Пункт отправления</Label><div className="flex gap-1"><Input value={f('startPoint')} onChange={e => setF('startPoint', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2 gap-1" onClick={() => fetchSnapshot('start')} disabled={fetchingStart} title="Запросить из ГЛОНАСС на время начала">{fetchingStart ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}ГЛОНАСС</Button></div></div>
            <div><Label className="text-xs">Пункт назначения</Label><div className="flex gap-1"><Input value={f('endPoint')} onChange={e => setF('endPoint', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2 gap-1" onClick={() => fetchSnapshot('end')} disabled={fetchingEnd} title="Запросить из ГЛОНАСС на время окончания">{fetchingEnd ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}ГЛОНАСС</Button></div></div>
            <div><Label className="text-xs">Экипаж</Label><Select value={f('crewId') || '_none'} onValueChange={v => setF('crewId', v === '_none' ? '' : v)}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Без экипажа" /></SelectTrigger><SelectContent><SelectItem value="_none">Без экипажа</SelectItem>{crews.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Статус</Label><Select value={f('status')} onValueChange={v => setF('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TRIP_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Груз</Label><Input value={f('cargo')} onChange={e => setF('cargo', e.target.value)} /></div>
            <div><Label className="text-xs">Вес груза (т)</Label><Input type="number" value={f('cargoWeight')} onChange={e => setF('cargoWeight', e.target.value)} /></div>
            <div><Label className="text-xs">Расстояние (км)</Label><Input type="number" value={f('distance')} onChange={e => setF('distance', e.target.value)} /></div>
            <div><Label className="text-xs">Дата и время начала</Label><Input type="datetime-local" value={f('startDate')} onChange={e => setF('startDate', e.target.value)} /></div>
            <div><Label className="text-xs">Планируемое окончание</Label><Input type="datetime-local" value={f('plannedEndDate')} onChange={e => setF('plannedEndDate', e.target.value)} /></div>
            <div><Label className="text-xs">Дата и время окончания</Label><Input type="datetime-local" value={f('endDate')} onChange={e => setF('endDate', e.target.value)} /></div>
            <div><Label className="text-xs">Топливо на старте (л)</Label><div className="flex gap-1"><Input type="number" value={f('fuelStart')} onChange={e => setF('fuelStart', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2" onClick={() => fetchSnapshot('start')} disabled={fetchingStart} title="Запросить из ГЛОНАСС">{fetchingStart ? <Loader2 className="size-3.5 animate-spin" /> : <Fuel className="size-3.5" />}</Button></div></div>
            <div><Label className="text-xs">Топливо на финише (л)</Label><div className="flex gap-1"><Input type="number" value={f('fuelEnd')} onChange={e => setF('fuelEnd', e.target.value)} className="flex-1" /><Button type="button" size="sm" variant="outline" className="shrink-0 h-9 px-2" onClick={() => fetchSnapshot('end')} disabled={fetchingEnd} title="Запросить из ГЛОНАСС">{fetchingEnd ? <Loader2 className="size-3.5 animate-spin" /> : <Fuel className="size-3.5" />}</Button></div></div>
            <div><Label className="text-xs">Пробег на старте</Label><Input type="number" value={f('mileageStart')} onChange={e => setF('mileageStart', e.target.value)} /></div>
            <div><Label className="text-xs">Пробег на финише</Label><Input type="number" value={f('mileageEnd')} onChange={e => setF('mileageEnd', e.target.value)} /></div>
            <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={f('cost')} onChange={e => setF('cost', e.target.value)} /></div>
            <div><Label className="text-xs">Доход (₽)</Label><Input type="number" value={f('revenue')} onChange={e => setF('revenue', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Заметки</Label><Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>

          {/* ── ROUTE POINTS (WAYPOINTS) SECTION ── */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPinned className="size-3.5 text-primary" />
                <Label className="text-xs font-semibold">Точки маршрута</Label>
                {routePoints.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{routePoints.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {routePoints.length >= 2 && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleAutoSort} disabled={optimizingRoute}>
                    {optimizingRoute ? <Loader2 className="size-3 animate-spin" /> : <ToggleRight className="size-3" />}
                    Оптимизировать
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={addRoutePoint}>
                  <Plus className="size-3" />Добавить точку
                </Button>
              </div>
            </div>
            {totalRouteDistance > 0 && (
              <div className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400">
                <Navigation className="size-3" />
                <span>Общее расстояние по точкам: <strong>{totalRouteDistance.toFixed(1)} км</strong></span>
              </div>
            )}
            {routePoints.length > 0 && (
              <div className="space-y-0">
                {routePoints.map((p, idx) => (
                  <div key={idx} className="flex gap-2 group">
                    {/* Timeline visualization */}
                    <div className="flex flex-col items-center w-6 shrink-0 pt-2">
                      <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        idx === routePoints.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < routePoints.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border/60 min-h-[24px]" />
                      )}
                    </div>
                    {/* Point content */}
                    <div className="flex-1 space-y-1.5 pb-3">
                      <div className="flex items-center gap-1">
                        <Input value={p.name} onChange={e => updateRoutePoint(idx, 'name', e.target.value)} placeholder="Название" className="h-7 text-xs flex-1" />
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0" onClick={() => moveRoutePoint(idx, 'up')} disabled={idx === 0} title="Вверх">
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0" onClick={() => moveRoutePoint(idx, 'down')} disabled={idx === routePoints.length - 1} title="Вниз">
                          <ArrowDown className="size-3" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="size-7 p-0 shrink-0 text-red-500 hover:text-red-700" onClick={() => removeRoutePoint(idx)} title="Удалить">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Input value={p.address} onChange={e => updateRoutePoint(idx, 'address', e.target.value)} placeholder="Адрес" className="h-7 text-xs flex-1" />
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => handleGeocodePoint(idx)} disabled={geocodingIdx === idx} title="Геокодировать адрес">
                          {geocodingIdx === idx ? <Loader2 className="size-3 animate-spin" /> : <MapPin className="size-3" />}
                        </Button>
                      </div>
                      {(p.latitude || p.longitude) && (
                        <div className="text-[9px] text-muted-foreground px-0.5">
                          📍 {p.latitude && parseFloat(p.latitude).toFixed(4)}{p.longitude && `, ${parseFloat(p.longitude).toFixed(4)}`}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Прибытие</Label>
                          <Input type="datetime-local" value={p.plannedArrival} onChange={e => updateRoutePoint(idx, 'plannedArrival', e.target.value)} className="h-6 text-[10px]" />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Отправление</Label>
                          <Input type="datetime-local" value={p.plannedDeparture} onChange={e => updateRoutePoint(idx, 'plannedDeparture', e.target.value)} className="h-6 text-[10px]" />
                        </div>
                      </div>
                      {idx > 0 && p.distanceFromPrev && (
                        <div className="text-[9px] text-muted-foreground px-0.5">
                          📏 {parseFloat(p.distanceFromPrev).toFixed(1)} км от предыдущей точки
                        </div>
                      )}
                      <Input value={p.notes} onChange={e => updateRoutePoint(idx, 'notes', e.target.value)} placeholder="Заметки" className="h-6 text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-card z-10 border-t pt-2">
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
// ROUTE TEMPLATE FORM DIALOG
// ═══════════════════════════════════════════════════════════════

function RouteTemplateFormDialog({ open, setOpen, editData, onSaved }: {
  open: boolean; setOpen: (v: boolean) => void;
  editData: RouteTemplate | null; onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [points, setPoints] = useState<Array<{
    id?: string; name: string; address: string; latitude: string; longitude: string;
    plannedArrival: string; plannedDeparture: string; distanceFromPrev: string; notes: string;
  }>>([])
  const [saving, setSaving] = useState(false)
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null)
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '', description: editData.description || '',
        startPoint: editData.startPoint || '', endPoint: editData.endPoint || '',
        totalDistance: editData.totalDistance?.toString() || '',
        estimatedDuration: editData.estimatedDuration?.toString() || '',
        notes: editData.notes || '',
      })
      setPoints((editData.points || []).map(p => ({
        id: p.id, name: p.name || '', address: p.address || '',
        latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
        plannedArrival: p.plannedArrival || '', plannedDeparture: p.plannedDeparture || '',
        distanceFromPrev: p.distanceFromPrev?.toString() || '', notes: p.notes || '',
      })))
    } else {
      setForm({ name: '' })
      setPoints([])
    }
  }, [editData, open])

  const f = (key: string) => form[key] || ''
  const setF = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const recalcDistances = (pts: typeof points) => {
    return pts.map((p, i) => {
      if (i === 0) return { ...p, distanceFromPrev: '' }
      const prev = pts[i - 1]
      const lat1 = parseFloat(prev.latitude), lng1 = parseFloat(prev.longitude)
      const lat2 = parseFloat(p.latitude), lng2 = parseFloat(p.longitude)
      if (isFinite(lat1) && isFinite(lng1) && isFinite(lat2) && isFinite(lng2)) {
        return { ...p, distanceFromPrev: haversineDistance(lat1, lng1, lat2, lng2).toFixed(1) }
      }
      return p
    })
  }

  const recalcTimes = (pts: typeof points, avgSpeedKmh = 60, stopMin = 15) => {
    let currentMinutes: number | null = null
    return pts.map((p, i) => {
      // Use first point's existing arrival time as start, or default 08:00
      if (i === 0) {
        const startTime = p.plannedArrival || '08:00'
        const [h, m] = startTime.split(':').map(Number)
        if (isFinite(h) && isFinite(m)) currentMinutes = h * 60 + m
        else currentMinutes = 8 * 60
        const depMin = currentMinutes + (p.plannedDeparture ? 0 : stopMin)
        const depTime = p.plannedDeparture || `${String(Math.floor(depMin / 60) % 24).padStart(2, '0')}:${String(depMin % 60).padStart(2, '0')}`
        if (!p.plannedDeparture) currentMinutes = depMin
        else {
          const [dh, dm] = p.plannedDeparture.split(':').map(Number)
          if (isFinite(dh) && isFinite(dm)) currentMinutes = dh * 60 + dm
        }
        return { ...p, plannedArrival: p.plannedArrival || startTime, plannedDeparture: depTime }
      }
      if (currentMinutes === null) return p
      const dist = parseFloat(p.distanceFromPrev) || 0
      const travelMin = Math.round((dist / avgSpeedKmh) * 60)
      currentMinutes += travelMin
      const arrTime = p.plannedArrival || `${String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`
      const depMin = currentMinutes + (p.plannedDeparture ? 0 : stopMin)
      const depTime = p.plannedDeparture || `${String(Math.floor(depMin / 60) % 24).padStart(2, '0')}:${String(depMin % 60).padStart(2, '0')}`
      if (!p.plannedArrival) currentMinutes = currentMinutes
      else {
        const [ah, am] = p.plannedArrival.split(':').map(Number)
        if (isFinite(ah) && isFinite(am)) currentMinutes = ah * 60 + am
      }
      if (!p.plannedDeparture) currentMinutes = depMin
      else {
        const [dh, dm] = p.plannedDeparture.split(':').map(Number)
        if (isFinite(dh) && isFinite(dm)) currentMinutes = dh * 60 + dm
      }
      return { ...p, plannedArrival: arrTime, plannedDeparture: depTime }
    })
  }

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
    try {
      const res = await fetch(`/api/glonass/geocode?address=${encodeURIComponent(address)}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.latitude && data.longitude) return { latitude: data.latitude, longitude: data.longitude, address: data.address || address }
    } catch {}
    return null
  }

  const handleGeocodePoint = async (idx: number) => {
    const p = points[idx]
    if (!p.address.trim()) { toast.error('Введите адрес'); return }
    setGeocodingIdx(idx)
    try {
      const result = await geocodeAddress(p.address)
      if (result) {
        const newPoints = [...points]
        newPoints[idx] = { ...newPoints[idx], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        setPoints(recalcTimes(recalcDistances(newPoints)))
        toast.success(`Координаты: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`)
      } else { toast.error('Не удалось определить координаты') }
    } catch { toast.error('Ошибка геокодирования') }
    setGeocodingIdx(null)
  }

  const handleAutoSort = async () => {
    if (points.length < 2) { toast.info('Добавьте минимум 2 точки'); return }
    setOptimizing(true)
    try {
      const geocoded = [...points]
      for (let i = 0; i < geocoded.length; i++) {
        if (!geocoded[i].latitude && !geocoded[i].longitude && geocoded[i].address.trim()) {
          const result = await geocodeAddress(geocoded[i].address)
          if (result) geocoded[i] = { ...geocoded[i], latitude: result.latitude.toString(), longitude: result.longitude.toString(), address: result.address }
        }
      }
      const coords = geocoded.map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), hasCoords: !!(p.latitude && p.longitude) }))
      const coordIndices: number[] = []
      const coordList: { lat: number; lng: number }[] = []
      for (let i = 0; i < geocoded.length; i++) {
        if (coords[i].hasCoords) { coordIndices.push(i); coordList.push({ lat: coords[i].lat, lng: coords[i].lng }) }
      }
      const n = coordList.length
      if (n < 2) { toast.error('Недостаточно точек с координатами'); setOptimizing(false); return }

      const visited = new Set<number>()
      const order: number[] = [0]
      visited.add(0)
      while (visited.size < n) {
        const current = order[order.length - 1]
        let nearest = -1, nearestDist = Infinity
        for (let i = 0; i < n; i++) {
          if (visited.has(i)) continue
          const dist = haversineDistance(coordList[current].lat, coordList[current].lng, coordList[i].lat, coordList[i].lng)
          if (dist < nearestDist) { nearestDist = dist; nearest = i }
        }
        if (nearest >= 0) { order.push(nearest); visited.add(nearest) }
      }
      const ordered = order.map(i => geocoded[coordIndices[i]])
      const noCoords = geocoded.filter(p => !p.latitude && !p.longitude)
      const result = recalcDistances([...ordered, ...noCoords])

      if (result.length > 0) {
        if (result[0].address) setF('startPoint', result[0].address)
        if (result[result.length - 1].address) setF('endPoint', result[result.length - 1].address)
      }
      const totalDist = result.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)
      if (totalDist > 0) setF('totalDistance', totalDist.toFixed(1))
      // Auto-calculate estimated duration (avg speed 60 km/h)
      const avgSpeedKmh = 60
      const estMin = Math.round((totalDist / avgSpeedKmh) * 60)
      if (estMin > 0) setF('estimatedDuration', estMin.toString())
      // Auto-calculate point arrival/departure times
      const resultWithTimes = recalcTimes(result, avgSpeedKmh, 15)
      setPoints(resultWithTimes)
      const hrs = Math.floor(estMin / 60)
      const mins = estMin % 60
      toast.success(`Маршрут оптимизирован: ${totalDist.toFixed(1)} км, ~${hrs > 0 ? hrs + ' ч ' : ''}${mins > 0 ? mins + ' мин' : ''}`)
    } catch { toast.error('Ошибка оптимизации') }
    setOptimizing(false)
  }

  const addPoint = () => {
    setPoints(prev => [...prev, { name: `Точка ${prev.length + 1}`, address: '', latitude: '', longitude: '', plannedArrival: '', plannedDeparture: '', distanceFromPrev: '', notes: '' }])
  }
  const removePoint = (idx: number) => {
    setPoints(prev => recalcTimes(recalcDistances(prev.filter((_, i) => i !== idx))))
  }
  const movePoint = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= points.length) return
    const newPoints = [...points]
    const temp = newPoints[idx]
    newPoints[idx] = newPoints[newIdx]
    newPoints[newIdx] = temp
    setPoints(recalcTimes(recalcDistances(newPoints)))
  }
  const updatePoint = (idx: number, field: string, value: string) => {
    setPoints(prev => {
      const newPoints = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
      if (field === 'latitude' || field === 'longitude') return recalcTimes(recalcDistances(newPoints))
      if (field === 'plannedArrival' || field === 'plannedDeparture') return recalcTimes(newPoints, 60, 15)
      return newPoints
    })
  }

  const handleSave = async () => {
    if (!f('name').trim()) { toast.error('Укажите название маршрута'); return }
    setSaving(true)
    try {
      // Auto-calculate estimatedDuration if not set but distance is known
      const dist = parseFloat(f('totalDistance')) || totalDist
      const estDur = f('estimatedDuration') ? f('estimatedDuration') : (dist > 0 ? Math.round((dist / 60) * 60).toString() : '')
      const url = editData ? `/api/route-templates/${editData.id}` : '/api/route-templates'
      const method = editData ? 'PUT' : 'POST'
      const payload = {
        ...form,
        estimatedDuration: estDur,
        points: points.map((p, i) => ({
          id: p.id || undefined,
          name: p.name || `Точка ${i + 1}`,
          address: p.address || null,
          latitude: p.latitude ? parseFloat(p.latitude) : null,
          longitude: p.longitude ? parseFloat(p.longitude) : null,
          sortOrder: i,
          plannedArrival: p.plannedArrival || null,
          plannedDeparture: p.plannedDeparture || null,
          distanceFromPrev: p.distanceFromPrev ? parseFloat(p.distanceFromPrev) : null,
          notes: p.notes || null,
        })),
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Ошибка'); return }
      toast.success(editData ? 'Маршрут обновлён' : 'Маршрут создан')
      onSaved()
      setOpen(false)
    } catch { toast.error('Ошибка сохранения') }
    setSaving(false)
  }

  const totalDist = points.reduce((s, p) => s + (parseFloat(p.distanceFromPrev) || 0), 0)

  const [expandedPoint, setExpandedPoint] = useState<number | null>(null)

  const totalEstMin = f('estimatedDuration') ? parseInt(f('estimatedDuration')) : (totalDist > 0 ? Math.round((totalDist / 60) * 60) : 0)
  const totalHrs = Math.floor(totalEstMin / 60)
  const totalMins = totalEstMin % 60
  const durationStr = totalEstMin > 0 ? `${totalHrs > 0 ? totalHrs + ' ч ' : ''}${totalMins > 0 ? totalMins + ' мин' : ''}` : ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0">
        {/* Header with gradient accent */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="size-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0">
              {editData ? <Edit className="size-4 text-sky-600 dark:text-sky-400" /> : <Route className="size-4 text-sky-600 dark:text-sky-400" />}
            </div>
            <div>
              <span>{editData ? 'Редактирование маршрута' : 'Новый маршрут'}</span>
              {(points.length > 0 || totalDist > 0) && (
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {points.length > 0 && `${points.length} ${points.length === 1 ? 'точка' : points.length < 5 ? 'точки' : 'точек'}`}
                  {points.length > 0 && totalDist > 0 && ' · '}
                  {totalDist > 0 && `${totalDist.toFixed(1)} км`}
                  {totalDist > 0 && durationStr && ' · '}
                  {durationStr && `~${durationStr}`}
                </p>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">{editData ? 'Измените параметры маршрута и точки маршрута' : 'Создайте шаблон маршрута с точками назначения'}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 max-h-[72vh]">
          {/* Section 1: Basic parameters */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FileText className="size-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold">Основные параметры</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Название маршрута <span className="text-red-500">*</span></Label>
                <Input value={f('name')} onChange={e => setF('name', e.target.value)} placeholder="Например: Москва — Санкт-Петербург" className="mt-1 h-9" autoFocus />
              </div>
              <div>
                <Label className="text-xs font-medium">Пункт отправления</Label>
                <div className="relative mt-1">
                  <MapPin className="size-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input value={f('startPoint')} onChange={e => setF('startPoint', e.target.value)} placeholder="Москва" className="h-9 pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Пункт назначения</Label>
                <div className="relative mt-1">
                  <MapPin className="size-3.5 text-red-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input value={f('endPoint')} onChange={e => setF('endPoint', e.target.value)} placeholder="Санкт-Петербург" className="h-9 pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Общее расстояние</Label>
                <div className="relative mt-1">
                  <Navigation className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input type="number" value={f('totalDistance')} onChange={e => setF('totalDistance', e.target.value)} placeholder="700" className="h-9 pl-8 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">км</span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Ориентировочное время</Label>
                <div className="relative mt-1">
                  <Clock className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input type="number" value={f('estimatedDuration')} onChange={e => setF('estimatedDuration', e.target.value)} placeholder="480" className="h-9 pl-8 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">мин</span>
                </div>
                {totalDist > 0 && !f('estimatedDuration') && (
                  <p className="text-[10px] text-muted-foreground mt-1 ml-0.5">Авто: ~{Math.round((totalDist / 60) * 60)} мин при 60 км/ч</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Route points — Timeline style */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <MapPinned className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold">Точки маршрута</h3>
                {points.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">{points.length}</Badge>
                )}
              </div>
              {totalDist > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Navigation className="size-3 text-sky-500" />{totalDist.toFixed(1)} км</span>
                  {durationStr && <span className="flex items-center gap-1"><Clock className="size-3 text-sky-500" />{durationStr}</span>}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button type="button" size="sm" className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700" onClick={addPoint}>
                <Plus className="size-3.5" />Добавить точку
              </Button>
              {points.length >= 2 && (
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleAutoSort} disabled={optimizing}>
                  {optimizing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  {optimizing ? 'Оптимизация...' : 'Оптимизировать маршрут'}
                </Button>
              )}
            </div>

            {/* Empty state */}
            {points.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <MapPinned className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Точки маршрута не добавлены</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Нажмите «Добавить точку» для создания маршрута</p>
              </div>
            )}

            {/* Timeline points list */}
            {points.length > 0 && (
              <div className="relative">
                {points.map((p, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === points.length - 1
                  const isExpanded = expandedPoint === idx
                  const hasCoords = !!(p.latitude && p.longitude)

                  return (
                    <div key={idx} className="relative flex gap-3">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center w-8 shrink-0">
                        {/* Connector line above */}
                        {!isFirst && (
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-sky-300 to-sky-400 dark:from-sky-700 dark:to-sky-600 -mb-1" />
                        )}
                        {/* Point number circle */}
                        <div className={`relative z-10 flex items-center justify-center size-8 rounded-full text-xs font-bold border-2 shrink-0 transition-colors ${
                          isFirst ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700' :
                          isLast ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700' :
                          'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/50 dark:text-sky-400 dark:border-sky-700'
                        }`}>
                          {isFirst ? <MapPin className="size-3.5" /> : isLast ? <MapPin className="size-3.5" /> : idx + 1}
                        </div>
                        {/* Connector line below */}
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gradient-to-b from-sky-400 to-sky-300 dark:from-sky-600 dark:to-sky-700 -mt-1" />
                        )}
                      </div>

                      {/* Point card */}
                      <div className={`flex-1 mb-3 rounded-xl border transition-all ${
                        isExpanded ? 'border-sky-300 dark:border-sky-700 shadow-sm bg-sky-50/50 dark:bg-sky-950/20' : 'border-border hover:border-sky-200 dark:hover:border-sky-800 bg-card'
                      }`}>
                        {/* Point header — always visible */}
                        <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpandedPoint(isExpanded ? null : idx)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{p.name || `Точка ${idx + 1}`}</span>
                              {p.distanceFromPrev && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 rounded-full shrink-0">
                                  +{parseFloat(p.distanceFromPrev).toFixed(1)} км
                                </span>
                              )}
                              {hasCoords && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <CheckCircle2 className="size-2.5" />
                                </span>
                              )}
                            </div>
                            {p.address && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                                <MapPin className="size-3 shrink-0" />{p.address}
                              </p>
                            )}
                            {!p.address && !p.name && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">Заполните название и адрес</p>
                            )}
                            {(p.plannedArrival || p.plannedDeparture) && !isExpanded && (
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                {p.plannedArrival && <span className="flex items-center gap-0.5"><ArrowDownToLine className="size-2.5" />{p.plannedArrival}</span>}
                                {p.plannedArrival && p.plannedDeparture && <span>→</span>}
                                {p.plannedDeparture && <span className="flex items-center gap-0.5"><ArrowUpFromLine className="size-2.5" />{p.plannedDeparture}</span>}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); movePoint(idx, 'up') }} disabled={isFirst} title="Вверх">
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0" onClick={e => { e.stopPropagation(); movePoint(idx, 'down') }} disabled={isLast} title="Вниз">
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={e => { e.stopPropagation(); removePoint(idx) }} title="Удалить">
                              <Trash2 className="size-3.5" />
                            </Button>
                            <div className={`ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="size-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                            {/* Name field */}
                            <div className="pt-2">
                              <Label className="text-xs font-medium">Название точки</Label>
                              <Input value={p.name} onChange={e => updatePoint(idx, 'name', e.target.value)} placeholder="Название точки" className="mt-1 h-8 text-sm" />
                            </div>

                            {/* Address + geocode */}
                            <div>
                              <Label className="text-xs font-medium">Адрес</Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Input value={p.address} onChange={e => updatePoint(idx, 'address', e.target.value)} placeholder="Введите адрес для геокодирования" className="h-8 text-sm flex-1" />
                                <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 shrink-0 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30" onClick={() => handleGeocodePoint(idx)} disabled={geocodingIdx === idx}>
                                  {geocodingIdx === idx ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />}
                                  Найти
                                </Button>
                              </div>
                            </div>

                            {/* Coordinates */}
                            <div>
                              <Label className="text-xs font-medium">Координаты {hasCoords && <CheckCircle2 className="size-3 text-emerald-500 inline ml-1" />}</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Ш</span>
                                  <Input value={p.latitude} onChange={e => updatePoint(idx, 'latitude', e.target.value)} placeholder="55.7558" className="h-8 text-sm pl-7" />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Д</span>
                                  <Input value={p.longitude} onChange={e => updatePoint(idx, 'longitude', e.target.value)} placeholder="37.6173" className="h-8 text-sm pl-7" />
                                </div>
                              </div>
                            </div>

                            {/* Time schedule */}
                            <div>
                              <Label className="text-xs font-medium">Расписание</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowDownToLine className="size-2.5" />Прибытие</Label>
                                  <Input type="time" value={p.plannedArrival} onChange={e => updatePoint(idx, 'plannedArrival', e.target.value)} className="h-8 text-sm mt-0.5" />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowUpFromLine className="size-2.5" />Отправление</Label>
                                  <Input type="time" value={p.plannedDeparture} onChange={e => updatePoint(idx, 'plannedDeparture', e.target.value)} className="h-8 text-sm mt-0.5" />
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <Label className="text-xs font-medium">Заметки</Label>
                              <Input value={p.notes} onChange={e => updatePoint(idx, 'notes', e.target.value)} placeholder="Комментарий к точке маршрута" className="h-8 text-sm mt-1" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 3: Description & Notes */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <StickyNote className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold">Дополнительно</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Описание</Label>
                <Input value={f('description')} onChange={e => setF('description', e.target.value)} placeholder="Краткое описание маршрута" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium">Заметки</Label>
                <Textarea value={f('notes')} onChange={e => setF('notes', e.target.value)} placeholder="Дополнительные заметки к маршруту" rows={2} className="mt-1 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with summary */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/30 flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {points.length > 0 && <span className="flex items-center gap-1"><MapPinned className="size-3" />{points.length} {points.length === 1 ? 'точка' : points.length < 5 ? 'точки' : 'точек'}</span>}
            {totalDist > 0 && <span className="flex items-center gap-1"><Navigation className="size-3" />{totalDist.toFixed(1)} км</span>}
            {durationStr && <span className="flex items-center gap-1"><Clock className="size-3" />{durationStr}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-9">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 bg-sky-600 hover:bg-sky-700">
              {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}{editData ? 'Сохранить' : 'Создать маршрут'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES TAB — Сотрудники (водители, техники)
// ═══════════════════════════════════════════════════════════════

const EmployeesTab = React.memo(function EmployeesTab({ employees, crews, empSearch, setEmpSearch, empPositionFilter, setEmpPositionFilter, empStatusFilter, setEmpStatusFilter, onOpenDetail, onAdd, onEdit, onDelete }: {
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
        <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 active:scale-95 transition-transform"><Plus className="size-3.5" />Сотрудник</Button>
        <Button variant="outline" size="sm" className="h-9 px-2 active:scale-95 transition-transform" onClick={() => downloadCSV(filtered.map(e => ({ ФИО: e.fullName, Должность: EMPLOYEE_POSITION_MAP[e.position]?.label || e.position, Телефон: e.phone || '', Email: e.email || '', Статус: EMPLOYEE_STATUS_MAP[e.status]?.label || e.status, 'Дата приёма': formatDate(e.hireDate), 'Категория ВУ': e.licenseCat || '', Экипаж: e.crew?.name || '' })), 'employees')} title="Экспорт CSV" aria-label="Экспорт CSV">
          <FileDown className="size-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Найдено: {filtered.length} из {employees.length}</p>

      {/* Employee list */}
      {filtered.length === 0 ? (
        <Card className="py-8 animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center text-center p-4 pt-0">
            <Users className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Сотрудники не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте водителей и техников для управления персоналом</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left py-1.5 px-2 font-medium w-8"></th>
                  <th className="text-left py-1.5 px-2 font-medium">ФИО</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Должность</th>
                  <th className="text-left py-1.5 px-2 font-medium">Статус</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden sm:table-cell">Телефон</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">ВУ / Кат.</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Техника</th>
                  <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">Стаж</th>
                  <th className="text-right py-1.5 px-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const statusInfo = EMPLOYEE_STATUS_MAP[emp.status]
                  const posInfo = EMPLOYEE_POSITION_MAP[emp.position]
                  const licenseExpiring = emp.licenseExpiry && new Date(emp.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(emp.licenseExpiry) >= new Date()
                  const licenseExpired = emp.licenseExpiry && new Date(emp.licenseExpiry) < new Date()
                  const tenure = emp.hireDate ? Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
                  const tenureMonths = emp.hireDate ? Math.floor((Date.now() - new Date(emp.hireDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)) : null
                  const repairCount = emp.repairAssignments?.length || 0
                  return (
                    <tr key={emp.id} className={`border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${statusInfo?.border || 'border-l-gray-300'} ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={() => onOpenDetail(emp)}>
                      <td className="py-1.5 px-2">
                        <div className={`flex items-center justify-center size-6 rounded-full text-[8px] font-bold ${getPositionColor(emp.position)}`}>
                          {emp.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium truncate max-w-[200px]">{emp.fullName}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`sm:hidden inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                          {licenseExpired && <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 dark:text-red-400 font-medium"><AlertTriangle className="size-2.5" />ВУ истекло!</span>}
                          {licenseExpiring && !licenseExpired && <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400 font-medium"><Clock className="size-2.5" />ВУ истекает</span>}
                          {repairCount > 0 && <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Wrench className="size-2" />{repairCount}</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[10px] font-medium ${getPositionColor(emp.position)}`}>{posInfo?.label || emp.position}</span>
                      </td>
                      <td className="py-1.5 px-2">{statusBadge(emp.status, EMPLOYEE_STATUS_MAP)}</td>
                      <td className="py-1.5 px-2 hidden sm:table-cell">
                        {emp.phone ? <a href={`tel:${emp.phone}`} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5" onClick={e => e.stopPropagation()}><Phone className="size-2.5" />{emp.phone}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell">
                        <span className="font-mono">{emp.licenseNum || '—'}</span>
                        {emp.licenseCat && <span className="ml-1 text-[9px] text-muted-foreground">кат. {emp.licenseCat}</span>}
                        {licenseExpired && <AlertTriangle className="inline size-2.5 text-red-500 ml-0.5" />}
                        {licenseExpiring && !licenseExpired && <Clock className="inline size-2.5 text-amber-500 ml-0.5" />}
                      </td>
                      <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
                        {emp.equipment ? <span className="inline-flex items-center gap-0.5"><Truck className="size-2" />{emp.equipment.name}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 hidden lg:table-cell text-muted-foreground">
                        {tenure != null ? <span>{tenure > 0 ? `${tenure} г.` : `${tenureMonths} мес.`}</span> : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => onEdit(emp)}><Edit className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="size-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(emp)}><Trash2 className="size-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

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

const MapTab = React.memo(function MapTab({ equipment, onSync, onOpenDetail }: {
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
                            <span className="text-muted-foreground ml-auto">{trip.distance != null ? trip.distance.toFixed(1) : '—'} км • {trip.points?.length || 0} т.</span>
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
})

// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB CONTENT (Admin only)
// ═══════════════════════════════════════════════════════════════

function SettingsTabContent({
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
    'Система': <Settings className="size-3.5" />,
  }

  const activeUsers = users.filter(u => u.isActive).length

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Tabs navigation */}
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

      {/* Tab content */}
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

            {/* Add button */}
            <Button className="w-full h-9 gap-2" onClick={() => { setUserFormEdit(null); setUserFormOpen(true) }}>
              <UserPlus className="size-4" />Добавить пользователя
            </Button>

            {/* User list */}
            <div className="space-y-2">
              {users.map(user => {
                const rc = ROLE_COLORS[user.role] || ROLE_COLORS.worker
                return (
                  <div key={user.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent/50 transition-colors group">
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
          </div>
        )}

        {/* ─── PERMISSIONS TAB ─── */}
        {settingsSubTab === 'permissions' && (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border bg-blue-50 dark:bg-blue-950/20 p-3">
              <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Настройка прав доступа</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Нажмите на роль для настройки прав. Администратор всегда имеет полный доступ. Полный доступ автоматически включает просмотр.
                </p>
              </div>
            </div>

            {editingRole ? (
              /* ─── Permission editor ─── */
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingRole(null)}>
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className={`size-9 rounded-xl flex items-center justify-center text-white shrink-0 ${ROLE_COLORS[editingRole]?.bg || 'bg-primary/10'} ${ROLE_COLORS[editingRole]?.darkBg || ''}`}
                    style={{ backgroundColor: ROLE_HEX[editingRole] || '#6366f1' }}>
                    {ROLE_ICONS[editingRole] || <Shield className="size-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{ROLE_LABELS[editingRole as RoleKey] || editingRole}</p>
                    {editingRole === 'admin' && <p className="text-[10px] text-muted-foreground">Полный доступ ко всем разделам</p>}
                  </div>
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
                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">Администратор всегда имеет доступ ко всем разделам системы. Настройка прав не требуется.</p>
                  </div>
                ) : (
                  Object.entries(PERM_CATEGORIES).map(([category, perms]) => {
                    const catIcon = PERM_CATEGORY_ICONS[category] || <Settings className="size-3.5" />
                    // Count active perms in this category
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
              /* ─── Role cards ─── */
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
            {/* Status header */}
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

            {/* Instructions */}
            <div className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                <Info className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Как подключить</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold shrink-0">1</span>
                  <p className="text-xs text-muted-foreground">Зарегистрируйтесь на <span className="font-medium text-foreground">axenta.cloud</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold shrink-0">2</span>
                  <p className="text-xs text-muted-foreground">Создайте учётную запись в разделе «Учетные записи»</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold shrink-0">3</span>
                  <p className="text-xs text-muted-foreground">Введите логин и пароль ниже — токен будет получен автоматически</p>
                </div>
              </div>
            </div>

            {/* Connection form */}
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

            {/* Action buttons */}
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
            {/* Logo section */}
            <div className="flex flex-col items-center py-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg mb-3">
                <Truck className="size-8 text-white" />
              </div>
              <h3 className="text-base font-bold">Учёт техники</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Комплексная система управления парком</p>
            </div>

            {/* Info grid */}
            <div className="rounded-xl border overflow-hidden">
              <div className="divide-y">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-2"><Tag className="size-3.5" />Версия</span>
                  <span className="text-xs font-medium">1.0.0</span>
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
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
              Система учёта оборудования, ремонтов, рейсов и отслеживания техники на карте с интеграцией GPS/ГЛОНАСС трекеров через Axenta.cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// User form component for settings
function UserForm({ editData, saving, onSave }: {
  editData: AppUserType | null; saving: boolean; onSave: (data: { name: string; pin: string; role: string; isActive: boolean; avatar: string }) => void;
}) {
  const [name, setName] = useState(editData?.name || '')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState(editData?.role || 'worker')
  const [isActive, setIsActive] = useState(editData?.isActive ?? true)
  const [avatar] = useState(editData?.avatar || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])

  return (
    <div className="space-y-3 px-1">
      <div><Label className="text-xs">Имя *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Имя пользователя" /></div>
      <div><Label className="text-xs">{editData ? 'Новый PIN (оставьте пустым чтобы не менять)' : 'PIN (4-6 цифр) *'}</Label><Input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="1234" /></div>
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
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: avatar }}>{getInitials(name || '?')}</div>
        <span className="text-[10px] text-muted-foreground">Цвет аватара назначен автоматически</span>
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
