import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getLeaveSubmissions,
  approveLeave,
  rejectLeave,
  getAttendancePunchFeed,
  formatWorkedDuration,
  type LeaveSubmissionRecord,
  type AttendancePunchEvent,
} from '../lib/api'

export interface PasswordResetRequest {
  id: string
  employeeId: string
  name: string
  role: string
  department: string
  email: string
  requestedAt: string
  timeAgo: string
  reason: string
  status: 'pending' | 'resolved'
}

export interface AttendanceAlertItem {
  id: string
  employeeId: string
  name: string
  type: 'geofence' | 'late' | 'missing_checkout'
  title: string
  description: string
  location?: string
  timeAgo: string
  severity: 'high' | 'medium'
  status: 'pending' | 'acknowledged'
}

const DEFAULT_PASSWORD_REQUESTS: PasswordResetRequest[] = []

const DEFAULT_ATTENDANCE_ALERTS: AttendanceAlertItem[] = []

const STORAGE_KEY_PWD_REQUESTS = 'skytrack_admin_password_requests'
const STORAGE_KEY_ATT_ALERTS = 'skytrack_admin_attendance_alerts'

function getRelativeTime(timestampStr: string): string {
  try {
    const then = new Date(timestampStr).getTime()
    const now = Date.now()
    const diffSec = Math.floor((now - then) / 1000)
    if (diffSec < 45) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
  } catch {
    return 'Recent'
  }
}

