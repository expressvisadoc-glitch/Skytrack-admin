import { CATEGORY_META, visibleArticles, categoriesForRole, type AcademyArticle, type AcademyCategory, type AcademyRole } from '../../lib/academy'

interface AcademySidebarProps {
  role: AcademyRole
  activeCategory: AcademyCategory | null
  activeArticleId: string | null
  onSelectCategory: (category: AcademyCategory) => void
  onOpenArticle: (id: string) => void
}

/** Categories, with the articles of the open one listed beneath it. Role-filtered. */
export function AcademySidebar({
  role, activeCategory, activeArticleId, onSelectCategory, onOpenArticle,
}: AcademySidebarProps) {
  const categories = categoriesForRole(role)
  const all = visibleArticles(role)

  const grouped = (category: AcademyCategory): AcademyArticle[] =>
    all.filter((a) => a.category === category)

  return (
    <nav aria-label="Academy categories" className="flex flex-col gap-1">
      {categories.map((category) => {
        const meta = CATEGORY_META[category]
        const isOpen = activeCategory === category
        const articles = isOpen ? grouped(category) : []
        return (
          <div key={category}>
            <button
              type="button"
              onClick={() => onSelectCategory(category)}
              aria-expanded={isOpen}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">{meta.icon}</span>
              <span className="flex-1 text-left truncate">{meta.label}</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{grouped(category).length}</span>
            </button>

            {isOpen && articles.length > 0 && (
              <ul className="mt-1 mb-2 ml-3.5 pl-3 border-l border-slate-200 dark:border-slate-700 flex flex-col gap-0.5">
                {articles.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(a.id)}
                      aria-current={activeArticleId === a.id ? 'page' : undefined}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] leading-snug transition-colors cursor-pointer flex items-start gap-1.5 ${
                        activeArticleId === a.id
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className="flex-1">{a.title}</span>
                      {a.featureStatus !== 'live' && (
                        <span title="Not released yet" className="material-symbols-outlined text-[14px] text-amber-500 shrink-0 mt-0.5">schedule</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
