import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  activeTab: string
  onSelectTab: (tab: string) => void
}

export function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
  const { employee } = useAuth()
  const isSuperAdmin = employee?.role === 'super_admin'

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'employees', label: 'Employees', icon: 'badge' },
    { id: 'attendance', label: 'Attendance', icon: 'how_to_reg' },
    { id: 'leave-management', label: 'Leave Management', icon: 'event_busy', badge: '8', badgeColor: 'bg-red-100 text-red-600' },
    { id: 'public-holidays', label: 'Public Holidays', icon: 'event_available' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'organization', label: 'Organization', icon: 'corporate_fare' },
    ...(isSuperAdmin ? [{ id: 'admin-management', label: 'Admin Management', icon: 'admin_panel_settings' }] : []),
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white/80 backdrop-blur-2xl border-r border-slate-200/70 z-50 flex flex-col justify-between shadow-[2px_0_24px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col">
        {/* Top Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100/80">
          <div className="flex items-center gap-3.5">
            {/* Sleek Emblem */}
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 ring-4 ring-red-50 text-white group cursor-pointer transition-transform hover:scale-105 font-extrabold text-lg">
              S
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-base leading-none">SkyTrack</span>
              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-red-50 text-red-600 border border-red-100 w-fit">
                By Skypass Visa Services
              </span>
            </div>
          </div>
          <button className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[19px]">unfold_more</span>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-5 pt-5 pb-2">
          <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Menu Overview</span>
        </div>
        <nav className="flex flex-col gap-1.5 px-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                type="button"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm transition-all text-left cursor-pointer ${isActive
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-md shadow-red-500/25'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-slate-400'
                    }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${item.badgeColor
                      ? item.badgeColor
                      : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom status pill */}
      <div className="p-4">
        <div className="p-3.5 rounded-2xl bg-[#181d27] text-white flex items-center justify-between shadow-xl shadow-slate-900/10 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <span className="material-symbols-outlined text-[18px]">wifi_tethering</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-wide">Online Link</span>
              <span className="text-[11px] text-slate-400">v2.4.0 • Live</span>
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
        </div>
      </div>
    </aside>
  )
}
