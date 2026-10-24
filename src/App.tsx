import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { Employees } from './components/Employees'
import { Attendance } from './components/Attendance'
import { LeaveManagement } from './components/LeaveManagement'
import { PublicHolidays } from './components/PublicHolidays'
import { Settings } from './components/Settings'
import { Organization } from './components/Organization'
import { Login } from './components/Login'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminManagement } from './components/AdminManagement'
import { OfficeGeofence } from './components/OfficeGeofence'

// Employee Workspace Components
import { EmployeeSidebar } from './components/employee/EmployeeSidebar'
import { EmployeeHeader } from './components/employee/EmployeeHeader'
import { EmployeeHome } from './components/employee/EmployeeHome'
import { EmployeeLeaves } from './components/employee/EmployeeLeaves'
import { EmployeeMonthly } from './components/employee/EmployeeMonthly'
import { EmployeeHolidays } from './components/employee/EmployeeHolidays'
import { EmployeeProfile } from './components/employee/EmployeeProfile'

import { useAuth } from './contexts/AuthContext'
import './index.css'

const VALID_ADMIN_TABS = [
  'dashboard',
  'employees',
  'attendance',
  'leave-management',
  'public-holidays',
  'settings',
  'organization',
  'office-geofence',
  'admin-management',
]

const VALID_EMPLOYEE_TABS = [
  'home',
  'leave',
  'monthly',
  'holidays',
  'profile',
]

function getInitialTab(isAdmin: boolean): string {
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0]
  if (isAdmin) {
    if (!path || path === 'login' || path === 'home') return 'dashboard'
    if (path === 'leaves') return 'leave-management'
    return VALID_ADMIN_TABS.includes(path) ? path : 'dashboard'
  } else {
    if (!path || path === 'login' || path === 'dashboard') return 'home'
    if (path === 'leaves' || path === 'leave-management') return 'leave'
    if (path === 'public-holidays') return 'holidays'
    return VALID_EMPLOYEE_TABS.includes(path) ? path : 'home'
  }
}

function App() {
  const { session, isAdmin, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab(isAdmin))
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Reconcile initial tab whenever auth role resolves
  useEffect(() => {
    setActiveTab(getInitialTab(isAdmin))
  }, [isAdmin])

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialTab(isAdmin))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isAdmin])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Initializing Workspace...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />
  }

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab)
    setIsSidebarOpen(false)
    const targetPath = (tab === 'dashboard' || tab === 'home') ? '/' : `/${tab}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
  }

  // =========================================================
  // ADMIN WORKSPACE
  // =========================================================
  if (isAdmin) {
    return (
      <ProtectedRoute adminOnly>
        <div className="bg-[#f6f8fc] text-[#181d27] antialiased min-h-screen selection:bg-brand-100 selection:text-brand-600 overflow-hidden lg:overflow-auto">
          <Sidebar 
            activeTab={activeTab} 
            onSelectTab={handleSelectTab} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />

          {/* Main Body Content Frame */}
          <div className="lg:pl-72 transition-all duration-300">
            <Header 
              onSelectTab={handleSelectTab} 
              onToggleSidebar={() => setIsSidebarOpen(true)} 
            />
            {activeTab === 'dashboard' ? (
              <Dashboard />
            ) : activeTab === 'employees' ? (
              <Employees />
            ) : activeTab === 'attendance' ? (
              <Attendance />
            ) : activeTab === 'leave-management' ? (
              <LeaveManagement />
            ) : activeTab === 'public-holidays' ? (
              <PublicHolidays />
            ) : activeTab === 'settings' ? (
              <Settings />
            ) : activeTab === 'organization' ? (
              <Organization />
            ) : activeTab === 'office-geofence' ? (
              <OfficeGeofence />
            ) : activeTab === 'admin-management' ? (
              <AdminManagement />
            ) : (
              <div className="pt-28 px-4 sm:px-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px]">construction</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
                <p className="text-slate-400 text-sm mt-1 max-w-sm">
                  This module is currently being configured for Enterprise v2.4.
                </p>
                <button
                  onClick={() => handleSelectTab('dashboard')}
                  className="mt-5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // =========================================================
  // EMPLOYEE WORKSPACE
  // =========================================================
  return (
    <ProtectedRoute>
      <div className="bg-[#f6f8fc] text-[#181d27] antialiased min-h-screen selection:bg-brand-100 selection:text-brand-600 overflow-hidden lg:overflow-auto">
        <EmployeeSidebar 
          activeTab={activeTab} 
          onSelectTab={handleSelectTab} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* Main Body Content Frame */}
        <div className="lg:pl-72 transition-all duration-300">
          <EmployeeHeader 
            onSelectTab={handleSelectTab} 
            onToggleSidebar={() => setIsSidebarOpen(true)} 
          />
          {activeTab === 'home' ? (
            <EmployeeHome />
          ) : activeTab === 'leave' ? (
            <EmployeeLeaves />
          ) : activeTab === 'monthly' ? (
            <EmployeeMonthly />
          ) : activeTab === 'holidays' ? (
            <EmployeeHolidays />
          ) : activeTab === 'profile' ? (
            <EmployeeProfile />
          ) : (
            <div className="pt-28 px-4 sm:px-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">construction</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                This employee module is currently updating.
              </p>
              <button
                onClick={() => handleSelectTab('home')}
                className="mt-5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default App
