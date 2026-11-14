import type { TutorialDefinition } from './simulator/engine/types'

interface TutorialCardProps {
  tutorial: TutorialDefinition
  onStart: (tutorial: TutorialDefinition) => void
  onReadGuide: (articleId: string) => void
}

const ICONS: Record<string, string> = {
  'tutorial.employee.first-checkin': 'fingerprint',
  'tutorial.employee.take-break': 'coffee',
  'tutorial.employee.apply-leave': 'event_note',
  'tutorial.employee.read-monthly': 'calendar_month',
  'tutorial.employee.salary-card': 'visibility',
  'tutorial.administrator.leave-approval': 'event_available',
  'tutorial.administrator.fix-attendance': 'edit_calendar',
  'tutorial.administrator.add-employee': 'person_add',
  'tutorial.administrator.set-salary': 'payments',
  'tutorial.administrator.geofence': 'location_on',
  'tutorial.administrator.month-end': 'lock',
}

/** One tile on the Academy home grid: a walkthrough that can be started right now. */
export function TutorialCard({ tutorial, onStart, onReadGuide }: TutorialCardProps) {
  // Count what the learner does, not the explain/complete cards around it.
  const actions = tutorial.steps.filter((s) => s.action !== 'explain' && s.action !== 'complete').length
  const minutes = Math.max(1, Math.round(tutorial.steps.length / 4))
  return (
    <div className="glass-panel rounded-2xl border border-slate-200/70 p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[21px]">{ICONS[tutorial.id] ?? 'play_circle'}</span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight leading-snug">{tutorial.title}</h3>
          <p className="text-[11.5px] text-slate-400 mt-0.5">
            {actions} steps · about {minutes} min · {tutorial.mock === 'employee' ? 'phone app' : 'admin portal'}
          </p>
        </div>
      </div>
      <p className="text-[12.5px] text-slate-500 leading-relaxed flex-1">{tutorial.description}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onStart(tutorial)}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          Start tutorial
        </button>
        <button
          type="button"
          onClick={() => onReadGuide(tutorial.articleId)}
          className="px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Read the guide
        </button>
      </div>
    </div>
  )
}
