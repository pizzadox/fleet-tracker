'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
import { PanelConfigContext } from '@/components/panels/panel-section'
import { PanelManagerDialog } from '@/components/panels/panel-manager-dialog'
import { usePanelConfig } from '@/lib/use-panel-config'
import type { PanelConfigAPI } from '@/lib/use-panel-config'

// ═══════════════════════════════════════════════════════════════
// useTabPanels — Convenience hook that provides everything
// a tab needs for panel management:
// - panelConfig (with context provider value)
// - PanelManagerDialog state
// - Manage panels button
// ═══════════════════════════════════════════════════════════════

export function useTabPanels(tabKey: string) {
  const panelConfig = usePanelConfig(tabKey)
  const [panelManagerOpen, setPanelManagerOpen] = useState(false)

  return {
    panelConfig,
    panelManagerOpen,
    setPanelManagerOpen,
    // Context provider value
    contextValue: panelConfig,
  }
}

// ═══════════════════════════════════════════════════════════════
// PanelManagerButton — Small button to open panel manager
// ═══════════════════════════════════════════════════════════════

export function PanelManagerButton({
  panelConfig,
  onClick,
}: {
  panelConfig: PanelConfigAPI
  onClick: () => void
}) {
  return (
    <Button
      variant={panelConfig.editMode ? 'default' : 'outline'}
      size="sm"
      className="h-9 px-2 gap-1"
      onClick={onClick}
      title="Управление панелями"
    >
      <LayoutGrid className="size-3.5" />
    </Button>
  )
}

// Re-export for convenience
export { PanelConfigContext, PanelSection } from '@/components/panels/panel-section'
export { PanelManagerDialog } from '@/components/panels/panel-manager-dialog'
export { PanelWrapper } from '@/components/panels/panel-wrapper'
