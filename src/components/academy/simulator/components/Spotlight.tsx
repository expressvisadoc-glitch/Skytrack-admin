import { useLayoutEffect, useState } from 'react'
import { locateTarget } from './locate'

interface SpotlightProps {
  /** data-tutorial-target of the element to highlight; null dims everything */
  target: string | null
  containerRef: React.RefObject<HTMLElement | null>
}

interface Rect { top: number; left: number; width: number; height: number }

/**
 * Dims the mock interface and cuts a hole around the current target.
 *
 * Drawn as four panels around the target rather than a box-shadow, so the hole is genuinely
 * transparent and the highlighted control keeps its real colours.
 */
export function Spotlight({ target, containerRef }: SpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !target) { setRect(null); return }

    const pad = 6
    const measure = (reveal: boolean) => {
      const r = locateTarget(container, target, reveal)
      setRect(r && { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }
    // On a new step, bring the target into view inside the phone; afterwards only follow it, so a
    // learner who scrolls the phone themselves is not dragged back.
    measure(true)
    const follow = () => measure(false)
    const settle = window.setTimeout(follow, 60)
    const observer = new MutationObserver(follow)
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] })
    window.addEventListener('resize', follow)
    container.addEventListener('scroll', follow, true)   // scroll does not bubble; capture sees the phone's
    return () => {
      window.clearTimeout(settle)
      observer.disconnect()
      window.removeEventListener('resize', follow)
      container.removeEventListener('scroll', follow, true)
    }
  }, [target, containerRef])

  const dim = 'absolute bg-slate-900/55 transition-all duration-200'

  if (!rect) {
    return <div className="absolute inset-0 bg-slate-900/55 pointer-events-none z-20" aria-hidden="true" />
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
      <div className={dim} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
      <div className={dim} style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
      <div className={dim} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
      <div className={dim} style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />
      <div
        className="absolute rounded-xl ring-2 ring-red-500 ring-offset-0 transition-all duration-200 animate-pulse"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />
    </div>
  )
}
