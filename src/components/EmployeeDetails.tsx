import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getEmployeeHistory,
  updateEmployeeDetails,
  type EmployeeDirectoryItem,
  type AttendanceHistoryItem,
  type LeaveHistoryItem,
  getLeaveBalance,
  adjustLeaveBalance,
  type SkyTrackEmployeeLeaveBalance,
  getOrganizationData,
  updateEmployeeOrganization,
  updateEmployeeId,
  type OrganizationData,
} from '../lib/api'

interface EmployeeDetailsProps {
  employee?: EmployeeDirectoryItem | null
  onBack: () => void
  onEmployeeUpdated?: (updated: EmployeeDirectoryItem) => void
}

export function EmployeeDetails({ employee: initialEmployee, onBack, onEmployeeUpdated }: EmployeeDetailsProps) {
  const { token, logout } = useAuth()
  const [currentEmp, setCurrentEmp] = useState<EmployeeDirectoryItem | null>(initialEmployee || null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([])
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryItem[]>([])
  const [leaveBalance, setLeaveBalance] = useState<SkyTrackEmployeeLeaveBalance | null>(null)
  const [orgData, setOrgData] = useState<OrganizationData | null>(null)
  const [isOrgLoading, setIsOrgLoading] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: initialEmployee?.name || '',
    employeeId: initialEmployee?.employee_id || '',
    role: initialEmployee?.role || '',
    department: initialEmployee?.department || '',
    email: initialEmployee?.email || '',
    phone: initialEmployee?.phone || '',
    accountStatus: initialEmployee?.accountStatus || 'Active',
    avatar: initialEmployee?.avatar || '',
    reportingManagerId: initialEmployee?.reportingManagerId || '',
    departmentId: initialEmployee?.departmentId || '',
    workShiftId: initialEmployee?.workShiftId || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccessToast, setEditSuccessToast] = useState(false)

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustFormData, setAdjustFormData] = useState({
    leaveType: 'casual',
    days: 0,
    reason: '',
  })
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)

  // Sync internal state if initial prop changes
  useEffect(() => {
    if (initialEmployee) {
      setCurrentEmp(initialEmployee)
      setEditFormData({
        name: initialEmployee.name || '',
        employeeId: initialEmployee.employee_id || '',
        role: initialEmployee.role || '',
        department: initialEmployee.department || '',
        email: initialEmployee.email || '',
        phone: initialEmployee.phone || '',
        accountStatus: initialEmployee.accountStatus || 'Active',
        avatar: initialEmployee.avatar || '',
        reportingManagerId: initialEmployee.reportingManagerId || '',
        departmentId: initialEmployee.departmentId || '',
        workShiftId: initialEmployee.workShiftId || '',
      })
    }
  }, [initialEmployee])

  const loadHistory = useCallback(async () => {
    if (!token || !currentEmp?.id) return
    setIsLoading(true)
    setError(null)
    try {
      setIsOrgLoading(true)
      const [attData, balanceRes, orgRes] = await Promise.all([
        getEmployeeHistory(token, currentEmp.id),
        getLeaveBalance(token, currentEmp.id).catch(() => null),
        getOrganizationData(token).catch((err: any) => {
          console.error('Failed to load organization data', err)
          return null
        })
      ])

      setAttendanceHistory(attData.attendanceHistory)
      setLeaveHistory(attData.leaveHistory)
      if (balanceRes?.success && balanceRes.balance) {
        setLeaveBalance(balanceRes.balance)
      }
      if (orgRes) {
        setOrgData(orgRes)
      }
    } catch (err: any) {
      console.error('Failed to load employee history:', err)
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError('Unable to load employee history records.')
    } finally {
      setIsLoading(false)
      setIsOrgLoading(false)
    }
  }, [token, currentEmp?.id, logout])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !currentEmp?.id) return

    setIsSaving(true)
    setEditError(null)

    try {
      await updateEmployeeDetails(token, currentEmp.id, {
        name: editFormData.name.trim(),
        designation: editFormData.role.trim(),
        department: editFormData.department.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        status: editFormData.accountStatus.toLowerCase(),
        profile_photo_url: editFormData.avatar.trim() || undefined,
      })

      await updateEmployeeOrganization(
        token,
        currentEmp.id,
        editFormData.reportingManagerId || null,
        editFormData.departmentId || null,
        editFormData.workShiftId || null
      )

      const newEmployeeId = editFormData.employeeId.trim()
      if (newEmployeeId && newEmployeeId !== currentEmp.employee_id) {
        await updateEmployeeId(token, currentEmp.id, newEmployeeId)
      }

      const updatedEmp: EmployeeDirectoryItem = {
        ...currentEmp,
        name: editFormData.name.trim(),
        employee_id: editFormData.employeeId.trim(),
        role: editFormData.role.trim(),
        department: editFormData.department.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        accountStatus: editFormData.accountStatus as 'Active' | 'Suspended' | 'Pending',
        avatar: editFormData.avatar.trim(),
        reportingManagerId: editFormData.reportingManagerId || null,
        departmentId: editFormData.departmentId || null,
        workShiftId: editFormData.workShiftId || null,
      }

      setCurrentEmp(updatedEmp)
      onEmployeeUpdated?.(updatedEmp)
      setIsEditModalOpen(false)
      setEditSuccessToast(true)
      setTimeout(() => setEditSuccessToast(false), 4000)
    } catch (err: any) {
      console.error('Failed to save employee changes:', err)
      setEditError(err.message || 'Failed to update employee details.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !currentEmp?.id) return

    setIsAdjusting(true)
    setAdjustError(null)
    try {
      await adjustLeaveBalance(
        token,
        currentEmp.id,
        adjustFormData.leaveType,
        Number(adjustFormData.days),
        adjustFormData.reason
      )
      setIsAdjustModalOpen(false)
      setAdjustFormData({ leaveType: 'casual', days: 0, reason: '' })
      await loadHistory() // refresh balances
    } catch (err: any) {
      console.error('Failed to adjust leave balance:', err)
      setAdjustError(err.message || 'Failed to adjust leave balance.')
    } finally {
      setIsAdjusting(false)
    }
  }

  const empName = currentEmp?.name || 'Employee'
  const empCode = currentEmp?.code || '—'
  const empRole = currentEmp?.role || 'Field Personnel'
  const empDepartment = currentEmp?.department || 'Department Not Set'
  const empEmail = currentEmp?.email || '—'
  const empPhone = currentEmp?.phone || '—'
  const empJoiningDate = currentEmp?.joiningDate || '—'
  const empAvatar = currentEmp?.avatar || ''
  const empInitials = currentEmp?.initials || 'SK'

  // Monthly stats calculated dynamically from live attendance history
  const monthlyStats = useMemo(() => {
    const totalDays = attendanceHistory.length
    const present = attendanceHistory.filter((a) => a.status === 'Present').length
    const late = attendanceHistory.filter((a) => a.status === 'Late').length
    const absent = attendanceHistory.filter((a) => a.status === 'Absent').length
    const halfDay = attendanceHistory.filter((a) => a.status === 'Half Day').length
    const leave = attendanceHistory.filter((a) => a.status === 'Leave').length

    return {
      workingDays: totalDays,
      present,
      late,
      absent,
      halfDay,
      leave,
    }
  }, [attendanceHistory])

  // Today's attendance snapshot from employee object
  const todayAtt = currentEmp?.attendanceToday
  const todayStartTime = todayAtt?.time || '—'
  const isPresentToday = todayAtt?.type === 'present' || todayAtt?.type === 'late' || todayAtt?.type === 'half_day'

  const currentMonthName = new Date().toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="w-full px-4 sm:px-8 bg-background pt-24 pb-16 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-6">
        {/* Top Back Navigation & Live Record Synced Status */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-semibold text-slate-700 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base text-red-600">arrow_back</span>
            <span>Back to Employees</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Record Synced
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadHistory}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Employee Profile Header Card */}
        <div className="relative w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {empAvatar ? (
                  <img
                    alt={empName}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-sm ring-4 ring-slate-100"
                    src={empAvatar}
                  />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-2xl text-slate-700 shadow-sm ring-4 ring-slate-100">
                    {empInitials}
                  </div>
                )}
                <span
                  className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-600/30"
                  title="Active"
                ></span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {empName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200/50">
                    <span className="material-symbols-outlined text-xs text-emerald-600">
                      check_circle
                    </span>
                    {currentEmp?.accountStatus || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Employee ID
                    </span>
                    <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {empCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">badge</span>
                    <span>{empRole}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">corporate_fare</span>
                    <span>{empDepartment}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">edit_square</span>
                <span>Edit Employee</span>
              </button>
              {/* <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-right">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Current Sync
                </span>
                <span className="text-sm font-bold text-red-600 flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  SkyTrack Live
                </span>
              </div> */}
            </div>
          </div>

          {/* Extended Info Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <span className="material-symbols-outlined text-slate-400 text-lg">mail</span>
              <span className="truncate">{empEmail}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <span className="material-symbols-outlined text-slate-400 text-lg">call</span>
              <span>{empPhone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
              <span>Joined: {empJoiningDate}</span>
            </div>
          </div>

          {/* Organization Info Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">badge</span>
                <span className="text-sm font-semibold text-slate-800">
                  {currentEmp?.reportingManagerId && orgData?.managers.find(m => m.id === currentEmp.reportingManagerId)
                    ? orgData.managers.find(m => m.id === currentEmp.reportingManagerId)?.name
                    : <span className="text-slate-400 italic font-normal">Not assigned</span>}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">corporate_fare</span>
                <span className="text-sm font-semibold text-slate-800">
                  {currentEmp?.departmentId && orgData?.departments.find(d => d.id === currentEmp.departmentId)
                    ? orgData.departments.find(d => d.id === currentEmp.departmentId)?.department_name
                    : <span className="text-slate-400 italic font-normal">Not assigned</span>}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Shift</span>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">schedule</span>
                <div className="flex flex-col">
                  {(() => {
                    const shift = orgData?.work_shifts.find(s => s.id === currentEmp?.workShiftId)
                    if (!shift) return <span className="text-sm text-slate-400 italic">Not assigned</span>

                    const formatShiftTime = (timeStr: string) => {
                      const [h, m] = timeStr.split(':')
                      const hour = parseInt(h, 10)
                      const ampm = hour >= 12 ? 'PM' : 'AM'
                      const h12 = hour % 12 || 12
                      return `${h12}:${m} ${ampm}`
                    }

                    const workHrs = Math.round(shift.working_minutes / 60)

                    return (
                      <>
                        <span className="text-sm font-semibold text-slate-800">{shift.shift_name}</span>
                        <span className="text-xs text-slate-500">{formatShiftTime(shift.start_time)} – {formatShiftTime(shift.end_time)}</span>
                        <span className="text-xs text-emerald-600 font-medium">{workHrs} hrs working</span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {editSuccessToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <span>Employee details successfully updated in SkyTrack registry.</span>
          </div>
        )}

        {/* Edit Employee Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-2xl w-full flex flex-col gap-6 animate-in fade-in zoom-in-95 my-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">edit_square</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900">Edit Employee Details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Update workforce profile, designation, department, and contact information.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
                {editError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{editError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g. Aisha Ogundipe"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.employeeId}
                      onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                      placeholder="e.g. SKY001"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium font-mono"
                    />
                  </div>

                  {/* Designation / Role */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Designation / Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      placeholder="e.g. Senior Visa Evaluator"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>

                  {/* Department */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Department *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      placeholder="e.g. Visa Operations"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="e.g. aisha@skytrack.aero"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="e.g. +971 50 123 4567"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>

                  {/* Account Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Account Status
                    </label>
                    <select
                      value={editFormData.accountStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value as 'Active' | 'Suspended' | 'Pending' })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold cursor-pointer"
                    >
                      <option value="Active">Active (Operational)</option>
                      <option value="Suspended">Suspended (Access Revoked)</option>
                      <option value="Pending">Pending Verification</option>
                    </select>
                  </div>

                  {/* Profile Photo URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Profile Photo URL
                    </label>
                    <input
                      type="url"
                      value={editFormData.avatar}
                      onChange={(e) => setEditFormData({ ...editFormData, avatar: e.target.value })}
                      placeholder="https://... (Image link)"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* --- Organization Section --- */}
                <div className="col-span-1 md:col-span-2 pt-4 mt-2 border-t border-slate-100 flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-slate-800">Organization</h4>

                  {isOrgLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                      <span>Loading organization structure...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Reporting Manager */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Reporting Manager
                        </label>
                        <select
                          value={editFormData.reportingManagerId}
                          onChange={(e) => setEditFormData({ ...editFormData, reportingManagerId: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                        >
                          <option value="">Select reporting manager</option>
                          {orgData?.managers.map(m => (
                            <option key={m.id} value={m.id} disabled={m.employee_id === currentEmp?.code}>
                              {m.name} ({m.employee_id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Department
                        </label>
                        <select
                          value={editFormData.departmentId}
                          onChange={(e) => {
                            const newDeptId = e.target.value;
                            const newDeptName = orgData?.departments.find(d => d.id === newDeptId)?.department_name || editFormData.department;
                            setEditFormData({ ...editFormData, departmentId: newDeptId, department: newDeptName })
                          }}
                          className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                        >
                          <option value="">Select department</option>
                          {orgData?.departments.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.department_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Work Shift */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Work Shift
                        </label>
                        <select
                          value={editFormData.workShiftId}
                          onChange={(e) => setEditFormData({ ...editFormData, workShiftId: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-medium"
                        >
                          <option value="">Select work shift</option>
                          {orgData?.work_shifts.map(s => {
                            const formatShiftTime = (timeStr: string) => {
                              const [h, m] = timeStr.split(':')
                              const hour = parseInt(h, 10)
                              const ampm = hour >= 12 ? 'PM' : 'AM'
                              const h12 = hour % 12 || 12
                              return `${h12}:${m} ${ampm}`
                            }
                            const workHrs = Math.round(s.working_minutes / 60)
                            return (
                              <option key={s.id} value={s.id}>
                                {s.shift_name} ({formatShiftTime(s.start_time)} – {formatShiftTime(s.end_time)}, {workHrs} hrs)
                              </option>
                            )
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 hover:shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-75"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {isSaving ? 'refresh' : 'save'}
                    </span>
                    <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Adjust Leave Balance Modal */}
        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 max-w-lg w-full flex flex-col gap-6 animate-in fade-in zoom-in-95 my-8">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">tune</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900">Manual Leave Adjustment</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust {currentEmp?.name}'s leave balance
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-5">
                {adjustError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{adjustError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leave Type</label>
                    <select
                      value={adjustFormData.leaveType}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, leaveType: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all font-semibold"
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Adjustment Days</label>
                    <div className="text-xs text-slate-500 mb-1">Use positive numbers to add days, negative to subtract (e.g. 2, -1)</div>
                    <input
                      type="number"
                      required
                      value={adjustFormData.days}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, days: Number(e.target.value) })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reason *</label>
                    <textarea
                      required
                      value={adjustFormData.reason}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
                      rows={3}
                      placeholder="e.g. Compensatory off for weekend work"
                      className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-red-500 transition-all font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 hover:shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-75"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {isAdjusting ? 'refresh' : 'tune'}
                    </span>
                    <span>{isAdjusting ? 'Adjusting...' : 'Adjust Balance'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Today's Attendance Snapshot Card */}
        <div className="w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">timer</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Today's Attendance</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600 border border-slate-200/60">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Start Work
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900">
                  {todayStartTime !== '—' ? todayStartTime : '—'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                End Work
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-400">
                  {isPresentToday ? '—' : '—'}
                </span>
                {isPresentToday && (
                  <span className="text-xs font-semibold text-red-600">(In Progress)</span>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between ${todayAtt?.type === 'present'
              ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-800'
              : todayAtt?.type === 'late'
                ? 'bg-amber-50/80 border-amber-200/80 text-amber-800'
                : todayAtt?.type === 'leave'
                  ? 'bg-purple-50/80 border-purple-200/80 text-purple-800'
                  : 'bg-rose-50/80 border-rose-200/80 text-rose-800'
              }`}>
              <span className="text-xs font-semibold uppercase tracking-wider mb-2">
                Status
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${todayAtt?.type === 'present' ? 'bg-emerald-500' : todayAtt?.type === 'late' ? 'bg-amber-500' : todayAtt?.type === 'leave' ? 'bg-purple-500' : 'bg-rose-500'
                  }`}></span>
                <span className="text-2xl font-bold">
                  {todayAtt?.label || 'Absent'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Leave Status
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-800 capitalize">
                  {currentEmp?.leaveStatus?.status === 'pending'
                    ? `Pending (${currentEmp.leaveStatus.type})`
                    : currentEmp?.leaveStatus?.status === 'approved'
                      ? `Approved (${currentEmp.leaveStatus.type})`
                      : 'None Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balance Section */}
        {leaveBalance && (
          <div className="w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Leave Balance</h2>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Adjust Balance</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Casual Leave */}
              <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Casual Leave</h3>
                  <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                    {leaveBalance.casual.balance} Days Left
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.casual.allocated}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjusted</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.casual.adjusted}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Used</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.casual.used}</span>
                  </div>
                </div>
              </div>

              {/* Sick Leave */}
              <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sick Leave</h3>
                  <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                    {leaveBalance.sick.balance} Days Left
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.sick.allocated}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjusted</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.sick.adjusted}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Used</span>
                    <span className="text-lg font-extrabold text-slate-800">{leaveBalance.sick.used}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance History Section */}
        <div className="w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">calendar_month</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
            </div>
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-xl self-start md:self-auto">
              <span className="text-xs font-bold text-slate-800">{currentMonthName}</span>
            </div>
          </div>

          <div className="p-6 pt-4">
            {/* Monthly Summary 6-Grid Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="block text-xs text-slate-500 font-medium">Recorded Days</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                  {monthlyStats.workingDays}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <span className="block text-xs text-emerald-800 font-medium">Present</span>
                <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                  {monthlyStats.present}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
                <span className="block text-xs text-amber-800 font-medium">Late</span>
                <span className="text-xl font-bold text-amber-800 mt-0.5 block">
                  {monthlyStats.late}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80">
                <span className="block text-xs text-rose-800 font-medium">Absent</span>
                <span className="text-xl font-bold text-rose-800 mt-0.5 block">
                  {monthlyStats.absent}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                <span className="block text-xs text-slate-700 font-medium">Half Day</span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {monthlyStats.halfDay}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200/80">
                <span className="block text-xs text-purple-800 font-medium">Leave</span>
                <span className="text-xl font-bold text-purple-800 mt-0.5 block">
                  {monthlyStats.leave}
                </span>
              </div>
            </div>

            {/* Attendance History Table */}
            <div className="overflow-x-auto w-full border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6" scope="col">Date</th>
                    <th className="py-3.5 px-4" scope="col">Start Work</th>
                    <th className="py-3.5 px-4" scope="col">End Work</th>
                    <th className="py-3.5 px-6 text-right" scope="col">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-medium">
                        Loading attendance history...
                      </td>
                    </tr>
                  ) : attendanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-medium">
                        No attendance history records found for this employee.
                      </td>
                    </tr>
                  ) : (
                    attendanceHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-6 text-xs font-semibold text-slate-900">{row.date}</td>
                        <td
                          className={`py-3 px-4 text-xs font-semibold ${row.status === 'Late' ? 'text-amber-700' : 'text-slate-700'
                            }`}
                        >
                          {row.startTime}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{row.endTime}</td>
                        <td className="py-3 px-6 text-right">
                          {row.status === 'Present' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Present</span>
                            </div>
                          )}
                          {row.status === 'Late' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Late</span>
                            </div>
                          )}
                          {row.status === 'Half Day' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              <span>Half Day</span>
                            </div>
                          )}
                          {row.status === 'Week Off' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200/60">
                              Week Off
                            </span>
                          )}
                          {row.status === 'Leave' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              <span>Leave</span>
                            </div>
                          )}
                          {row.status === 'Absent' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>Absent</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Leave History Section */}
        <div className="w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">beach_access</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Leave History</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {leaveHistory.length} total recorded requests
            </span>
          </div>

          <div className="p-6 pt-4">
            <div className="overflow-x-auto w-full border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6" scope="col">From</th>
                    <th className="py-3.5 px-4" scope="col">To</th>
                    <th className="py-3.5 px-4" scope="col">Type</th>
                    <th className="py-3.5 px-4" scope="col">Reason</th>
                    <th className="py-3.5 px-6 text-right" scope="col">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">
                        Loading leave records...
                      </td>
                    </tr>
                  ) : leaveHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">
                        No leave history records found for this employee.
                      </td>
                    </tr>
                  ) : (
                    leaveHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-6 text-xs font-semibold text-slate-900">{item.from}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-900">{item.to}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{item.reason}</td>
                        <td className="py-3 px-6 text-right">
                          {item.status === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs">
                              <span className="material-symbols-outlined text-xs text-red-600">verified</span>
                              Approved
                            </span>
                          ) : item.status === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-medium text-xs">
                              <span className="material-symbols-outlined text-xs text-rose-600">cancel</span>
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium text-xs">
                              <span className="material-symbols-outlined text-xs text-amber-600">schedule</span>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
