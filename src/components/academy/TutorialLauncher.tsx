import type { AcademyArticle } from '../../lib/academy'
import { tutorialById } from './simulator/scenarios'

interface TutorialLauncherProps {
  article: AcademyArticle
  onLaunch?: (tutorialId: string) => void
}

/**
 * Entry point to the interactive tutorial for an article. An article may reserve a tutorial id
 * before the walkthrough is written, so the button only becomes live once a definition exists —
 * the Academy's rule is never to offer what the reader cannot use.
 */
export function TutorialLauncher({ article, onLaunch }: TutorialLauncherProps) {
  if (!article.tutorialId) return null
  const available = Boolean(onLaunch) && Boolean(tutorialById(article.tutorialId))

  return (
    <section className="mt-6 rounded-2xl border border-red-100 bg-red-50/60 p-4 flex items-start gap-3.5">
      <span className="w-10 h-10 rounded-xl bg-white border border-red-100 text-red-600 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[21px]">play_circle</span>
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-[13.5px] font-bold text-slate-900">Interactive tutorial</h3>
        <p className="text-[12.5px] text-slate-600 mt-0.5 leading-relaxed">
          Practise this in a simulated SkyTrack. Nothing you do affects real records.
        </p>
        <button
          type="button"
          disabled={!available}
          onClick={() => onLaunch?.(article.tutorialId!)}
          className="mt-2.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {available ? 'Start tutorial' : 'Coming soon'}
        </button>
      </div>
    </section>
  )
}
