import { useSyncExternalStore } from 'react'

/**
 * Light / dark theme. The choice is kept per browser (localStorage) and applied as the `dark` class on <html>.
 * index.html applies a saved dark choice before the first paint so the page never flashes white.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'skytrack-theme'
const listeners = new Set<() => void>()

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private mode or storage blocked: the theme still applies for this visit
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme)
  return { theme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
