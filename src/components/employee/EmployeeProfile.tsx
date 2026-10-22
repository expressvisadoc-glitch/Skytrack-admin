import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getEmployeeProfile, isSessionExpiredError } from '../../lib/api'
import { 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  LogOut, 
  IdCard,
  AlertCircle
} from 'lucide-react'

export function EmployeeProfile() {
  const { token, employee, logout } = useAuth()
  const [profileData, setProfileData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return
      try {
        const res = await getEmployeeProfile(token)
        if (res && res.success && res.employee) {
          setProfileData(res.employee)
        }
      } catch (err: any) {
        console.warn('Could not fetch remote profile, using session employee:', err)
        if (isSessionExpiredError(err)) {
          logout()
          return
        }
        setErrorMessage(err?.message || null)
      }
    }

    fetchProfile()
  }, [token, logout])

  // Failsafe: if an expired session error is somehow set, navigate to login
  useEffect(() => {
    if (isSessionExpiredError(errorMessage)) {
      logout()
    }
  }, [errorMessage, logout])

  const effectiveEmployee = profileData || employee

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const handleLogoutConfirm = () => {
    if (window.confirm('Are you sure you want to sign out of your SkyTrack workspace?')) {
      logout()
    }
  }

  return (
    <div className="pt-24 px-4 sm:px-8 pb-12 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
            Staff Dossier
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Account &amp; Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your employment profile, designation, organizational unit, and active session details.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-extrabold text-3xl sm:text-4xl flex items-center justify-center shadow-md shadow-red-500/25 ring-4 ring-red-50 shrink-0">
              {effectiveEmployee?.name ? effectiveEmployee.name.charAt(0).toUpperCase() : 'E'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {effectiveEmployee?.name || 'Employee Member'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                {effectiveEmployee?.designation || effectiveEmployee?.role || 'Workforce Personnel'}
              </p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                <IdCard className="w-3.5 h-3.5 text-slate-400" />
                {effectiveEmployee?.employee_id || effectiveEmployee?.employeeId || 'ID: —'}
              </span>
            </div>
          </div>

          {/* Quick Sign Out Action */}
          <div>
            <button
              onClick={handleLogoutConfirm}
              className="px-5 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition-colors cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Employment Details */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-red-500" />
            <span>Employment Record</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Employee ID Code</span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {effectiveEmployee?.employee_id || effectiveEmployee?.employeeId || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Department</span>
              <span className="text-xs font-bold text-slate-900">
                {effectiveEmployee?.department || 'Operations'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Designation</span>
              <span className="text-xs font-bold text-slate-900">
                {effectiveEmployee?.designation || effectiveEmployee?.role || 'Staff Member'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Joining Date</span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {formatDate(effectiveEmployee?.joining_date || effectiveEmployee?.joiningDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Account Information */}
        <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mail className="w-4 h-4 text-red-500" />
            <span>Contact &amp; Credentials</span>
          </h3>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Work Email</span>
              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                {effectiveEmployee?.email || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Account Status</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Active</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Workstation Organization</span>
              <span className="text-xs font-bold text-slate-900">
                Skypass Visa Services
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Security Clearance</span>
              <span className="text-xs font-bold text-slate-900">
                Standard Staff Access
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Support Note */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-500 flex items-center justify-between">
        <span>Need to update your contact details or password? Contact your HR manager or system administrator.</span>
        <span className="font-semibold text-slate-700">Enterprise v2.4</span>
      </div>
    </div>
  )
}
