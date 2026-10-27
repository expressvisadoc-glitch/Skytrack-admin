import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  getEmployeeMonthlyAttendance,
  type MonthlyAttendanceSummary,
  type MonthlyAttendanceDay,
  isSessionExpiredError
} from '../../lib/api'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  CalendarDays,
  Briefcase,
  Hourglass
} from 'lucide-react'
import { EmployeePayslips } from './EmployeePayslips'

export function EmployeeMonthly() {
  const { token, employee, logout } = useAuth()
  
  // Format current month: "YYYY-MM"
  const getCurrentMonthStr = () => {
    const d = new Date()
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    return `${yr}-${mo}`
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr)
  const [summary, setSummary] = useState<MonthlyAttendanceSummary | null>(null)
  const [records, setRecords] = useState<MonthlyAttendanceDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load monthly attendance
  const loadMonthData = useCallback(async (monthStr: string) => {
    const empId = employee?.employee_id || employee?.employeeId || employee?.id
    if (!token || !empId) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await getEmployeeMonthlyAttendance(token, empId, monthStr)
      if (res && res.summary) {
        setSummary(res.summary)
        setRecords(res.days || [])
      } else {
        setSummary(null)
        setRecords([])
        setErrorMessage('Unable to retrieve monthly attendance.')
      }
    } catch (err: any) {
      console.error('Failed to load monthly attendance:', err)
      if (isSessionExpiredError(err)) {
        logout()
        return
      }
      setErrorMessage(err?.message || 'Error communicating with attendance server.')
      setSummary(null)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [token, employee, logout])

  useEffect(() => {
    loadMonthData(selectedMonth)
  }, [selectedMonth, loadMonthData])

  // Failsafe: if an expired session error is somehow set, navigate to login
  useEffect(() => {
    if (isSessionExpiredError(errorMessage)) {
      logout()
    }
  }, [errorMessage, logout])

  // Navigate months
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const d = new Date(year, month - 2, 1)
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${yr}-${mo}`)
  }

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const d = new Date(year, month, 1)
    const yr = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${yr}-${mo}`)
  }

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(getCurrentMonthStr())
  }

  // Format month for display: e.g. "October 2026"
  const formatMonthTitle = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number)
      const date = new Date(year, month - 1, 1)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } catch {
      return monthStr
    }
  }

  // Format date display: e.g. "Mon, Oct 19, 2026"
  const formatDateTitle = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="pt-24 px-4 sm:px-8 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Top Header with Month Navigator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
              Timesheet &amp; Punches
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Monthly Attendance Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your daily punches, hours worked, breaks, and compliance summary for {formatMonthTitle(selectedMonth)}.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 font-extrabold text-xs text-slate-800 font-mono tracking-tight">
            {formatMonthTitle(selectedMonth)}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {selectedMonth !== getCurrentMonthStr() && (
            <button
              onClick={handleResetToCurrentMonth}
              className="ml-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Current
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Payslips for locked payroll months */}
      <EmployeePayslips />

      {/* Monthly Statistics Bento Pods */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Pod 1: Days Present */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Days Present</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {summary?.presentDays ?? '—'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            of <strong className="text-slate-700">{summary?.requiredWorkingDays ?? 0} required working days</strong>
          </div>
        </div>

        {/* Pod 2: Attendance Rate */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">
            {summary?.presentPercent != null ? `${summary.presentPercent}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {summary?.absentDays ? `${summary.absentDays} absent days recorded` : 'Perfect attendance record'}
          </div>
        </div>

        {/* Pod 3: Total Hours Worked */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Worked</span>
            <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {summary?.totalHours || '0h 00m'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Accumulated monthly work time
          </div>
        </div>

        {/* Pod 4: Average Daily Hours */}
        <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily Average</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Hourglass className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {summary?.averageHours || '0h 00m'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Standard baseline: 8h 00m / day
          </div>
        </div>
      </div>

      {/* Daily Records Ledger Table */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Punches &amp; Working Hours</h2>
            <span className="text-[11px] text-slate-400 font-medium">Detailed logs for each recorded calendar day</span>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {records.length} {records.length === 1 ? 'Day' : 'Days'}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
            <p className="text-xs font-bold text-slate-500">Loading Timesheet Records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Attendance Records</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              No punch logs or attendance records found for {formatMonthTitle(selectedMonth)}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Punch In</th>
                  <th className="py-3 px-3">Punch Out</th>
                  <th className="py-3 px-3">Work Duration</th>
                  <th className="py-3 px-3 text-right">Breaks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((rec, idx) => {
                  const st = String(rec.status || 'present').toLowerCase()
                  const isPresent = st === 'present'
                  const isWorking = st === 'working'
                  const isLeave = st === 'leave'
                  const isHoliday = st === 'holiday'
                  const isWeekend = st === 'weekend'
                  const isAbsent = st === 'absent'

                  return (
                    <tr key={rec.date || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800">{formatDateTitle(rec.date)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {isPresent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Present
                          </span>
                        )}
                        {isWorking && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Working
                          </span>
                        )}
                        {isLeave && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            On Leave
                          </span>
                        )}
                        {isHoliday && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Public Holiday
                          </span>
                        )}
                        {isWeekend && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Week Off
                          </span>
                        )}
                        {isAbsent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Absent
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {rec.checkIn || '—'}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {rec.checkOut || (isWorking ? 'Active' : '—')}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {rec.hours || '0h 00m'}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-amber-700 text-right">
                        {rec.breakFormatted || '0m'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
