// ═══════════════════════════════════════════════════════════════
// PANEL REGISTRY — Defines all available panels, their metadata,
// scenario presets, and configuration management
// ═══════════════════════════════════════════════════════════════

import React from 'react'
import {
  Truck, Wrench, Route, Map, Building2, Users,
  BarChart3, Filter, Zap, LayoutGrid, List,
  Search, Activity, Fuel, Shield, ClipboardCheck,
  WifiOff, AlertTriangle, Eye, Gauge, TrendingUp,
  Package, MapPin, Bell, ChevronDown, Settings2,
  Monitor, Cog, Box, Briefcase, Car, Terminal, Calendar
} from 'lucide-react'

// ─── Panel types ──────────────────────────────────────────────

export interface PanelDef {
  key: string                // Unique key: "eq_stats"
  label: string              // Display name: "Статистика"
  description: string        // Short description
  icon: React.ReactNode      // Icon element
  tabKey: string             // Which tab this panel belongs to: "equipment", "repairs", etc.
  category: string           // Category for grouping: "Статистика", "Фильтры", "Данные"
  defaultVisible: boolean    // Whether panel is visible by default
  defaultOrder: number       // Default position in layout
  required?: boolean         // Cannot be removed (e.g., main list)
  scenarios?: string[]       // Which scenarios include this panel
}

export interface PanelConfig {
  key: string
  visible: boolean
  collapsed: boolean
  order: number
}

export interface ScenarioPreset {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  panels: Record<string, { visible: boolean; collapsed: boolean }> // key -> config
}

// ─── All panels registry ──────────────────────────────────────

