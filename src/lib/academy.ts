/**
 * SkyTrack Academy — content layer.
 *
 * The 101 articles in docs/academy/ are the single source of truth. They are bundled at build time
 * with import.meta.glob, so there is no backend, no migration and no second copy to keep in sync.
 * Front matter is parsed here with a small reader rather than a YAML dependency: the shape is fixed
 * by docs/academy/ARTICLE_METADATA_SPEC.md and validated in CI by metadata/validate.py.
 */

import featureStatus from '../../docs/academy/metadata/feature-status.json'
import intentsData from '../../docs/academy/metadata/intents.json'

export type AcademyRole = 'employee' | 'admin' | 'super_admin'
export type FeatureStatus = 'live' | 'branch_only' | 'built_disabled' | 'planned'
export type AcademyCategory =
  | 'getting-started' | 'employee' | 'administrator' | 'monitoring' | 'troubleshooting' | 'payroll'

export interface AcademyArticle {
  id: string
  title: string
  description: string
  category: AcademyCategory
  subcategory?: string
  feature: string
  roles: AcademyRole[]
  keywords: string[]
  synonyms: string[]
  relatedArticles: string[]
  relatedTutorials: string[]
  featureStatus: FeatureStatus
  screens: string[]
  errorCodes: string[]
  lastUpdated: string
  docVersion: string
  tutorialId: string | null
  /** Markdown body, front matter removed */
  body: string
  /** Lower-cased body, built once for search */
  searchText: string
}

export const CATEGORY_META: Record<AcademyCategory, { label: string; icon: string; blurb: string }> = {
  'getting-started': { label: 'Getting Started', icon: 'rocket_launch', blurb: 'Signing in, finding your way, and your first day' },
  employee: { label: 'Employee Guide', icon: 'person', blurb: 'Attendance, breaks, leave, holidays and your pay' },
  administrator: { label: 'Administrator Guide', icon: 'admin_panel_settings', blurb: 'Running the workforce day to day' },
  monitoring: { label: 'Monitoring', icon: 'monitoring', blurb: 'Watching attendance and the audit trail' },
  troubleshooting: { label: 'Troubleshooting', icon: 'build', blurb: 'When something is refused or will not work' },
  payroll: { label: 'Payroll', icon: 'account_balance_wallet', blurb: 'Salaries, deductions, month end and payslips' },
}

export const CATEGORY_ORDER: AcademyCategory[] = [
  'getting-started', 'employee', 'administrator', 'payroll', 'monitoring', 'troubleshooting',
]

/**
 * Whether to hide articles whose feature is not released. On this branch geofencing, payroll and
 * notifications ARE present, so they are shown with the availability banner each article already
 * carries. A deployment without those features sets this to true.
 */
const HIDE_UNRELEASED = false

// --- front matter ------------------------------------------------------------------------------

function stripQuotes(value: string): string {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return v
}

function parseInlineList(value: string): string[] {
  const v = value.trim()
  if (!v.startsWith('[')) return []
  return v.slice(1, -1).split(',').map(stripQuotes).filter(Boolean)
}

/** Reads the subset of YAML the spec allows: scalars, inline lists, dash lists and one nested block. */
function parseFrontMatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { meta: {}, body: raw }

  const meta: Record<string, string | string[]> = {}
  let currentKey: string | null = null
  let nestedPrefix: string | null = null

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue
    const dash = /^\s+-\s+(.*)$/.exec(line)
    if (dash && currentKey) {
      const list = (meta[currentKey] as string[]) ?? []
      list.push(stripQuotes(dash[1]))
      meta[currentKey] = list
      continue
    }
    const nested = /^\s{2,}([A-Za-z_]+):\s*(.*)$/.exec(line)
    if (nested && nestedPrefix) {
      meta[`${nestedPrefix}.${nested[1]}`] = stripQuotes(nested[2])
      continue
    }
    const top = /^([A-Za-z_]+):\s*(.*)$/.exec(line)
    if (!top) continue
    const [, key, rest] = top
    if (rest === '') {
      // Either a dash list or a nested block; decided by the next line.
      meta[key] = []
      currentKey = key
      nestedPrefix = key
    } else if (rest.trim().startsWith('[')) {
      meta[key] = parseInlineList(rest)
      currentKey = null
      nestedPrefix = null
    } else {
      meta[key] = stripQuotes(rest)
      currentKey = null
      nestedPrefix = null
    }
  }
  return { meta, body: raw.slice(match[0].length) }
}

const asList = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v : v ? [v] : []
const asText = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')

// --- load --------------------------------------------------------------------------------------

// macOS writes AppleDouble "._" siblings on this volume; they are not articles.
const modules = import.meta.glob('../../docs/academy/**/*.md', { query: '?raw', import: 'default', eager: true })

