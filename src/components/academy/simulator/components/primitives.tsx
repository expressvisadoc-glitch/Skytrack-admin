import { useState, type ReactNode } from 'react'
import type { TutorialEngine } from '../engine/TutorialEngine'
import type { TutorialStep } from '../engine/types'

/**
 * Building blocks for every mock screen. Each one is only interactive while the engine says it is
 * the current target, and each reports to the engine rather than changing anything itself.
 */

interface TargetProps {
  engine: TutorialEngine
  target: string
  action: TutorialStep['action']
  children: ReactNode
  className?: string
  as?: 'button' | 'div'
  value?: string
}

/** A highlightable element. As a button it reports a click/confirm; as a div it is read ('inspect'). */
export function Target({ engine, target, action, children, className = '', as = 'button', value }: TargetProps) {
  const live = engine.isInteractive(target)
  const common = {
    'data-tutorial-target': target,
    className: `${className} ${live ? 'relative z-30 cursor-pointer' : ''}`.trim(),
  }
  if (as === 'div') return <div {...common}>{children}</div>
  return (
    <button type="button" {...common} onClick={() => engine.attempt(target, action, value)}
      disabled={!live} tabIndex={live ? 0 : -1}>
      {children}
    </button>
  )
}

interface FieldProps {
  engine: TutorialEngine
  target: string
  label: string
  type?: 'text' | 'date' | 'time' | 'number'
  /** Suffix shown after the value, e.g. "m" or "₹" */
  unit?: string
  placeholder?: string
  multiline?: boolean
}

/**
 * A form field for an 'input' step. The learner types, then commits with the button or Enter —
 * never on blur, which would submit when they merely tabbed away. An empty commit uses the step's
 * suggested value, so nobody gets stuck inventing a name or a date.
 */
export function MockField({ engine, target, label, type = 'text', unit, placeholder, multiline }: FieldProps) {
  const live = engine.isInteractive(target)
  const step = engine.getStep()
  const committed = engine.getInput(target)
  // Typed text belongs to one visit of one step: Back, Restart or a later step start it empty again.
  const [draft, setDraft] = useState({ key: '', text: '' })
  const key = `${step?.id}:${engine.getProgress().stepIndex}:${engine.getProgress().done.length}`
  const text = draft.key === key ? draft.text : ''
  const setText = (value: string) => setDraft({ key, text: value })
  const commit = () => engine.attempt(target, 'input', text.trim() || step?.sampleInput)
  const common = 'w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12.5px] bg-white disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500'

  return (
    <div data-tutorial-target={target} className={`flex flex-col gap-1.5 ${live ? 'relative z-30' : ''}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {live ? (
        <>
          {multiline ? (
            <textarea rows={2} value={text} data-field={target} placeholder={step?.sampleInput ?? placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() } }}
              className={common} />
          ) : (
            <input type={type} value={text} data-field={target} placeholder={step?.sampleInput ?? placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
              className={common} />
          )}
          <button type="button" data-commit={target} onClick={commit}
            className="self-end px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11.5px] font-bold cursor-pointer">
            {text.trim() ? 'Continue' : 'Use the example'}
          </button>
        </>
      ) : (
        <div className={`${common} min-h-[2.25rem] flex items-center ${committed ? 'text-slate-800' : 'text-slate-400'}`}>
          {committed ? `${committed}${unit ? ` ${unit}` : ''}` : placeholder ?? '—'}
        </div>
      )}
    </div>
  )
}

interface ChoiceProps {
  engine: TutorialEngine
  target: string
  label: string
  options: { value: string; label: string; hint?: string; disabled?: boolean }[]
  /** Lay options out side by side rather than stacked */
  inline?: boolean
}

/**
 * A choice for a 'select' step. A wrong pick is refused by the engine and explained here, so the
 * learner finds out why rather than wondering why nothing happened.
 */
export function MockChoice({ engine, target, label, options, inline }: ChoiceProps) {
  const live = engine.isInteractive(target)
  const chosen = engine.getInput(target)
  const rejected = engine.getRejected()
  const wrong = live && rejected?.target === target ? options.find((o) => o.value === rejected.value) : undefined
  const expected = options.find((o) => o.value === engine.getStep()?.expectedValue)

  return (
    <div data-tutorial-target={target} className={`flex flex-col gap-1.5 ${live ? 'relative z-30' : ''}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className={inline ? 'flex flex-wrap gap-1.5' : 'flex flex-col gap-1.5'}>
        {options.map((o) => {
          const isChosen = chosen === o.value
          return (
            <button key={o.value} type="button" data-value={o.value}
              disabled={!live || o.disabled}
              onClick={() => engine.attempt(target, 'select', o.value)}
              className={`text-left rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors ${
                isChosen ? 'border-red-300 bg-red-50 text-red-700 font-semibold'
                  : o.disabled ? 'border-slate-200 bg-slate-50 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700'
              } ${live && !o.disabled ? 'cursor-pointer hover:border-red-300' : ''}`}>
              <span className="block">{o.label}</span>
              {o.hint && <span className="block text-[10.5px] text-slate-400">{o.hint}</span>}
            </button>
          )
        })}
      </div>
      {wrong && expected && (
        <p role="alert" className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          Not quite — this step asks for <strong>{expected.label}</strong>.
        </p>
      )}
    </div>
  )
}

/** A dialog inside the mock. Rendered within the stage so the spotlight can still find its buttons. */
export function MockModal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 bg-slate-900/40 flex items-center justify-center p-3">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-4 flex flex-col gap-3">
        <h4 className="text-[13.5px] font-bold text-slate-900">{title}</h4>
        {children}
      </div>
    </div>
  )
}

/** A small read-only label/value list used across screens. */
export function MockRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="font-semibold text-slate-800 text-right">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