export const PANEL_REGISTRY: PanelDef[] = [
  // ═══ EQUIPMENT TAB ═══
  { key: 'eq_stats', label: 'Статистика', description: 'Карточки со статистикой по технике: всего, активна, ремонт, аренда, резерв, списана', icon: <BarChart3 className="size-3.5" />, tabKey: 'equipment', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager', 'mechanic'] },
  { key: 'eq_fleet_value', label: 'Стоимость парка', description: 'Стоимость, состояние и использование парка техники', icon: <TrendingUp className="size-3.5" />, tabKey: 'equipment', category: 'Статистика', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'manager'] },
  { key: 'eq_filters', label: 'Фильтры', description: 'Поиск, фильтры по статусу, типу, состоянию, владельцу, арендатору', icon: <Filter className="size-3.5" />, tabKey: 'equipment', category: 'Фильтры', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'manager', 'mechanic', 'dispatcher', 'minimal'], required: true },
  { key: 'eq_quick_filters', label: 'Быстрые фильтры', description: 'Чипы быстрой фильтрации: требует ТО, страховка, ТО просрочен, слабое состояние, без трекера', icon: <Zap className="size-3.5" />, tabKey: 'equipment', category: 'Фильтры', defaultVisible: true, defaultOrder: 3, scenarios: ['full', 'manager', 'mechanic'] },
  { key: 'eq_actions', label: 'Действия', description: 'Кнопки: добавить, вид (карточки/таблица/канбан), экспорт CSV, выделение', icon: <Settings2 className="size-3.5" />, tabKey: 'equipment', category: 'Управление', defaultVisible: true, defaultOrder: 4, scenarios: ['full', 'manager', 'mechanic', 'minimal'], required: true },
  { key: 'eq_status_chips', label: 'Статусы', description: 'Счётчики по статусам техники с быстрым переходом', icon: <Activity className="size-3.5" />, tabKey: 'equipment', category: 'Статистика', defaultVisible: true, defaultOrder: 5, scenarios: ['full', 'manager'] },
  { key: 'eq_list', label: 'Список техники', description: 'Основной список техники: карточки, таблица или канбан', icon: <Truck className="size-3.5" />, tabKey: 'equipment', category: 'Данные', defaultVisible: true, defaultOrder: 6, scenarios: ['full', 'manager', 'mechanic', 'dispatcher', 'minimal'], required: true },

  // ═══ REPAIRS TAB ═══
  { key: 'rep_stats', label: 'Статистика ремонтов', description: 'Карточки: всего, в процессе, завершено, стоимость, средняя стоимость, длительность', icon: <BarChart3 className="size-3.5" />, tabKey: 'repairs', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager', 'mechanic'] },
  { key: 'rep_top_repaired', label: 'Топ ремонтируемой техники', description: 'Список техники с наибольшим количеством ремонтов', icon: <TrendingUp className="size-3.5" />, tabKey: 'repairs', category: 'Статистика', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'manager'] },
  { key: 'rep_filters', label: 'Фильтры ремонтов', description: 'Поиск и фильтры по статусу, технике, приоритету, типу ремонта', icon: <Filter className="size-3.5" />, tabKey: 'repairs', category: 'Фильтры', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'manager', 'mechanic', 'minimal'], required: true },
  { key: 'rep_quick_filters', label: 'Быстрые фильтры', description: 'Чипы: просроченные, критические, гарантийные, без подрядчика, дорогие', icon: <Zap className="size-3.5" />, tabKey: 'repairs', category: 'Фильтры', defaultVisible: true, defaultOrder: 3, scenarios: ['full', 'mechanic'] },
  { key: 'rep_actions', label: 'Действия', description: 'Кнопки: добавить ремонт, вид, экспорт', icon: <Settings2 className="size-3.5" />, tabKey: 'repairs', category: 'Управление', defaultVisible: true, defaultOrder: 4, scenarios: ['full', 'manager', 'mechanic', 'minimal'], required: true },
  { key: 'rep_list', label: 'Список ремонтов', description: 'Основной список ремонтов: таблица или канбан', icon: <Wrench className="size-3.5" />, tabKey: 'repairs', category: 'Данные', defaultVisible: true, defaultOrder: 5, scenarios: ['full', 'manager', 'mechanic', 'minimal'], required: true },

  // ═══ TRIPS TAB ═══
  { key: 'trip_filters', label: 'Фильтры рейсов', description: 'Поиск и фильтры по статусу, технике, экипажу, маршруту', icon: <Filter className="size-3.5" />, tabKey: 'trips', category: 'Фильтры', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager', 'dispatcher', 'minimal'], required: true },
  { key: 'trip_quick_filters', label: 'Быстрые фильтры', description: 'Чипы: все, сегодня, просроченные', icon: <Zap className="size-3.5" />, tabKey: 'trips', category: 'Фильтры', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'dispatcher'] },
  { key: 'trip_crews', label: 'Экипажи', description: 'Список доступных экипажей с карточками', icon: <Users className="size-3.5" />, tabKey: 'trips', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'dispatcher'] },
  { key: 'trip_routes', label: 'Шаблоны маршрутов', description: 'Список шаблонов маршрутов с мини-картой', icon: <Route className="size-3.5" />, tabKey: 'trips', category: 'Данные', defaultVisible: true, defaultOrder: 3, scenarios: ['full', 'dispatcher'] },
  { key: 'trip_actions', label: 'Действия', description: 'Кнопки: добавить рейс, вид, компактный режим', icon: <Settings2 className="size-3.5" />, tabKey: 'trips', category: 'Управление', defaultVisible: true, defaultOrder: 4, scenarios: ['full', 'manager', 'dispatcher', 'minimal'], required: true },
  { key: 'trip_list', label: 'Список рейсов', description: 'Основной список рейсов: таблица или карточки', icon: <Route className="size-3.5" />, tabKey: 'trips', category: 'Данные', defaultVisible: true, defaultOrder: 5, scenarios: ['full', 'manager', 'dispatcher', 'minimal'], required: true },

  // ═══ MAP TAB ═══
  { key: 'map_stats', label: 'Сводка по парку', description: 'Статистика: онлайн/офлайн, средняя скорость, топливо, пробег', icon: <BarChart3 className="size-3.5" />, tabKey: 'map', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'dispatcher', 'manager'] },
  { key: 'map_filters', label: 'Фильтры карты', description: 'Фильтры: онлайн/офлайн/без трекера, тип, поиск, сортировка', icon: <Filter className="size-3.5" />, tabKey: 'map', category: 'Фильтры', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'dispatcher', 'minimal'], required: true },
  { key: 'map_main', label: 'Карта', description: 'Интерактивная карта с трекерами и треками', icon: <Map className="size-3.5" />, tabKey: 'map', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'dispatcher', 'minimal'], required: true },
  { key: 'map_equipment_panel', label: 'Панель техники', description: 'Боковая панель со списком техники на карте', icon: <LayoutGrid className="size-3.5" />, tabKey: 'map', category: 'Данные', defaultVisible: true, defaultOrder: 3, scenarios: ['full', 'dispatcher'] },
  { key: 'map_track_viewer', label: 'Просмотр треков', description: 'Панель просмотра истории перемещений с аналитикой', icon: <Route className="size-3.5" />, tabKey: 'map', category: 'Данные', defaultVisible: true, defaultOrder: 4, scenarios: ['full', 'dispatcher'] },

  // ═══ GLONASS (Equipment detail sub-tab) ═══
  { key: 'gl_map', label: 'Карта', description: 'Карта с местоположением техники и треками', icon: <MapPin className="size-3.5" />, tabKey: 'glonass', category: 'Данные', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'dispatcher', 'mechanic', 'minimal'], required: true },
  { key: 'gl_location', label: 'Местоположение', description: 'Координаты, скорость, курс, высота, адрес', icon: <MapPin className="size-3.5" />, tabKey: 'glonass', category: 'Данные', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'dispatcher', 'mechanic', 'minimal'] },
  { key: 'gl_sensors', label: 'Датчики', description: 'Данные датчиков из Axenta: топливо, зажигание, температура, пробег и др.', icon: <Gauge className="size-3.5" />, tabKey: 'glonass', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'dispatcher', 'mechanic'] },
  { key: 'gl_ident', label: 'Идентификация', description: 'Название трекера, ID, IMEI, телефон', icon: <Cog className="size-3.5" />, tabKey: 'glonass', category: 'Данные', defaultVisible: true, defaultOrder: 3, scenarios: ['full', 'mechanic'] },
  { key: 'gl_comm', label: 'Связь', description: 'Время выхода на связь, последняя позиция, активность', icon: <WifiOff className="size-3.5" />, tabKey: 'glonass', category: 'Данные', defaultVisible: true, defaultOrder: 4, scenarios: ['full', 'dispatcher'] },
  { key: 'gl_commands', label: 'Команды трекера', description: 'Отправка команд на трекер: перезагрузка, позиция, блокировка и др.', icon: <Terminal className="size-3.5" />, tabKey: 'glonass', category: 'Управление', defaultVisible: true, defaultOrder: 5, scenarios: ['full', 'mechanic'] },
  { key: 'gl_history', label: 'Данные за период', description: 'Запрос исторических данных за выбранный период', icon: <Calendar className="size-3.5" />, tabKey: 'glonass', category: 'Аналитика', defaultVisible: true, defaultOrder: 6, scenarios: ['full', 'dispatcher'] },
  { key: 'gl_stats', label: 'Статистика за период', description: 'Пробег, скорость, расход топлива, моточасы за выбранный период', icon: <Activity className="size-3.5" />, tabKey: 'glonass', category: 'Аналитика', defaultVisible: true, defaultOrder: 7, scenarios: ['full', 'manager'] },
  { key: 'gl_actions', label: 'Действия', description: 'Синхронизация, обновление, отключение трекера', icon: <Settings2 className="size-3.5" />, tabKey: 'glonass', category: 'Управление', defaultVisible: true, defaultOrder: 8, scenarios: ['full', 'mechanic', 'minimal'], required: true },

  // ═══ COMPANIES (Management sub-tab) ═══
  { key: 'comp_stats', label: 'Статистика компаний', description: 'Карточки: своя техника, арендованная, всего компаний', icon: <BarChart3 className="size-3.5" />, tabKey: 'companies', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager'] },
  { key: 'comp_actions', label: 'Действия', description: 'Поиск, фильтр по типу, добавить компанию, экспорт', icon: <Settings2 className="size-3.5" />, tabKey: 'companies', category: 'Управление', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'manager', 'minimal'], required: true },
  { key: 'comp_list', label: 'Список компаний', description: 'Таблица или карточки компаний', icon: <Building2 className="size-3.5" />, tabKey: 'companies', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'manager', 'minimal'], required: true },

  // ═══ EMPLOYEES (Management sub-tab) ═══
  { key: 'emp_stats', label: 'Статистика сотрудников', description: 'Водители, механики, активные, просроченные ВУ, ФОТ', icon: <BarChart3 className="size-3.5" />, tabKey: 'employees', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager'] },
  { key: 'emp_filters', label: 'Фильтры сотрудников', description: 'Поиск, фильтр по должности, статусу, экипажу', icon: <Filter className="size-3.5" />, tabKey: 'employees', category: 'Фильтры', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'manager', 'minimal'], required: true },
  { key: 'emp_list', label: 'Список сотрудников', description: 'Таблица или карточки сотрудников', icon: <Users className="size-3.5" />, tabKey: 'employees', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'manager', 'minimal'], required: true },

  // ═══ CREWS (Management sub-tab) ═══
  { key: 'crew_stats', label: 'Статистика экипажей', description: 'Всего экипажей, активные, всего участников', icon: <BarChart3 className="size-3.5" />, tabKey: 'crews', category: 'Статистика', defaultVisible: true, defaultOrder: 0, scenarios: ['full', 'manager', 'dispatcher'] },
  { key: 'crew_filters', label: 'Фильтры экипажей', description: 'Поиск, фильтр по типу и статусу', icon: <Filter className="size-3.5" />, tabKey: 'crews', category: 'Фильтры', defaultVisible: true, defaultOrder: 1, scenarios: ['full', 'manager', 'minimal'], required: true },
  { key: 'crew_list', label: 'Список экипажей', description: 'Таблица или карточки экипажей', icon: <Users className="size-3.5" />, tabKey: 'crews', category: 'Данные', defaultVisible: true, defaultOrder: 2, scenarios: ['full', 'manager', 'dispatcher', 'minimal'], required: true },
]

