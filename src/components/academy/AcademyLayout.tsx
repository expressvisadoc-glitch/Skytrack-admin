import type { ReactNode } from 'react'
import { AcademySidebar } from './AcademySidebar'
import type { AcademyCategory, AcademyRole } from '../../lib/academy'

interface AcademyLayoutProps {
  role: AcademyRole
  activeCategory: AcademyCategory | null
  activeArticleId: string | null
  onSelectCategory: (category: AcademyCategory) => void
  onOpenArticle: (id: string) => void
  children: ReactNode
}

/**
 * Two-column shell: category navigation beside the content. The navigation collapses above the
 * content on small screens so the Academy is usable on a phone browser.
 */
export function AcademyLayout({
  role, activeCategory, activeArticleId, onSelectCategory, onOpenArticle, children,
}: AcademyLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      {/* On small screens the content comes first and the category list follows it; on wide
          screens the list sits to the left as usual. */}
      <aside className="order-last lg:order-first w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-28">
        <div className="glass-panel rounded-2xl border border-slate-200/70 p-3 max-h-[16rem] lg:max-h-[70vh] overflow-y-auto">
          <AcademySidebar
            role={role}
            activeCategory={activeCategory}
            activeArticleId={activeArticleId}
            onSelectCategory={onSelectCategory}
            onOpenArticle={onOpenArticle}
          />
        </div>
      </aside>
      <div className="order-first lg:order-last flex-1 min-w-0 w-full">{children}</div>
    </div>
  )
}
