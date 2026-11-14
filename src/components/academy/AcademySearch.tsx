import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
 *
 * The results panel is rendered in a portal. `glass-panel` applies backdrop-filter, which creates a
 * stacking context, so a dropdown positioned inside one is trapped there and later siblings — the
 * category cards — paint straight over it however high its z-index. Portalling to the body and
 * positioning from the input's own rect escapes every stacking context and every overflow clip.
 */
export function AcademySearch({ role, onOpenArticle, variant = 'compact' }: AcademySearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)

  const hits: SearchHit[] = useMemo(() => searchArticles(query, role), [query, role])
  const showPanel = open && query.trim().length >= 2
  const suggestions = useMemo(() => suggestedSearches(role), [role])

  useEffect(() => { setActive(0) }, [query])

  useLayoutEffect(() => {
    if (!showPanel) { setAnchor(null); return }
    const place = () => {
      const el = inputRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 8
      const below = window.innerHeight - r.bottom - gap - 12
      const above = r.top - gap - 12
      // Flip above the field when there is more room there (small screens, keyboard open).
      const openUp = below < 200 && above > below
      setAnchor({
        top: openUp ? Math.max(12, r.top - gap) : r.bottom + gap,
        left: Math.max(12, Math.min(r.left, window.innerWidth - r.width - 12)),
        width: r.width,
        maxHeight: Math.max(160, Math.min(openUp ? above : below, 416)),
      })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [showPanel, hits.length])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inField = containerRef.current?.contains(target)
      const inPanel = (target as HTMLElement).closest?.('[data-academy-search-panel]')
      if (!inField && !inPanel) setOpen(false)
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

  return (
    <div ref={containerRef} className={`relative ${isHero ? 'w-full max-w-2xl' : 'w-full max-w-sm'}`}>
      <div className="relative">
        <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${isHero ? 'text-[22px]' : 'text-[19px]'}`}>
          search
        </span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="academy-search-results"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={isHero ? 'Search the guides…' : 'Search guides…'}
          className={`w-full rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 ${
            isHero ? 'h-13 pl-11 pr-4 py-3.5 text-[14px]' : 'h-10 pl-10 pr-3 text-[13px]'
          }`}
        />
      </div>

      {isHero && !showPanel && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] text-slate-400">Common questions:</span>
          {suggestions.map((s) => (
            <button
              key={s} type="button" onClick={() => { setQuery(s); setOpen(true) }}
              className="px-2.5 py-1 rounded-full border border-slate-200 text-[11.5px] text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showPanel && anchor && createPortal(
        <div
          id="academy-search-results"
          data-academy-search-panel=""
          role="listbox"
          style={{ top: anchor.top, left: anchor.left, width: anchor.width, maxHeight: anchor.maxHeight }}
          className="fixed z-[70] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          {hits.length === 0 ? (
            <div className="p-5 text-center">
              <span className="material-symbols-outlined text-[28px] text-slate-300">search_off</span>
              <p className="text-[13px] font-semibold text-slate-700 mt-1 break-words">No guides match “{query}”</p>
              <p className="text-[11.5px] text-slate-400 mt-1">
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
                      n === active ? 'bg-slate-50' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">
                        {CATEGORY_META[hit.article.category].icon}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-800 truncate">{hit.article.title}</span>
                      {hit.article.featureStatus !== 'live' && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="text-[11.5px] text-slate-500 line-clamp-2 pl-6">
                      {hit.excerpt ?? hit.article.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body,
      )}

    </div>
  )
}
