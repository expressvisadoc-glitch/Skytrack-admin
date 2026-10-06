import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getLeaveSubmissions,
  approveLeave,
  rejectLeave,
  type LeaveSubmissionRecord,
} from '../lib/api'

export function LeaveManagement() {
  const { token } = useAuth()
  const [submissions, setSubmissions] = useState<LeaveSubmissionRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadSubmissions = useCallback(async () => {
    if (!token) return
    try {
      setIsLoading(true)
      setError(null)
      const data = await getLeaveSubmissions(token)
      setSubmissions(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
      }
    } catch (err: any) {
      console.error('Error fetching leave submissions:', err)
      setError(err.message || 'Failed to load leave submissions.')
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedId])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter((s) => s.status === 'Pending').length,
      approved: submissions.filter((s) => s.status === 'Approved').length,
      rejected: submissions.filter((s) => s.status === 'Rejected').length,
      cancelled: submissions.filter((s) => s.status === 'Cancelled').length,
    }
  }, [submissions])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        sub.employeeName.toLowerCase().includes(q) ||
        sub.employeeId.toLowerCase().includes(q) ||
        sub.reason.toLowerCase().includes(q)

      const matchesFilter =
        currentFilter === 'all' || sub.status.toLowerCase() === currentFilter

      return matchesSearch && matchesFilter
    })
  }, [submissions, searchQuery, currentFilter])

  const selectedItem = useMemo(() => {
    if (!selectedId && submissions.length > 0) return submissions[0]
    return submissions.find((s) => s.id === selectedId) || submissions[0] || null
  }, [submissions, selectedId])

  const handleApprove = async (leaveOrId: LeaveSubmissionRecord | string) => {
    if (!token) return
    const leave =
      typeof leaveOrId === 'string'
        ? submissions.find((s) => s.id === leaveOrId || s.request_id === leaveOrId || s.requestId === leaveOrId)
        : leaveOrId
    const requestId = leave?.request_id || leave?.requestId || (typeof leaveOrId === 'string' ? leaveOrId : leave?.id)
    const updateKey = leave?.id || (typeof leaveOrId === 'string' ? leaveOrId : '')
    if (!requestId) return

    setIsUpdating(updateKey)
    try {
      await approveLeave(token, requestId)
      // Since it's updated via Edge Function, let's refresh all submissions
      // so we get the accurate backend state (e.g. lopDays, etc.)
      await loadSubmissions()
    } catch (err: any) {
      console.error('Error approving leave:', err)
      alert(err.message || 'Failed to approve leave request.')
    } finally {
      setIsUpdating(null)
    }
  }

  const handleReject = async (leaveOrId: LeaveSubmissionRecord | string) => {
    if (!token) return
    const leave =
      typeof leaveOrId === 'string'
        ? submissions.find((s) => s.id === leaveOrId || s.request_id === leaveOrId || s.requestId === leaveOrId)
        : leaveOrId
    const requestId = leave?.request_id || leave?.requestId || (typeof leaveOrId === 'string' ? leaveOrId : leave?.id)
    const updateKey = leave?.id || (typeof leaveOrId === 'string' ? leaveOrId : '')
    if (!requestId) return

    setIsUpdating(updateKey)
    try {
      await rejectLeave(token, requestId)
      await loadSubmissions()
    } catch (err: any) {
      console.error('Error rejecting leave:', err)
      alert(err.message || 'Failed to reject leave request.')
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#f4f6fb] min-h-screen">
      <div className="flex flex-col w-full gap-7 max-w-[1600px] mx-auto">
        {/* Top Operational Hero Card / Greeting Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold tracking-wider uppercase text-red-500">Workforce Registry</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-400">Leave Requests & Approvals</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">Leave Management</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Review and manage employee leave submissions from the mobile application.
            </p>
          </div>

          {/* Quick Counters Dark Capsule */}
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-[#181d27] shadow-xl shadow-slate-900/15 border border-slate-700/60 self-start lg:self-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30 font-bold text-xs">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{counts.pending} Pending Review</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 text-emerald-400 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{counts.approved} Approved</span>
            </div>
          </div>
        </div>

        {/* Filter & Controls Toolbar Card */}
        <div className="rounded-3xl p-5 bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Bar & Refresh Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-100 text-slate-800 placeholder:text-slate-400 text-sm font-medium border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 transition-all"
                placeholder="Search by employee name or ID (e.g. Aisha, SKY042)..."
                type="text"
              />
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/50 transition-colors whitespace-nowrap cursor-pointer"
              type="button"
              title="Refresh submissions"
            >
              <span className={`material-symbols-outlined text-[18px] text-red-500 ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Status Filter Pill Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setCurrentFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'all'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-semibold'
              }`}
              type="button"
            >
              <span>All Requests</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setCurrentFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'pending'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-semibold'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Pending</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setCurrentFilter('approved')}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'approved'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-semibold'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Approved</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.approved}
              </span>
            </button>

            <button
              onClick={() => setCurrentFilter('rejected')}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-semibold'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Rejected</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentFilter === 'rejected' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.rejected}
              </span>
            </button>

            <button
              onClick={() => setCurrentFilter('cancelled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentFilter === 'cancelled'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-semibold'
              }`}
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Cancelled</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  currentFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadSubmissions}
              className="px-3 py-1 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Primary Workspace: Split Layout Table + Drawer Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Table Container Card (8 cols) */}
          <div className="lg:col-span-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Submissions Log</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">Live Backend Stream</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-symbols-outlined text-3xl text-red-500 animate-spin">
                    progress_activity
                  </span>
                  <p className="text-xs text-slate-400 font-medium">Loading leave submissions...</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4" scope="col">
                        Employee
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        From
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        To
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        Type
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        Reason
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        Submitted
                      </th>
                      <th className="py-3.5 px-3" scope="col">
                        Status
                      </th>
                      <th className="py-3.5 px-4 text-right" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-medium">
                          No leave submissions found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((row) => {
                        const isSelected = row.id === selectedId
                        const isThisUpdating = isUpdating === row.id

                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedId(row.id)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                              isSelected ? 'bg-red-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 shadow-xs"
                                  src={row.avatar}
                                  alt={row.employeeName}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-900 text-xs group-hover:text-red-600 transition-colors truncate">
                                    {row.employeeName}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    {row.employeeId}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-800">{row.fromDate}</span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-xs font-semibold text-slate-800">{row.toDate}</span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                                  row.type === 'Sick'
                                    ? 'bg-red-50 text-red-700'
                                    : row.type === 'Half Day'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 max-w-[150px] truncate">
                              <span className="text-xs text-slate-500 truncate block" title={row.reason}>
                                {row.reason}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-xs text-slate-700 font-medium">{row.submittedDate}</span>
                                <span className="text-[11px] text-slate-400">{row.submittedTime}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {row.status === 'Pending' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                                  Pending
                                </span>
                              )}
                              {row.status === 'Approved' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-xs">
                                  Approved
                                </span>
                              )}
                              {row.status === 'Rejected' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                                  Rejected
                                </span>
                              )}
                              {row.status === 'Cancelled' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {row.status === 'Pending' && (
                                  <>
                                    <button
                                      disabled={isThisUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApprove(row)
                                      }}
                                      className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Approve Leave"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-[17px]">
                                        {isThisUpdating ? 'hourglass_top' : 'check'}
                                      </span>
                                    </button>
                                    <button
                                      disabled={isThisUpdating}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReject(row)
                                      }}
                                      className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Reject Leave"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-[17px]">close</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedId(row.id)
                                  }}
                                  className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                                  title="View Details"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[17px]">visibility</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination / Meta Footer */}
            <div className="pt-2 flex items-center justify-between mt-auto">
              <span className="text-xs text-slate-500">
                Showing <strong className="font-bold text-slate-800">{filteredSubmissions.length}</strong> of{' '}
                <strong className="font-bold text-slate-800">{submissions.length}</strong> submissions
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                  disabled
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                  type="button"
                >
                  1
                </button>
                <button
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  disabled
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Request Details Sticky Preview Panel (4 cols) */}
          {selectedItem && (
            <div className="lg:col-span-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-5 sticky top-28">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Preview Panel</span>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Leave Request Details</h2>
                </div>
                {selectedItem.status === 'Pending' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending Review
                  </span>
                )}
                {selectedItem.status === 'Approved' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-xs flex items-center gap-1.5">
                    Approved
                  </span>
                )}
                {selectedItem.status === 'Rejected' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 font-bold text-xs flex items-center gap-1.5">
                    Rejected
                  </span>
                )}
                {selectedItem.status === 'Cancelled' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 font-bold text-xs flex items-center gap-1.5">
                    Cancelled
                  </span>
                )}
              </div>

              {/* Drawer Content Details */}
              <div className="flex flex-col gap-4">
                {/* Employee Micro Profile */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-xs ring-2 ring-white">
                    <img
                      className="w-full h-full object-cover"
                      src={selectedItem.avatar}
                      alt={selectedItem.employeeName}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 text-sm truncate">{selectedItem.employeeName}</span>
                    <span className="text-xs text-slate-500 truncate">{selectedItem.role}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                        {selectedItem.employeeId}
                      </span>
                      <span className="text-xs text-slate-400">• {selectedItem.shift}</span>
                    </div>
                  </div>
                </div>

                {/* Metric Grid for Dates & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">From Date</span>
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <span className="material-symbols-outlined text-[17px] text-red-500">event</span>
                      <span className="text-xs font-bold">{selectedItem.fromDate}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{selectedItem.fromDay}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">To Date</span>
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <span className="material-symbols-outlined text-[17px] text-red-500">event_available</span>
                      <span className="text-xs font-bold">{selectedItem.toDate}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{selectedItem.toDay}</span>
                  </div>
                </div>

                {/* Data List Items */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[18px]">category</span>
                      <span>Leave Type</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{selectedItem.type} Leave</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-[18px]">timelapse</span>
                      <span>Duration</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-bold">
                      {selectedItem.duration}
                    </span>
                  </div>

                  {selectedItem.status !== 'Pending' && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                          <span>Total Leave Days</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">{selectedItem.leaveDays ?? '—'}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <span className="material-symbols-outlined text-[18px]">task_alt</span>
                          <span>Paid Leave Days</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">{selectedItem.paidLeaveDays ?? '—'}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <span className="material-symbols-outlined text-[18px]">warning</span>
                          <span>LOP Days</span>
                        </div>
                        <span className="text-xs font-bold text-rose-600">{selectedItem.lopDays ?? '—'}</span>
                      </div>
                    </>
                  )}

                  {/* Reason Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-red-500">notes</span>
                      Reason for Request
                    </span>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed mt-1">
                      "{selectedItem.reason}"
                    </p>
                  </div>

                  {/* Submitted Meta */}
                  <div className="flex items-center justify-between px-2 text-slate-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                      Submitted:
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700">
                      {selectedItem.submittedDate} • {selectedItem.submittedTime}
                    </span>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                {selectedItem.status === 'Pending' ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      disabled={isUpdating === selectedItem.id}
                      onClick={() => handleApprove(selectedItem)}
                      className="w-full flex-1 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isUpdating === selectedItem.id ? 'hourglass_top' : 'check_circle'}
                      </span>
                      <span>{isUpdating === selectedItem.id ? 'Updating...' : 'Approve Request'}</span>
                    </button>
                    <button
                      disabled={isUpdating === selectedItem.id}
                      onClick={() => handleReject(selectedItem)}
                      className="w-full sm:w-auto px-4 h-11 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-center text-xs text-slate-400 font-medium">
                    This request is marked as <strong className="text-slate-700">{selectedItem.status}</strong>.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

