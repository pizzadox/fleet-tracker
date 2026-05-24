'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus, ChevronRight, ChevronLeft, Loader2, Calendar,
  Save, Truck, Wrench, Settings2, HeartPulse, ScanLine,
  Hash, FileBadge, Fuel as FuelIcon,
  Activity, AlertTriangle, Bus, Car, Clock, Cog, DollarSign, Droplets, Edit, Gauge,
  IdCard, MapPin, Navigation, Package, Palette, Route, Satellite, Search, Shield, Ship,
  StickyNote, Tractor, TrendingDown, User, Users, Weight, XCircle, Zap,
  CheckCircle2, ClipboardCheck, Building2, FileText
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Equipment, Company } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EQUIPMENT_STATUS_MAP, EQUIPMENT_TYPE_MAP, EQUIPMENT_TYPE_GROUPS, EQUIPMENT_CONDITION_MAP, FUEL_TYPE_MAP, ENGINE_TYPE_MAP, COMPANY_TYPES, API } from '@/lib/constants'
import { toLocalDatetime, localDatetimeToISO, toLocalDate, formatDate, formatDateTime, handleApiError } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// EQUIPMENT FORM DIALOG (Multi-Step)
// ═══════════════════════════════════════════════════════════════

export function EquipmentFormDialog({ open, onOpenChange, editData, companies, step, setStep, saving, setSaving, onSaved }: {
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
          <div className="space-y-3 px-6 overflow-y-auto flex-1 min-h-0 py-3 max-h-[60dvh]">
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
        <div className="px-6 overflow-y-auto flex-1 min-h-0 py-3 max-h-[55dvh]" key={step}>
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

