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
import './index.css'

function App() {
  const { session, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'attendance' | 'leave-management' | 'public-holidays' | 'settings' | 'organization' | string>('dashboard')

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

  return (
    <ProtectedRoute>
      <div className="bg-[#f6f8fc] text-[#181d27] antialiased min-h-screen selection:bg-brand-100 selection:text-brand-600">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Body Content Frame */}
        <div className="pl-72">
          <Header onSelectTab={setActiveTab} />
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
            <div className="pt-28 px-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">construction</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-sm">
                This module is currently being configured for Enterprise v2.4.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
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




