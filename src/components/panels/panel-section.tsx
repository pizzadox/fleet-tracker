'use client'

import React, { createContext, useContext } from 'react'
import type { PanelConfigAPI } from '@/lib/use-panel-config'
import { getPanelDef } from '@/lib/panel-registry'
import { ChevronDown, ChevronRight, Minimize2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// PanelSection — Wraps a section of a tab to make it a
// manageable panel. Supports visibility, collapse, and
// CSS-based reordering.
//
// Usage:
//   <PanelSection panelKey="eq_stats">
//     <div>... stats content ...</div>
//   </PanelSection>
// ═══════════════════════════════════════════════════════════════

// Context to share panel config within a tab
const PanelConfigContext = createContext<PanelConfigAPI | null>(null)

export function usePanelConfigContext() {
  return useContext(PanelConfigContext)
}

export { PanelConfigContext }

interface PanelSectionProps {
  panelKey: string
  children: React.ReactNode
  /** Disable collapse for this section */
  noCollapse?: boolean
  className?: string
}

export const PanelSection = React.memo(function PanelSection({
  panelKey,
  children,
  noCollapse = false,
  className = '',
}: PanelSectionProps) {
  const panelConfig = useContext(PanelConfigContext)
  if (!panelConfig) return <div className={className}>{children}</div>

  const visible = panelConfig.isVisible(panelKey)
  const collapsed = panelConfig.isCollapsed(panelKey)
  const def = getPanelDef(panelKey)

  // Get order from config
  const panelData = panelConfig.panels.find(p => p.key === panelKey)
  const order = panelData?.order ?? 0

  if (!visible) return null

  // Collapsed state: show a clickable bar with icon and label
  if (collapsed && !noCollapse) {
    return (
      <div
        className={className}
        style={{ order }}
      >
        <button
          onClick={() => panelConfig.toggleCollapse(panelKey)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-xs text-muted-foreground group/collapse"
        >
          <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover/collapse:translate-x-0.5" />
          {def?.icon && <span className="shrink-0">{def.icon}</span>}
          <span className="font-medium">{def?.label || panelKey}</span>
          <span className="text-[10px] opacity-50 ml-1">свёрнуто</span>
          <ChevronDown className="size-3 ml-auto opacity-0 group-hover/collapse:opacity-60 transition-opacity" />
        </button>
      </div>
    )
  }

  // Normal render with collapse button
  return (
    <div
      className={`group/panel relative ${className}`}
      style={{ order }}
    >
      {/* Collapse button — visible on hover */}
      {!noCollapse && !panelConfig.editMode && (
        <button
          onClick={() => panelConfig.toggleCollapse(panelKey)}
          className="absolute right-1.5 top-1.5 z-10 size-6 rounded-md bg-muted/80 hover:bg-muted border shadow-sm flex items-center justify-center opacity-0 group-hover/panel:opacity-100 transition-all hover:scale-105"
          title="Свернуть панель"
        >
          <Minimize2 className="size-3" />
        </button>
      )}

      {/* Edit mode toolbar */}
      {panelConfig.editMode && (
        <div className="flex items-center gap-1.5 px-2 py-1 mb-1 rounded-md bg-primary/5 border border-dashed border-primary/30">
          {def?.icon}
          <span className="text-[10px] font-medium text-primary">{def?.label || panelKey}</span>
          {def?.required && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">
              Обязательная
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  )
})
