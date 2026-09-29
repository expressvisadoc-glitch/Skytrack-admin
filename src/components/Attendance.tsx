import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getDailyAttendance,
  type FullAttendanceRecord,
} from '../lib/api'

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

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const formattedToday = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    []
  )
  const currentMonthName = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    []
  )

  const loadAttendance = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getDailyAttendance(token, todayIsoDate)
      setRecords(data.records)
      setCounts(data.counts)
      if (data.records.length > 0 && !selectedId) {
        setSelectedId(data.records[0].id)
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
  }, [token, todayIsoDate, selectedId, logout])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

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

  const handleDownloadSheet = () => {
    if (!selectedRecord) return
    setDownloadToast(true)

    // Build actual CSV file contents
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Time/Duration', 'Status']
    const rows = (selectedRecord.history || []).map((h) => [
      `"${selectedRecord.employeeId}"`,
      `"${selectedRecord.employeeName}"`,
      `"${h.date}"`,
      `"${h.time}"`,
      `"${h.status}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `SkyTrack_Attendance_${selectedRecord.employeeId}_${todayIsoDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => setDownloadToast(false), 3000)
  }

  return (
    <main className="relative min-h-screen bg-[#faf9fd] w-full px-8 py-7 pt-24">
      {downloadToast && selectedRecord && (
        <div className="fixed top-24 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            download_done
          </span>
          <div className="flex flex-col text-xs">
            <span className="font-bold">Attendance Sheet Generated</span>
            <span className="text-slate-400">
              Downloaded CSV for {selectedRecord.employeeName}...
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

            {/* Date & Month Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[17px] text-red-600">
                  calendar_today
                </span>
                <span className="text-xs font-semibold">
                  {formattedToday} (Today)
                </span>
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-1 py-1">
                <span className="px-3 text-xs font-semibold text-slate-800">
                  {currentMonthName}
                </span>
              </div>
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {formattedToday}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-xs">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-red-500 animate-ping"></span>
                          <p className="text-slate-500 font-semibold">Loading daily attendance records...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-xs">
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
                <div className="flex items-start justify-between pb-1">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                      FOCUSED EMPLOYEE AUDIT
                    </span>
                    <span className="text-base font-bold text-slate-900 mt-0.5">
                      Recent Attendance History
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                    {selectedRecord.employeeId}
                  </span>
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
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {selectedRecord.employeeName}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {selectedRecord.role} • {selectedRecord.department}
                    </span>
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

                {/* Action Button */}
                <button
                  onClick={handleDownloadSheet}
                  className="w-full mt-1 py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100/80 text-red-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    download
                  </span>
                  <span>Download Attendance Sheet</span>
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center text-slate-400 text-xs">
                Select an employee from the table to view their attendance history.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
