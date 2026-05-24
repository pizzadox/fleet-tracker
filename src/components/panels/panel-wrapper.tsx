'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ChevronDown, ChevronUp, ChevronRight,
  GripVertical, X, Eye, EyeOff, ArrowUp, ArrowDown,
  PanelLeftClose
} from 'lucide-react'
import { getPanelDef } from '@/lib/panel-registry'
import type { PanelConfigAPI } from '@/lib/use-panel-config'

// ═══════════════════════════════════════════════════════════════
// PanelWrapper — Wraps each panel section with controls for
// edit mode: drag handle, move up/down, collapse, hide
// ═══════════════════════════════════════════════════════════════

interface PanelWrapperProps {
  panelKey: string
  editMode: boolean
  panelConfig: PanelConfigAPI
  children: React.ReactNode
  /** If true, this panel cannot be collapsed (e.g., filters) */
  noCollapse?: boolean
  /** Additional className for the wrapper */
  className?: string
}

export const PanelWrapper = React.memo(function PanelWrapper({
  panelKey,
  editMode,
  panelConfig,
  children,
  noCollapse = false,
  className = '',
}: PanelWrapperProps) {
  const def = getPanelDef(panelKey)
  const collapsed = panelConfig.isCollapsed(panelKey)
  const isRequired = def?.required ?? false

  if (!editMode) {
    // Normal mode: just render with optional collapse
    if (collapsed && !noCollapse) {
      return (
        <div className={className}>
          <button
            onClick={() => panelConfig.toggleCollapse(panelKey)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground"
          >
            <ChevronRight className="size-3" />
            {def?.icon}
            <span className="font-medium">{def?.label || panelKey}</span>
            <span className="text-[10px] opacity-60">(свёрнуто)</span>
          </button>
        </div>
      )
    }

    return (
      <div className={`group/panel relative ${className}`}>
        {/* Collapse toggle on hover (non-edit mode) */}
        {!noCollapse && (
          <button
            onClick={() => panelConfig.toggleCollapse(panelKey)}
            className="absolute -right-1 -top-1 z-10 size-5 rounded-full bg-muted border shadow-sm flex items-center justify-center opacity-0 group-hover/panel:opacity-100 transition-opacity hover:bg-accent"
            title="Свернуть панель"
          >
            <PanelLeftClose className="size-3" />
          </button>
        )}
        {children}
      </div>
    )
  }

  // ═══ EDIT MODE ═══
  return (
    <div className={className}>
      <div className={`relative rounded-lg border-2 transition-all ${
        isRequired
          ? 'border-dashed border-primary/40 bg-primary/5'
          : 'border-dashed border-muted-foreground/30 bg-muted/10'
      } ${collapsed ? 'opacity-60' : ''}`}>
        {/* Edit toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-dashed border-inherit bg-inherit/50 rounded-t-lg">
          {/* Drag handle */}
          <GripVertical className="size-3.5 text-muted-foreground/50 cursor-grab" />

          {/* Panel icon + label */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-muted-foreground">{def?.icon}</span>
            <span className="text-xs font-medium truncate">{def?.label || panelKey}</span>
            {isRequired && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium shrink-0">
                Обязательная
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Move up */}
            <Button
              variant="ghost" size="icon"
              className="size-6"
              onClick={() => panelConfig.moveUp(panelKey)}
              title="Переместить вверх"
            >
              <ArrowUp className="size-3" />
            </Button>

            {/* Move down */}
            <Button
              variant="ghost" size="icon"
              className="size-6"
              onClick={() => panelConfig.moveDown(panelKey)}
              title="Переместить вниз"
            >
              <ArrowDown className="size-3" />
            </Button>

            {/* Collapse toggle */}
            {!noCollapse && (
              <Button
                variant="ghost" size="icon"
                className="size-6"
                onClick={() => panelConfig.toggleCollapse(panelKey)}
                title={collapsed ? 'Развернуть' : 'Свернуть'}
              >
                {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              </Button>
            )}

            {/* Hide (remove) button — not for required panels */}
            {!isRequired && (
              <Button
                variant="ghost" size="icon"
                className="size-6 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={() => panelConfig.hidePanel(panelKey)}
                title="Скрыть панель"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Panel content (if not collapsed) */}
        {!collapsed && (
          <div className="p-1">
            {children}
          </div>
        )}

        {/* Collapsed indicator */}
        {collapsed && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center italic">
            Панель свёрнута
          </div>
        )}
      </div>
    </div>
  )
})
