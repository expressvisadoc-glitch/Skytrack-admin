import { useState } from 'react'
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
import { useAuth } from './contexts/AuthContext'
import { useEffect } from 'react'
import './index.css'

const VALID_TABS = [
  'dashboard',
  'employees',
  'attendance',
  'leave-management',
  'public-holidays',
  'settings',
  'organization',
  'admin-management',
]

function getInitialTab(): string {
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0]
  if (!path || path === 'login') return 'dashboard'
  if (path === 'leaves') return 'leave-management'
  return VALID_TABS.includes(path) ? path : 'dashboard'
}

function App() {
  const { session, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<string>(getInitialTab)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialTab())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
    const targetPath = tab === 'dashboard' ? '/' : `/${tab}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
  }

  return (
    <ProtectedRoute>
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

export default App




