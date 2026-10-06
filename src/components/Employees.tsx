import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getEmployeesDirectory,
  createEmployee,
  type EmployeeDirectoryItem,
} from '../lib/api'
import { EmployeeDetails } from './EmployeeDetails'

export function Employees() {
  const { token, logout } = useAuth()
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<'all' | 'present' | 'leave' | 'absent'>('all')
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDirectoryItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Add Employee State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<{ message: string; employeeId: string } | null>(null)

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password) {
      setAddError('All fields are required.')
      return
    }
    if (addForm.password !== addForm.confirmPassword) {
      setAddError('Passwords do not match.')
      return
    }

    if (!token) return

    setIsAdding(true)
    try {
      const result = await createEmployee(token, {
        name: addForm.name,
        email: addForm.email,
        password: addForm.password
      })
      if (result.success && result.employee) {
        const generatedEmployeeId = result.employee.employee_id
        setIsAddModalOpen(false)
        setAddForm({ name: '', email: '', password: '', confirmPassword: '' })
        setAddError(null)
        setSuccessToast({
          message: result.message || 'Employee created successfully.',
          employeeId: generatedEmployeeId,
        })
        loadEmployees()
      } else if (result.success && (result as any).employee_id) {
        const generatedEmployeeId = (result as any).employee_id
        setIsAddModalOpen(false)
        setAddForm({ name: '', email: '', password: '', confirmPassword: '' })
        setAddError(null)
        setSuccessToast({
          message: result.message || 'Employee created successfully.',
          employeeId: generatedEmployeeId,
        })
        loadEmployees()
      } else {
        setAddError(result.message || 'Failed to create employee.')
      }
    } catch (err: any) {
      setAddError(err.message || 'An error occurred while creating employee.')
    } finally {
      setIsAdding(false)
    }
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setAddError(null)
    setAddForm({ name: '', email: '', password: '', confirmPassword: '' })
  }

  const loadEmployees = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getEmployeesDirectory(token)
      setEmployees(data)
    } catch (err: any) {
      console.error('Failed to load employee directory:', err)
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError('Unable to load employee registry. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [token, logout])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  // Keyboard shortcut listener (CMD+K / CTRL+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Dynamic filter counts
  const counts = useMemo(() => {
    const all = employees.length
    const present = employees.filter((e) => e.filterCategory === 'present').length
    const leave = employees.filter((e) => e.filterCategory === 'leave').length
    const absent = employees.filter((e) => e.filterCategory === 'absent').length
    return { all, present, leave, absent }
  }, [employees])

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)

      const matchesFilter =
        currentFilter === 'all' || emp.filterCategory === currentFilter

      return matchesSearch && matchesFilter
    })
  }, [employees, searchQuery, currentFilter])

  const handleEmployeeUpdated = (updated: EmployeeDirectoryItem) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
    )
    setSelectedEmployee(updated)
  }

  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        onEmployeeUpdated={handleEmployeeUpdated}
      />
    )
  }


  return (
    <main className="w-full pt-20 px-4 sm:px-8 bg-background pb-14 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-6">
        {/* Top Header / Title Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200/70 text-[11px] font-bold text-red-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                WORKFORCE REGISTRY
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-xs font-semibold text-slate-500">Live Audit</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Employees</h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              View and manage employees using their existing SkyTrack records.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:bg-red-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>Add Employee</span>
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <span className="text-xs font-bold text-slate-800">
                {isLoading ? '...' : `${counts.all} Enrolled`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 shadow-xs">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
              <span className="text-xs font-bold">Bio-Sync Active</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xl">
                search
              </span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-14 py-2.5 rounded-xl bg-slate-100/70 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 placeholder:text-slate-400 border border-transparent focus:border-slate-300 focus:outline-none shadow-inner transition-all"
                placeholder="Search by employee name or ID (e.g. Amal, SKY001)..."
                type="text"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-400">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => setCurrentFilter('all')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  currentFilter === 'all'
                    ? 'font-semibold bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'font-medium bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                }`}
                type="button"
              >
                <span>All</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    currentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setCurrentFilter('present')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  currentFilter === 'present'
                    ? 'font-semibold bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'font-medium bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Present Today</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    currentFilter === 'present' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.present}
                </span>
              </button>

              <button
                onClick={() => setCurrentFilter('leave')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  currentFilter === 'leave'
                    ? 'font-semibold bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'font-medium bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>On Leave</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    currentFilter === 'leave' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.leave}
                </span>
              </button>

              <button
                onClick={() => setCurrentFilter('absent')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  currentFilter === 'absent'
                    ? 'font-semibold bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'font-medium bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Absent</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    currentFilter === 'absent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.absent}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Success State Banner */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              <span>
                {successToast.message} Employee ID:{' '}
                <strong className="font-mono bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300">
                  {successToast.employeeId}
                </strong>
              </span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadEmployees}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Employees Table Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6" scope="col">Employee</th>
                  <th className="py-3.5 px-4" scope="col">Employee ID</th>
                  <th className="py-3.5 px-4" scope="col">Attendance Today</th>
                  <th className="py-3.5 px-4" scope="col">Leave Status</th>
                  <th className="py-3.5 px-4" scope="col">Account Status</th>
                  <th className="py-3.5 px-6 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-500 animate-ping"></span>
                        <p className="text-slate-500 font-semibold">Loading workforce registry...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                          <span className="material-symbols-outlined text-2xl">person_off</span>
                        </div>
                        <p className="text-base font-semibold text-slate-800">No SkyTrack records match your query</p>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                          Verify employee name or standard identification badge code (e.g. SKY001).
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setCurrentFilter('all')
                          }}
                          className="mt-4 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          type="button"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          {emp.avatar ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-100 shadow-xs">
                              <img
                                className="w-full h-full object-cover"
                                src={emp.avatar}
                                alt={emp.name}
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs ${
                                emp.initialsBg || 'bg-slate-100'
                              } ${emp.initialsColor || 'text-slate-700 border-slate-200'}`}
                            >
                              {emp.initials}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                              {emp.name}
                            </span>
                            <span className="text-xs text-slate-500">{emp.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60">
                          {emp.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.attendanceToday.type === 'present' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>
                              Present{' '}
                              {emp.attendanceToday.time && (
                                <span className="text-[11px] font-normal text-emerald-600">
                                  ({emp.attendanceToday.time})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {emp.attendanceToday.type === 'late' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>
                              Late{' '}
                              {emp.attendanceToday.time && (
                                <span className="text-[11px] font-normal text-amber-600">
                                  ({emp.attendanceToday.time})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {emp.attendanceToday.type === 'absent' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Absent</span>
                          </div>
                        )}
                        {emp.attendanceToday.type === 'half_day' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            <span>
                              Half Day{' '}
                              {emp.attendanceToday.time && (
                                <span className="text-[11px] font-normal text-slate-500">
                                  ({emp.attendanceToday.time})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {emp.attendanceToday.type === 'leave' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            <span>Leave</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {emp.leaveStatus.status === 'none' ? (
                          <span className="text-sm text-slate-400 font-medium">—</span>
                        ) : emp.leaveStatus.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium text-xs">
                            <span className="material-symbols-outlined text-xs text-amber-600">schedule</span>
                            Pending ({emp.leaveStatus.type})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs">
                            <span className="material-symbols-outlined text-xs text-red-600">verified</span>
                            Approved ({emp.leaveStatus.type})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200/50">
                          <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                          {emp.accountStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEmployee(emp)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-red-600 hover:text-white transition-all shadow-xs group-hover:border-slate-300 cursor-pointer"
                          type="button"
                        >
                          <span>View Details</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 border-t border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                Showing <strong className="font-bold text-slate-800">1-{filteredEmployees.length}</strong> of{' '}
                <strong className="font-bold text-slate-800">{counts.all}</strong> employees
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Registry
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-3 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-xs font-bold text-slate-100">
              {successToast.message || 'Employee created successfully.'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300">
              <span>Employee ID:</span>
              <span className="font-mono font-extrabold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 tracking-wider">
                {successToast.employeeId}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 border border-white bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                </div>
                <span className="font-bold text-base text-slate-900">Add New Employee</span>
              </div>
              <button
                onClick={closeAddModal}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="flex flex-col gap-4">
              {addError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{addError}</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-red-400 focus:outline-none transition-all"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-red-400 focus:outline-none transition-all"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-red-400 focus:outline-none transition-all"
                    placeholder="Enter a strong password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={addForm.confirmPassword}
                    onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-red-400 focus:outline-none transition-all"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
