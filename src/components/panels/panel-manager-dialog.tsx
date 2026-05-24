'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus, X, ArrowUp, ArrowDown, Eye, EyeOff,
  ChevronDown, ChevronUp, RotateCcw, LayoutGrid,
  GripVertical, Check, Sparkles, Search
} from 'lucide-react'
import {
  getPanelsForTab, getPanelDef, SCENARIO_PRESETS,
  getDefaultPanelConfig,
} from '@/lib/panel-registry'
import type { PanelConfigAPI } from '@/lib/use-panel-config'

// ═══════════════════════════════════════════════════════════════
// PanelManagerDialog — Full dialog for managing panels on a tab:
// reorder, toggle visibility, collapse, add hidden panels,
// apply scenario presets, reset to defaults
// ═══════════════════════════════════════════════════════════════

interface PanelManagerDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  tabKey: string
  tabLabel: string
  panelConfig: PanelConfigAPI
}

export const PanelManagerDialog = React.memo(function PanelManagerDialog({
  open,
  onOpenChange,
  tabKey,
  tabLabel,
  panelConfig,
}: PanelManagerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'panels' | 'scenarios'>('panels')

  const tabPanels = getPanelsForTab(tabKey)
  const sortedPanels = [...panelConfig.panels].sort((a, b) => a.order - b.order)

  // Filter by search
  const filteredPanels = sortedPanels.filter(p => {
    const def = getPanelDef(p.key)
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      def?.label.toLowerCase().includes(q) ||
      def?.description.toLowerCase().includes(q) ||
      def?.category.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q)
    )
  })

  // Group visible panels by category
  const visiblePanels = filteredPanels.filter(p => p.visible)
  const hiddenPanels = filteredPanels.filter(p => !p.visible)

  const handleApplyScenario = (scenarioId: string) => {
    panelConfig.applyScenario(scenarioId)
  }

  const handleReset = () => {
    panelConfig.resetToDefaults()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="size-4" />
            Управление панелями — {tabLabel}
          </DialogTitle>
          <DialogDescription>
            Настройте отображение панелей на этой вкладке. Перемещайте, скрывайте или добавляйте панели.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-md">
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'panels' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('panels')}
          >
            <LayoutGrid className="size-3" />
            Панели ({visiblePanels.length}/{sortedPanels.length})
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'scenarios' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('scenarios')}
          >
            <Sparkles className="size-3" />
            Сценарии
          </button>
        </div>

        {activeTab === 'panels' && (
          <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Поиск панелей..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Visible panels */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Видимые панели ({visiblePanels.length})
              </p>
              {visiblePanels.map((panel, idx) => {
                const def = getPanelDef(panel.key)
                if (!def) return null
                return (
                  <div
                    key={panel.key}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md border transition-colors ${
                      panel.collapsed ? 'bg-muted/30 opacity-70' : 'bg-card'
                    }`}
                  >
                    <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground shrink-0">{def.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{def.label}</span>
                        {def.required && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                            Обяз.
                          </Badge>
                        )}
                        {panel.collapsed && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                            Свёрнута
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => panelConfig.moveUp(panel.key)} disabled={idx === 0} title="Вверх">
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => panelConfig.moveDown(panel.key)} disabled={idx === visiblePanels.length - 1} title="Вниз">
                        <ArrowDown className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => panelConfig.toggleCollapse(panel.key)} title={panel.collapsed ? 'Развернуть' : 'Свернуть'}>
                        {panel.collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
                      </Button>
                      {!def.required && (
                        <Button variant="ghost" size="icon" className="size-6 text-red-500 hover:text-red-700" onClick={() => panelConfig.hidePanel(panel.key)} title="Скрыть">
                          <EyeOff className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hidden panels (available to add) */}
            {hiddenPanels.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Скрытые панели ({hiddenPanels.length})
                </p>
                {hiddenPanels.map(panel => {
                  const def = getPanelDef(panel.key)
                  if (!def) return null
                  return (
                    <div
                      key={panel.key}
                      className="flex items-center gap-2 px-2 py-2 rounded-md border border-dashed bg-muted/20"
                    >
                      <span className="text-muted-foreground shrink-0">{def.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate">{def.label}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                      </div>
                      <Button
                        variant="outline" size="sm"
                        className="h-6 text-[10px] gap-1 shrink-0"
                        onClick={() => panelConfig.addPanel(panel.key)}
                      >
                        <Plus className="size-3" />
                        Добавить
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {filteredPanels.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Ничего не найдено
              </div>
            )}
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Выберите предустановку для быстрой настройки
            </p>
            {SCENARIO_PRESETS.map(scenario => (
              <button
                key={scenario.id}
                className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors"
                onClick={() => handleApplyScenario(scenario.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${scenario.color}`}>
                    {scenario.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{scenario.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{scenario.description}</p>
                  </div>
                  <Check className="size-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline" size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleReset}
          >
            <RotateCcw className="size-3" />
            Сбросить
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="h-7 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
