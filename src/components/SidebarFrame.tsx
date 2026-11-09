import type { ReactNode } from 'react'
import { useSidebarCollapsed } from '../lib/sidebar'
import { useOnlineStatus } from '../lib/useOnlineStatus'

export interface SidebarNavItem {
  id: string
  label: string
  icon: string
  badge?: string
  badgeColor?: string
}

interface SidebarFrameProps {
  items: SidebarNavItem[]
  activeTab: string
  onSelectTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
  sectionLabel: string
  /** Small pill under the SkyTrack name (e.g. "Employee Portal") */
  brandBadge?: string
  /** Extra footer content above the connection status; gets `compact` when the menu is collapsed */
  footer?: (compact: boolean) => ReactNode
}

/**
 * The side menu shared by the admin and employee portals. On desktop it can be collapsed to icons only with the
 * arrow button at the top (the choice is remembered per browser); on phones it is a slide-in drawer that always
 * shows the full menu.
 */
export function SidebarFrame({ items, activeTab, onSelectTab, isOpen, onClose, sectionLabel, brandBadge, footer }: SidebarFrameProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const isOnline = useOnlineStatus()
  // The phone drawer is always full width; collapsing only applies to the desktop menu
  const compact = collapsed && !isOpen

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full w-72 lg:w-[var(--sidebar-w)] bg-white/80 backdrop-blur-2xl border-r border-slate-200/70 z-50 flex flex-col justify-between shadow-[2px_0_24px_rgba(15,23,42,0.03)] transition-[width,transform] duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col min-h-0">
          {/* Top Brand Header */}
          <div className={`relative h-20 flex items-center border-b border-slate-100/80 shrink-0 ${compact ? 'justify-center px-0' : 'justify-between px-6'}`}>
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 ring-4 ring-red-50 text-white font-extrabold text-lg">
                S
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></div>
              </div>
              {!compact && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 tracking-tight text-base leading-none">SkyTrack</span>
                  {brandBadge && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-red-50 text-red-600 border border-red-100 w-fit">
                      {brandBadge}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="lg:hidden w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
            {/* Collapse / expand (desktop). When collapsed it sits on the menu's edge so it stays reachable. */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={compact ? 'Expand menu' : 'Collapse menu'}
              aria-expanded={!compact}
              title={compact ? 'Expand menu' : 'Collapse menu'}
              className={
                compact
                  ? 'hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.12)] text-slate-500 hover:text-red-600 hover:border-red-200 items-center justify-center transition-colors cursor-pointer'
                  : 'hidden lg:flex w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer'
              }
            >
              <span className={`material-symbols-outlined ${compact ? 'text-[18px]' : 'text-[20px]'}`}>
                {compact ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Navigation Section */}
          {compact ? (
            <div className="mx-auto mt-5 mb-3 w-8 border-t border-slate-200/80" aria-hidden="true" />
          ) : (
            <div className="px-5 pt-5 pb-2">
              <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{sectionLabel}</span>
            </div>
          )}
          <nav className={`flex flex-col gap-1.5 ${compact ? 'px-3 items-center' : 'px-4'}`} aria-label={sectionLabel}>
            {items.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  type="button"
                  aria-label={compact ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group/nav relative flex items-center rounded-2xl text-sm transition-all text-left cursor-pointer ${
                    compact ? 'w-12 h-11 justify-center shrink-0' : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-md shadow-red-500/25'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  {!compact && <span>{item.label}</span>}
                  {!compact && item.badge && (
                    <span
                      className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor ? item.badgeColor : isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {compact && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
                  )}
                  {/* Collapsed: the label appears beside the icon on hover or keyboard focus */}
                  {compact && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-lg opacity-0 -translate-x-1 group-hover/nav:opacity-100 group-hover/nav:translate-x-0 group-focus-visible/nav:opacity-100 group-focus-visible/nav:translate-x-0 transition-all duration-150 z-[60]"
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className={`flex flex-col gap-3 ${compact ? 'p-3 items-center' : 'p-4'}`}>
          {footer?.(compact)}
          {/* Connection status */}
          {compact ? (
            <div
              className="relative w-11 h-11 rounded-xl bg-[#181d27] text-red-400 flex items-center justify-center border border-slate-700/50 shadow-xl shadow-slate-900/10"
              role="status"
              title={isOnline ? 'Online · Connected to SkyTrack' : 'Offline · Changes cannot be saved'}
            >
              <span className="material-symbols-outlined text-[18px]">{isOnline ? 'wifi' : 'wifi_off'}</span>
              <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#181d27] text-white flex items-center justify-between shadow-xl shadow-slate-900/10 border border-slate-700/50" role="status">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <span className="material-symbols-outlined text-[18px]">{isOnline ? 'wifi' : 'wifi_off'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white tracking-wide">{isOnline ? 'Online' : 'Offline'}</span>
                  <span className="text-[11px] text-slate-400">{isOnline ? 'Connected to SkyTrack' : 'Changes cannot be saved'}</span>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
