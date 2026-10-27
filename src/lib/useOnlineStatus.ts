import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** The browser's real network status (navigator.onLine), updated when the connection changes. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
