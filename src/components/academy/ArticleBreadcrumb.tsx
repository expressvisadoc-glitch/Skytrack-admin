import { CATEGORY_META, type AcademyCategory } from '../../lib/academy'

interface ArticleBreadcrumbProps {
  category?: AcademyCategory
  title?: string
  onHome: () => void
  onCategory: (category: AcademyCategory) => void
}

/** Academy → Category → Article. Every level before the last is navigable. */
export function ArticleBreadcrumb({ category, title, onHome, onCategory }: ArticleBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] font-semibold flex-wrap">
      <button type="button" onClick={onHome} className="text-slate-500 hover:text-red-600 cursor-pointer">
        Academy
      </button>
      {category && (
        <>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => onCategory(category)}
            className="text-slate-500 hover:text-red-600 cursor-pointer"
          >
            {CATEGORY_META[category].label}
          </button>
        </>
      )}
      {title && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 truncate max-w-[11rem] sm:max-w-[18rem] lg:max-w-[22rem]">{title}</span>
        </>
      )}
    </nav>
  )
}
