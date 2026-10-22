import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  submitLeave, 
  getLeaveHistory, 
  getLeaveBalance, 
  cancelLeave,
  getPublicHolidaysList,
  getEmployeeProfile,
  getOrganizationData,
  resolveReportingManagerNameFromOrg,
  isUuid,
  type SkyTrackLeave,
  type SkyTrackEmployeeLeaveBalance,
  type PublicHolidayItem,
  isSessionExpiredError
} from '../../lib/api'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  CalendarDays, 
  ShieldCheck, 
  Ban,
  Clock,
  Sparkles,
  Palmtree,
  Stethoscope,
  CreditCard,
  History,
  Users
} from 'lucide-react'

export function EmployeeLeaves() {
  const { token, employee, logout, updateEmployee } = useAuth()
  
  // Data states
  const [leaves, setLeaves] = useState<SkyTrackLeave[]>([])
  const [balances, setBalances] = useState<SkyTrackEmployeeLeaveBalance | null>(null)
  const [remoteHolidays, setRemoteHolidays] = useState<PublicHolidayItem[]>([])
  const [remoteManagerName, setRemoteManagerName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all')
  const [showPastDateModal, setShowPastDateModal] = useState(false)

  // Calendar states (matching Android app)
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today])

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-indexed (1..12)

  const [selectedStartDate, setSelectedStartDate] = useState<string>(todayStr)
  const [selectedEndDate, setSelectedEndDate] = useState<string>(todayStr)
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [selectedSession, setSelectedSession] = useState<'First Half' | 'Second Half'>('First Half')
  const [leaveCategory, setLeaveCategory] = useState<'Casual Leave' | 'Sick Leave' | 'Loss of Pay'>('Casual Leave')
  const [reason, setReason] = useState('')
  const [holidayIndex, setHolidayIndex] = useState(0)

  // Balance availability
  const casualBalance = balances ? Number(balances?.casual?.balance ?? 0) : 12
  const sickBalance = balances ? Number(balances?.sick?.balance ?? 0) : 6
  const isCasualAvailable = balances === null || casualBalance > 0
  const isSickAvailable = balances === null || sickBalance > 0

  // Synchronize selected leave category with available balances (matching Android LeaveScreen)
  useEffect(() => {
    if (!balances) return
    const casualLeft = Number(balances?.casual?.balance ?? 0)
    const sickLeft = Number(balances?.sick?.balance ?? 0)

    if (casualLeft <= 0 && sickLeft <= 0) {
      setLeaveCategory('Loss of Pay')
    } else if (leaveCategory === 'Casual Leave' && casualLeft <= 0) {
      setLeaveCategory(sickLeft > 0 ? 'Sick Leave' : 'Loss of Pay')
    } else if (leaveCategory === 'Sick Leave' && sickLeft <= 0) {
      setLeaveCategory(casualLeft > 0 ? 'Casual Leave' : 'Loss of Pay')
    }
  }, [balances, leaveCategory])

  // Manager name for Approver Handover Note (checking live remoteManagerName, session employee, and all alias keys)
  const managerName = useMemo(() => {
    const raw = remoteManagerName ||
      employee?.reporting_manager_name ||
      employee?.manager_name ||
      employee?.managerName ||
      employee?.reportingManager ||
      ''
    const clean = typeof raw === 'string' ? raw.trim() : ''
    if (
      clean &&
      clean.toLowerCase() !== 'null' &&
      clean.toLowerCase() !== 'undefined' &&
      clean.toLowerCase() !== 'not assigned' &&
      clean.toLowerCase() !== 'not_assigned' &&
      !isUuid(clean)
    ) {
      return clean
    }

    // Check reportingManagerId fallback if manager name is not yet resolved
    const repId = employee?.reportingManagerId || employee?.reporting_manager_id
    if (repId && typeof repId === 'string') {
      const cleanRepId = repId.trim()
      if (
        cleanRepId &&
        cleanRepId.toLowerCase() !== 'null' &&
        cleanRepId.toLowerCase() !== 'undefined' &&
        cleanRepId.toLowerCase() !== 'not assigned' &&
        cleanRepId.toLowerCase() !== 'not_assigned' &&
        !isUuid(cleanRepId)
      ) {
        return cleanRepId
      }
    }

    return ''
  }, [remoteManagerName, employee])

  // Load balances, employee leave history, public holidays, and live employee profile
  const loadData = useCallback(async (quiet = false) => {
    if (!token) return
    if (!quiet) setIsLoading(true)
    setErrorMessage(null)

    try {
      const [historyRes, balanceRes, holidaysRes, profileRes, orgRes] = await Promise.allSettled([
        getLeaveHistory(token),
        getLeaveBalance(token),
        getPublicHolidaysList(token),
        getEmployeeProfile(token),
        getOrganizationData(token)
      ])

      let extractedManager: string | null = null
      let extractedRepId: string | null = employee?.reportingManagerId || employee?.reporting_manager_id || null

      // 1. Leave History & Manager extraction
      if (historyRes.status === 'fulfilled' && historyRes.value) {
        const hVal = historyRes.value as any
        if (hVal.leaves) setLeaves(hVal.leaves)
        else if (hVal.data) setLeaves(hVal.data)

        const mgr = hVal.reporting_manager_name || hVal.managerName || hVal.manager_name || hVal.reportingManager
        if (mgr && typeof mgr === 'string' && mgr.trim() && !isUuid(mgr.trim())) {
          extractedManager = mgr.trim()
        }
        if (hVal.reportingManagerId || hVal.reporting_manager_id) {
          extractedRepId = hVal.reportingManagerId || hVal.reporting_manager_id
        }
      }

      // 2. Balances & Manager extraction
      if (balanceRes.status === 'fulfilled' && balanceRes.value) {
        const bVal = balanceRes.value as any
        if (bVal.balance) setBalances(bVal.balance)

        const mgr = bVal.reporting_manager_name || bVal.managerName || bVal.manager_name || bVal.reportingManager
        if (!extractedManager && mgr && typeof mgr === 'string' && mgr.trim() && !isUuid(mgr.trim())) {
          extractedManager = mgr.trim()
        }
        if (bVal.reportingManagerId || bVal.reporting_manager_id) {
          extractedRepId = bVal.reportingManagerId || bVal.reporting_manager_id
        }
      }

      // 3. Public Holidays
      if (holidaysRes.status === 'fulfilled' && holidaysRes.value && holidaysRes.value.holidays) {
        setRemoteHolidays(holidaysRes.value.holidays)
      }

      // 4. Live Employee Profile (Authoritative Manager resolution)
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const pVal = profileRes.value as any
        const emp = pVal.employee || pVal
        const mgr = emp?.reporting_manager_name || emp?.managerName || emp?.manager_name || emp?.reportingManager
        if (mgr && typeof mgr === 'string' && mgr.trim() && !isUuid(mgr.trim())) {
          extractedManager = mgr.trim()
        }
        if (emp?.reportingManagerId || emp?.reporting_manager_id) {
          extractedRepId = emp.reportingManagerId || emp.reporting_manager_id
        }
        updateEmployee?.(emp)
      }

      // 5. Fallback Resolution from Organization Data
      if (!extractedManager && extractedRepId) {
        const cleanRepId = String(extractedRepId).trim()
        if (orgRes.status === 'fulfilled' && orgRes.value?.managers) {
          const matched = orgRes.value.managers.find(
            (m: any) =>
              (m.id && m.id.toLowerCase() === cleanRepId.toLowerCase()) ||
              (m.employee_id && m.employee_id.trim().toLowerCase() === cleanRepId.toLowerCase()) ||
              (m.auth_user_id && m.auth_user_id.toLowerCase() === cleanRepId.toLowerCase()) ||
              (m.name && m.name.trim().toLowerCase() === cleanRepId.toLowerCase())
          )
          if (matched?.name) {
            extractedManager = matched.name.trim()
          }
        }
        if (!extractedManager) {
          extractedManager = await resolveReportingManagerNameFromOrg(token, cleanRepId)
        }
        if (!extractedManager && !isUuid(cleanRepId)) {
          extractedManager = cleanRepId
        }
      }

      if (extractedManager) {
        setRemoteManagerName(extractedManager)
        updateEmployee?.({
          reporting_manager_name: extractedManager,
          managerName: extractedManager,
          reportingManager: extractedManager,
          reportingManagerId: extractedRepId
        })
      }
    } catch (err: any) {
      console.error('Failed to load leave data:', err)
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      if (!quiet) {
        setErrorMessage(err?.message || 'Unable to load leave records.')
      }
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }, [token, logout, updateEmployee])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calendar navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setHolidayIndex(0)
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setHolidayIndex(0)
  }

  const monthTitle = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [currentYear, currentMonth])

  // Holidays for current calendar month
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const monthHolidays = useMemo(() => {
    return remoteHolidays.filter((h) => h.date && h.date.startsWith(monthPrefix))
  }, [remoteHolidays, monthPrefix])

  const holidayDateSet = useMemo(() => {
    return new Set(monthHolidays.map((h) => h.date))
  }, [monthHolidays])

  // Format holiday date like Android app: "MMM d" (e.g. "Oct 24")
  const formatHolidayDate = (dStr?: string) => {
    if (!dStr) return ''
    try {
      const d = new Date(dStr + 'T12:00:00')
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dStr
    }
  }

  // Calculate dynamic Loss of Pay (LOP) days taken this month (same as Android app)
  const lopUsed = useMemo(() => {
    const mPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    return leaves
      .filter((it) => {
        const typeStr = (it.leaveType || (it as any).type || '').toLowerCase()
        const isLopType = typeStr.includes('loss') || typeStr.includes('lop')
        const isApproved = String(it.status || '').toLowerCase() === 'approved'
        const isCurrentMonth = (it.fromDate && it.fromDate.startsWith(mPrefix)) || (it.toDate && it.toDate.startsWith(mPrefix))
        return isLopType && isApproved && isCurrentMonth
      })
      .reduce((sum, it) => sum + (Number(it.leaveDays) || 1), 0)
  }, [leaves, currentYear, currentMonth])

  // Half day toggle
  const handleToggleHalfDay = () => {
    setIsHalfDay((prev) => {
      const next = !prev
      if (next) {
        setSelectedEndDate(selectedStartDate)
      }
      return next
    })
  }

  // Date click handling (matching Android LeaveScreen logic)
  const handleDateClick = (clickedDateStr: string) => {
    if (isHalfDay) {
      setSelectedStartDate(clickedDateStr)
      setSelectedEndDate(clickedDateStr)
    } else {
      if (selectedStartDate !== selectedEndDate) {
        // Start a fresh range
        setSelectedStartDate(clickedDateStr)
        setSelectedEndDate(clickedDateStr)
      } else {
        if (clickedDateStr < selectedStartDate) {
          setSelectedStartDate(clickedDateStr)
        } else {
          setSelectedEndDate(clickedDateStr)
        }
      }
    }
  }

  // Calculate duration in days (excluding Sundays as in backend)
  const calculatedDays = useMemo(() => {
    if (isHalfDay) return 0.5
    if (!selectedStartDate || !selectedEndDate || selectedStartDate > selectedEndDate) return 1
    let count = 0
    const cur = new Date(selectedStartDate)
    const end = new Date(selectedEndDate)
    while (cur <= end) {
      if (cur.getUTCDay() !== 0) {
        count++
      }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return count > 0 ? count : 1
  }, [isHalfDay, selectedStartDate, selectedEndDate])

  // Formatted date range for summary pill
  const selectedDatesFormatted = useMemo(() => {
    const formatDateShort = (dStr: string) => {
      try {
        const d = new Date(dStr + 'T12:00:00')
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } catch {
        return dStr
      }
    }

    if (isHalfDay || selectedStartDate === selectedEndDate) {
      return formatDateShort(selectedStartDate)
    } else {
      return `${formatDateShort(selectedStartDate)} – ${formatDateShort(selectedEndDate)}`
    }
  }, [isHalfDay, selectedStartDate, selectedEndDate])

  // Actual leave submission execution
  const performSubmit = async () => {
    if (!token || isSubmitting) return

    if (leaveCategory === 'Casual Leave' && !isCasualAvailable) {
      setErrorMessage('You have 0 Casual Leaves remaining. Please select Sick Leave or Loss of Pay.')
      return
    }
    if (leaveCategory === 'Sick Leave' && !isSickAvailable) {
      setErrorMessage('You have 0 Sick Leaves remaining. Please select Casual Leave or Loss of Pay.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    // Construct the type string
    const finalType = isHalfDay 
      ? (leaveCategory === 'Casual Leave' ? 'Casual Leave (Half Day)' : leaveCategory === 'Sick Leave' ? 'Sick Leave (Half Day)' : 'Loss of Pay (Half Day)')
      : leaveCategory

    const fullReason = isHalfDay 
      ? `[${selectedSession === 'First Half' ? 'Morning / First Half' : 'Afternoon / Second Half'}] ${reason.trim()}`
      : reason.trim()

    try {
      const res = await submitLeave(token, selectedStartDate, selectedEndDate, finalType, fullReason)
      if (res && (res.success || (res as any).leave)) {
        setSuccessMessage('Leave application submitted successfully for review.')
        setReason('')
        setIsHalfDay(false)
        await loadData(true)
      } else {
        setErrorMessage((res as any)?.message || 'Failed to submit leave request.')
      }
    } catch (err: any) {
      console.error('Leave submit error:', err)
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'An error occurred while submitting your leave application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Form submission with past date verification (matching Android app)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || isSubmitting) return

    if (!selectedStartDate || !selectedEndDate) {
      setErrorMessage('Please select leave dates.')
      return
    }

    if (selectedStartDate > selectedEndDate) {
      setErrorMessage('Start date cannot be after end date.')
      return
    }

    if (reason.trim().length < 3) {
      setErrorMessage('Please enter a reason for your leave request (at least 3 characters).')
      return
    }

    // Check if applying for a past date (same as Android LeaveScreen:502)
    if (selectedStartDate < todayStr) {
      setShowPastDateModal(true)
      return
    }

    await performSubmit()
  }

  // Cancel pending leave
  const handleCancel = async (leaveId: string, requestId?: string) => {
    if (!token || cancellingId) return
    if (!window.confirm('Are you sure you want to cancel this pending leave request?')) {
      return
    }

    setCancellingId(leaveId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await cancelLeave(token, requestId || leaveId)
      if (res && (res.success || (res as any).leave)) {
        setSuccessMessage('Leave request has been cancelled.')
        await loadData(true)
      } else {
        setErrorMessage(res.message || 'Unable to cancel this leave request.')
      }
    } catch (err: any) {
      console.error('Leave cancel error:', err)
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Failed to cancel leave request.')
    } finally {
      setCancellingId(null)
    }
  }

  // Failsafe: if an expired session error is somehow set, navigate to login
  useEffect(() => {
    if (isSessionExpiredError(errorMessage)) {
      logout()
    }
  }, [errorMessage, logout])

  // Filter requests
  const filteredLeaves = leaves.filter((item) => {
    if (activeFilter === 'all') return true
    const st = String(item.status || '').toLowerCase()
    return st === activeFilter
  })

  // Format date helper
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  // Calendar Matrix Grid Math
  const firstDayOfWeek = (() => {
    const d = new Date(currentYear, currentMonth - 1, 1).getDay()
    return d === 0 ? 6 : d - 1 // 0 = Mon, 6 = Sun
  })()

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate()

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const weekDaysLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Quick Tags (Matching Android LeaveScreen)
  const quickTags = ['Family Event', 'Medical checkup', 'Personal matter']

  const handleQuickTagClick = (tag: string) => {
    setReason((prev) => (prev ? `${prev}, ${tag}` : tag))
  }

  return (
    <div className="pt-24 px-4 sm:px-8 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
              Leave &amp; Absence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Leave Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View your allocated leave balances, submit new time-off requests, and track approval status.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-semibold">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-800 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Leave Balance Bento Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Casual Leave Balance */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Casual Leave (CL)</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Paid Leave
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
              {balances?.casual?.balance ?? balances?.casual?.allocated ?? 12}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              days remaining of {balances?.casual?.allocated ?? 12}
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.max(0, (((balances?.casual?.balance ?? 12) / (balances?.casual?.allocated || 12)) * 100)))}%` 
              }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Used: <strong className="text-slate-800">{balances?.casual?.used ?? 0} days</strong></span>
            <span>Allocated: <strong className="text-slate-800">{balances?.casual?.allocated ?? 12} days</strong></span>
          </div>
        </div>

        {/* Sick Leave Balance */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sick Leave (SL)</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">
              Medical
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
              {balances?.sick?.balance ?? balances?.sick?.allocated ?? 6}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              days remaining of {balances?.sick?.allocated ?? 6}
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, Math.max(0, (((balances?.sick?.balance ?? 6) / (balances?.sick?.allocated || 6)) * 100)))}%` 
              }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Used: <strong className="text-slate-800">{balances?.sick?.used ?? 0} days</strong></span>
            <span>Allocated: <strong className="text-slate-800">{balances?.sick?.allocated ?? 6} days</strong></span>
          </div>
        </div>

        {/* Loss of Pay Indicator */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4 relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loss of Pay (LOP)</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
              Unpaid Leave
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
              {String(lopUsed).padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              days taken this month
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed pt-1">
            Used when paid leave entitlements are exhausted. Deduction is calculated against monthly payroll.
          </p>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold pt-1">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Requires manager verification</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Leave Application Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form: Apply for Leave with EXACT ANDROID CALENDAR (7 Columns) */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Apply for Leave</h2>
                <span className="text-[11px] text-slate-400 font-medium">Select type, dates, and session</span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
              Step 1 of 2
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Leave Type Selector Group (Matching Android Options) */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-700">
                Select Leave Type
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Casual (CL) */}
                <button
                  type="button"
                  disabled={!isCasualAvailable}
                  onClick={() => isCasualAvailable && setLeaveCategory('Casual Leave')}
                  className={`h-16 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    !isCasualAvailable
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 pointer-events-none'
                      : leaveCategory === 'Casual Leave'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent shadow-md shadow-red-500/25 ring-2 ring-red-100 cursor-pointer'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 cursor-pointer'
                  }`}
                >
                  <Palmtree className={`w-4 h-4 ${!isCasualAvailable ? 'text-slate-400' : leaveCategory === 'Casual Leave' ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[11px] font-semibold leading-tight">Casual (CL)</span>
                  {!isCasualAvailable && (
                    <span className="text-[9px] font-bold text-red-500">0 left</span>
                  )}
                </button>

                {/* Sick (SL) */}
                <button
                  type="button"
                  disabled={!isSickAvailable}
                  onClick={() => isSickAvailable && setLeaveCategory('Sick Leave')}
                  className={`h-16 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    !isSickAvailable
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 pointer-events-none'
                      : leaveCategory === 'Sick Leave'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent shadow-md shadow-red-500/25 ring-2 ring-red-100 cursor-pointer'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 cursor-pointer'
                  }`}
                >
                  <Stethoscope className={`w-4 h-4 ${!isSickAvailable ? 'text-slate-400' : leaveCategory === 'Sick Leave' ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[11px] font-semibold leading-tight">Sick (SL)</span>
                  {!isSickAvailable && (
                    <span className="text-[9px] font-bold text-red-500">0 left</span>
                  )}
                </button>

                {/* Loss of Pay (LOP) */}
                <button
                  type="button"
                  onClick={() => setLeaveCategory('Loss of Pay')}
                  className={`h-16 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    leaveCategory === 'Loss of Pay'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-transparent shadow-md shadow-red-500/25 ring-2 ring-red-100'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${leaveCategory === 'Loss of Pay' ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[11px] font-semibold leading-tight">Loss of Pay</span>
                </button>
              </div>
            </div>

            {/* 2. Custom Calendar Matrix (Identical to Android App) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
              {/* Calendar Month Header with Prev/Next Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-red-500 shadow-xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                    {monthTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                    title="Previous Month"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                    title="Next Month"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Letters: M, T, W, T, F, S, S (Sunday in Red) */}
              <div className="grid grid-cols-7 text-center">
                {weekDaysLetters.map((letter, idx) => (
                  <span
                    key={idx}
                    className={`text-[11px] font-extrabold uppercase py-1 ${
                      idx === 6 ? 'text-red-500' : 'text-slate-400'
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>

              {/* 7-Column Days Grid */}
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {Array.from({ length: totalCells }).map((_, cellIdx) => {
                  const dayNum = cellIdx - firstDayOfWeek + 1
                  const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth

                  if (!isCurrentMonth) {
                    // Overflow days (muted)
                    const overflowNum = dayNum <= 0 ? daysInPrevMonth + dayNum : dayNum - daysInMonth
                    return (
                      <div
                        key={cellIdx}
                        className="h-9 flex items-center justify-center text-xs font-semibold text-slate-300 pointer-events-none select-none"
                      >
                        {overflowNum}
                      </div>
                    )
                  }

                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const isHoliday = holidayDateSet.has(dateStr)
                  const isStart = dateStr === selectedStartDate
                  const isEnd = dateStr === selectedEndDate
                  const isSelected = isStart || isEnd
                  const isInRange = !isHalfDay && dateStr > selectedStartDate && dateStr < selectedEndDate
                  const isSunday = (cellIdx % 7) === 6

                  // Cell shape classes for contiguous range
                  let roundedClass = 'rounded-lg'
                  if (isStart && isEnd) {
                    roundedClass = 'rounded-xl'
                  } else if (isStart) {
                    roundedClass = 'rounded-l-xl rounded-r-none'
                  } else if (isEnd) {
                    roundedClass = 'rounded-r-xl rounded-l-none'
                  } else if (isInRange) {
                    roundedClass = 'rounded-none'
                  }

                  return (
                    <button
                      key={cellIdx}
                      type="button"
                      onClick={() => handleDateClick(dateStr)}
                      className={`h-9 flex flex-col items-center justify-center relative cursor-pointer transition-all ${roundedClass} ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-extrabold shadow-sm z-10'
                          : isInRange
                            ? 'bg-red-50 text-red-600 font-bold'
                            : isHoliday
                              ? 'text-red-600 font-extrabold hover:bg-red-50/50'
                              : isSunday
                                ? 'text-red-500 font-bold hover:bg-slate-100'
                                : 'text-slate-700 font-semibold hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs leading-none">{dayNum}</span>
                      {isHoliday && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected ? 'bg-white' : 'bg-red-500'
                          }`}
                        ></span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Public Holiday Banner & Carousel Pill */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/60 flex items-center justify-between text-xs text-red-700">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    {monthHolidays.length > 0 ? (
                      <span className="truncate">
                        <strong>Public Holiday: </strong>
                        {formatHolidayDate(monthHolidays[holidayIndex]?.date)} ({monthHolidays[holidayIndex]?.name})
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">No public holidays this month</span>
                    )}
                  </div>

                  {monthHolidays.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => setHolidayIndex((i) => (i > 0 ? i - 1 : monthHolidays.length - 1))}
                        className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-red-700 cursor-pointer"
                        title="Previous Holiday"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-bold font-mono">
                        {holidayIndex + 1} of {monthHolidays.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHolidayIndex((i) => (i < monthHolidays.length - 1 ? i + 1 : 0))}
                        className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-red-700 cursor-pointer"
                        title="Next Holiday"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Duration & Half Day Switch */}
              <div className="pt-2 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Leave Duration</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700">Half Day</span>
                    {/* iOS style switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isHalfDay}
                      onClick={handleToggleHalfDay}
                      className={`w-10 h-5 rounded-full transition-colors p-0.5 cursor-pointer relative ${
                        isHalfDay ? 'bg-red-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                          isHalfDay ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Session Option Buttons (When Half Day is Active) */}
                {isHalfDay && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                      type="button"
                      onClick={() => setSelectedSession('First Half')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedSession === 'First Half'
                          ? 'bg-red-500 text-white border-red-500 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>First Half (Morning)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSession('Second Half')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedSession === 'Second Half'
                          ? 'bg-red-500 text-white border-red-500 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Second Half (Afternoon)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Dates & Duration Badge Summary */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-slate-600 font-medium">Selected:</span>
                  <span className="font-extrabold text-red-600 truncate font-mono">
                    {selectedDatesFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isHalfDay && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                      {selectedSession}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-xs border border-red-200 font-mono">
                    {isHalfDay ? '0.5 Day (Half Day)' : calculatedDays === 1 ? '1 Day' : `${calculatedDays} Days`}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Reason for Leave Input with Quick Tags (Matching Android LeaveReasonInput) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>REASON FOR LEAVE</span>
                <span className="font-mono text-slate-400 font-medium">{reason.length}/150</span>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 150))}
                placeholder="E.g., Attending family wedding, medical checkup at Aster Medcity..."
                rows={3}
                maxLength={150}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all resize-none min-h-[84px]"
                required
              />
            </div>

            {/* Approver Handover Note Card (Matching Android ApproverHandoverCard) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  Reporting Manager: {managerName || 'Not Assigned'}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {managerName 
                    ? `Request will be routed to ${managerName} for approval` 
                    : 'Request will be routed to Admin & HR Desk'}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-xs shadow-md shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Leave Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Leave Requests Ledger / History (5 Columns) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Leave Applications</h2>
              <span className="text-[11px] text-slate-400 font-medium">History of your time-off submissions</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((filter) => {
                const isActive = activeFilter === filter
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                )
              })}
            </div>
          </div>

          {/* List of Leave Applications */}
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
              <p className="text-xs font-bold text-slate-500">Loading Leave Records...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Leave Requests Found</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {activeFilter === 'all' 
                  ? 'You have not submitted any leave requests yet.' 
                  : `You have no ${activeFilter} leave requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredLeaves.map((lv) => {
                const statusLower = String(lv.status || 'pending').toLowerCase()
                const isPending = statusLower === 'pending'
                const isApproved = statusLower === 'approved'
                const isRejected = statusLower === 'rejected'
                const isCancelled = statusLower === 'cancelled'

                return (
                  <div
                    key={lv.id || lv.requestId}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatDateDisplay(lv.fromDate)} {lv.fromDate !== lv.toDate ? `— ${formatDateDisplay(lv.toDate)}` : ''}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {lv.leaveDays ?? 1} {Number(lv.leaveDays) === 0.5 ? 'Half Day' : Number(lv.leaveDays) === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700">{lv.leaveType || 'Leave'}</span>
                          {lv.requestId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-slate-400">ID: {lv.requestId}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    {lv.reason && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        <strong className="text-slate-800">Reason: </strong>
                        {lv.reason}
                      </p>
                    )}

                    {/* Manager Feedback note if approved or rejected */}
                    {lv.managerComment && (
                      <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 text-xs text-slate-700 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manager Note:</span>
                        <p className="font-medium text-slate-800">{lv.managerComment}</p>
                      </div>
                    )}

                    {/* Actions: Cancel if Pending */}
                    {isPending && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleCancel(lv.id, lv.requestId)}
                          disabled={cancellingId === lv.id}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {cancellingId === lv.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Cancel Request</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Past Date Confirmation Modal (Matching Android SkyTrackDialog) */}
      {showPastDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Past Date Selected</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are applying for leave on a past date. Do you want to proceed?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPastDateModal(false)}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPastDateModal(false)
                  performSubmit()
                }}
                className="h-10 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
