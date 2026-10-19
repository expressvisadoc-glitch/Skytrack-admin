import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getDailyAttendance,
  adminUndoCheckOut,
  adminSetAttendance,
  timeToIso,
  isoToTimeInput,
  getCurrentTimeInput,
  formatTime,
  type FullAttendanceRecord,
} from '../lib/api'
import { generateAttendancePdf } from '../lib/attendancePdf'
import { EmployeeAttendanceHistory } from './EmployeeAttendanceHistory'

export function Attendance() {
  const { token, logout } = useAuth()
  const [records, setRecords] = useState<FullAttendanceRecord[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    present: 0,
    late: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<
    'All' | 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
  >('All')
  const [selectedId, setSelectedId] = useState<string>('')
  const [downloadToast, setDownloadToast] = useState(false)
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<FullAttendanceRecord | null>(null)

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate)

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return selectedDate
    }
  }, [selectedDate])

  const currentMonthName = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return new Date().toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    }
  }, [selectedDate])

  const isToday = selectedDate === todayIsoDate

  const handlePreviousDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const prev = new Date(Date.UTC(y, m - 1, d - 1))
    setSelectedDate(prev.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    if (selectedDate >= todayIsoDate) return
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    setSelectedDate(next.toISOString().slice(0, 10))
  }

  const handleResetToday = () => {
    setSelectedDate(todayIsoDate)
  }

  const loadAttendance = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getDailyAttendance(token, selectedDate)
      setRecords(data.records)
      setCounts(data.counts)
      if (data.records.length > 0) {
        setSelectedId((prev) => prev && data.records.some(r => r.id === prev) ? prev : data.records[0].id)
      }
    } catch (err: any) {
      console.error('Failed to load daily attendance:', err)
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError('Unable to load attendance records. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedDate, logout])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Support direct deep linking via URL (?emp=SKY001)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const empParam = params.get('emp')
    if (empParam && records.length > 0 && !selectedEmployeeForHistory) {
      const found = records.find(
        (r) => r.employeeId.toLowerCase() === empParam.toLowerCase() || r.employeeDbId === empParam
      )
      if (found) setSelectedEmployeeForHistory(found)
    }
  }, [records, selectedEmployeeForHistory])

  // Support browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const empParam = params.get('emp')
      if (!empParam) {
        setSelectedEmployeeForHistory(null)
      } else if (records.length > 0) {
        const found = records.find(
          (r) => r.employeeId.toLowerCase() === empParam.toLowerCase() || r.employeeDbId === empParam
        )
        if (found) setSelectedEmployeeForHistory(found)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [records])

  const handleOpenEmployeeHistory = (record: FullAttendanceRecord) => {
    setSelectedEmployeeForHistory(record)
    const url = new URL(window.location.href)
    url.searchParams.set('emp', record.employeeId)
    window.history.pushState(null, '', url.toString())
  }

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeId.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q)

      const matchesFilter =
        currentFilter === 'All' || item.status === currentFilter

      return matchesQuery && matchesFilter
    })
  }, [records, searchQuery, currentFilter])

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedId) || records[0] || null
  }, [records, selectedId])

  const handleDownloadSheet = async () => {
    if (!selectedRecord) return
    setDownloadToast(true)

    // Build and download PDF attendance sheet
    const blob = await generateAttendancePdf(selectedRecord, formattedSelectedDate)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `SkyTrack_Attendance_${selectedRecord.employeeId}_${selectedDate}.pdf`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setTimeout(() => setDownloadToast(false), 3000)
  }

  // Manual Attendance & Undo Check-Out State
  const [manualCheckInTime, setManualCheckInTime] = useState<string>('')
  const [manualCheckOutTime, setManualCheckOutTime] = useState<string>('')
  const [isSavingIn, setIsSavingIn] = useState<boolean>(false)
  const [isSavingOut, setIsSavingOut] = useState<boolean>(false)
  const [isUndoing, setIsUndoing] = useState<boolean>(false)
  const [confirmUndoRecord, setConfirmUndoRecord] = useState<FullAttendanceRecord | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Keep manual time inputs in sync with the selected employee
  useEffect(() => {
    if (selectedRecord) {
      setManualCheckInTime(isoToTimeInput(selectedRecord.rawCheckIn))
      setManualCheckOutTime(isoToTimeInput(selectedRecord.rawCheckOut))
    } else {
      setManualCheckInTime('')
      setManualCheckOutTime('')
    }
  }, [selectedRecord?.id, selectedRecord?.rawCheckIn, selectedRecord?.rawCheckOut])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleSaveCheckIn = async () => {
    if (!token || !selectedRecord) return
    if (!manualCheckInTime) {
      setToast({ type: 'error', message: 'Please select a valid Check In time.' })
      return
    }
    setIsSavingIn(true)
    try {
      const isoCheckIn = timeToIso(selectedDate, manualCheckInTime)
      await adminSetAttendance(token, {
        employeeDbId: selectedRecord.employeeDbId,
        date: selectedDate,
        checkIn: isoCheckIn,
        attendanceDbId: selectedRecord.attendanceDbId,
      })
      setToast({
        type: 'success',
        message: `Check In set to ${formatTime(isoCheckIn)} for ${selectedRecord.employeeName}.`,
      })
      await loadAttendance()
    } catch (err: any) {
      console.error('Failed to set check in:', err)
      setToast({
        type: 'error',
        message: err?.message || 'Failed to update check in time.',
      })
    } finally {
      setIsSavingIn(false)
    }
  }

  const handleSaveCheckOut = async () => {
    if (!token || !selectedRecord) return
    if (!manualCheckOutTime) {
      setToast({ type: 'error', message: 'Please select a valid Check Out time.' })
      return
    }
    setIsSavingOut(true)
    try {
      const isoCheckOut = timeToIso(selectedDate, manualCheckOutTime)
      await adminSetAttendance(token, {
        employeeDbId: selectedRecord.employeeDbId,
        date: selectedDate,
        checkOut: isoCheckOut,
        attendanceDbId: selectedRecord.attendanceDbId,
      })
      setToast({
        type: 'success',
        message: `Check Out set to ${formatTime(isoCheckOut)} for ${selectedRecord.employeeName}.`,
      })
      await loadAttendance()
    } catch (err: any) {
      console.error('Failed to set check out:', err)
      setToast({
        type: 'error',
        message: err?.message || 'Failed to update check out time.',
      })
    } finally {
      setIsSavingOut(false)
    }
  }

  const handleConfirmUndoCheckOut = async (record: FullAttendanceRecord) => {
    if (!token) return
    setIsUndoing(true)
    try {
      await adminUndoCheckOut(token, {
        employeeDbId: record.employeeDbId,
        date: selectedDate,
        attendanceDbId: record.attendanceDbId,
      })
      setToast({
        type: 'success',
        message: `Check out undone for ${record.employeeName}. Session is now active.`,
      })
      setConfirmUndoRecord(null)
      await loadAttendance()
    } catch (err: any) {
      console.error('Failed to undo check out:', err)
      setToast({
        type: 'error',
        message: err?.message || 'Failed to undo check out.',
      })
    } finally {
      setIsUndoing(false)
    }
  }

  // If viewing employee monthly history page
  if (selectedEmployeeForHistory) {
    return (
      <EmployeeAttendanceHistory
        employeeId={selectedEmployeeForHistory.employeeId || selectedEmployeeForHistory.employeeDbId}
        employeeName={selectedEmployeeForHistory.employeeName}
        initialData={selectedEmployeeForHistory}
        allEmployees={records.map((r) => ({
          id: r.employeeDbId,
          employeeId: r.employeeId,
          name: r.employeeName,
          role: r.role,
          department: r.department,
          avatar: r.avatar,
          joiningDate: r.joiningDate || r.created_at,
        }))}
        onBack={() => {
          setSelectedEmployeeForHistory(null)
          const url = new URL(window.location.href)
          url.searchParams.delete('emp')
          window.history.pushState(null, '', url.pathname)
        }}
        onSelectEmployee={(empId) => {
          const found = records.find(
            (r) => r.employeeId === empId || r.employeeDbId === empId
          )
          if (found) {
            setSelectedEmployeeForHistory(found)
            const url = new URL(window.location.href)
            url.searchParams.set('emp', found.employeeId)
            window.history.pushState(null, '', url.toString())
          }
        }}
      />
    )
  }

  return (
    <main className="relative min-h-screen bg-[#faf9fd] w-full px-4 sm:px-8 py-7 pt-24">
      {downloadToast && selectedRecord && (
        <div className="fixed top-24 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            download_done
          </span>
          <div className="flex flex-col text-xs">
            <span className="font-bold">Attendance Sheet Generated</span>
            <span className="text-slate-400">
              Downloaded PDF for {selectedRecord.employeeName}...
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto">
        {/* Top Bar / Breadcrumb & Header Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-100/70 text-red-700 text-[11px] font-bold uppercase tracking-wider">
                WORKFORCE REGISTRY • LIVE AUDIT
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">
                  verified_user
                </span>
                Biometric Gateway Sync
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Attendance
            </h1>
            <p className="text-sm text-slate-500">
              View and verify real-time employee check-in and check-out records.
            </p>
          </div>

          {/* Top Counters */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  ACTIVE LOGS
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {counts.present} Present Today
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600"></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  EXCEPTIONS
                </span>
                <span className="text-sm font-bold text-red-600">
                  {counts.absent} Absent
                </span>
              </div>
            </div>
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
              onClick={loadAttendance}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Controls / Search & Filters Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[19px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 placeholder:text-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                placeholder="Search by employee name or ID (e.g. Amal, SKY001)... ⌘K"
                type="text"
              />
            </div>

            {/* Date & Month Controls with Interactive Date Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePreviousDay}
                  title="Previous Day"
                  className="w-7 h-7 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                <div className="relative flex items-center gap-1.5 px-2">
                  <span className="material-symbols-outlined text-[17px] text-red-600">
                    calendar_today
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    max={todayIsoDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  />
                  {isToday ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Today
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      Past
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  disabled={selectedDate >= todayIsoDate}
                  title="Next Day"
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    selectedDate >= todayIsoDate
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'hover:bg-white text-slate-500 hover:text-slate-800 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={handleResetToday}
                  className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer border border-red-200 flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px]">today</span>
                  <span>Jump to Today</span>
                </button>
              )}

              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-800">
                  {currentMonthName}
                </span>
              </div>

              {/* Quick Employee Monthly History Dropdown */}
              {records.length > 0 && (
                <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-[16px] text-red-600 mr-1.5">
                    person_search
                  </span>
                  <select
                    value=""
                    onChange={(e) => {
                      const found = records.find(
                        (r) => r.employeeId === e.target.value || r.employeeDbId === e.target.value
                      )
                      if (found) handleOpenEmployeeHistory(found)
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="" disabled>
                      View Monthly History...
                    </option>
                    {records.map((r) => (
                      <option key={r.id} value={r.employeeId}>
                        {r.employeeName} ({r.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {/* All */}
            <button
              onClick={() => setCurrentFilter('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'All'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  currentFilter === 'All' ? 'bg-white/20 text-white' : 'text-slate-400'
                }`}
              >
                {counts.all}
              </span>
            </button>

            {/* Present */}
            <button
              onClick={() => setCurrentFilter('Present')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'Present'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Present</span>
              <span
                className={`text-[11px] font-semibold ${
                  currentFilter === 'Present' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {counts.present}
              </span>
            </button>

            {/* Late */}
            <button
              onClick={() => setCurrentFilter('Late')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'Late'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Late</span>
              <span
                className={`text-[11px] font-semibold ${
                  currentFilter === 'Late' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {counts.late}
              </span>
            </button>

            {/* Absent */}
            <button
              onClick={() => setCurrentFilter('Absent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'Absent'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <span>Absent</span>
              <span
                className={`text-[11px] font-semibold ${
                  currentFilter === 'Absent' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {counts.absent}
              </span>
            </button>

            {/* Half Day */}
            <button
              onClick={() => setCurrentFilter('Half Day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'Half Day'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Half Day</span>
              <span
                className={`text-[11px] font-semibold ${
                  currentFilter === 'Half Day' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {counts.halfDay}
              </span>
            </button>

            {/* Leave */}
            <button
              onClick={() => setCurrentFilter('Leave')}
              className={`px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                currentFilter === 'Leave'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-sm shadow-red-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 font-medium'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Leave</span>
              <span
                className={`text-[11px] font-semibold ${
                  currentFilter === 'Leave' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {counts.leave}
              </span>
            </button>
          </div>
        </div>

        {/* 2-Column Section: Attendance Table + Contextual Right Audit Drawer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Attendance Table (col-span-8) */}
          <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Table Header Bar */}
            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900 text-sm">Daily Punch Log</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {formattedSelectedDate} {isToday ? '(Today)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">sync</span>
                <span>Live Gateway Sync</span>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white">
                    <th className="py-3 px-6">EMPLOYEE</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">START WORK</th>
                    <th className="py-3 px-4">END WORK</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-red-500 animate-ping"></span>
                          <p className="text-slate-500 font-semibold">Loading daily attendance records...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No attendance logs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((row) => {
                      const isSelected = selectedRecord?.id === row.id
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedId(row.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            isSelected ? 'bg-red-50/25' : ''
                          }`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              {row.avatar ? (
                                <img
                                  alt={row.employeeName}
                                  className={`w-9 h-9 rounded-full object-cover shrink-0 shadow-xs ring-2 ${
                                    isSelected ? 'ring-red-500/40' : 'ring-slate-100'
                                  }`}
                                  src={row.avatar}
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 rounded-full ${
                                    row.initialsBg || 'bg-slate-100'
                                  } ${
                                    row.initialsColor || 'text-slate-700 border border-slate-200'
                                  } font-bold text-xs flex items-center justify-center shrink-0`}
                                >
                                  {row.initials}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 truncate">
                                  {row.employeeName}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">
                                  {row.role}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                              {row.employeeId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td
                            className={`py-3 px-4 whitespace-nowrap ${
                              row.status === 'Late'
                                ? 'font-bold text-amber-600'
                                : row.startWork === '—'
                                ? 'text-slate-400'
                                : 'font-semibold text-slate-900'
                            }`}
                          >
                            {row.startWork}
                          </td>
                          <td
                            className={`py-3 px-4 whitespace-nowrap ${
                              row.endWork.includes('In Progress')
                                ? 'text-slate-400 italic'
                                : row.endWork === '—'
                                ? 'text-slate-400'
                                : 'font-semibold text-slate-900'
                            }`}
                          >
                            {row.endWork}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {row.status === 'Present' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Present
                              </span>
                            )}
                            {row.status === 'Late' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Late
                              </span>
                            )}
                            {row.status === 'Absent' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-red-700 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Absent
                              </span>
                            )}
                            {row.status === 'Half Day' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Half Day
                              </span>
                            )}
                            {row.status === 'Leave' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span> Leave
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.hasCheckedOut && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmUndoRecord(row)
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 text-xs font-bold transition-all border border-amber-200/90 hover:border-amber-300 cursor-pointer shadow-xs active:scale-95"
                                  title={`Undo accidental check out for ${row.employeeName}`}
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-amber-600">
                                    undo
                                  </span>
                                  <span>Undo Out</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEmployeeHistory(row)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold transition-all border border-slate-200/70 hover:border-red-200 cursor-pointer shadow-xs"
                                title={`View full monthly attendance for ${row.employeeName}`}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[15px] text-red-600">
                                  calendar_month
                                </span>
                                <span>Monthly View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                SHOWING 1-{filteredRecords.length} OF {counts.all} RECORDS
              </span>
            </div>
          </div>

          {/* Right Focused Employee Audit Card (col-span-4) */}
          <div className="xl:col-span-4 flex flex-col gap-4 sticky top-24">
            {selectedRecord ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between pb-1 border-b border-slate-100">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-red-600 text-[16px]">
                        fingerprint
                      </span>
                      <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                        FOCUSED EMPLOYEE AUDIT
                      </span>
                    </div>
                    <span className="text-base font-bold text-slate-900 mt-0.5">
                      Live Audit & Controls
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {selectedRecord.employeeId}
                    </span>
                  </div>
                </div>

                {/* Selected Profile Card */}
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  {selectedRecord.avatar ? (
                    <img
                      alt={selectedRecord.employeeName}
                      className="w-11 h-11 rounded-xl object-cover shadow-xs shrink-0"
                      src={selectedRecord.avatar}
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-xl ${
                        selectedRecord.initialsBg || 'bg-slate-100'
                      } ${
                        selectedRecord.initialsColor || 'text-slate-700 border border-slate-200'
                      } font-bold text-sm flex items-center justify-center shrink-0`}
                    >
                      {selectedRecord.initials}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {selectedRecord.employeeName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedRecord.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : selectedRecord.status === 'Late'
                            ? 'bg-amber-50 text-amber-700'
                            : selectedRecord.status === 'Absent'
                            ? 'bg-rose-50 text-red-700'
                            : selectedRecord.status === 'Half Day'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {selectedRecord.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate">
                      {selectedRecord.role} • {selectedRecord.department}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Shift: {selectedRecord.shiftStart || '09:00 AM'} - {selectedRecord.shiftEnd || '06:00 PM'}
                    </span>
                  </div>
                </div>

                {/* Today/Selected Date Punch Status Overview */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col">
                    <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                      <span className="material-symbols-outlined text-[15px]">login</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Punch In</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedRecord.startWork}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {selectedRecord.hasCheckedIn ? 'Recorded' : 'Not Recorded'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col">
                    <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                      <span className="material-symbols-outlined text-[15px]">logout</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Punch Out</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedRecord.endWork}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {selectedRecord.hasCheckedOut
                        ? 'Recorded'
                        : selectedRecord.hasCheckedIn
                        ? 'In Progress'
                        : 'Not Recorded'}
                    </span>
                  </div>
                </div>

                {/* Accidental Check-Out Quick Action Alert Banner */}
                {selectedRecord.hasCheckedOut && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">history_toggle_off</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-amber-950 truncate">
                          Accidental Check-Out?
                        </span>
                        <span className="text-[11px] text-amber-800/80">
                          Out at {selectedRecord.endWork}. Click below to undo and restore.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmUndoRecord(selectedRecord)}
                      disabled={isUndoing}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">undo</span>
                      <span>Undo Check Out</span>
                    </button>
                  </div>
                )}

                {/* Manual Check In & Check Out Controls */}
                <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-red-600">
                        schedule
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Manual Check In & Check Out
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                      {formattedSelectedDate}
                    </span>
                  </div>

                  {/* Check In Manual Row */}
                  <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Check In Time</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setManualCheckInTime(getCurrentTimeInput())}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Set to current time"
                        >
                          Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualCheckInTime('09:00')}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Set to standard shift start"
                        >
                          09:00 AM
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={manualCheckInTime}
                        onChange={(e) => setManualCheckInTime(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800"
                      />
                      <button
                        type="button"
                        disabled={isSavingIn || !manualCheckInTime}
                        onClick={handleSaveCheckIn}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {isSavingIn ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span className="material-symbols-outlined text-[15px]">login</span>
                        )}
                        <span>Set Check In</span>
                      </button>
                    </div>
                  </div>

                  {/* Check Out Manual Row */}
                  <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Check Out Time</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setManualCheckOutTime(getCurrentTimeInput())}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Set to current time"
                        >
                          Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualCheckOutTime('18:00')}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="Set to standard shift end"
                        >
                          06:00 PM
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={manualCheckOutTime}
                        onChange={(e) => setManualCheckOutTime(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800"
                      />
                      <button
                        type="button"
                        disabled={isSavingOut || !manualCheckOutTime}
                        onClick={handleSaveCheckOut}
                        className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {isSavingOut ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span className="material-symbols-outlined text-[15px]">logout</span>
                        )}
                        <span>Set Check Out</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Past Records Section Label */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    PAST RECORDS ({currentMonthName.toUpperCase()})
                  </span>

                  {/* History Items List */}
                  <div className="flex flex-col gap-2">
                    {selectedRecord.history.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 text-center text-slate-400 text-xs">
                        No previous records recorded for this employee.
                      </div>
                    ) : (
                      selectedRecord.history.map((hist, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900">
                              {hist.date}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {hist.time}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hist.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700'
                                : hist.status === 'Late'
                                ? 'bg-amber-50 text-amber-700'
                                : hist.status === 'Absent'
                                ? 'bg-rose-50 text-red-700'
                                : hist.status === 'Half Day'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {hist.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    onClick={() => handleOpenEmployeeHistory(selectedRecord)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      calendar_month
                    </span>
                    <span>View Full Monthly Attendance</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </button>

                  <button
                    onClick={handleDownloadSheet}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200/80"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      picture_as_pdf
                    </span>
                    <span>Download Attendance Sheet (PDF)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center text-slate-400 text-xs">
                Select an employee from the table to view their attendance history.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal to Confirm Undo Check Out */}
      {confirmUndoRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">undo</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900 text-base">Undo Employee Check-Out</h3>
                  <p className="text-xs text-slate-500">Restore session to active working</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmUndoRecord(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Employee:</span>
                <span className="font-bold text-slate-900">
                  {confirmUndoRecord.employeeName} ({confirmUndoRecord.employeeId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-semibold text-slate-800">{formattedSelectedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Recorded Check Out:</span>
                <span className="font-bold text-rose-600">{confirmUndoRecord.endWork}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If this employee accidentally clicked Check Out, this action will remove their recorded check-out time and restore their active session in their mobile app so they can continue working.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUndoRecord(null)}
                disabled={isUndoing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmUndoCheckOut(confirmUndoRecord)}
                disabled={isUndoing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUndoing ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                )}
                <span>Confirm Undo Check Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500/30'
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-500/40'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              toast.type === 'success'
                ? 'text-emerald-400'
                : toast.type === 'error'
                ? 'text-rose-400'
                : 'text-sky-400'
            }`}
          >
            {toast.type === 'success'
              ? 'check_circle'
              : toast.type === 'error'
              ? 'error'
              : 'info'}
          </span>
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </main>
  )
}
