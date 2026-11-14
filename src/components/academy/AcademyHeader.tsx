import { AcademySearch } from './AcademySearch'
import { ArticleBreadcrumb } from './ArticleBreadcrumb'
import type { AcademyCategory, AcademyRole } from '../../lib/academy'

interface AcademyHeaderProps {
  role: AcademyRole
  category?: AcademyCategory
  title?: string
  onHome: () => void
  onCategory: (category: AcademyCategory) => void
  onOpenArticle: (id: string) => void
}

/** Breadcrumb on the left, search on the right. */
export function AcademyHeader({ role, category, title, onHome, onCategory, onOpenArticle }: AcademyHeaderProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <ArticleBreadcrumb category={category} title={title} onHome={onHome} onCategory={onCategory} />
      <AcademySearch role={role} onOpenArticle={onOpenArticle} variant="compact" />
    </div>
  )
}
