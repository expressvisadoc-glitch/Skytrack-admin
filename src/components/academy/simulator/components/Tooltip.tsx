import { useLayoutEffect, useRef, useState } from 'react'
import type { TooltipPlacement, TutorialStep, TutorialProgress } from '../engine/types'
import { locateTarget } from './locate'

interface TooltipProps {
  step: TutorialStep
  progress: TutorialProgress
  containerRef: React.RefObject<HTMLElement | null>
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  onExit: () => void
}

/**
 * The instruction card. Positions itself against the current target and flips to the opposite side
 * when it would otherwise fall outside the mock, so it never covers the thing it is pointing at.
 */
const HINTS: Partial<Record<TutorialStep['action'], string>> = {
  input: 'Type in the highlighted box and select Continue — or Use the example',
  select: 'Choose an option in the highlighted box',
  conditional: 'Choose one of the highlighted options',
}

export function Tooltip({ step, progress, containerRef, onNext, onPrevious, onSkip, onExit }: TooltipProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; placement: TooltipPlacement }>({
    top: 0, left: 0, placement: step.placement ?? 'bottom',
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    const card = cardRef.current
    if (!container || !card) return

    const place = (reveal: boolean) => {
      const wanted: TooltipPlacement = step.placement ?? 'bottom'
      const c = container.getBoundingClientRect()
      const cw = card.offsetWidth || 320
      const ch = card.offsetHeight || 140
      const gap = 14
      const centred = { top: Math.max(16, c.height / 2 - ch / 2), left: Math.max(16, c.width / 2 - cw / 2), placement: 'center' as const }

      const r = step.target && wanted !== 'center' ? locateTarget(container, step.target, reveal) : null
      if (!r) { setPos(centred); return }
      const { top, left } = r

      const candidates: Record<Exclude<TooltipPlacement, 'center'>, { top: number; left: number }> = {
        bottom: { top: top + r.height + gap, left: left + r.width / 2 - cw / 2 },
        top: { top: top - ch - gap, left: left + r.width / 2 - cw / 2 },
        right: { top: top + r.height / 2 - ch / 2, left: left + r.width + gap },
        left: { top: top + r.height / 2 - ch / 2, left: left - cw - gap },
      }

      // Above/below only have to fit vertically - their horizontal position is clamped afterwards.
      // Requiring a horizontal fit too failed EVERY placement on a phone, where the card is nearly as
      // wide as the stage, and the fallback then clamped the card straight on top of its target.
      const fitsVertically = (p: { top: number }) => p.top >= 8 && p.top + ch <= c.height - 8
      const fitsHorizontally = (p: { left: number }) => p.left >= 8 && p.left + cw <= c.width - 8
      const fits = (side: Exclude<TooltipPlacement, 'center'>) => {
        const p = candidates[side]
        return side === 'top' || side === 'bottom' ? fitsVertically(p) : fitsVertically(p) && fitsHorizontally(p)
      }

      const order: Exclude<TooltipPlacement, 'center'>[] =
        [wanted as Exclude<TooltipPlacement, 'center'>, 'bottom', 'top', 'right', 'left']

      const chosen = order.find((side) => fits(side)) ?? 'bottom'
      const p = candidates[chosen]
      setPos({
        top: Math.min(Math.max(8, p.top), Math.max(8, c.height - ch - 8)),
        left: Math.min(Math.max(8, p.left), Math.max(8, c.width - cw - 8)),
        placement: chosen,
      })
    }

    place(true)
    const follow = () => place(false)
    window.addEventListener('resize', follow)
    container.addEventListener('scroll', follow, true)   // the phone mock scrolls inside the stage
    return () => {
      window.removeEventListener('resize', follow)
      container.removeEventListener('scroll', follow, true)
    }
  }, [step.id, step.target, step.placement, containerRef])

  // Once positioned, make sure the instruction is actually on screen. 'nearest' leaves a desktop
  // layout alone when it already fits, and only scrolls when the card would be cut off.
  useLayoutEffect(() => {
    const id = window.requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [pos.top, pos.left, step.id])

  const needsAction = !['explain', 'inspect', 'complete'].includes(step.action)
  const stepNumber = progress.done.length + 1

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-live="polite"
      aria-label={step.instruction}
      // Read by the automated walkthrough check (docs/academy/metadata), never by the app itself.
      data-step-id={step.id}
      data-step-action={step.action}
      data-step-target={step.target}
      data-step-sample={step.sampleInput}
      data-step-expected={step.expectedValue}
      data-step-branches={step.branches ? Object.keys(step.branches).join(',') : undefined}
      className="absolute z-40 scroll-mt-32 scroll-mb-6 w-[min(22rem,calc(100%-2rem))] rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 flex flex-col gap-2.5"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-red-600">
          Step {stepNumber} of {progress.total}
        </span>
        <button
          type="button" onClick={onExit}
          aria-label="Exit tutorial"
          className="text-slate-400 hover:text-slate-700 cursor-pointer -mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <h3 className="text-[14px] font-bold text-slate-900 leading-snug">{step.instruction}</h3>
      {step.detail && <p className="text-[12.5px] text-slate-600 leading-relaxed">{step.detail}</p>}

      {needsAction && (
        <p className="text-[11.5px] text-red-600 font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">touch_app</span>
          {HINTS[step.action] ?? 'Select the highlighted item to continue'}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
        <button
          type="button" onClick={onPrevious} disabled={progress.stepIndex === 0}
          className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          {step.skippable && (
            <button type="button" onClick={onSkip} className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">
              Skip
            </button>
          )}
          {!needsAction && (
            <button type="button" onClick={onNext} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11.5px] font-bold cursor-pointer">
              {step.action === 'complete' ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
