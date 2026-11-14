import { CATEGORY_META, type AcademyCategory } from '../../lib/academy'

interface CategoryCardProps {
  category: AcademyCategory
  count: number
  onOpen: (category: AcademyCategory) => void
}

/** One tile on the Academy home grid. */
export function CategoryCard({ category, count, onOpen }: CategoryCardProps) {
  const meta = CATEGORY_META[category]
  return (
    <button
      type="button"
      onClick={() => onOpen(category)}
      className="group glass-panel rounded-2xl border border-slate-200/70 p-5 text-left flex flex-col gap-2 hover:border-red-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[21px]">{meta.icon}</span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">{meta.label}</h3>
          <p className="text-[11.5px] text-slate-400">
            {count} {count === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </div>
      <p className="text-[12.5px] text-slate-500 leading-relaxed">{meta.blurb}</p>
    </button>
  )
}
