import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Material Symbols icon name */
  icon: string
  title: string
  description?: string
  /** Smaller variant for side panels and cards */
  compact?: boolean
  action?: ReactNode
}

/** Consistent empty state for admin lists and tables (matches the employee portal's empty states). */
export function EmptyState({ icon, title, description, compact = false, action }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6 px-4 gap-2' : 'py-12 px-6 gap-3'}`}>
      <div className={`${compact ? 'w-10 h-10 rounded-xl' : 'w-14 h-14 rounded-2xl'} bg-slate-100 text-slate-400 flex items-center justify-center`}>
        <span className={`material-symbols-outlined ${compact ? 'text-[20px]' : 'text-[28px]'}`} aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}
