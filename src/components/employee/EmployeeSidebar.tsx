import { useAuth } from '../../contexts/AuthContext'
import { SidebarFrame, type SidebarNavItem } from '../SidebarFrame'

interface EmployeeSidebarProps {
  activeTab: string
  onSelectTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function EmployeeSidebar({ activeTab, onSelectTab, isOpen, onClose }: EmployeeSidebarProps) {
  const { employee } = useAuth()
  const initial = employee?.name ? employee.name.charAt(0).toUpperCase() : 'E'
  const name = employee?.name || 'Employee'
  const employeeCode = employee?.employee_id || employee?.employeeId || 'Staff'

  const navItems: SidebarNavItem[] = [
    { id: 'home', label: 'Attendance & Breaks', icon: 'how_to_reg' },
    { id: 'leave', label: 'Leave Requests', icon: 'event_busy' },
    { id: 'monthly', label: 'Monthly Overview', icon: 'calendar_month' },
    { id: 'holidays', label: 'Public Holidays', icon: 'event_available' },
    { id: 'profile', label: 'My Account', icon: 'person' },
  ]

  return (
    <SidebarFrame
      items={navItems}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      isOpen={isOpen}
      onClose={onClose}
      sectionLabel="My Workspace"
      brandBadge="Employee Portal"
      footer={(compact) =>
        compact ? (
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-xs"
            title={`${name} · ${employeeCode}`}
          >
            {initial}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
              {initial}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-800 truncate">{name}</span>
              <span className="text-[10px] font-semibold text-slate-400 truncate">{employeeCode}</span>
            </div>
          </div>
        )
      }
    />
  )
}
