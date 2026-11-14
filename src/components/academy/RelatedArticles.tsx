import { ARTICLES_BY_ID, type AcademyArticle, type AcademyRole } from '../../lib/academy'

interface RelatedArticlesProps {
  article: AcademyArticle
  role: AcademyRole
  onOpenArticle: (id: string) => void
}

/** Related reading, filtered to what this viewer can actually use. */
export function RelatedArticles({ article, role, onOpenArticle }: RelatedArticlesProps) {
  const related = article.relatedArticles
    .map((id) => ARTICLES_BY_ID.get(id))
    .filter((a): a is AcademyArticle => Boolean(a) && a!.roles.includes(role))

  if (related.length === 0) return null

  return (
    <section className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
      <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
        Related articles
      </h2>
      <ul className="flex flex-col gap-2">
        {related.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpenArticle(a.id)}
              className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 hover:border-red-300 dark:hover:border-red-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{a.title}</span>
                  <span className="block text-[11.5px] text-slate-400 dark:text-slate-500 truncate">{a.description}</span>
                </span>
                <span className="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600 group-hover:text-red-500 shrink-0">
                  chevron_right
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
