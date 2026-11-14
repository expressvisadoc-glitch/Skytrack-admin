import type { TutorialDefinition } from '../engine/types'

interface CompletionScreenProps {
  definition: TutorialDefinition
  onRestart: () => void
  onExit: () => void
}

/** Shown when the walkthrough finishes, with the points worth remembering. */
export function CompletionScreen({ definition, onRestart, onExit }: CompletionScreenProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">task_alt</span>
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Tutorial complete</h3>
            <p className="text-[12px] text-slate-500">{definition.completion.message}</p>
          </div>
        </div>

        {definition.completion.points && (
          <ul className="flex flex-col gap-1.5">
            {definition.completion.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[12.5px] text-slate-700 leading-relaxed">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5 shrink-0">check</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onRestart}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Try the other path
          </button>
          <button type="button" onClick={onExit}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold cursor-pointer">
            Back to the guide
          </button>
        </div>
      </div>
    </div>
  )
}
