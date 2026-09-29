import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LoginProps {
  onLoginSuccess?: (credential: string) => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const { login } = useAuth()
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(true)
  const [statusState, setStatusState] = useState<'idle' | 'verifying' | 'approved'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credential.trim() || !password) {
      setErrorMessage('Please provide an authorized administrator credential.')
      return
    }

    setErrorMessage('')
    setStatusState('verifying')

    const result = await login(credential.trim(), password, rememberDevice)

    if (!result.success) {
      setStatusState('idle')
      setErrorMessage(result.error || 'Authentication failed. Please verify your credentials.')
      return
    }

    setStatusState('approved')
    if (onLoginSuccess) {
      onLoginSuccess(credential)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] bg-grid-pattern text-slate-800 antialiased relative selection:bg-red-500 selection:text-white flex flex-col justify-between">
      {/* Top Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-red-200/25 via-rose-100/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 -left-20 w-80 h-80 bg-red-100/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-slate-200/40 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation Header Bar */}
      <header className="relative z-20 w-full h-20 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
        {/* Left: Brand Wordmark and Emblem */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 ring-4 ring-red-50 text-white font-extrabold text-lg cursor-pointer transition-transform hover:scale-105">
            S
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base leading-none">SkyTrack</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5">Workforce &amp; Mobility Fleet</span>
          </div>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Operational Date Pill */}
          <div className="hidden md:flex items-center gap-2 text-slate-600 px-3.5 py-1.5 bg-slate-50/80 rounded-full border border-slate-200/70 shadow-xs">
            <span className="material-symbols-outlined text-[17px] text-red-500">calendar_today</span>
            <span className="text-xs font-semibold text-slate-700">Monday, Sep 21, 2026</span>
          </div>

          {/* Operational Live Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Operational</span>
          </div>

          {/* Connection / Security Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-600">
            <span className="material-symbols-outlined text-[16px] text-slate-500">lock</span>
            <span>256-bit TLS Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[500px] mx-auto">
          {/* Main Card Architecture with glass-card aesthetics */}
          <div className="glass-card rounded-3xl p-7 sm:p-10 shadow-[0_10px_35px_rgba(15,23,42,0.06)] border border-slate-200/80 relative transition-all duration-300">
            {/* Header Tag */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-red-600">
                  Admin Authentication
                </span>
              </div>
            </div>

            {/* Brand Identity & Subheading */}
            <div className="flex items-start gap-3.5 mb-6">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 ring-4 ring-red-50 text-white font-extrabold text-xl shrink-0">
                S
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">SkyTrack Admin</h1>
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px] tracking-wider uppercase border border-red-100">
                    Portal
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                  Enter your authorized administrator credentials to manage Employees.
                </p>
              </div>
            </div>

            {/* Authentication Form */}
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              {/* Employee ID / Work Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase" htmlFor="adminCredential">
                  Employee ID or Work Email
                </label>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none transition-colors group-focus-within:text-red-500">
                    badge
                  </span>
                  <input
                    id="adminCredential"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50/90 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all font-medium"
                    placeholder="e.g. SKY001 or admin@skytrack.aero"
                    required
                    type="text"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 tracking-wide uppercase" htmlFor="adminPassword">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Please contact Airfield IT Security Command at ext. 4402 or security@skytrack.aero to reset your credentials.'
                      )
                    }
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors cursor-pointer"
                  >
                    Reset Key?
                  </button>
                </div>
                <div className="relative flex items-center group">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none transition-colors group-focus-within:text-red-500">
                    lock
                  </span>
                  <input
                    id="adminPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-11 bg-slate-50/90 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all font-medium tracking-normal"
                    placeholder="••••••••••••"
                    required
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center rounded-lg cursor-pointer"
                    title="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    id="rememberDevice"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 accent-red-600 cursor-pointer transition-colors"
                    type="checkbox"
                  />
                  <span className="text-xs font-semibold text-slate-600">Remember this workstation (12h)</span>
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  disabled={statusState !== 'idle'}
                  className={`w-full h-12 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    statusState === 'idle'
                      ? 'bg-gradient-to-r from-red-500 via-rose-600 to-red-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30 active:scale-[0.99]'
                      : statusState === 'verifying'
                      ? 'bg-slate-800 opacity-90 cursor-not-allowed'
                      : 'bg-emerald-600 shadow-emerald-600/30'
                  }`}
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {statusState === 'verifying'
                      ? 'sync'
                      : statusState === 'approved'
                      ? 'check_circle'
                      : 'login'}
                  </span>
                  <span>
                    {statusState === 'idle'
                      ? 'Sign In to Admin Portal'
                      : statusState === 'verifying'
                      ? 'Verifying Clearance & MFA...'
                      : 'Clearance Approved. Redirecting...'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Supplementary Micro Notice below Card */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
              Protected system for Skypass Visa. Unauthorized access attempts are logged and monitored.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Enterprise Footer */}
      <footer className="relative z-10 w-full py-4 px-6 lg:px-12 border-t border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs font-medium">
          <span>© 2026 SkyPass Visa Services. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
