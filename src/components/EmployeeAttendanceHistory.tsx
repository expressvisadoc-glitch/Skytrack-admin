import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getEmployeeMonthlyAttendance,
  type EmployeeMonthlyAttendanceResult,
  type MonthlyAttendanceDay,
} from '../lib/api'

interface EmployeeOption {
  id: string
  employeeId: string
  name: string
  role?: string
  department?: string
  avatar?: string
  joiningDate?: string
}

interface EmployeeAttendanceHistoryProps {
  employeeId: string
  employeeName?: string
  initialData?: any
  allEmployees?: EmployeeOption[]
  onBack: () => void
  onSelectEmployee?: (empId: string) => void
}

export function EmployeeAttendanceHistory({
  employeeId,
  employeeName,
  initialData,
  allEmployees = [],
  onBack,
  onSelectEmployee,
}: EmployeeAttendanceHistoryProps) {
  const { token, logout } = useAuth()
  const [currentEmpId, setCurrentEmpId] = useState<string>(employeeId)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [attendanceData, setAttendanceData] = useState<EmployeeMonthlyAttendanceResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Keep track of current employee if prop changes
  useEffect(() => {
    if (employeeId && employeeId !== currentEmpId) {
      setCurrentEmpId(employeeId)
      setSelectedMonth('') // Reset to default month for new employee
    }
  }, [employeeId, currentEmpId])

  // Load monthly attendance data
  const loadData = useCallback(async () => {
    if (!token || !currentEmpId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await getEmployeeMonthlyAttendance(token, currentEmpId, selectedMonth || undefined)
      setAttendanceData(result)
      if (!selectedMonth && result.month) {
        setSelectedMonth(result.month)
      }
    } catch (err: any) {
      console.error('Failed to load employee monthly attendance:', err)
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError(err?.message || 'Unable to load attendance history.')
    } finally {
      setIsLoading(false)
    }
  }, [token, currentEmpId, selectedMonth, logout])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
  }

  const handleSwitchEmployee = (newEmpId: string) => {
    setCurrentEmpId(newEmpId)
    setSelectedMonth('')
    if (onSelectEmployee) {
      onSelectEmployee(newEmpId)
    }
  }

  // Filter days based on search and status filter
  const filteredDays = useMemo(() => {
    if (!attendanceData?.days) return []
    return attendanceData.days.filter((day: MonthlyAttendanceDay) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !q ||
        day.date.toLowerCase().includes(q) ||
        day.dayOfWeek.toLowerCase().includes(q) ||
        day.statusLabel.toLowerCase().includes(q) ||
        (day.notes && day.notes.toLowerCase().includes(q)) ||
        (day.holidayName && day.holidayName.toLowerCase().includes(q))

      let matchesFilter = true
      if (statusFilter === 'Present') {
        matchesFilter = day.status === 'present' || day.status === 'working'
      } else if (statusFilter === 'Late') {
        matchesFilter = day.status === 'late'
      } else if (statusFilter === 'Leave') {
        matchesFilter = day.status === 'leave'
      } else if (statusFilter === 'Absent') {
        matchesFilter = day.status === 'absent'
      } else if (statusFilter === 'Holiday') {
        matchesFilter = day.status === 'holiday'
      } else if (statusFilter === 'Sunday') {
        matchesFilter = day.status === 'weekend'
      }

      return matchesQuery && matchesFilter
    })
  }, [attendanceData?.days, searchQuery, statusFilter])

  const employee = attendanceData?.employee || {
    id: currentEmpId,
    employeeId: initialData?.employeeId || currentEmpId,
    name: employeeName || initialData?.employeeName || 'Employee',
    role: initialData?.role || 'Team Member',
    department: initialData?.department || 'Department',
    joiningDate: initialData?.joiningDate || initialData?.created_at,
    created_at: initialData?.created_at,
    avatar: initialData?.avatar,
    email: initialData?.email,
    phone: initialData?.phone,
  }

  const summary = attendanceData?.summary
  const availableMonths = attendanceData?.availableMonths || []

  const formattedJoiningDate = useMemo(() => {
    const raw = employee.joiningDate || employee.created_at
    if (!raw) return null
    try {
      const d = new Date(raw)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }, [employee.joiningDate, employee.created_at])

  const handlePrint = () => {
    window.print()
  }

  return (
    <main className="relative min-h-screen bg-[#faf9fd] w-full px-4 sm:px-8 py-7 pt-24 print:pt-4 print:px-2 print:bg-white">
      <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto">
        {/* Top Header Bar & Breadcrumb */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-red-50 border border-slate-200/80 hover:border-red-200 text-slate-700 hover:text-red-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
                <span>Back to Attendance</span>
              </button>
              <span className="text-slate-300">/</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100/70 text-red-700 text-[11px] font-bold uppercase tracking-wider">
                MONTHLY AUDIT TRAIL
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                {employee.name}
              </h1>
              <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs">
                {employee.employeeId}
              </span>
              <span className="text-sm text-slate-500">
                • {employee.role} ({employee.department})
              </span>
            </div>
          </div>

          {/* Employee & Month Controls */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {/* Employee Switcher (if list provided) */}
            {allEmployees.length > 0 && (
              <div className="relative flex items-center bg-white border border-slate-200/80 rounded-2xl shadow-xs px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400 mr-2">
                  badge
                </span>
                <div className="flex flex-col mr-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    EMPLOYEE
                  </span>
                  <select
                    value={currentEmpId}
                    onChange={(e) => handleSwitchEmployee(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-4"
                  >
                    {allEmployees.map((emp) => (
                      <option key={emp.id || emp.employeeId} value={emp.employeeId || emp.id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Selectable Month Dropdown (Starts from joining date) */}
            <div className="relative flex items-center bg-white border border-red-200 rounded-2xl shadow-xs px-3.5 py-2 ring-2 ring-red-500/10">
              <span className="material-symbols-outlined text-[19px] text-red-600 mr-2.5">
                calendar_month
              </span>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">
                  SELECTABLE MONTH
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-4"
                >
                  {availableMonths.length === 0 ? (
                    <option value={selectedMonth}>{attendanceData?.monthName || 'Current Month'}</option>
                  ) : (
                    availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Print / Export Action */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Print Timesheet"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span className="hidden sm:inline">Print Timesheet</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Employee Profile Overview Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {employee.avatar ? (
              <img
                alt={employee.name}
                src={employee.avatar}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-red-500/20 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                {employee.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">{employee.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                  {employee.employeeId}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-0.5">
                {employee.role} • {employee.department}
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Onboarding / Added Date Banner */}
          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            {formattedJoiningDate ? (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="material-symbols-outlined text-red-600 text-[18px]">
                  event_available
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ONBOARDED DATE
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Added on {formattedJoiningDate}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-red-50/50 border border-red-100">
              <span className="material-symbols-outlined text-red-600 text-[18px]">
                date_range
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] text-red-600/80 font-bold uppercase tracking-wider">
                  HISTORY TIMEFRAME
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {attendanceData?.monthName || 'Selected Month'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. Total Worked Hours */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                WORKED HOURS
              </span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                schedule
              </span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {isLoading ? '...' : summary?.totalHours || '0h 00m'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Avg: {summary?.averageHours || '0h 00m'} / day
              </p>
            </div>
          </div>

          {/* 2. Target Required Hours */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TARGET HOURS
              </span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                flag
              </span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {isLoading ? '...' : summary?.targetHours || '0h 00m'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary?.requiredWorkingDays || 0} Working Days
              </p>
            </div>
          </div>

          {/* 3. Present Days */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PRESENT DAYS
              </span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                how_to_reg
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-600 tracking-tight">
                  {isLoading ? '...' : summary?.presentDays || 0}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {summary?.requiredWorkingDays || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary?.presentPercent || 0}% attendance rate
              </p>
            </div>
          </div>

          {/* 4. Absent Days */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ABSENT DAYS
              </span>
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-red-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                event_busy
              </span>
            </div>
            <div>
              <span className="text-xl font-bold text-red-600 tracking-tight">
                {isLoading ? '...' : summary?.absentDays || 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Unexcused absences
              </p>
            </div>
          </div>

          {/* 5. Approved Leave Days */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                LEAVE DAYS
              </span>
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                beach_access
              </span>
            </div>
            <div>
              <span className="text-xl font-bold text-purple-600 tracking-tight">
                {isLoading ? '...' : summary?.leaveDays || 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Paid & verified leaves
              </p>
            </div>
          </div>

          {/* 6. Overtime / Difference */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                OVERTIME / BALANCE
              </span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center material-symbols-outlined text-[16px]">
                timelapse
              </span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {isLoading ? '...' : summary?.differenceFormatted || '0h 00m'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Net vs target hours
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search date, status, notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 placeholder:text-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {['All', 'Present', 'Late', 'Leave', 'Holiday', 'Sunday', 'Absent'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                type="button"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Attendance Breakdown Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-900 text-sm">
                Daily Attendance Breakdown
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                • {attendanceData?.monthName || 'Selected Month'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredDays.length} Days
            </span>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white">
                  <th className="py-3 px-6">DATE & DAY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">CHECK IN</th>
                  <th className="py-3 px-4">CHECK OUT</th>
                  <th className="py-3 px-4">BREAK</th>
                  <th className="py-3 px-4">WORKED HOURS</th>
                  <th className="py-3 px-6">REMARKS / NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-500 animate-ping"></span>
                        <p className="text-slate-500 font-semibold text-xs">
                          Fetching monthly attendance history...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredDays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredDays.map((row: MonthlyAttendanceDay) => {
                    const isToday = row.date === new Date().toISOString().slice(0, 10)
                    return (
                      <tr
                        key={row.date}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isToday ? 'bg-red-50/20' : ''
                        }`}
                      >
                        {/* Date & Day */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {row.dayNumber}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">
                                {new Date(row.date + 'T12:00:00').toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                {isToday && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                    Today
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {row.dayOfWeek}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {row.status === 'present' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Present
                            </span>
                          )}
                          {row.status === 'working' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Working Live
                            </span>
                          )}
                          {row.status === 'late' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Late
                            </span>
                          )}
                          {row.status === 'half_day' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Half Day
                            </span>
                          )}
                          {row.status === 'leave' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {row.statusLabel}
                            </span>
                          )}
                          {row.status === 'holiday' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Holiday
                            </span>
                          )}
                          {row.status === 'weekend' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Sunday
                            </span>
                          )}
                          {row.status === 'absent' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-red-700 font-bold text-[11px] border border-red-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Absent
                            </span>
                          )}
                          {row.status === 'incomplete' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Missing Checkout
                            </span>
                          )}
                        </td>

                        {/* Check In */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              row.checkIn !== '—' ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {row.checkIn}
                          </span>
                        </td>

                        {/* Check Out */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {row.status === 'working' ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active Shift
                            </span>
                          ) : (
                            <span
                              className={`font-semibold ${
                                row.checkOut !== '—' ? 'text-slate-900' : 'text-slate-400'
                              }`}
                            >
                              {row.checkOut}
                            </span>
                          )}
                        </td>

                        {/* Break */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {row.breakFormatted !== '0m' ? row.breakFormatted : '—'}
                        </td>

                        {/* Worked Hours */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              row.hours !== '0h 00m'
                                ? 'text-slate-900'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.hours}
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="py-3.5 px-6 text-slate-500">
                          {row.notes ? (
                            <span className="text-xs text-slate-600">{row.notes}</span>
                          ) : row.holidayName ? (
                            <span className="text-xs text-blue-700 font-medium">
                              {row.holidayName}
                            </span>
                          ) : row.leaveType ? (
                            <span className="text-xs text-purple-700 font-medium">
                              {row.leaveType} Leave
                            </span>
                          ) : row.checkIn !== '—' ? (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">
                                verified
                              </span>
                              Biometric gateway verified
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing {filteredDays.length} logged days for {attendanceData?.monthName || 'selected month'}
            </span>
            <span className="font-semibold text-slate-600">
              Total Active Time: {summary?.totalHours || '0h 00m'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
