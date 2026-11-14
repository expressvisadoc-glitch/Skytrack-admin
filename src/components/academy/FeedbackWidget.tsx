import { useEffect, useState } from 'react'

interface FeedbackWidgetProps {
  articleId: string
}

type Vote = 'up' | 'down' | null

/**
 * "Was this helpful?" Votes are kept in this browser only — there is no Academy backend, and the
 * Academy deliberately added no table. The value is telling the writer which articles fail, so when
 * a backend exists this should post instead. Until then it at least stops asking the same reader twice.
 */
export function FeedbackWidget({ articleId }: FeedbackWidgetProps) {
  const storageKey = `skytrack_academy_feedback_${articleId}`
  const [vote, setVote] = useState<Vote>(null)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setNote('')
    setSent(false)
    try {
      const stored = window.localStorage.getItem(storageKey)
      setVote(stored === 'up' || stored === 'down' ? stored : null)
    } catch {
      setVote(null)
    }
  }, [storageKey])

  const record = (next: Exclude<Vote, null>) => {
    setVote(next)
    try { window.localStorage.setItem(storageKey, next) } catch { /* private mode */ }
  }

  if (vote && (sent || vote === 'up')) {
    return (
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-[12.5px] text-slate-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          Thank you — that helps us improve this guide.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12.5px] font-semibold text-slate-600">Was this helpful?</span>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => record('up')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-[12px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">thumb_up</span> Yes
          </button>
          <button
            type="button" onClick={() => record('down')}
            aria-pressed={vote === 'down'}
            className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              vote === 'down'
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">thumb_down</span> No
          </button>
        </div>
      </div>

      {vote === 'down' && !sent && (
        <div className="flex flex-col gap-2 max-w-lg">
          <label htmlFor="academy-feedback" className="text-[11.5px] text-slate-500">
            What was missing or wrong? (optional)
          </label>
          <textarea
            id="academy-feedback" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
          <button
            type="button" onClick={() => setSent(true)}
            className="self-start px-4 py-2 rounded-lg bg-slate-900 text-white text-[12px] font-bold cursor-pointer"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
