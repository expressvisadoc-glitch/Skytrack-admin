import { useAuth } from '../contexts/AuthContext'
import { SidebarFrame, type SidebarNavItem } from './SidebarFrame'

interface SidebarProps {
  activeTab: string
  onSelectTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ activeTab, onSelectTab, isOpen, onClose }: SidebarProps) {
  const { employee } = useAuth()
  const isSuperAdmin = employee?.role === 'super_admin'

  const navItems: SidebarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'employees', label: 'Employees', icon: 'badge' },
    { id: 'attendance', label: 'Attendance', icon: 'how_to_reg' },
    { id: 'leave-management', label: 'Leave Management', icon: 'event_busy' },
    { id: 'public-holidays', label: 'Public Holidays', icon: 'event_available' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'organization', label: 'Organization', icon: 'corporate_fare' },
    { id: 'office-geofence', label: 'Office Geofence', icon: 'location_on' },
    { id: 'payroll', label: 'Payroll', icon: 'account_balance_wallet' },
    { id: 'payroll-settings', label: 'Payroll Settings', icon: 'tune' },
    ...(isSuperAdmin ? [{ id: 'admin-management', label: 'Admin Management', icon: 'admin_panel_settings' }] : []),
  ]

  return (
    <SidebarFrame
      items={navItems}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      isOpen={isOpen}
      onClose={onClose}
      sectionLabel="Menu Overview"
    />
  )
}