// ─── Helper functions ─────────────────────────────────────────

/** Get all panels for a specific tab */
export function getPanelsForTab(tabKey: string): PanelDef[] {
  return PANEL_REGISTRY.filter(p => p.tabKey === tabKey).sort((a, b) => a.defaultOrder - b.defaultOrder)
}

/** Get a specific panel definition */
export function getPanelDef(key: string): PanelDef | undefined {
  return PANEL_REGISTRY.find(p => p.key === key)
}

/** Get default panel configuration for a tab */
export function getDefaultPanelConfig(tabKey: string): PanelConfig[] {
  return getPanelsForTab(tabKey).map(p => ({
    key: p.key,
    visible: p.defaultVisible,
    collapsed: false,
    order: p.defaultOrder,
  }))
}

/** Get categories for a tab */
export function getCategoriesForTab(tabKey: string): string[] {
  const cats = new Set<string>()
  getPanelsForTab(tabKey).forEach(p => cats.add(p.category))
  return Array.from(cats)
}

// ─── Scenario Presets ─────────────────────────────────────────

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'full',
    label: 'Полный',
    description: 'Все панели видны — максимальная информация',
    icon: <LayoutGrid className="size-4" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    panels: {}, // empty = all visible, default
  },
  {
    id: 'dispatcher',
    label: 'Диспетчер',
    description: 'Мониторинг техники и рейсов: карта, список, уведомления, быстрые фильтры',
    icon: <Monitor className="size-4" />,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    panels: {
      // Equipment: hide fleet value, hide status chips
      eq_stats: { visible: true, collapsed: false },
      eq_fleet_value: { visible: false, collapsed: false },
      eq_quick_filters: { visible: true, collapsed: false },
      eq_status_chips: { visible: false, collapsed: false },
      // Repairs: hide stats, show list only
      rep_stats: { visible: false, collapsed: false },
      rep_top_repaired: { visible: false, collapsed: false },
      rep_quick_filters: { visible: false, collapsed: false },
      // Trips: show crews & routes
      trip_crews: { visible: true, collapsed: false },
      trip_routes: { visible: true, collapsed: false },
    },
  },
  {
    id: 'mechanic',
    label: 'Механик',
    description: 'Фокус на ремонтах: статистика ремонтов, список, статус техники',
    icon: <Wrench className="size-4" />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    panels: {
      // Equipment: show stats, hide fleet value
      eq_stats: { visible: true, collapsed: false },
      eq_fleet_value: { visible: false, collapsed: false },
      eq_quick_filters: { visible: true, collapsed: false },
      eq_status_chips: { visible: false, collapsed: false },
      // Repairs: show everything
      rep_stats: { visible: true, collapsed: false },
      rep_top_repaired: { visible: true, collapsed: false },
      rep_quick_filters: { visible: true, collapsed: false },
      // Trips: hide crews & routes
      trip_crews: { visible: false, collapsed: false },
      trip_routes: { visible: false, collapsed: false },
      // Map: hide track viewer
      map_track_viewer: { visible: false, collapsed: false },
    },
  },
  {
    id: 'manager',
    label: 'Руководитель',
    description: 'Полный обзор: вся статистика, стоимость парка, утилизация',
    icon: <Briefcase className="size-4" />,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    panels: {
      // Everything visible, focus on stats
      eq_stats: { visible: true, collapsed: false },
      eq_fleet_value: { visible: true, collapsed: false },
      eq_status_chips: { visible: true, collapsed: false },
      rep_stats: { visible: true, collapsed: false },
      rep_top_repaired: { visible: true, collapsed: false },
      map_stats: { visible: true, collapsed: false },
      comp_stats: { visible: true, collapsed: false },
      emp_stats: { visible: true, collapsed: false },
      crew_stats: { visible: true, collapsed: false },
    },
  },
  {
    id: 'minimal',
    label: 'Минималистичный',
    description: 'Только фильтры и список — минимум отвлекающих элементов',
    icon: <List className="size-4" />,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    panels: {
      // Hide all stats
      eq_stats: { visible: false, collapsed: false },
      eq_fleet_value: { visible: false, collapsed: false },
      eq_quick_filters: { visible: false, collapsed: false },
      eq_status_chips: { visible: false, collapsed: false },
      rep_stats: { visible: false, collapsed: false },
      rep_top_repaired: { visible: false, collapsed: false },
      rep_quick_filters: { visible: false, collapsed: false },
      trip_crews: { visible: false, collapsed: false },
      trip_routes: { visible: false, collapsed: false },
      trip_quick_filters: { visible: false, collapsed: false },
      map_stats: { visible: false, collapsed: false },
      map_track_viewer: { visible: false, collapsed: false },
      map_equipment_panel: { visible: false, collapsed: false },
      comp_stats: { visible: false, collapsed: false },
      emp_stats: { visible: false, collapsed: false },
      crew_stats: { visible: false, collapsed: false },
    },
  },
]

