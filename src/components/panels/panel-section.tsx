'use client'

import React, { createContext, useContext } from 'react'
import type { PanelConfigAPI } from '@/lib/use-panel-config'
import { getPanelDef } from '@/lib/panel-registry'
import { ChevronRight, PanelLeftClose } from 'lucide-react'

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

  // Collapsed state: show just a button to expand
  if (collapsed && !noCollapse) {
    return (
      <div
        className={className}
        style={{ order }}
      >
        <button
          onClick={() => panelConfig.toggleCollapse(panelKey)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground"
        >
          <ChevronRight className="size-3" />
          {def?.icon}
          <span className="font-medium">{def?.label || panelKey}</span>
          <span className="text-[10px] opacity-60">(свёрнуто — нажмите чтобы развернуть)</span>
        </button>
      </div>
    )
  }

  // Normal render with optional collapse button on hover
  return (
    <div
      className={`group/panel relative ${className}`}
      style={{ order }}
    >
      {/* Hover collapse button (non-edit mode) */}
      {!noCollapse && !panelConfig.editMode && (
        <button
          onClick={() => panelConfig.toggleCollapse(panelKey)}
          className="absolute -right-1 -top-1 z-10 size-5 rounded-full bg-muted border shadow-sm flex items-center justify-center opacity-0 group-hover/panel:opacity-100 transition-opacity hover:bg-accent"
          title="Свернуть панель"
        >
          <PanelLeftClose className="size-3" />
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
