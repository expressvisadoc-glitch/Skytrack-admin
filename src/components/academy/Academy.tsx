import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  ARTICLES_BY_ID, CATEGORY_META, countByCategory, categoriesForRole, visibleArticles,
  type AcademyArticle, type AcademyCategory, type AcademyRole,
} from '../../lib/academy'
import { AcademyLayout } from './AcademyLayout'
import { AcademyHeader } from './AcademyHeader'
import { AcademySearch } from './AcademySearch'
import { CategoryCard } from './CategoryCard'
import { ArticleRenderer } from './ArticleRenderer'
import { RelatedArticles } from './RelatedArticles'
import { TutorialLauncher } from './TutorialLauncher'
import { FeedbackWidget } from './FeedbackWidget'
import { AssistantLauncher } from './AssistantLauncher'
import { TutorialPlayer } from './simulator/engine/TutorialPlayer'
import { tutorialForArticle } from './simulator/scenarios'

interface AcademyProps {
  /** Opens a specific article on mount, e.g. from contextual help */
  initialArticleId?: string | null
}

/**
 * The Academy screen. Browsing and search work entirely without the assistant, which is the
 * completion condition for this phase.
 */
export function Academy({ initialArticleId = null }: AcademyProps) {
  const { employee, isAdmin } = useAuth()

  // Three real audiences; `manager` is deliberately not one of them. See docs/academy/ROLE_PERMISSIONS.md.
  const role: AcademyRole = useMemo(() => {
    const raw = String((employee as { role?: string } | null)?.role ?? '').toLowerCase()
    if (raw === 'super_admin' || raw === 'superadmin') return 'super_admin'
    return isAdmin ? 'admin' : 'employee'
  }, [employee, isAdmin])

  const [articleId, setArticleId] = useState<string | null>(initialArticleId)
  const [category, setCategory] = useState<AcademyCategory | null>(null)
  const [tutorialArticleId, setTutorialArticleId] = useState<string | null>(null)

  const article: AcademyArticle | null = articleId ? (ARTICLES_BY_ID.get(articleId) ?? null) : null
  const categories = useMemo(() => categoriesForRole(role), [role])
  const counts = useMemo(() => countByCategory(role), [role])
  const articles = useMemo(() => visibleArticles(role), [role])

  // Keep the sidebar in step with whatever is open.
  useEffect(() => {
    if (article) setCategory(article.category)
  }, [article])

  useEffect(() => {
    if (initialArticleId) setArticleId(initialArticleId)
  }, [initialArticleId])

  const openArticle = useCallback((id: string) => {
    setArticleId(id)
    setTutorialArticleId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const runningTutorial = tutorialArticleId ? tutorialForArticle(tutorialArticleId) : null

  const goHome = useCallback(() => { setArticleId(null); setCategory(null) }, [])
  const openCategory = useCallback((c: AcademyCategory) => { setCategory(c); setArticleId(null) }, [])

  // An article the viewer's role cannot use — reachable only via a stale link.
  const forbidden = Boolean(articleId && article && !article.roles.includes(role))
  const missing = Boolean(articleId && !article)

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-28 min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              Academy
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">
              Help &amp; Training
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            SkyTrack Academy
          </h1>
          <p className="text-[13.5px] text-slate-500">
            Guides for everything you can do in SkyTrack, written for your role.
          </p>
        </div>

        <AcademyLayout
          role={role}
          activeCategory={category}
          activeArticleId={articleId}
          onSelectCategory={openCategory}
          onOpenArticle={openArticle}
        >
          {missing ? (
            <ErrorPanel
              icon="link_off"
              title="That guide does not exist"
              body="The link may be out of date. Search above, or start from a category."
              onHome={goHome}
            />
          ) : forbidden ? (
            <ErrorPanel
              icon="lock"
              title="That guide is for a different role"
              body="It describes actions your account cannot perform, so it is not shown here. If you believe you need it, ask an administrator."
              onHome={goHome}
            />
          ) : article ? (
            <article className="glass-panel rounded-2xl border border-slate-200/70 p-5 sm:p-7">
              {runningTutorial ? (
                <TutorialPlayer definition={runningTutorial} onExit={() => setTutorialArticleId(null)} />
              ) : (
              <>
              <AcademyHeader
                role={role}
                category={article.category}
                title={article.title}
                onHome={goHome}
                onCategory={openCategory}
                onOpenArticle={openArticle}
              />
              <ArticleRenderer markdown={article.body} onOpenArticle={openArticle} />
              <TutorialLauncher article={article} onLaunch={() => setTutorialArticleId(article.id)} />
              <RelatedArticles article={article} role={role} onOpenArticle={openArticle} />
              <FeedbackWidget articleId={article.id} />
              <p className="mt-6 text-[11px] text-slate-400">
                Last updated {article.lastUpdated} · version {article.docVersion}
              </p>
              </>
              )}
            </article>
          ) : category ? (
            <section className="glass-panel rounded-2xl border border-slate-200/70 p-5 sm:p-7">
              <AcademyHeader
                role={role}
                category={category}
                onHome={goHome}
                onCategory={openCategory}
                onOpenArticle={openArticle}
              />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {CATEGORY_META[category].label}
              </h2>
              <p className="text-[13px] text-slate-500 mt-1">{CATEGORY_META[category].blurb}</p>
              <ul className="mt-5 flex flex-col gap-2">
                {articles.filter((a) => a.category === category).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => openArticle(a.id)}
                      className="w-full text-left rounded-xl border border-slate-200 px-4 py-3 hover:border-red-300 hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-slate-800">{a.title}</span>
                            {a.featureStatus !== 'live' && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                                Not released
                              </span>
                            )}
                          </span>
                          <span className="block text-[12px] text-slate-500 mt-0.5">{a.description}</span>
                        </span>
                        <span className="material-symbols-outlined text-[19px] text-slate-300 group-hover:text-red-500 shrink-0">
                          chevron_right
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex flex-col gap-6">
              <section className="glass-panel rounded-2xl border border-slate-200/70 p-6 sm:p-8 flex flex-col items-center text-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  What do you need help with?
                </h2>
                <AcademySearch role={role} onOpenArticle={openArticle} variant="hero" />
              </section>

              {categories.length === 0 ? (
                <ErrorPanel
                  icon="menu_book"
                  title="No guides available yet"
                  body="There is nothing published for your role at the moment."
                  onHome={goHome}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categories.map((c) => (
                    <CategoryCard key={c} category={c} count={counts[c] ?? 0} onOpen={openCategory} />
                  ))}
                </div>
              )}
            </div>
          )}
        </AcademyLayout>
      </div>

      <AssistantLauncher />
    </main>
  )
}

function ErrorPanel({ icon, title, body, onHome }: { icon: string; title: string; body: string; onHome: () => void }) {
  return (
    <div className="glass-panel rounded-2xl border border-slate-200/70 p-10 flex flex-col items-center text-center gap-3">
      <span className="material-symbols-outlined text-[34px] text-slate-300">{icon}</span>
      <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
      <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed">{body}</p>
      <button
        type="button" onClick={onHome}
        className="mt-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold transition-colors cursor-pointer"
      >
        Back to the Academy
      </button>
    </div>
  )
}
