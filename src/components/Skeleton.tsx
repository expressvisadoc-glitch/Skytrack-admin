/**
 * Loading placeholders in the Dashboard's style: pulsing grey shapes in the layout of the content that is
 * loading. Each set announces "Loading" once to screen readers.
 */

// Relative to the column, so wide tables (many columns) never overflow
const WIDTHS = ['w-3/5', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2', 'w-4/5']

function LoadingLabel() {
  return (
    <span className="sr-only" role="status">
      Loading
    </span>
  )
}

/** Inline placeholder for a single value, e.g. a stat that is still loading */
export function SkeletonValue({ className = 'h-6 w-16' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block align-middle rounded-md bg-slate-200 animate-pulse ${className}`} />
}

/** Placeholder rows for an `.item-list` table: render inside <tbody> */
export function SkeletonTableRows({ columns, rows = 6, avatar = true }: { columns: number; rows?: number; avatar?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="animate-pulse">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className={c === 0 ? 'py-3.5 px-4' : 'py-3.5 px-3'}>
              {r === 0 && c === 0 && <LoadingLabel />}
              {c === 0 ? (
                <div aria-hidden="true" className="flex items-center gap-3">
                  {avatar && <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="h-3 w-full max-w-28 rounded bg-slate-300/80" />
                    <div className="h-2.5 w-3/4 max-w-20 rounded bg-slate-200" />
                  </div>
                </div>
              ) : (
                <div aria-hidden="true" className={`h-3 rounded bg-slate-200 ${WIDTHS[(r + c) % WIDTHS.length]}`} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** A whole placeholder list (for screens that render the table only after loading) */
export function SkeletonTable({ columns, rows = 6, avatar = true }: { columns: number; rows?: number; avatar?: boolean }) {
  return (
    <table className="item-list w-full">
      <tbody>
        <SkeletonTableRows columns={columns} rows={rows} avatar={avatar} />
      </tbody>
    </table>
  )
}

/** Placeholder cards stacked like a card list */
export function SkeletonCards({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <LoadingLabel />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="glass-panel rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className={`h-3 rounded bg-slate-300/80 ${i % 2 ? 'w-2/3' : 'w-1/2'}`} />
            <div className={`h-2.5 rounded bg-slate-200 ${i % 2 ? 'w-1/3' : 'w-2/5'}`} />
          </div>
          <div className="h-6 w-16 rounded-full bg-slate-200 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** A few text lines, for a small section */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2.5 animate-pulse">
      <LoadingLabel />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden="true" className={`h-3 rounded bg-slate-200 ${['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5'][i % 4]}`} />
      ))}
    </div>
  )
}

/** Whole-screen placeholder: title, a row of cards and a large panel (same shapes as the Dashboard's) */
export function SkeletonPage({ cards = 3, className = 'pt-28 px-4 sm:px-8 pb-14' }: { cards?: number; className?: string }) {
  return (
    <main className={`relative w-full ${className}`}>
      <LoadingLabel />
      <div aria-hidden="true" className="flex flex-col w-full gap-7 max-w-7xl mx-auto animate-pulse">
        <div className="space-y-2.5">
          <div className="h-4 w-36 bg-slate-200 rounded-md" />
          <div className="h-8 w-72 max-w-full bg-slate-300 rounded-lg" />
          <div className="h-3.5 w-96 max-w-full bg-slate-200 rounded" />
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-white/80 border border-slate-200/70 p-5 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-9 w-9 bg-slate-200 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-16 bg-slate-300 rounded" />
                <div className="h-3.5 w-28 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-white/80 border border-slate-200/70" />
      </div>
    </main>
  )
}
