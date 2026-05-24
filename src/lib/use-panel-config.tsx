'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  PanelConfig,
  loadPanelConfig,
  savePanelConfig,
  clearPanelConfig,
  getDefaultPanelConfig,
  getPanelsForTab,
  getPanelDef,
  applyScenarioToTab,
} from '@/lib/panel-registry'

// ═══════════════════════════════════════════════════════════════
// usePanelConfig — Hook for managing panel visibility, order,
// collapse state, and scenario presets per tab
// ═══════════════════════════════════════════════════════════════

export interface PanelConfigAPI {
  /** Current panel configurations (ordered, with visibility) */
  panels: PanelConfig[]
  /** Whether edit mode is active */
  editMode: boolean
  /** Toggle edit mode */
  toggleEditMode: () => void
  /** Set edit mode */
  setEditMode: (v: boolean) => void
  /** Check if a panel is visible */
  isVisible: (key: string) => boolean
  /** Check if a panel is collapsed */
  isCollapsed: (key: string) => boolean
  /** Toggle panel visibility */
  togglePanel: (key: string) => void
  /** Toggle panel collapse */
  toggleCollapse: (key: string) => void
  /** Move panel up in order */
  moveUp: (key: string) => void
  /** Move panel down in order */
  moveDown: (key: string) => void
  /** Move panel to specific position */
  moveTo: (key: string, newOrder: number) => void
  /** Reorder panels (drag-and-drop result) */
  reorderPanels: (oldIndex: number, newIndex: number) => void
  /** Show a hidden panel */
  showPanel: (key: string) => void
  /** Hide a panel */
  hidePanel: (key: string) => void
  /** Apply a scenario preset */
  applyScenario: (scenarioId: string) => void
  /** Reset to defaults */
  resetToDefaults: () => void
  /** Get ordered visible panel keys */
  visiblePanelKeys: string[]
  /** Get available (hidden) panel definitions for adding */
  availablePanels: Array<{ key: string; label: string; description: string; category: string }>
  /** Add a panel back (make visible) */
  addPanel: (key: string) => void
  /** Whether there are any hidden panels that can be added */
  hasHiddenPanels: boolean
}

export function usePanelConfig(tabKey: string): PanelConfigAPI {
  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    const saved = loadPanelConfig(tabKey)
    if (saved && saved.length > 0) {
      // Merge with defaults in case new panels were added
      const defaults = getDefaultPanelConfig(tabKey)
      const savedKeys = new Set(saved.map(p => p.key))
      const newPanels = defaults.filter(d => !savedKeys.has(d.key))
      // Re-assign order for new panels
      const maxOrder = saved.reduce((m, p) => Math.max(m, p.order), 0)
      newPanels.forEach((p, i) => { p.order = maxOrder + 1 + i })
      return [...saved, ...newPanels]
    }
    return getDefaultPanelConfig(tabKey)
  })

  const [editMode, setEditMode] = useState(false)

  // Persist to localStorage whenever panels change
  useEffect(() => {
    savePanelConfig(tabKey, panels)
  }, [tabKey, panels])

  // Visibility check
  const isVisible = useCallback((key: string) => {
    return panels.find(p => p.key === key)?.visible ?? true
  }, [panels])

  // Collapse check
  const isCollapsed = useCallback((key: string) => {
    return panels.find(p => p.key === key)?.collapsed ?? false
  }, [panels])

  // Toggle visibility
  const togglePanel = useCallback((key: string) => {
    setPanels(prev => prev.map(p =>
      p.key === key ? { ...p, visible: !p.visible } : p
    ))
  }, [])

  // Toggle collapse
  const toggleCollapse = useCallback((key: string) => {
    setPanels(prev => prev.map(p =>
      p.key === key ? { ...p, collapsed: !p.collapsed } : p
    ))
  }, [])

  // Move panel up
  const moveUp = useCallback((key: string) => {
    setPanels(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(p => p.key === key)
      if (idx <= 0) return prev
      // Swap orders
      const newPanels = prev.map(p => {
        if (p.key === key) return { ...p, order: sorted[idx - 1].order }
        if (p.key === sorted[idx - 1].key) return { ...p, order: sorted[idx].order }
        return p
      })
      return newPanels
    })
  }, [])

  // Move panel down
  const moveDown = useCallback((key: string) => {
    setPanels(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(p => p.key === key)
      if (idx < 0 || idx >= sorted.length - 1) return prev
      const newPanels = prev.map(p => {
        if (p.key === key) return { ...p, order: sorted[idx + 1].order }
        if (p.key === sorted[idx + 1].key) return { ...p, order: sorted[idx].order }
        return p
      })
      return newPanels
    })
  }, [])

  // Move to specific position
  const moveTo = useCallback((key: string, newOrder: number) => {
    setPanels(prev => {
      return prev.map(p => p.key === key ? { ...p, order: newOrder } : p)
    })
  }, [])

  // Reorder via drag-and-drop
  const reorderPanels = useCallback((oldIndex: number, newIndex: number) => {
    setPanels(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const [moved] = sorted.splice(oldIndex, 1)
      sorted.splice(newIndex, 0, moved)
      // Reassign orders
      return sorted.map((p, i) => ({ ...p, order: i }))
    })
  }, [])

  // Show a panel
  const showPanel = useCallback((key: string) => {
    setPanels(prev => prev.map(p =>
      p.key === key ? { ...p, visible: true } : p
    ))
  }, [])

  // Hide a panel
  const hidePanel = useCallback((key: string) => {
    const def = getPanelDef(key)
    if (def?.required) return // Can't hide required panels
    setPanels(prev => prev.map(p =>
      p.key === key ? { ...p, visible: false } : p
    ))
  }, [])

  // Add panel back
  const addPanel = useCallback((key: string) => {
    setPanels(prev => {
      const maxOrder = prev.reduce((m, p) => Math.max(m, p.order), 0)
      return prev.map(p =>
        p.key === key ? { ...p, visible: true, order: maxOrder + 1 } : p
      )
    })
  }, [])

  // Apply scenario preset
  const applyScenario = useCallback((scenarioId: string) => {
    const newConfig = applyScenarioToTab(tabKey, scenarioId)
    setPanels(newConfig)
  }, [tabKey])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    clearPanelConfig(tabKey)
    setPanels(getDefaultPanelConfig(tabKey))
  }, [tabKey])

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev)
  }, [])

  // Computed: visible panel keys in order
  const visiblePanelKeys = useMemo(() => {
    return panels
      .filter(p => p.visible)
      .sort((a, b) => a.order - b.order)
      .map(p => p.key)
  }, [panels])

  // Computed: available hidden panels
  const availablePanels = useMemo(() => {
    const tabPanels = getPanelsForTab(tabKey)
    const hiddenKeys = new Set(panels.filter(p => !p.visible).map(p => p.key))
    return tabPanels
      .filter(p => hiddenKeys.has(p.key))
      .map(p => ({ key: p.key, label: p.label, description: p.description, category: p.category }))
  }, [tabKey, panels])

  const hasHiddenPanels = availablePanels.length > 0

  return {
    panels,
    editMode,
    toggleEditMode,
    setEditMode,
    isVisible,
    isCollapsed,
    togglePanel,
    toggleCollapse,
    moveUp,
    moveDown,
    moveTo,
    reorderPanels,
    showPanel,
    hidePanel,
    addPanel,
    applyScenario,
    resetToDefaults,
    visiblePanelKeys,
    availablePanels,
    hasHiddenPanels,
  }
}