function buildArticles(): AcademyArticle[] {
  const out: AcademyArticle[] = []
  for (const [path, raw] of Object.entries(modules)) {
    const file = path.split('/').pop() ?? ''
    if (file.startsWith('._') || file === 'README.md') continue
    // Only the six content categories; the planning documents at the root are not articles.
    const segments = path.split('/')
    const category = segments[segments.length - 2] as AcademyCategory
    if (!CATEGORY_META[category]) continue

    const { meta, body } = parseFrontMatter(raw as string)
    const id = asText(meta.id)
    if (!id) continue

    out.push({
      id,
      title: asText(meta.title),
      description: asText(meta.description),
      category,
      subcategory: asText(meta.subcategory) || undefined,
      feature: asText(meta.feature),
      roles: asList(meta.roles) as AcademyRole[],
      keywords: asList(meta.keywords),
      synonyms: asList(meta.synonyms),
      relatedArticles: asList(meta.related_articles),
      relatedTutorials: asList(meta.related_tutorials),
      featureStatus: (asText(meta.feature_status) || 'live') as FeatureStatus,
      screens: asList(meta.screens),
      errorCodes: asList(meta.error_codes),
      lastUpdated: asText(meta.last_updated),
      docVersion: asText(meta.doc_version),
      tutorialId: asText(meta['tutorial.tutorial_id']) || null,
      body,
      searchText: body.toLowerCase(),
    })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

export const ARTICLES: AcademyArticle[] = buildArticles()
export const ARTICLES_BY_ID = new Map(ARTICLES.map((a) => [a.id, a]))

export function featureLabel(feature: string): string {
  const entry = (featureStatus.features as Record<string, { label?: string }>)[feature]
  return entry?.label ?? feature
}

// --- role and availability ---------------------------------------------------------------------

/**
 * Articles the viewer should see. Frontend visibility is a usability measure, NOT an authorisation
 * mechanism — the Academy holds no confidential data, and real access control lives in the Edge
 * Function. Hiding administrator articles from employees stops them following instructions that
 * would only fail; it is not a security boundary.
 */
export function visibleArticles(role: AcademyRole): AcademyArticle[] {
  return ARTICLES.filter((a) => {
    if (!a.roles.includes(role)) return false
    if (HIDE_UNRELEASED && a.featureStatus !== 'live') return false
    return true
  })
}

export function categoriesForRole(role: AcademyRole): AcademyCategory[] {
  const available = new Set(visibleArticles(role).map((a) => a.category))
  return CATEGORY_ORDER.filter((c) => available.has(c))
}

export function countByCategory(role: AcademyRole): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const a of visibleArticles(role)) counts[a.category] = (counts[a.category] ?? 0) + 1
  return counts
}

// --- search ------------------------------------------------------------------------------------

export interface SearchHit {
  article: AcademyArticle
  score: number
  /** A short excerpt around the first body match, for the results list */
  excerpt: string | null
}

const INTENTS = intentsData.intents as { intent: string; phrases: string[]; article: string }[]
const ERROR_CODE_MAP = intentsData.error_code_map as Record<string, string>

/** Finds the article that answers a server error code, so a failed action can open the right help. */
export function articleForErrorCode(code: string): AcademyArticle | null {
  const id = ERROR_CODE_MAP[code]
  return id ? (ARTICLES_BY_ID.get(id) ?? null) : null
}

function excerptAround(body: string, needle: string): string | null {
  const i = body.toLowerCase().indexOf(needle)
  if (i < 0) return null
  const start = Math.max(0, i - 60)
  const text = body.slice(start, i + needle.length + 90).replace(/[#>*`|\-\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + text + '…'
}

/**
 * Ranked search over titles, keywords, synonyms, descriptions and body text, plus the curated
 * intent phrases — which is how "salary cut" finds the deductions article even though neither
 * word appears in its title.
 */
export function searchArticles(query: string, role: AcademyRole): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const terms = q.split(/\s+/).filter(Boolean)
  const pool = visibleArticles(role)

  // Curated intents win: they map how people actually speak onto the right article.
  const intentBoost = new Map<string, number>()
  for (const intent of INTENTS) {
    const phrases = [intent.intent, ...intent.phrases].map((p) => p.toLowerCase())
    const exact = phrases.some((p) => p === q)
    const partial = phrases.some((p) => p.includes(q) || q.includes(p))
    if (exact) intentBoost.set(intent.article, 400)
    else if (partial) intentBoost.set(intent.article, Math.max(intentBoost.get(intent.article) ?? 0, 180))
  }

  const hits: SearchHit[] = []
  for (const article of pool) {
    let score = intentBoost.get(article.id) ?? 0
    const title = article.title.toLowerCase()
    const description = article.description.toLowerCase()
    const keywords = article.keywords.map((k) => k.toLowerCase())
    const synonyms = article.synonyms.map((s) => s.toLowerCase())

    if (title === q) score += 300
    if (title.includes(q)) score += 120
    if (keywords.some((k) => k === q)) score += 150
    if (keywords.some((k) => k.includes(q))) score += 70
    if (synonyms.some((s) => s.includes(q) || q.includes(s))) score += 90
    if (description.includes(q)) score += 50
    if (article.searchText.includes(q)) score += 25

    for (const term of terms) {
      if (title.includes(term)) score += 30
      if (keywords.some((k) => k.includes(term))) score += 20
      if (synonyms.some((s) => s.includes(term))) score += 15
      if (description.includes(term)) score += 10
      if (article.searchText.includes(term)) score += 4
    }

    if (score > 0) {
      hits.push({ article, score, excerpt: excerptAround(article.body, terms[0]) })
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title)).slice(0, 25)
}

/** A few starting points shown before anything is typed. */
export function suggestedSearches(role: AcademyRole): string[] {
  const base = role === 'employee'
    ? ['check in', 'apply for leave', 'salary cut', 'leave balance', 'cannot check in']
    : ['approve leave', 'close the month', 'fix attendance', 'late deduction', 'set a salary']
  return base
}
