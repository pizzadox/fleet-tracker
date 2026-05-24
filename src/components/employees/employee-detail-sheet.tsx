'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Users, Edit, Trash2, Phone, Mail, Car, Wrench, UserCircle,
  MapPin, Calendar, Shield, IdCard, RefreshCw, User, Loader2, Truck,
  ClipboardCheck, AlertTriangle, ClipboardList
} from 'lucide-react'
import type { Employee, Crew } from '@/lib/types'
import { EMPLOYEE_POSITION_MAP, EMPLOYEE_STATUS_MAP, REPAIR_MASTER_ROLE_MAP, REPAIR_STATUS_MAP, getInitials } from '@/lib/constants'
import { formatDate, formatPrice, statusBadge, TypeBadge, SectionDivider, formatDaysUntil } from '@/lib/utils'
import { DetailSection, DetailRow } from '@/components/equipment/equipment-detail-sheet'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL SHEET
// ═══════════════════════════════════════════════════════════════

export function EmployeeDetailSheet({ open, onOpenChange, employee, loading, crews, onEdit, onDelete, onRefresh }: {
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

