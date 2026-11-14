import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_META, searchArticles, suggestedSearches, type AcademyRole, type SearchHit } from '../../lib/academy'

interface AcademySearchProps {
  role: AcademyRole
  onOpenArticle: (id: string) => void
  /** Rendered large on the Academy home, compact in the header elsewhere */
  variant?: 'hero' | 'compact'
}

/**
 * Searches titles, keywords, synonyms, descriptions and body text, plus the curated intent phrases
 * in metadata/intents.json — which is why "salary cut" finds the deductions article even though
 * neither word is in its title.
 */
export function AcademySearch({ role, onOpenArticle, variant = 'compact' }: AcademySearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const hits: SearchHit[] = useMemo(() => searchArticles(query, role), [query, role])
  const suggestions = useMemo(() => suggestedSearches(role), [role])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const choose = (id: string) => {
    onOpenArticle(id)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % hits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + hits.length) % hits.length) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(hits[active].article.id) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const isHero = variant === 'hero'
  const showPanel = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className={`relative ${isHero ? 'w-full max-w-2xl' : 'w-full max-w-sm'}`}>
      <div className="relative">
        <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${isHero ? 'text-[22px]' : 'text-[19px]'}`}>
          search
        </span>
        <input
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="academy-search-results"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={isHero ? 'Search the guides — try "salary cut" or "cannot check in"' : 'Search guides…'}
          className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 ${
            isHero ? 'h-13 pl-11 pr-4 py-3.5 text-[14px]' : 'h-10 pl-10 pr-3 text-[13px]'
          }`}
        />
      </div>

      {isHero && !showPanel && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] text-slate-400 dark:text-slate-500">Common questions:</span>
          {suggestions.map((s) => (
            <button
              key={s} type="button" onClick={() => { setQuery(s); setOpen(true) }}
              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[11.5px] text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showPanel && (
        <div
          id="academy-search-results"
          role="listbox"
          className="absolute z-30 mt-2 w-full max-h-[26rem] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        >
          {hits.length === 0 ? (
            <div className="p-5 text-center">
              <span className="material-symbols-outlined text-[28px] text-slate-300 dark:text-slate-600">search_off</span>
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mt-1">No guides match “{query}”</p>
              <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1">
                Try a word you would use out loud, such as “late” or “payslip”.
              </p>
            </div>
          ) : (
            <ul className="py-1.5">
              {hits.map((hit, n) => (
                <li key={hit.article.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={n === active}
                    onMouseEnter={() => setActive(n)}
                    onClick={() => choose(hit.article.id)}
                    className={`w-full text-left px-3.5 py-2.5 flex flex-col gap-0.5 cursor-pointer ${
                      n === active ? 'bg-slate-50 dark:bg-slate-800' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">
                        {CATEGORY_META[hit.article.category].icon}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{hit.article.title}</span>
                      {hit.article.featureStatus !== 'live' && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2 pl-6">
                      {hit.excerpt ?? hit.article.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
