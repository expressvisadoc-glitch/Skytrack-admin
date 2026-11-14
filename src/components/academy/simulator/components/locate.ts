/**
 * Finding the current target inside the stage.
 *
 * The phone mock scrolls inside its own screen, so a target can exist in the DOM yet sit below the
 * phone's fold. Measuring it there would put the spotlight hole and the instruction card over
 * nothing. Before measuring, the target's scrollable ancestor (inside the stage only — the page is
 * left alone) is scrolled just enough to show it.
 */

export function findTarget(container: HTMLElement, target: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-tutorial-target="${CSS.escape(target)}"]`)
}

function scrollableAncestor(el: HTMLElement, stop: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== stop; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

/** Scrolls `el` into view within its own scroll area, then returns its rect relative to `container`. */
export function locateTarget(container: HTMLElement, target: string, reveal = true) {
  const el = findTarget(container, target)
  if (!el) return null
  if (reveal) {
    const scroller = scrollableAncestor(el, container)
    if (scroller) {
      const s = scroller.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      const margin = 12
      if (r.top < s.top + margin || r.height > s.height - margin * 2) {
        scroller.scrollTop += r.top - s.top - margin
      } else if (r.bottom > s.bottom - margin) {
        scroller.scrollTop += r.bottom - s.bottom + margin
      }
    }
  }
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height }
}
