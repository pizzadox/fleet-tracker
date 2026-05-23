'use client'

import React from 'react'
import {
  Car, Bike, Truck, Bus, Tractor, Ship, Container, Wrench,
  Package, UserCircle, Weight, User
} from 'lucide-react'
import type { RoleKey, EquipmentTypeInfo } from './types'

// Refresh interval options for map auto-update
export const REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '1 мин' },
  { value: 120, label: '2 мин' },
  { value: 300, label: '5 мин' },
] as const

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: 'Администратор',
  manager: 'Управляющий',
  trip_master: 'Мастер рейсов',
  repair_worker: 'Работник ремонта',
  worker: 'Работник',
}

// Default permissions (used as fallback when DB has no entries)
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  admin: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map', 'settings', 'users'],
  manager: ['equipment', 'repairs', 'trips', 'employees', 'companies', 'crews', 'map'],
  trip_master: ['trips', 'crews', 'map', 'equipment_read'],
  repair_worker: ['repairs', 'equipment_read'],
  worker: ['equipment_read', 'map'],
}

// All available permissions with labels and categories
export const ALL_PERMISSIONS: { key: string; label: string; category: string }[] = [
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

export function setDynamicPermissions(perms: Record<string, string[]>) {
  dynamicPermissions = perms
}

export function hasPermission(role: string, perm: string): boolean {
  // Admin always has all permissions
  if (role === 'admin') return true
  const perms = dynamicPermissions[role] || DEFAULT_ROLE_PERMISSIONS[role as RoleKey] || []
  return perms.includes(perm) || perms.includes('equipment') && perm === 'equipment_read'
}

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7', '#d946ef',
]

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'В эксплуатации', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  repair: { label: 'На ремонте', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
  decommissioned: { label: 'Списана', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
  rented: { label: 'В аренде', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  reserved: { label: 'Зарезервирована', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400', border: 'border-l-violet-500' },
}

export const REPAIR_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  paused: { label: 'Приостановлен', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
}

export const STAGE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидание', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  in_progress: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  paused: { label: 'Пауза', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
}

export const EQUIPMENT_TYPE_MAP: Record<string, EquipmentTypeInfo> = {
  'автомобиль': { label: 'Автомобиль', icon: <Car className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400', category: 'Легковой транспорт' },
  'кроссовер': { label: 'Кроссовер', icon: <Car className="size-3.5" />, color: 'bg-indigo-100 text-indigo-700', darkColor: 'dark:bg-indigo-900/40 dark:text-indigo-400', category: 'Легковой транспорт' },
  'внедорожник': { label: 'Внедорожник', icon: <Car className="size-3.5" />, color: 'bg-teal-100 text-teal-700', darkColor: 'dark:bg-teal-900/40 dark:text-teal-400', category: 'Легковой транспорт' },
  'мототехника': { label: 'Мототехника', icon: <Bike className="size-3.5" />, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/40 dark:text-orange-400', category: 'Легковой транспорт' },
  'грузовик': { label: 'Грузовик', icon: <Truck className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400', category: 'Грузовой транспорт' },
  'фургон': { label: 'Фургон', icon: <Truck className="size-3.5" />, color: 'bg-yellow-100 text-yellow-700', darkColor: 'dark:bg-yellow-900/40 dark:text-yellow-400', category: 'Грузовой транспорт' },
  'прицеп': { label: 'Прицеп', icon: <Container className="size-3.5" />, color: 'bg-stone-100 text-stone-700', darkColor: 'dark:bg-stone-900/40 dark:text-stone-400', category: 'Грузовой транспорт' },
  'полуприцеп': { label: 'Полуприцеп', icon: <Container className="size-3.5" />, color: 'bg-neutral-100 text-neutral-700', darkColor: 'dark:bg-neutral-900/40 dark:text-neutral-400', category: 'Грузовой транспорт' },
  'рефрижератор': { label: 'Рефрижератор', icon: <Truck className="size-3.5" />, color: 'bg-cyan-100 text-cyan-700', darkColor: 'dark:bg-cyan-900/40 dark:text-cyan-400', category: 'Грузовой транспорт' },
  'автобус': { label: 'Автобус', icon: <Bus className="size-3.5" />, color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/40 dark:text-purple-400', category: 'Пассажирский транспорт' },
  'микроавтобус': { label: 'Микроавтобус', icon: <Bus className="size-3.5" />, color: 'bg-violet-100 text-violet-700', darkColor: 'dark:bg-violet-900/40 dark:text-violet-400', category: 'Пассажирский транспорт' },
  'спецтехника': { label: 'Спецтехника', icon: <Wrench className="size-3.5" />, color: 'bg-red-100 text-red-700', darkColor: 'dark:bg-red-900/40 dark:text-red-400', category: 'Спецтехника' },
  'экскаватор': { label: 'Экскаватор', icon: <Tractor className="size-3.5" />, color: 'bg-yellow-100 text-yellow-700', darkColor: 'dark:bg-yellow-900/40 dark:text-yellow-400', category: 'Спецтехника' },
  'бульдозер': { label: 'Бульдозер', icon: <Tractor className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400', category: 'Спецтехника' },
  'кран': { label: 'Кран', icon: <Tractor className="size-3.5" />, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/40 dark:text-orange-400', category: 'Спецтехника' },
  'погрузчик': { label: 'Погрузчик', icon: <Tractor className="size-3.5" />, color: 'bg-lime-100 text-lime-700', darkColor: 'dark:bg-lime-900/40 dark:text-lime-400', category: 'Спецтехника' },
  'самосвал': { label: 'Самосвал', icon: <Truck className="size-3.5" />, color: 'bg-rose-100 text-rose-700', darkColor: 'dark:bg-rose-900/40 dark:text-rose-400', category: 'Спецтехника' },
  'автовышка': { label: 'Автовышка', icon: <Tractor className="size-3.5" />, color: 'bg-fuchsia-100 text-fuchsia-700', darkColor: 'dark:bg-fuchsia-900/40 dark:text-fuchsia-400', category: 'Спецтехника' },
  'ямобур': { label: 'Ямобур', icon: <Tractor className="size-3.5" />, color: 'bg-pink-100 text-pink-700', darkColor: 'dark:bg-pink-900/40 dark:text-pink-400', category: 'Спецтехника' },
  'сельхозтехника': { label: 'Сельхозтехника', icon: <Tractor className="size-3.5" />, color: 'bg-green-100 text-green-700', darkColor: 'dark:bg-green-900/40 dark:text-green-400', category: 'Сельхозтехника' },
  'трактор': { label: 'Трактор', icon: <Tractor className="size-3.5" />, color: 'bg-emerald-100 text-emerald-700', darkColor: 'dark:bg-emerald-900/40 dark:text-emerald-400', category: 'Сельхозтехника' },
  'комбайн': { label: 'Комбайн', icon: <Tractor className="size-3.5" />, color: 'bg-lime-100 text-lime-700', darkColor: 'dark:bg-lime-900/40 dark:text-lime-400', category: 'Сельхозтехника' },
  'строительная техника': { label: 'Строительная техника', icon: <Wrench className="size-3.5" />, color: 'bg-slate-100 text-slate-700', darkColor: 'dark:bg-slate-900/40 dark:text-slate-400', category: 'Строительная техника' },
  'бетономешалка': { label: 'Бетономешалка', icon: <Truck className="size-3.5" />, color: 'bg-gray-100 text-gray-700', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Строительная техника' },
  'каток': { label: 'Каток', icon: <Tractor className="size-3.5" />, color: 'bg-zinc-100 text-zinc-700', darkColor: 'dark:bg-zinc-900/40 dark:text-zinc-400', category: 'Строительная техника' },
  'водный транспорт': { label: 'Водный транспорт', icon: <Ship className="size-3.5" />, color: 'bg-sky-100 text-sky-700', darkColor: 'dark:bg-sky-900/40 dark:text-sky-400', category: 'Водный транспорт' },
  'катер': { label: 'Катер', icon: <Ship className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400', category: 'Водный транспорт' },
  'баржа': { label: 'Баржа', icon: <Ship className="size-3.5" />, color: 'bg-indigo-100 text-indigo-700', darkColor: 'dark:bg-indigo-900/40 dark:text-indigo-400', category: 'Водный транспорт' },
  'другое': { label: 'Другое', icon: <Package className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400', category: 'Другое' },
}

export const EQUIPMENT_TYPES = Object.keys(EQUIPMENT_TYPE_MAP)

export const EQUIPMENT_TYPE_GROUPS = (() => {
  const groups: Record<string, Array<{ value: string; label: string }>> = {}
  for (const [key, info] of Object.entries(EQUIPMENT_TYPE_MAP)) {
    if (!groups[info.category]) groups[info.category] = []
    groups[info.category].push({ value: key, label: info.label })
  }
  return groups
})()

export const EQUIPMENT_CONDITION_MAP: Record<string, { label: string; color: string; icon: string }> = {
  excellent: { label: 'Отличное', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', icon: '✓' },
  good: { label: 'Хорошее', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', icon: '○' },
  fair: { label: 'Удовлетворительное', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', icon: '△' },
  poor: { label: 'Плохое', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', icon: '✗' },
}

export const FUEL_TYPE_MAP: Record<string, string> = {
  diesel: 'Дизель', petrol: 'Бензин', gas: 'Газ', electric: 'Электро', hybrid: 'Гибрид',
}

export const ENGINE_TYPE_MAP: Record<string, string> = {
  internal_combustion: 'ДВС', electric: 'Электрический', hybrid: 'Гибридный',
}

export const MAINTENANCE_WARN_DAYS = 30

export const PHOTO_CATEGORIES: Record<string, string> = {
  general: 'Общие', document: 'Документы', damage: 'Повреждения', repair: 'Ремонт'
}

export const COMPANY_TYPES: Record<string, string> = {
  owner: 'Владелец', renter: 'Арендатор', both: 'Владелец и арендатор'
}

export const TRIP_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  planned: { label: 'Запланирован', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  in_progress: { label: 'В пути', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
  completed: { label: 'Завершён', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
}

export const CREW_TYPE_MAP: Record<string, string> = {
  driver: 'Водители', mechanic: 'Механики', mixed: 'Смешанный', other: 'Другой'
}

export const MEMBER_ROLE_MAP: Record<string, string> = {
  driver: 'Водитель', mechanic: 'Механик', assistant: 'Помощник', loader: 'Грузчик', other: 'Другой'
}

export const EMPLOYEE_POSITION_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; darkColor: string }> = {
  driver: { label: 'Водитель', icon: <Car className="size-3.5" />, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/40 dark:text-blue-400' },
  mechanic: { label: 'Механик', icon: <Wrench className="size-3.5" />, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/40 dark:text-amber-400' },
  assistant: { label: 'Помощник', icon: <UserCircle className="size-3.5" />, color: 'bg-sky-100 text-sky-700', darkColor: 'dark:bg-sky-900/40 dark:text-sky-400' },
  loader: { label: 'Грузчик', icon: <Weight className="size-3.5" />, color: 'bg-stone-100 text-stone-700', darkColor: 'dark:bg-stone-900/40 dark:text-stone-400' },
  other: { label: 'Другой', icon: <User className="size-3.5" />, color: 'bg-gray-100 text-gray-600', darkColor: 'dark:bg-gray-900/40 dark:text-gray-400' },
}

export const EMPLOYEE_STATUS_MAP: Record<string, { label: string; color: string; border: string }> = {
  active: { label: 'Работает', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-l-emerald-500' },
  dismissed: { label: 'Уволен', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', border: 'border-l-red-500' },
  vacation: { label: 'Отпуск', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400', border: 'border-l-sky-500' },
  sick: { label: 'Больничный', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-l-amber-500' },
}

export const REPAIR_MASTER_ROLE_MAP: Record<string, { label: string; color: string }> = {
  master: { label: 'Мастер', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  assistant: { label: 'Помощник', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  supervisor: { label: 'Ответственный', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400' },
}

export const REPAIR_PRIORITY_MAP: Record<string, { label: string; color: string; icon?: string }> = {
  low: { label: 'Низкий', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  medium: { label: 'Средний', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  high: { label: 'Высокий', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  critical: { label: 'Критический', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
}

export const REPAIR_TYPE_MAP: Record<string, { label: string; color: string }> = {
  planned: { label: 'Плановый', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  emergency: { label: 'Аварийный', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  warranty: { label: 'Гарантийный', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400' },
  preventive: { label: 'Профилактический', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
}

export const REPAIR_PHOTO_CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  before: { label: 'До ремонта', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  during: { label: 'В процессе', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  after: { label: 'После ремонта', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  document: { label: 'Документы', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400' },
  other: { label: 'Другое', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
}

export const STAGE_TEMPLATES = [
  { name: 'Диагностика', description: 'Проведение диагностики неисправности' },
  { name: 'Разборка', description: 'Демонтаж и разборка узлов' },
  { name: 'Закупка запчастей', description: 'Заказ и получение запчастей' },
  { name: 'Ремонт/замена', description: 'Выполнение ремонтных работ' },
  { name: 'Сборка', description: 'Обратная сборка узлов' },
  { name: 'Тестирование', description: 'Проверка работоспособности' },
  { name: 'Покраска', description: 'Подготовка и покраска' },
  { name: 'Сдача заказчику', description: 'Проверка качества и сдача' },
]

export const API = {
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