export function NotificationPanel({
  isOpen,
  onClose,
  onSelectTab,
  onCountUpdate,
}: {
  isOpen: boolean
  onClose: () => void
  onSelectTab?: (tab: string) => void
  onCountUpdate?: (count: number) => void
}) {
  const { token } = useAuth()

  // Dynamic state
  const [leaves, setLeaves] = useState<LeaveSubmissionRecord[]>([])
  const [punches, setPunches] = useState<AttendancePunchEvent[]>([])
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PWD_REQUESTS)
      if (saved) return JSON.parse(saved)
    } catch { }
    return DEFAULT_PASSWORD_REQUESTS
  })
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATT_ALERTS)
      if (saved) return JSON.parse(saved)
    } catch { }
    return DEFAULT_ATTENDANCE_ALERTS
  })

  const [isLoading, setIsLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'punches' | 'leaves' | 'passwords' | 'alerts'>('all')

  // Password reset action modal
  const [resetModalItem, setResetModalItem] = useState<PasswordResetRequest | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState('SkyTrack@2026!')
  const [copySuccess, setCopySuccess] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Persist password requests and alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PWD_REQUESTS, JSON.stringify(passwordRequests))
    } catch { }
  }, [passwordRequests])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATT_ALERTS, JSON.stringify(attendanceAlerts))
    } catch { }
  }, [attendanceAlerts])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch pending leaves from Supabase
  const loadPendingLeaves = useCallback(async () => {
    if (!token) return
    try {
      const allSubmissions = await getLeaveSubmissions(token)
      // Only keep Pending requests for the notification attention list
      const pendingOnly = allSubmissions.filter((s) => s.status.toLowerCase() === 'pending')
      setLeaves(pendingOnly)
    } catch (err) {
      console.error('Failed to load pending leaves for notification panel:', err)
    }
  }, [token])

  // Fetch real-time check-in and check-out punches
  const loadPunches = useCallback(async () => {
    if (!token) return
    try {
      const punchFeed = await getAttendancePunchFeed(token, 35)
      setPunches(punchFeed)
    } catch (err) {
      console.error('Failed to load attendance punch feed for notification panel:', err)
    }
  }, [token])

  // Combined refresh
  const refreshAll = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      await Promise.all([loadPendingLeaves(), loadPunches()])
    } finally {
      setIsLoading(false)
    }
  }, [token, loadPendingLeaves, loadPunches])

  useEffect(() => {
    if (isOpen) {
      refreshAll()
      // Poll every 15 seconds while open to catch live check-ins / check-outs
      const interval = setInterval(() => {
        loadPunches()
      }, 15000)
      return () => clearInterval(interval)
    }
  }, [isOpen, refreshAll, loadPunches])

  // Compute pending counts
  const pendingLeaves = useMemo(() => leaves.filter((l) => l.status.toLowerCase() === 'pending'), [leaves])
  const pendingPasswords = useMemo(() => passwordRequests.filter((p) => p.status === 'pending'), [passwordRequests])
  const pendingAlerts = useMemo(() => attendanceAlerts.filter((a) => a.status === 'pending'), [attendanceAlerts])

  const totalActionableCount = pendingLeaves.length + pendingPasswords.length + pendingAlerts.length

  useEffect(() => {
    onCountUpdate?.(totalActionableCount)
  }, [totalActionableCount, onCountUpdate])

  // Leave Actions
  const handleApproveLeave = async (leave: LeaveSubmissionRecord) => {
    if (!token) return
    const requestId = leave.request_id || leave.requestId || leave.id
    setUpdatingId(leave.id)
    try {
      await approveLeave(token, requestId, 'Approved directly via Notification Panel')
      showToast(`Leave request for ${leave.employeeName} approved`)
      setLeaves((prev) => prev.filter((item) => item.id !== leave.id))
    } catch (err: any) {
      console.error('Error approving leave:', err)
      showToast(err.message || 'Failed to approve leave request.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRejectLeave = async (leave: LeaveSubmissionRecord) => {
    if (!token) return
    const requestId = leave.request_id || leave.requestId || leave.id
    setUpdatingId(leave.id)
    try {
      await rejectLeave(token, requestId, 'Rejected directly via Notification Panel')
      showToast(`Leave request for ${leave.employeeName} rejected`)
      setLeaves((prev) => prev.filter((item) => item.id !== leave.id))
    } catch (err: any) {
      console.error('Error rejecting leave:', err)
      showToast(err.message || 'Failed to reject leave request.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Password Reset Actions
  const openResetModal = (req: PasswordResetRequest) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setGeneratedPassword(`SkyTrack@${randomSuffix}!`)
    setCopySuccess(false)
    setResetModalItem(req)
  }

  const handleConfirmReset = () => {
    if (!resetModalItem) return
    navigator.clipboard.writeText(generatedPassword)
    setCopySuccess(true)

    // Mark as resolved
    setPasswordRequests((prev) =>
      prev.map((r) => (r.id === resetModalItem.id ? { ...r, status: 'resolved' as const } : r))
    )

    showToast(`Password reset for ${resetModalItem.name}. Temporary credentials copied!`)
    setTimeout(() => {
      setResetModalItem(null)
    }, 1200)
  }

  const handleDismissPasswordRequest = (id: string) => {
    setPasswordRequests((prev) => prev.filter((r) => r.id !== id))
    showToast('Password request dismissed')
  }

  // Attendance Alert Actions
  const handleAcknowledgeAlert = (id: string) => {
    setAttendanceAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' as const } : a))
    )
    showToast('Alert acknowledged')
  }

  // Mark all as read/resolved
  const handleMarkAllRead = () => {
    setPasswordRequests((prev) => prev.map((r) => ({ ...r, status: 'resolved' as const })))
    setAttendanceAlerts((prev) => prev.map((a) => ({ ...a, status: 'acknowledged' as const })))
    showToast('All alerts and password requests marked as resolved')
  }

  const handleNavigate = (tab: string) => {
    onClose()
    onSelectTab?.(tab)
  }

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Soft backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-30 transition-opacity duration-300 cursor-pointer"
        onClick={onClose}
      />

      {/* Flyout Panel anchored top-right */}
      <div className="fixed top-20 right-8 w-full max-w-[540px] z-50 transition-all duration-300 transform origin-top-right">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden">

          {/* Panel Header */}
          <div className="p-5 pb-3 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                    Workforce Activity &amp; Alerts
                  </h2>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Live check-in/out feed, leave approvals &amp; attention items
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalActionableCount > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    {totalActionableCount} Actionable
                  </span>
                )}

                <button
                  onClick={refreshAll}
                  title="Refresh items"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  type="button"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${activeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All ({punches.length + totalActionableCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('punches')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeFilter === 'punches'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Check-ins &amp; Outs</span>
                {punches.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {punches.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('leaves')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeFilter === 'leaves'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span>Leave Requests</span>
                {pendingLeaves.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {pendingLeaves.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('passwords')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeFilter === 'passwords'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span>Password Resets</span>
                {pendingPasswords.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {pendingPasswords.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('alerts')}
                className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeFilter === 'alerts'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span>Alerts</span>
                {pendingAlerts.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {pendingAlerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}

          {/* Scrollable Items Container */}
          <div className="flex flex-col overflow-y-auto p-4 gap-3 bg-slate-50/70 divide-y divide-slate-100">
            {isLoading && (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                <span className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs text-slate-500 font-medium">Loading live workforce activity...</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && (punches.length === 0 && totalActionableCount === 0) && (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[32px]">verified</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">All Caught Up!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                  There are no recent check-in/out records or pending requests requiring your attention right now.
                </p>
              </div>
            )}

            {/* SECTION 1: LIVE CHECK-IN & CHECK-OUT PUNCHES */}
            {(activeFilter === 'all' || activeFilter === 'punches') &&
              punches.map((punch) => {
                const isCheckIn = punch.type === 'check_in'
                const isLate = punch.status === 'Late'
                return (
                  <div
                    key={`punch-${punch.id}`}
                    className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all relative group"
                  >
                    <div
                      className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${isCheckIn
                          ? isLate
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          : 'bg-blue-500'
                        }`}
                    />
                    <div className="flex items-start gap-3 pl-1.5">
                      {/* Avatar or initial */}
                      <div className="relative shrink-0 mt-0.5">
                        {punch.avatar ? (
                          <img
                            className="w-10 h-10 rounded-xl object-cover shadow-xs ring-1 ring-slate-200"
                            alt={punch.employeeName}
                            src={punch.avatar}
                            onError={(e) => {
                              ; (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ring-1 ring-slate-200 shadow-xs ${isCheckIn ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                              }`}
                          >
                            {punch.employeeName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center ring-2 ring-white shadow-xs ${isCheckIn
                              ? isLate
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                              : 'bg-blue-600'
                            }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {isCheckIn ? 'login' : 'logout'}
                          </span>
                        </div>
                      </div>

                      {/* Punch Details */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {punch.employeeName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({punch.employeeId})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${isCheckIn
                                  ? isLate
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                            >
                              {isCheckIn
                                ? isLate
                                  ? 'Late Check-in'
                                  : 'Checked In'
                                : 'Checked Out'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">
                            {getRelativeTime(punch.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1 leading-snug">
                          <span className="font-semibold text-slate-800">
                            {isCheckIn ? 'Started work at' : 'Ended work at'}{' '}
                            {punch.timeFormatted || '—'}
                          </span>
                          {!isCheckIn && (
                            <span className="text-slate-500">
                              {' '}• Duration:{' '}
                              <strong className="text-slate-700">
                                {punch.workedDuration && punch.workedDuration !== '00:00' && punch.workedDuration !== '0h 00m'
                                  ? punch.workedDuration
                                  : formatWorkedDuration(punch.checkInTime, punch.timestamp, punch.workedMinutes)}
                              </strong>
                            </span>
                          )}
                          {punch.designation && (
                            <span className="text-slate-400">
                              {' '}• {punch.designation}
                            </span>
                          )}
                        </p>

                        {/* Quick View Button */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleNavigate('attendance')}
                            className="text-slate-500 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] text-slate-400">history</span>
                            <span>View Attendance Log</span>
                            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

            {/* SECTION 2: PENDING LEAVE REQUESTS */}
            {(activeFilter === 'all' || activeFilter === 'leaves') &&
              pendingLeaves.map((leave) => {
                const isItemUpdating = updatingId === leave.id
                return (
                  <div
                    key={`leave-${leave.id}`}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:shadow-md transition-all relative group"
                  >
                    <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-red-500 rounded-r-full"></div>
                    <div className="flex items-start gap-3 pl-1.5">
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <img
                          className="w-10 h-10 rounded-xl object-cover shadow-xs ring-1 ring-slate-200"
                          alt={leave.employeeName}
                          src={leave.avatar}
                          onError={(e) => {
                            ; (e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <span className="material-symbols-outlined text-[12px]">event_busy</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{leave.employeeName}</span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({leave.employeeId})
                            </span>
                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">
                              {leave.type} Leave
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">
                            {leave.submittedTime || 'Today'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
                          <span className="font-semibold text-slate-800">
                            {leave.fromDate} {leave.toDate && leave.toDate !== leave.fromDate ? `→ ${leave.toDate}` : ''}
                          </span>{' '}
                          ({leave.duration}) • <span className="text-slate-500">Reason:</span>{' '}
                          <span className="italic">{leave.reason || 'No reason provided'}</span>
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                          <button
                            disabled={isItemUpdating}
                            onClick={() => handleApproveLeave(leave)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {isItemUpdating ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            disabled={isItemUpdating}
                            onClick={() => handleRejectLeave(leave)}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Reject
                          </button>
                          <button
                            onClick={() => handleNavigate('leave-management')}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                            type="button"
                          >
                            <span>Open Roster</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

            {/* SECTION 3: FORGOT PASSWORD REQUESTS */}
            {(activeFilter === 'all' || activeFilter === 'passwords') &&
              pendingPasswords.map((req) => (
                <div
                  key={`pwd-${req.id}`}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:shadow-md transition-all relative group"
                >
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-amber-500 rounded-r-full"></div>
                  <div className="flex items-start gap-3 pl-1.5">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({req.employeeId})
                          </span>
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                            Password Reset
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-600 font-semibold shrink-0">
                          {req.timeAgo}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 leading-snug">
                        <span className="font-semibold text-slate-800">{req.role}</span> • {req.department}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 italic">
                        "{req.reason}"
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                        <button
                          onClick={() => openResetModal(req)}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[14px]">key</span>
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDismissPasswordRequest(req.id)}
                          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          type="button"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleNavigate('employees')}
                          className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                          type="button"
                        >
                          <span>Staff Dossier</span>
                          <span className="material-symbols-outlined text-[13px]">person</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* SECTION 4: ATTENDANCE & GEOFENCE EXCEPTIONS */}
            {(activeFilter === 'all' || activeFilter === 'alerts') &&
              pendingAlerts.map((alert) => (
                <div
                  key={`att-${alert.id}`}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:shadow-md transition-all relative group"
                >
                  <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-indigo-500'
                    }`}></div>
                  <div className="flex items-start gap-3 pl-1.5">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs border ${alert.type === 'geofence'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {alert.type === 'geofence' ? 'wrong_location' : 'timer_off'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{alert.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({alert.employeeId})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${alert.type === 'geofence'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                            {alert.type === 'geofence' ? 'Geofence Breach' : 'Punch Alert'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {alert.timeAgo}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-snug">
                        <span className="font-semibold text-slate-800">{alert.title}</span> • {alert.description}
                      </p>

                      {alert.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                          <span className="material-symbols-outlined text-[13px]">pin_drop</span>
                          <span>{alert.location}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
                        <button
                          onClick={() => handleNavigate('attendance')}
                          className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[14px] text-indigo-600">policy</span>
                          Review Attendance Log
                        </button>
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          type="button"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Panel Footer */}
          <div className="p-3.5 px-5 bg-white border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleMarkAllRead}
              className="text-primary hover:text-secondary text-xs font-semibold transition-colors cursor-pointer"
              type="button"
            >
              Mark alerts as handled
            </button>
            {/* <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('attendance')}
                className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                type="button"
              >
                <span>Live Roster</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
            </div> */}
          </div>
        </div>
      </div>

      {/* CREDENTIAL RESET MODAL */}
      {resetModalItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">vpn_key</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Issue Temporary Password</h3>
                  <p className="text-[11px] text-slate-500">Skypass Enterprise Credential Reset</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-800">{resetModalItem.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee ID:</span>
                  <span className="font-mono font-bold text-slate-800">{resetModalItem.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered Email:</span>
                  <span className="font-medium text-slate-700">{resetModalItem.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Generated Temporary Password:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedPassword}
                    onChange={(e) => setGeneratedPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword)
                      setCopySuccess(true)
                      setTimeout(() => setCopySuccess(false), 2000)
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copySuccess ? 'done' : 'content_copy'}
                    </span>
                    <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Share this temporary passcode with the employee. They will be prompted to choose a new password upon first sign-in.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Confirm &amp; Mark Handled</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