// ─── localStorage helpers ─────────────────────────────────────

const STORAGE_PREFIX = 'fleet_panels_'

export function loadPanelConfig(tabKey: string): PanelConfig[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + tabKey)
    if (!raw) return null
    return JSON.parse(raw) as PanelConfig[]
  } catch {
    return null
  }
}

export function savePanelConfig(tabKey: string, config: PanelConfig[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + tabKey, JSON.stringify(config))
  } catch { /* ignore quota errors */ }
}

export function clearPanelConfig(tabKey: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_PREFIX + tabKey)
  } catch { /* ignore */ }
}

/** Apply a scenario preset, returning new config for a tab */
export function applyScenarioToTab(tabKey: string, scenarioId: string): PanelConfig[] {
  const scenario = SCENARIO_PRESETS.find(s => s.id === scenarioId)
  const defaults = getDefaultPanelConfig(tabKey)

  if (!scenario || scenario.id === 'full') {
    // "Full" = all visible, reset to defaults
    return defaults.map(c => ({ ...c, visible: true, collapsed: false }))
  }

  // Apply scenario overrides
  return defaults.map(d => {
    const override = scenario.panels[d.key]
    if (override) {
      return { ...d, visible: override.visible, collapsed: override.collapsed }
    }
    // Panels not mentioned in scenario: hide non-required, keep required visible
    const def = getPanelDef(d.key)
    if (def?.required) {
      return { ...d, visible: true, collapsed: false }
    }
    // If scenario explicitly includes panels for this tab, hide unmentioned ones
    const tabPanelsInScenario = Object.keys(scenario.panels).filter(k => {
      const pd = getPanelDef(k)
      return pd?.tabKey === tabKey
    })
    if (tabPanelsInScenario.length > 0) {
      return { ...d, visible: false, collapsed: false }
    }
    // If scenario doesn't mention any panels for this tab, keep defaults
    return d
  })
}
