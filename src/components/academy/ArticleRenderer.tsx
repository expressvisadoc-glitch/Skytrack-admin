import { Fragment, type ReactNode } from 'react'
import { ARTICLES_BY_ID } from '../../lib/academy'

/**
 * Renders the Markdown subset the Academy articles use: headings, paragraphs, lists, tables,
 * blockquotes, code fences, horizontal rules, and inline bold / italic / code / links.
 *
 * Written rather than pulled in as a dependency because the input is a controlled corpus whose
 * shape is fixed by ARTICLE_METADATA_SPEC.md, and because article links are not URLs — they are
 * article ids, which need to navigate inside the Academy rather than leave it.
 */

interface ArticleRendererProps {
  markdown: string
  onOpenArticle: (id: string) => void
}

/** Splits inline markdown into React nodes. */
function renderInline(text: string, onOpenArticle: (id: string) => void): ReactNode[] {
  const nodes: ReactNode[] = []
  // Order matters: code first so its contents are not re-parsed.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>)
    const token = match[0]

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[0.9em] font-mono text-slate-800 dark:text-slate-200">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key++} className="font-bold text-slate-900 dark:text-slate-100">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        const [, label, href] = linkMatch
        if (ARTICLES_BY_ID.has(href)) {
          nodes.push(
            <button
              key={key++}
              type="button"
              onClick={() => onOpenArticle(href)}
              className="text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer text-left"
            >
              {label}
            </button>,
          )
        } else if (/^https?:\/\//.test(href)) {
          nodes.push(
            <a key={key++} href={href} target="_blank" rel="noreferrer" className="text-red-600 dark:text-red-400 hover:underline font-semibold">
              {label}
            </a>,
          )
        } else {
          // A link to an article that does not exist — show the label, not a dead control.
          nodes.push(<Fragment key={key++}>{label}</Fragment>)
        }
      }
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  return nodes
}

function splitRow(line: string): string[] {
  return line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
}

export function ArticleRenderer({ markdown, onOpenArticle }: ArticleRendererProps) {
  const lines = markdown.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0
  const inline = (t: string) => renderInline(t, onOpenArticle)

  while (i < lines.length) {
    const line = lines[i]

    // Blank
    if (!line.trim()) { i++; continue }

    // Code fence
    if (line.trim().startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { body.push(lines[i]); i++ }
      i++
      blocks.push(
        <pre key={key++} className="my-4 p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 text-[12.5px] leading-relaxed overflow-x-auto font-mono">
          <code>{body.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-7 border-slate-200 dark:border-slate-700" />)
      i++
      continue
    }

    // Heading
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = heading[2]
      if (level === 1) {
        blocks.push(<h1 key={key++} className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mt-2 mb-4">{inline(text)}</h1>)
      } else if (level === 2) {
        blocks.push(<h2 key={key++} className="text-[17px] font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-7 mb-2.5">{inline(text)}</h2>)
      } else {
        blocks.push(<h3 key={key++} className="text-[14.5px] font-bold text-slate-800 dark:text-slate-200 mt-5 mb-2">{inline(text)}</h3>)
      }
      i++
      continue
    }

    // Blockquote (availability banners live here)
    if (line.trim().startsWith('>')) {
      const body: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        body.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      const text = body.join(' ')
      const isNotice = /not available yet/i.test(text)
      blocks.push(
        <div
          key={key++}
          className={`my-4 px-4 py-3 rounded-xl border text-[13px] leading-relaxed ${
            isNotice
              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200'
              : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          {isNotice && <span className="material-symbols-outlined text-[18px] align-middle mr-1.5">schedule</span>}
          {inline(text)}
        </div>,
      )
      continue
    }

    // Table
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++ }
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {header.map((cell, n) => (
                  <th key={n} className="text-left font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wide py-2 pr-4 align-bottom">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                  {row.map((cell, c) => (
                    <td key={c} className="py-2.5 pr-4 text-slate-700 dark:text-slate-300 leading-relaxed">{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="my-3 ml-5 list-decimal flex flex-col gap-1.5 text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed marker:text-slate-400 marker:font-semibold">
          {items.map((it, n) => <li key={n} className="pl-1">{inline(it)}</li>)}
        </ol>,
      )
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="my-3 ml-5 list-disc flex flex-col gap-1.5 text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed marker:text-slate-300">
          {items.map((it, n) => <li key={n} className="pl-1">{inline(it)}</li>)}
        </ul>,
      )
      continue
    }

    // Paragraph: gather until a blank line or a block starter
    const para: string[] = []
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4}\s|>|\||```|---+$|\d+\.\s|[-*]\s)/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim())
      i++
    }
    if (para.length) {
      blocks.push(
        <p key={key++} className="my-3 text-[13.5px] text-slate-700 dark:text-slate-300 leading-[1.75]">
          {inline(para.join(' '))}
        </p>,
      )
    } else {
      i++
    }
  }

  return <div className="academy-article">{blocks}</div>
}
