import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminProfile,
  updateAdminPassword,
  updateEmployeeDetails,
  type SkyTrackEmployee,
} from '../lib/api'

interface SettingsProps {
  onLogout?: () => void
}

export function Settings({ onLogout }: SettingsProps) {
  const { logout, employee, token } = useAuth()
  const [profile, setProfile] = useState<SkyTrackEmployee | null>(employee)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggedOut, setIsLoggedOut] = useState(false)

  // Fetch fresh profile from employees table if available
  useEffect(() => {
    if (!token) return
    const empId = employee?.id || employee?.employee_id || employee?.employeeId

    getAdminProfile(token, empId)
      .then((fresh) => {
        if (fresh) {
          setProfile(fresh)
        }
      })
      .catch((err) => {
        console.warn('Could not refresh admin profile:', err)
      })
  }, [token, employee])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (newPwd !== confirmPwd) {
      setErrorMessage('New passwords do not match. Please verify.')
      return
    }

    if (newPwd.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (!token) {
      setErrorMessage('Active session not found. Please log in again.')
      return
    }

    setIsUpdating(true)
    try {
      await updateAdminPassword(token, newPwd)
      setIsUpdating(false)
      setShowSuccessToast(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')

      setTimeout(() => {
        setShowSuccessToast(false)
      }, 5000)
    } catch (err: any) {
      console.error('Password update error:', err)
      setIsUpdating(false)
      setErrorMessage(err.message || 'Failed to update password. Please try again.')
    }
  }

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    logout()
    if (onLogout) {
      onLogout()
    } else {
      setIsLoggedOut(true)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return

    const empId = employee?.id || employee?.employee_id || employee?.employeeId
    if (!empId) return

    setIsUploadingAvatar(true)
    setErrorMessage('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string
      try {
        const updated = await updateEmployeeDetails(token, empId, {
          profile_photo_url: base64Str
        })
        setProfile(updated)
        setShowSuccessToast(true)
        setTimeout(() => setShowSuccessToast(false), 5000)
      } catch (err: any) {
        console.error('Avatar update error:', err)
        setErrorMessage(err.message || 'Failed to update profile picture.')
      } finally {
        setIsUploadingAvatar(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const activeProfile = profile || employee
  const adminName =
    activeProfile?.name ||
    (activeProfile?.first_name ? `${activeProfile.first_name} ${activeProfile.last_name || ''}`.trim() : null) ||
    'Administrator'
  const adminEmail = activeProfile?.email || '—'
  const adminEmpId = activeProfile?.employee_id || activeProfile?.employeeId || activeProfile?.id || '—'
  const adminRole = activeProfile?.designation || activeProfile?.role || activeProfile?.role_name || 'System Administrator'
  const adminDepartment = activeProfile?.department || 'Operations'
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    adminName
  )}&background=f1f5f9&color=475569&bold=true`
  
  // Use a generic placeholder if no image exists and no initials fallback is preferred. 
  // We'll use the defaultAvatar as the "initial placeholder".
  const adminAvatar = activeProfile?.profile_photo_url || activeProfile?.avatar_url || defaultAvatar

  if (isLoggedOut) {
    return (
      <main className="relative w-full pt-28 px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-md text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-900">Session Terminated</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              You have been successfully logged out from SkyTrack Enterprise Admin HQ.
            </p>
          </div>
          <button
            onClick={() => setIsLoggedOut(false)}
            className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:from-red-600 hover:to-rose-700 transition-all cursor-pointer"
            type="button"
          >
            Log Back In as Admin
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="relative w-full pt-28 px-8 pb-14 bg-[#faf9fd] min-h-screen">
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-900">Sign Out Administrator?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to end your current session? All ongoing audit telemetries will be securely saved before token invalidation.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
                type="button"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Page Breadcrumb & Title Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              ADMIN PREFERENCES
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">
              ACCOUNT &amp; SECURITY
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
              <p className="text-[13.5px] text-slate-500 mt-0.5">
                Manage your administrator account credentials and session security.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-[12px] font-medium">
              <span className="material-symbols-outlined text-[16px] text-red-600">security</span>
              <span>MFA Enforced • High Trust Zone</span>
            </div>
          </div>
        </div>

        {/* 1. Admin Profile Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 md:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Admin Profile</h2>
                <p className="text-[12px] text-slate-500">Current logged-in administrator profile details</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[12px] font-semibold self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Session • Operational</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-6 pt-6">
            <div className="relative shrink-0 w-24 h-24 group">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <img
                className={`w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-50 shadow-sm transition-opacity ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-80'}`}
                alt="Admin User Profile"
                src={adminAvatar}
              />
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-slate-900/20 rounded-2xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-white text-[28px] drop-shadow-md">
                  {isUploadingAvatar ? 'hourglass_empty' : 'edit'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
                <span className="material-symbols-outlined text-[13px] font-bold">check</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {/* Full Name */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">FULL NAME</span>
                <div className="font-semibold text-slate-900 text-[15px] mt-0.5">
                  {adminName}
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">
                  Primary Key: {adminEmpId}
                </div>
              </div>

              {/* Email Address */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">EMAIL ADDRESS</span>
                <div className="font-semibold text-slate-900 text-[15px] mt-0.5 truncate">
                  {adminEmail}
                </div>
                <div className="text-[12px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">verified</span> Corporate Verified
                </div>
              </div>

              {/* Role / System */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 sm:col-span-2 lg:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ROLE / DEPARTMENT</span>
                <div className="font-semibold text-slate-900 text-[15px] mt-0.5 capitalize">
                  {adminRole}
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">{adminDepartment} • High Clearance</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Security & Password Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 md:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Security &amp; Password</h2>
                <p className="text-[12px] text-slate-500">Update your administrator access password via Supabase Auth</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-slate-500 text-[12px] font-medium self-start sm:self-auto">
              <span className="material-symbols-outlined text-[15px] text-slate-400">security</span>
              <span>Encrypted Session</span>
            </div>
          </div>

          <form className="flex flex-col gap-5 pt-6 max-w-2xl" onSubmit={handlePasswordSubmit}>
            {/* Current Password (Optional confirmation for UI) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="current-pwd">
                  Current Password
                </label>
                <span className="text-[12px] text-slate-400">Required for identity check</span>
              </div>
              <div className="relative flex items-center">
                <input
                  id="current-pwd"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full h-11 pl-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
                  placeholder="••••••••••••"
                  required
                  type={showCurrentPwd ? 'text' : 'password'}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showCurrentPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* New & Confirm Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="new-pwd">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-pwd"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
                    minLength={8}
                    placeholder="At least 8 characters"
                    required
                    type={showNewPwd ? 'text' : 'password'}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showNewPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700" htmlFor="confirm-pwd">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="confirm-pwd"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
                    minLength={8}
                    placeholder="Re-enter new password"
                    required
                    type={showConfirmPwd ? 'text' : 'password'}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showConfirmPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Helper Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">info</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-bold text-slate-800">Password Security Requirement</span>
                <span className="text-[12px] text-slate-500 leading-relaxed">
                  Minimum 8 characters. Make sure to choose a strong password to safeguard administrator capabilities.
                </span>
              </div>
            </div>

            {/* Submit Button & Feedback */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                disabled={isUpdating}
                className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/30 active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
                type="submit"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isUpdating ? 'refresh' : 'check_circle'}
                </span>
                <span>{isUpdating ? 'Updating Password...' : 'Update Password'}</span>
              </button>

              {showSuccessToast && (
                <span className="inline-flex text-[12.5px] text-emerald-700 font-semibold items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 animate-in fade-in">
                  <span className="material-symbols-outlined text-[17px]">done_all</span>
                  Password updated successfully in backend.
                </span>
              )}
            </div>
          </form>
        </section>

        {/* 3. Account Session Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 md:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-600"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pl-2">
            <div className="flex flex-col max-w-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Account Session</h2>
              </div>
              <p className="text-[12.5px] text-red-600 font-semibold mt-2">
                Sign out of your administrator account session
              </p>
              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                Ending your session will log you out from this device and return you to the SkyTrack Admin Portal login screen.
              </p>
            </div>
            <div className="shrink-0 self-start sm:self-center">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/30 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">output</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

