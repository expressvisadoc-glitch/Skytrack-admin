import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { TutorialEngine } from './TutorialEngine'
import type { TutorialDefinition } from './types'
import { MockApp } from '../components/MockApp'
import { Spotlight } from '../components/Spotlight'
import { Tooltip } from '../components/Tooltip'
import { CompletionScreen } from '../components/CompletionScreen'

interface TutorialPlayerProps {
  definition: TutorialDefinition
  onExit: () => void
}

/**
 * Runs one tutorial: a mock SkyTrack, dimmed except for the current target, with the instruction
 * card beside it and the controls underneath.
 *
 * The engine is the source of truth; this component only renders it and forwards interactions.
 */
export function TutorialPlayer({ definition, onExit }: TutorialPlayerProps) {
  const engine = useMemo(() => new TutorialEngine(definition), [definition])
  const stageRef = useRef<HTMLDivElement>(null)

  // Re-render whenever the engine changes, without a store or a reducer.
  const version = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getProgress(),
  )

  useEffect(() => { engine.start() }, [engine])

  const progress = version
  const step = engine.getStep()
  const finished = progress.status === 'complete'
  const percent = Math.round((progress.done.length / Math.max(1, progress.total)) * 100)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-slate-900 truncate">{definition.title}</h3>
          <p className="text-[11.5px] text-slate-500">Simulated SkyTrack · no real records are changed</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => engine.restart()}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">restart_alt</span> Restart
          </button>
          <button type="button" onClick={onExit}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Exit
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
          {Math.min(progress.done.length + (finished ? 0 : 1), progress.total)} / {progress.total}
        </span>
      </div>

      {/* Stage */}
      <div ref={stageRef} className="relative rounded-xl overflow-hidden">
        <MockApp engine={engine} />
        {!finished && <Spotlight target={step?.target ?? null} containerRef={stageRef} />}
        {!finished && step && (
          <Tooltip
            step={step}
            progress={progress}
            containerRef={stageRef}
            onNext={() => engine.next()}
            onPrevious={() => engine.previous()}
            onSkip={() => engine.skip()}
            onExit={onExit}
          />
        )}
        {finished && (
          <CompletionScreen definition={definition} onRestart={() => engine.restart()} onExit={onExit} />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Everything above is fictional demo data held in your browser. Press Escape to leave at any time.
      </p>
    </div>
  )
}
