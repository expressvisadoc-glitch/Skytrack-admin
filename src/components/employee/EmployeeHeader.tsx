import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export function EmployeeHeader({ 
  onSelectTab, 
  onToggleSidebar 
}: { 
  onSelectTab?: (tab: string) => void
  onToggleSidebar?: () => void 
}) {
  const { employee, logout } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <header className="fixed top-0 lg:left-72 left-0 right-0 h-20 bg-white/75 backdrop-blur-xl border-b border-slate-200/70 z-40 flex items-center justify-between px-4 lg:px-8 transition-all">
      {/* Brand & Mobile Menu */}
      <div className="flex items-center gap-4 lg:gap-6 w-full max-w-xl">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-bold text-base text-slate-900 tracking-tight hidden sm:block">SkyTrack Workforce</span>
        </div>
      </div>

      {/* Right Header Utilities */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Operational Date Pill */}
        <div className="hidden xl:flex items-center gap-2 text-slate-600 px-3.5 py-1.5 bg-white/80 rounded-full border border-slate-200/70 shadow-xs">
          <span className="material-symbols-outlined text-[17px] text-red-500">calendar_today</span>
          <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
        </div>

        {/* Operational Live Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Active Session</span>
        </div>

        {/* Employee Profile Pill */}
        <button
          onClick={() => onSelectTab && onSelectTab('profile')}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all cursor-pointer text-left"
          title="View profile"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {employee?.name ? employee.name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div className="flex flex-col hidden md:flex">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{employee?.name || 'My Account'}</span>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">{employee?.employee_id || employee?.employeeId || 'Staff'}</span>
          </div>
        </button>

        {/* Logout Quick Action */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer"
          title="Sign out of workspace"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
