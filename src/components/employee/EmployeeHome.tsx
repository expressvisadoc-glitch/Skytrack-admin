import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  getEmployeeTodayAttendance, 
  startWork, 
  endWork, 
  startBreak, 
  resumeWork,
  type EmployeeTodayAttendance,
  isSessionExpiredError
} from '../../lib/api'
import { getBrowserLocation } from '../../lib/geolocation'
import { 
  LogOut, 
  Coffee, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar,
  Sparkles,
  ShieldAlert,
  BarChart3
} from 'lucide-react'

export function EmployeeHome() {
  const { token, employee, logout } = useAuth()
  const [attendance, setAttendance] = useState<EmployeeTodayAttendance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Live timer states (in seconds)
  const [workSeconds, setWorkSeconds] = useState(0)
  const [breakSeconds, setBreakSeconds] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load and reconcile attendance with backend
  const loadAttendance = useCallback(async (quiet = false) => {
    if (!token) return
    if (!quiet) setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getEmployeeTodayAttendance(token)
      if (response && response.success) {
        setAttendance(response.attendance)
      } else {
        setAttendance(null)
      }
    } catch (err: any) {
      console.error('Failed to load today attendance:', err)
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      if (!quiet) {
        setErrorMessage(err?.message || 'Unable to load attendance status.')
      }
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }, [token, logout])

  // Initial mount & window focus listeners
  useEffect(() => {
    loadAttendance()

    const onFocus = () => loadAttendance(true)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadAttendance(true)
      }
    })

    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [loadAttendance])

  // Authoritative live timer updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())

      if (!attendance || !attendance.checkIn) {
        setWorkSeconds(0)
        setBreakSeconds(0)
        return
      }

      const checkInMs = new Date(attendance.checkIn).getTime()
      const nowMs = Date.now()
      const baseBreakSec = Number(attendance.totalBreakSeconds ?? 0)

      // 1. Break timer calculation
      if (attendance.breakStartedAt && !attendance.checkOut) {
        const breakStartMs = new Date(attendance.breakStartedAt).getTime()
        const elapsedSinceBreakMs = Math.max(0, nowMs - breakStartMs)
        const currentActiveBreakSec = Math.floor(elapsedSinceBreakMs / 1000)
        setBreakSeconds(baseBreakSec + currentActiveBreakSec)
      } else {
        setBreakSeconds(baseBreakSec)
      }

      // 2. Work timer calculation
      if (!attendance.checkOut) {
        const totalElapsedSec = Math.max(0, Math.floor((nowMs - checkInMs) / 1000))
        const activeBreakSec = attendance.breakStartedAt
          ? Math.max(0, Math.floor((nowMs - new Date(attendance.breakStartedAt).getTime()) / 1000))
          : 0
        const totalBreaksDeducted = baseBreakSec + activeBreakSec
        setWorkSeconds(Math.max(0, totalElapsedSec - totalBreaksDeducted))
      } else {
        // Attendance completed: calculate exact duration between check-in and check-out minus breaks
        const checkOutMs = new Date(attendance.checkOut).getTime()
        const totalDurationSec = Math.max(0, Math.floor((checkOutMs - checkInMs) / 1000))
        setWorkSeconds(Math.max(0, totalDurationSec - baseBreakSec))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [attendance])

  // Attendance actions
  const handleStartWork = async () => {
    if (!token || isActionLoading) return
    setIsActionLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Check-in is verified against the office geofence on the server
      const location = await getBrowserLocation()
      const res = await startWork(token, location)
      if (res.success) {
        setSuccessMessage('Punch in recorded successfully! Welcome to work.')
        await loadAttendance(true)
      } else {
        setErrorMessage(res.message || 'Unable to record punch in.')
      }
    } catch (err: any) {
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Failed to start work. Please try again.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleEndWork = async () => {
    if (!token || isActionLoading) return

    // Active break safeguard
    if (attendance?.breakStartedAt) {
      setErrorMessage('Cannot punch out while a break is still active. Please resume work first.')
      return
    }

    if (!window.confirm('Are you sure you want to punch out and end work for today?')) {
      return
    }

    setIsActionLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Check-out is verified against the office geofence on the server
      const location = await getBrowserLocation()
      const res = await endWork(token, location)
      if (res.success) {
        setSuccessMessage('Punch out recorded successfully! Have a great evening.')
        await loadAttendance(true)
      } else {
        setErrorMessage(res.message || 'Unable to record punch out.')
      }
    } catch (err: any) {
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Failed to end work. Please try again.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleStartBreak = async () => {
    if (!token || isActionLoading) return
    setIsActionLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Break location is recorded when available but never blocks the break
      const location = await getBrowserLocation(10000).catch(() => null)
      const res = await startBreak(token, location)
      if (res.success) {
        setSuccessMessage('Break started. Enjoy your break!')
        await loadAttendance(true)
      } else {
        setErrorMessage(res.message || 'Unable to start break.')
      }
    } catch (err: any) {
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Failed to start break.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleResumeWork = async () => {
    if (!token || isActionLoading) return
    setIsActionLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Break location is recorded when available but never blocks resuming
      const location = await getBrowserLocation(10000).catch(() => null)
      const res = await resumeWork(token, location)
      if (res.success) {
        setSuccessMessage('Work resumed successfully. Welcome back!')
        await loadAttendance(true)
      } else {
        setErrorMessage(res.message || 'Unable to resume work.')
      }
    } catch (err: any) {
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Failed to resume work.')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Failsafe: if an expired session error is somehow set, navigate to login
  useEffect(() => {
    if (isSessionExpiredError(errorMessage)) {
      logout()
    }
  }, [errorMessage, logout])

  // Format seconds into HH:MM:SS or HHh MMm
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeOnly = (isoString?: string | null) => {
    if (!isoString) return '—'
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return isoString
    }
  }

  // Determine State: 1 = Not Checked In, 2 = Working, 3 = On Break, 4 = Checked Out
  const isCheckedIn = Boolean(attendance?.checkIn)
  const isCheckedOut = Boolean(attendance?.checkOut)
  const isOnBreak = Boolean(attendance?.breakStartedAt && !isCheckedOut)

  let currentState = 1
  if (!isCheckedIn) {
    currentState = 1 // Not Checked In
  } else if (isCheckedOut) {
    currentState = 4 // Checked Out
  } else if (isOnBreak) {
    currentState = 3 // On Break
  } else {
    currentState = 2 // Working
  }

  // Circular gauge calculations (matching Android HomeScreen: viewBox 0 0 240 240, r=106, stroke=10)
  // Circumference = 2 * PI * 106 = 666.02
  const GAUGE_CIRCUMFERENCE = 666
  // Standard 8 hours workday = 28,800 seconds
  const shiftProgress = Math.min(1, Math.max(0, workSeconds / 28800))
  const shiftStrokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - shiftProgress)
  // 1 hour maximum break allowance = 3,600 seconds
  const breakProgress = Math.min(1, Math.max(0, breakSeconds / 3600))
  const breakStrokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - breakProgress)

  const greeting = (() => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  })()

  if (isLoading) {
    return (
      <div className="pt-28 px-4 sm:px-8 pb-12 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="w-10 h-10 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Syncing Attendance Status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 px-4 sm:px-8 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Notifications / Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-red-400 hover:text-red-700 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-semibold">
            {successMessage}
          </div>
          <button 
            onClick={() => setSuccessMessage(null)} 
            className="text-emerald-400 hover:text-emerald-800 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs border border-slate-200/80">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                Staff Identity
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {employee?.employee_id || employee?.employeeId || 'ID: —'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {employee?.name || 'Staff Member'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Welcome to your daily workstation. Record your work hours and manage break sessions below.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <Clock className="w-4 h-4 text-red-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Time</span>
                <span className="text-xs font-bold text-slate-800">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Attendance & Break Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Work Status Card (2 Columns) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Daily Attendance Console</span>
              </div>
              <div>
                {currentState === 1 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Not Checked In
                  </span>
                )}
                {currentState === 2 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Working Active
                  </span>
                )}
                {currentState === 3 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Currently On Break
                  </span>
                )}
                {currentState === 4 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Completed for Today
                  </span>
                )}
              </div>
            </div>

            {/* Central Circular Progress Action Hero (Matching Android HomeScreen) */}
            <div className="py-6 flex flex-col items-center justify-center">
              {/* STATE 1: NOT CHECKED IN */}
              {currentState === 1 && (
                <div className="space-y-5 w-full flex flex-col items-center">
                  <div className="w-64 h-64 relative flex items-center justify-center mx-auto">
                    {/* 1. Outer striped radar track ring */}
                    <div 
                      className="absolute inset-0 rounded-full border border-slate-200/60 animate-pulse pointer-events-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(229,57,53,0.035), rgba(229,57,53,0.035) 8px, transparent 8px, transparent 16px)'
                      }}
                    />

                    {/* 2. Intermediate soft gradient shadow ring (232px) */}
                    <div className="absolute w-[232px] h-[232px] rounded-full bg-gradient-to-b from-white/95 to-slate-50 border border-slate-100 shadow-xs pointer-events-none" />

                    {/* 3. Base SVG Track */}
                    <svg viewBox="0 0 240 240" className="absolute w-[232px] h-[232px] -rotate-90 pointer-events-none">
                      <circle cx="120" cy="120" r="106" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                    </svg>

                    {/* 4. Atmospheric Red Backlight Glow */}
                    <div className="absolute w-52 h-52 rounded-full bg-red-500/10 blur-xl pointer-events-none" />

                    {/* 5. Central Touch Button Surface (192px) */}
                    <button
                      type="button"
                      onClick={handleStartWork}
                      disabled={isActionLoading}
                      className="w-48 h-48 rounded-full bg-white border border-slate-200/90 shadow-xl shadow-red-500/10 relative flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group disabled:opacity-50 disabled:pointer-events-none z-10 p-3"
                      title="Click to Punch In & Start Shift"
                    >
                      {/* Dashed inner highlight ring */}
                      <div className="absolute inset-2.5 rounded-full border border-dashed border-slate-200 pointer-events-none" />

                      {isActionLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                          <span className="text-[11px] font-bold text-slate-500">Checking In...</span>
                        </div>
                      ) : (
                        <>
                          {/* Status Badge Indicator Pill */}
                          <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 text-[10px] font-bold flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Ready</span>
                          </div>

                          {/* Main Action Label */}
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors mt-2">
                            Check-In
                          </span>

                          {/* Subtitle / Current Time */}
                          <span className="text-[11px] font-medium text-slate-400 mt-1">
                            Current time: {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 font-medium text-center">
                    Click the <strong className="text-slate-700">Check-In</strong> button above to register your punch-in for today
                  </p>
                </div>
              )}

              {/* STATE 2: WORKING ACTIVE */}
              {currentState === 2 && (
                <div className="space-y-5 w-full flex flex-col items-center">
                  <div className="w-64 h-64 relative flex items-center justify-center mx-auto">
                    {/* 1. Outer decorative ring */}
                    <div className="absolute inset-2 rounded-full border border-amber-200/60 pointer-events-none" />

                    {/* 2. Intermediate soft gradient shadow ring */}
                    <div className="absolute w-[232px] h-[232px] rounded-full bg-gradient-to-b from-white/95 to-slate-50 border border-slate-100 shadow-xs pointer-events-none" />

                    {/* 3. SVG Circular Gauge Accent with Active Red Arc */}
                    <svg viewBox="0 0 240 240" className="absolute w-[232px] h-[232px] -rotate-90 pointer-events-none">
                      <circle cx="120" cy="120" r="106" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                      <circle 
                        cx="120" 
                        cy="120" 
                        r="106" 
                        stroke="#e53935" 
                        strokeWidth="10" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeDasharray={GAUGE_CIRCUMFERENCE} 
                        strokeDashoffset={shiftStrokeDashoffset} 
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* 4. Atmospheric Red Backlight Glow */}
                    <div className="absolute w-52 h-52 rounded-full bg-red-500/15 blur-xl pointer-events-none" />

                    {/* 5. Central Touch Button Surface (Start Break trigger) */}
                    <button
                      type="button"
                      onClick={handleStartBreak}
                      disabled={isActionLoading}
                      className="w-48 h-48 rounded-full bg-white border border-slate-200/90 shadow-xl shadow-red-500/10 relative flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 group disabled:opacity-50 z-10 p-3"
                      title="Click to Take a Break"
                    >
                      {/* Dashed inner accent ring */}
                      <div className="absolute inset-2.5 rounded-full border border-dashed border-amber-200/80 pointer-events-none" />

                      {isActionLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                          <span className="text-[11px] font-bold text-slate-500">Processing...</span>
                        </div>
                      ) : (
                        <>
                          {/* Start Break Pill */}
                          <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-600 text-xs font-bold flex items-center gap-1.5 shadow-2xs group-hover:bg-amber-100 transition-colors">
                            <Coffee className="w-3.5 h-3.5 text-amber-600" />
                            <span>Start Break</span>
                          </div>

                          {/* Work Duration Label */}
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            WORK DURATION
                          </span>

                          {/* Dynamic Live Counter */}
                          <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight my-0.5">
                            {formatTimer(workSeconds)}
                          </span>

                          {/* Break Policy Subtext */}
                          <span className="text-[10px] font-medium text-slate-400">
                            Tea / Lunch • 1h allowed
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Wide Check-Out Button (Directly below gauge matching Android) */}
                  <button
                    type="button"
                    onClick={handleEndWork}
                    disabled={isActionLoading}
                    className="w-full max-w-sm h-12 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-sm shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <LogOut className="w-4 h-4 text-red-500" />
                    )}
                    <span>End Shift / Check-Out</span>
                  </button>
                </div>
              )}

              {/* STATE 3: ON BREAK ACTIVE */}
              {currentState === 3 && (
                <div className="space-y-5 w-full flex flex-col items-center">
                  <div className="w-64 h-64 relative flex items-center justify-center mx-auto">
                    {/* 1. Outer decorative ring */}
                    <div className="absolute inset-2 rounded-full border border-amber-300/80 pointer-events-none" />

                    {/* 2. Intermediate soft gradient shadow ring */}
                    <div className="absolute w-[232px] h-[232px] rounded-full bg-gradient-to-b from-white/95 to-slate-50 border border-slate-100 shadow-xs pointer-events-none" />

                    {/* 3. SVG Circular Gauge with Amber Arc */}
                    <svg viewBox="0 0 240 240" className="absolute w-[232px] h-[232px] -rotate-90 pointer-events-none">
                      <circle cx="120" cy="120" r="106" stroke="#fef3c7" strokeWidth="10" fill="none" />
                      <circle 
                        cx="120" 
                        cy="120" 
                        r="106" 
                        stroke="#f59e0b" 
                        strokeWidth="10" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeDasharray={GAUGE_CIRCUMFERENCE} 
                        strokeDashoffset={breakStrokeDashoffset} 
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* 4. Atmospheric Amber Glow */}
                    <div className="absolute w-52 h-52 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />

                    {/* 5. Central Touch Break Container */}
                    <div className="w-48 h-48 rounded-full bg-white border border-amber-200/90 shadow-xl shadow-amber-500/10 relative flex flex-col items-center justify-center z-10 p-3">
                      {/* Dashed inner ring */}
                      <div className="absolute inset-2.5 rounded-full border border-dashed border-amber-300 pointer-events-none" />

                      {/* Top Pill */}
                      <div className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[10px] font-bold flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>On Break • Active</span>
                      </div>

                      {/* Break Duration Live Timer */}
                      <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight my-1">
                        {formatTimer(breakSeconds)}
                      </span>

                      {/* Subtext */}
                      <span className="text-[10px] font-medium text-slate-400 mb-2">
                        Break Duration (1h Max)
                      </span>

                      {/* End Break inner button */}
                      <button
                        type="button"
                        onClick={handleResumeWork}
                        disabled={isActionLoading}
                        className="px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Play className="w-3 h-3 fill-white" />
                        )}
                        <span>End Break</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Resume Work and Safeguard buttons */}
                  <div className="w-full max-w-sm space-y-2 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={handleResumeWork}
                      disabled={isActionLoading}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                      <span>Resume Work &amp; End Break</span>
                    </button>

                    {/* Blocked Check-Out Notice */}
                    <div className="w-full h-10 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/80 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                      <span>End Break before Check-Out</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 4: CHECKED OUT / COMPLETED */}
              {currentState === 4 && (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <div className="w-64 h-64 relative flex items-center justify-center mx-auto">
                    {/* 1. Outer decorative ring */}
                    <div className="absolute inset-2 rounded-full border border-blue-200/60 pointer-events-none" />

                    {/* 2. Intermediate soft gradient shadow ring */}
                    <div className="absolute w-[232px] h-[232px] rounded-full bg-gradient-to-b from-white/95 to-slate-50 border border-slate-100 shadow-xs pointer-events-none" />

                    {/* 3. SVG Circular Gauge with Full Blue Arc */}
                    <svg viewBox="0 0 240 240" className="absolute w-[232px] h-[232px] -rotate-90 pointer-events-none">
                      <circle cx="120" cy="120" r="106" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                      <circle 
                        cx="120" 
                        cy="120" 
                        r="106" 
                        stroke="#3b82f6" 
                        strokeWidth="10" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeDasharray={GAUGE_CIRCUMFERENCE} 
                        strokeDashoffset={0} 
                      />
                    </svg>

                    {/* 4. Atmospheric Blue Glow */}
                    <div className="absolute w-52 h-52 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

                    {/* 5. Central Completed Container */}
                    <div className="w-48 h-48 rounded-full bg-white border border-slate-200/90 shadow-xl shadow-blue-500/10 relative flex flex-col items-center justify-center z-10 p-3">
                      {/* Dashed inner ring */}
                      <div className="absolute inset-2.5 rounded-full border border-dashed border-slate-200 pointer-events-none" />

                      {/* Top Pill */}
                      <div className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>Completed</span>
                      </div>

                      {/* Main Label */}
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                        Completed
                      </span>

                      {/* Subtitle */}
                      <span className="text-[11px] font-medium text-slate-400 mt-1">
                        Punched out: {formatTimeOnly(attendance?.checkOut)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-medium text-center">
                    Shift completed for today. Great work!
                  </p>
                </div>
              )}

              {/* Attendance Stats Grid (3 Metrics Cards - Matching Android AttendanceMetricsGrid) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-6 mt-2 border-t border-slate-100">
                {/* Metric Card 1: Check-In */}
                <div className="h-24 rounded-2xl bg-slate-50/70 border border-slate-200/60 p-3.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Check-In</span>
                    <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {attendance?.checkIn ? formatTimeOnly(attendance.checkIn) : '--:--'}
                    </span>
                  </div>
                </div>

                {/* Metric Card 2: Break (1h Max) */}
                <div className="h-24 rounded-2xl bg-slate-50/70 border border-slate-200/60 p-3.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Break (1h Max)</span>
                    <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                      <Coffee className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {formatTimer(breakSeconds)}
                    </span>
                  </div>
                </div>

                {/* Metric Card 3: Active Hours / Total Hours */}
                <div className="h-24 rounded-2xl bg-slate-50/70 border border-slate-200/60 p-3.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {isCheckedIn && !isCheckedOut ? 'Active Hours' : 'Total Hours'}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {formatTimer(workSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Date: {attendance?.date || new Date().toISOString().slice(0, 10)}</span>
            <span>Recorded via SkyTrack Engine</span>
          </div>
        </div>

        {/* Side Bento Card: Today's Summary & Break Ledger */}
        <div className="space-y-6 flex flex-col">
          {/* Card 1: Today's Punch Summary */}
          <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" />
              <span>Today's Timecard</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Check-in Time</span>
                <span className="text-xs font-extrabold text-slate-900 font-mono">
                  {formatTimeOnly(attendance?.checkIn)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Check-out Time</span>
                <span className="text-xs font-extrabold text-slate-900 font-mono">
                  {formatTimeOnly(attendance?.checkOut)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Breaks</span>
                <span className="text-xs font-extrabold text-amber-700 font-mono">
                  {formatTimer(breakSeconds)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">Net Work Hours</span>
                <span className="text-xs font-extrabold text-emerald-900 font-mono">
                  {formatTimer(workSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Helpful Guidelines */}
          <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Attendance Guidelines</span>
              </h4>
              <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                  <span>Always start your break before stepping away from work duties.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                  <span>Break duration is synchronized automatically with the central server.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                  <span>Make sure to punch out before leaving the office at the end of the day.</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Standard Shift: 8.0 hrs</span>
              <span className="font-semibold text-emerald-600">Compliance OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
