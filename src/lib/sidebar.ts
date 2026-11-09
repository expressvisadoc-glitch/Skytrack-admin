import { useSyncExternalStore } from 'react'

/**
 * Collapsed (icons only) or expanded side menu on desktop. The choice is kept per browser (localStorage) and
 * applied as the `sidebar-collapsed` class on <html>, which sets --sidebar-w for the menu, the header and the page
 * (see index.css). index.html applies a saved choice before the first paint so the layout never jumps.
 */
const STORAGE_KEY = 'skytrack-sidebar'
const CLASS_NAME = 'sidebar-collapsed'
const listeners = new Set<() => void>()

function isCollapsed(): boolean {
  return document.documentElement.classList.contains(CLASS_NAME)
}

export function setSidebarCollapsed(collapsed: boolean): void {
  document.documentElement.classList.toggle(CLASS_NAME, collapsed)
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded')
  } catch {
    // Private mode or storage blocked: the choice still applies for this visit
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSidebarCollapsed(): { collapsed: boolean; toggleCollapsed: () => void } {
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false)
  return { collapsed, toggleCollapsed: () => setSidebarCollapsed(!collapsed) }
}
