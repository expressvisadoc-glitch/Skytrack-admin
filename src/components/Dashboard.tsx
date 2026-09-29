import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminDashboardData,
  type DashboardData,
  type DashboardLeaveRequest,
} from '../lib/api'

export function Dashboard() {
  const { token, employee, logout } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Present' | 'Late' | 'Absent' | 'Leave'
  >('All')
  const [selectedLeave, setSelectedLeave] = useState<DashboardLeaveRequest | null>(
    null
  )

  const loadDashboardData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const dashboard = await getAdminDashboardData(token, employee)
      setData(dashboard)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError(
        'Unable to load live dashboard metrics from the SkyTrack server. Please check your connection and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [token, employee, logout])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const filteredAttendance = (data?.todayAttendance || []).filter((record) => {
    if (statusFilter === 'All') return true
    if (statusFilter === 'Present')
      return record.status === 'Present' || record.status === 'Half Day'
    return record.status === statusFilter
  })

  // Loading State with Skeleton Structure matching the exact layout
  if (isLoading && !data) {
    return (
      <main className="relative w-full pt-28 px-8 pb-14">
        <div className="flex flex-col w-full gap-7 max-w-[1600px] mx-auto animate-pulse">
          {/* Header Skeleton */}
          <div className="h-28 rounded-3xl bg-white/80 border border-slate-200/70 p-6 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded-md"></div>
              <div className="h-7 w-64 bg-slate-300 rounded-lg"></div>
            </div>
            <div className="h-12 w-72 bg-slate-200 rounded-full"></div>
          </div>

          {/* Metric Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-36 rounded-3xl bg-white/80 border border-slate-200/70 p-5 flex flex-col justify-between"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  <div className="h-10 w-10 bg-slate-200 rounded-2xl"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-slate-300 rounded"></div>
                  <div className="h-4 w-28 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Content Split Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
            <div className="xl:col-span-7 h-96 rounded-3xl bg-white/80 border border-slate-200/70 p-6"></div>
            <div className="xl:col-span-5 space-y-7">
              <div className="h-48 rounded-3xl bg-white/80 border border-slate-200/70 p-6"></div>
              <div className="h-48 rounded-3xl bg-white/80 border border-slate-200/70 p-6"></div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Error State
  if (error && !data) {
    return (
      <main className="relative w-full pt-28 px-8 pb-14 min-h-[70vh] flex items-center justify-center">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4 border border-red-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-slate-900">Dashboard Unavailable</h2>
            <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:from-red-600 hover:to-rose-700 transition-all cursor-pointer flex items-center gap-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Connection</span>
          </button>
        </div>
      </main>
    )
  }

  const summary = data?.summary || {
    totalEmployees: 0,
    employeeGrowth: null,
    presentToday: 0,
    presentPercentage: 0,
    absentToday: 0,
    absentPercentage: 0,
    onLeave: 0,
    pendingLeaveRequests: 0,
  }

  const adminName = data?.admin.name || 'Admin'
  const operationalDate =
    data?.admin.operationalDate ||
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <main className="relative w-full pt-28 px-8 pb-14">
      <div className="flex flex-col w-full gap-7 max-w-[1600px] mx-auto">
        {/* Top Operational Hero Card / Greeting Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold tracking-wider uppercase text-red-500">
                Daily Workforce Status
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-400">Live Sync</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
              SkyTrack Admin
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Welcome back, {adminName}
            </p>
          </div>

          {/* Mobile-App Inspired Dark Pill Capsule */}
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-[#181d27] shadow-xl shadow-slate-900/15 border border-slate-700/60 self-start lg:self-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30">
              <span className="material-symbols-outlined text-[17px]">waving_hand</span>
              <span className="text-xs font-bold tracking-wide">
                Welcome, {adminName}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 text-slate-300 text-xs font-medium">
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                calendar_today
              </span>
              <span>{operationalDate}</span>
            </div>
          </div>
        </div>

        {/* Main Summary Cards: Exactly 5 Employee Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Employees */}
          <div className="glass-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Employees
              </span>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.totalEmployees}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                {summary.employeeGrowth ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">
                      trending_up
                    </span>
                    {summary.employeeGrowth}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                <span className="text-xs text-slate-400">Registered employees</span>
              </div>
            </div>
          </div>

          {/* 2. Present Today */}
          <div className="glass-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Present Today
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.presentToday}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-700 font-bold text-xs">
                  {summary.presentPercentage}%
                </span>
                <span className="text-xs text-slate-400">Checked-in for work</span>
              </div>
            </div>
          </div>

          {/* 3. Absent Today */}
          <div className="glass-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Absent Today
              </span>
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">person_off</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-red-500 tracking-tight">
                {summary.absentToday}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold text-xs">
                  {summary.absentPercentage}%
                </span>
                <span className="text-xs text-slate-400">No check-in record</span>
              </div>
            </div>
          </div>

          {/* 4. On Leave */}
          <div className="glass-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                On Leave
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">
                  time_to_leave
                </span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {summary.onLeave}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs">
                  Approved
                </span>
                <span className="text-xs text-slate-400">Approved active leave</span>
              </div>
            </div>
          </div>

          {/* 5. Pending Leave Requests */}
          <div className="glass-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden border-red-200/80 bg-gradient-to-b from-white to-red-50/40">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-500/5 rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                Pending Leave
              </span>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/25">
                <span className="material-symbols-outlined text-[20px]">
                  pending_actions
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-red-600 tracking-tight">
                  {summary.pendingLeaveRequests}
                </span>
                <span className="text-xs font-semibold text-slate-400">requests</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold text-[11px] uppercase tracking-wide">
                  Awaiting review
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Operational Grid: Today's Attendance (7 cols) & Pending Leaves + Activity (5 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          {/* Primary Section: Today's Attendance Table (7 cols) */}
          <section className="xl:col-span-7 glass-card rounded-3xl p-6 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Today's Attendance
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs shadow-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time start and end work records for {operationalDate}
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl">
                {(['All', 'Present', 'Late', 'Absent', 'Leave'] as const).map((filter) => {
                  const isActive = statusFilter === filter
                  return (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-xs'
                          : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                      type="button"
                    >
                      {filter}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Attendance Table Container */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-3">Employee ID</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-3">Start Work</th>
                    <th className="py-3.5 px-3">End Work</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-xs text-slate-400 font-medium"
                      >
                        No attendance records match the selected filter for today.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {row.avatar ? (
                              <img
                                className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 shadow-xs"
                                src={row.avatar}
                                alt={row.name}
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs ${
                                  row.initialsBg || 'bg-slate-100'
                                } ${
                                  row.initialsColor ||
                                  'text-slate-700 border-slate-200'
                                }`}
                              >
                                {row.initials}
                              </div>
                            )}
                            <span className="font-bold text-slate-900 text-xs">
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-500">
                          {row.employeeId}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500">{row.date}</td>
                        <td
                          className={`py-3 px-3 text-xs font-bold ${
                            row.status === 'Late'
                              ? 'text-red-500'
                              : row.startTime === '—'
                              ? 'text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {row.startTime}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-400">
                          {row.endTime}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                              row.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : row.status === 'Late'
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : row.status === 'Absent'
                                ? 'bg-rose-100/70 text-rose-700 border border-rose-200'
                                : row.status === 'Half Day'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            {row.status === 'Leave' ? 'Leave (Approved)' : row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Secondary Column: Pending Leaves & Recent Events (5 cols) */}
          <div className="xl:col-span-5 flex flex-col gap-7">
            {/* Secondary Section 1: Pending Leave Requests */}
            <section className="glass-card rounded-3xl p-6 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Pending Leave Requests
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs">
                    {(data?.pendingLeaveRequests || []).length} Pending
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-lg">
                  outgoing_mail
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {(data?.pendingLeaveRequests || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">
                    No pending leave requests requiring review.
                  </div>
                ) : (
                  (data?.pendingLeaveRequests || []).map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-red-200 hover:shadow-md transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {req.name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {req.employeeId}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {req.dates}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {req.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                          Reason: {req.reason}
                        </span>
                        <button
                          onClick={() => setSelectedLeave(req)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
                          type="button"
                        >
                          <span>View Details</span>
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Secondary Section 2: Recent Activity */}
            <section className="glass-card rounded-3xl p-6 lg:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Activity
                </h2>
                <span className="text-xs font-semibold text-slate-400">Today</span>
              </div>
              <div className="flex flex-col gap-3.5">
                {(data?.recentActivity || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium bg-white rounded-2xl border border-slate-100">
                    No employee activity recorded today.
                  </div>
                ) : (
                  (data?.recentActivity || []).map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${act.iconBg} ${act.iconColor}`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {act.icon}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-xs text-slate-800 leading-snug">
                          <strong className="font-bold text-slate-900">
                            {act.user} ({act.employeeId})
                          </strong>{' '}
                          {act.action}{' '}
                          {act.badgeText && (
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                                act.badgeColor || 'text-slate-600 bg-slate-100'
                              }`}
                            >
                              {act.badgeText}
                            </span>
                          )}
                        </p>
                        <span className="text-[11px] text-slate-400 mt-1">
                          {act.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLeave(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="glass-card rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">
                    description
                  </span>
                </div>
                <span className="font-bold text-base text-slate-900">
                  Leave Request Details
                </span>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Employee</span>
                <span className="font-bold text-slate-800">
                  {selectedLeave.name} ({selectedLeave.employeeId})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Leave Type</span>
                <span className="font-bold text-red-600">
                  {selectedLeave.type} Leave
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Duration</span>
                <span className="text-slate-700 font-medium">
                  {selectedLeave.dates}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-slate-400 text-xs font-semibold">
                  Stated Reason
                </span>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100">
                  {selectedLeave.fullReason}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
