'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
import { PanelWrapper } from '@/components/panels/panel-wrapper'
import { PanelManagerDialog } from '@/components/panels/panel-manager-dialog'
import { usePanelConfig } from '@/lib/use-panel-config'

// ═══════════════════════════════════════════════════════════════
// TabPanelProvider — Wraps a tab's content, providing panel
// management capabilities. Each child section with a
// data-panel-key attribute becomes a manageable panel.
//
// Usage:
//   <TabPanelProvider tabKey="equipment" tabLabel="Техника">
//     <div data-panel-key="eq_stats">...</div>
//     <div data-panel-key="eq_filters">...</div>
//     ...
//   </TabPanelProvider>
// ═══════════════════════════════════════════════════════════════

interface TabPanelProviderProps {
  tabKey: string
  tabLabel: string
  children: React.ReactNode
  /** Whether to show the manage panels button inline (default: true) */
  showButton?: boolean
}

export const TabPanelProvider = React.memo(function TabPanelProvider({
  tabKey,
  tabLabel,
  children,
  showButton = true,
}: TabPanelProviderProps) {
  const panelConfig = usePanelConfig(tabKey)
  const [panelManagerOpen, setPanelManagerOpen] = useState(false)

  // Build a map of panel keys to their configured order
  const panelOrderMap = useMemo(() => {
    const map: Record<string, number> = {}
    panelConfig.panels.forEach(p => {
      map[p.key] = p.order
    })
    return map
  }, [panelConfig.panels])

  // Process children: wrap each element with data-panel-key in a PanelWrapper
  const processedChildren = useMemo(() => {
    const childArray = React.Children.toArray(children)

    // Separate children with and without data-panel-key
    const panelChildren: Array<{ key: string; child: React.ReactElement; order: number }> = []
    const nonPanelChildren: React.ReactNode[] = []

    for (const child of childArray) {
      if (React.isValidElement(child) && (child.props as any)['data-panel-key']) {
        const panelKey = (child.props as any)['data-panel-key'] as string
        const order = panelOrderMap[panelKey] ?? 999
        panelChildren.push({ key: panelKey, child, order })
      } else {
        nonPanelChildren.push(child)
      }
    }

    // Sort panel children by configured order
    panelChildren.sort((a, b) => a.order - b.order)

    // Build the rendered panel list
    const renderedPanels = panelChildren.map(({ key, child }) => {
      if (!panelConfig.isVisible(key)) return null

      return (
        <PanelWrapper
          key={key}
          panelKey={key}
          editMode={panelConfig.editMode}
          panelConfig={panelConfig}
        >
          {/* Remove the data-panel-key prop from the rendered child */}
          {React.cloneElement(child, { 'data-panel-key': undefined })}
        </PanelWrapper>
      )
    })

    return [...renderedPanels, ...nonPanelChildren]
  }, [children, panelConfig, panelOrderMap])

  return (
    <>
      <div className="space-y-3">
        {/* Manage Panels button */}
        {showButton && (
          <div className="flex items-center gap-1.5">
            <Button
              variant={panelConfig.editMode ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => setPanelManagerOpen(true)}
              title="Управление панелями"
            >
              <LayoutGrid className="size-3" />
              Панели
            </Button>
            {panelConfig.editMode && (
              <span className="text-[10px] text-muted-foreground">
                Режим редактирования панелей
              </span>
            )}
          </div>
        )}
        {processedChildren}
      </div>

      {/* Panel Manager Dialog */}
      <PanelManagerDialog
        open={panelManagerOpen}
        onOpenChange={setPanelManagerOpen}
        tabKey={tabKey}
        tabLabel={tabLabel}
        panelConfig={panelConfig}
      />
    </>
  )
})
