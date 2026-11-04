import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getEmployeesDirectory, updateEmployeeRole, type EmployeeDirectoryItem } from '../lib/api'
import { EmptyState } from './EmptyState'
import { ShortcutArrow } from './ShortcutArrow'
import { openEmployeeScreen } from '../lib/navigation'

// Shared frosted glass (index.css) with a light edge
const GLASS = 'glass-panel rounded-2xl border border-slate-200/70 ring-1 ring-slate-900/[0.03]'

export function AdminManagement() {
  const { token, logout, employee } = useAuth()
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<{ message: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  const loadEmployees = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getEmployeesDirectory(token)
      setEmployees(data)
    } catch (err: any) {
      if (err?.message === 'SESSION_EXPIRED') {
        logout()
        return
      }
      setError('Unable to load employee registry.')
    } finally {
      setIsLoading(false)
    }
  }, [token, logout])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const handleUpdateRole = async (employee: EmployeeDirectoryItem, newRole: 'employee' | 'admin') => {
    if (!token) return
    const employeeId = employee.employee_id || employee.code
    setUpdatingId(employeeId)
    setError(null)
    try {
      const result = await updateEmployeeRole(token, employeeId, newRole)
      if (result.success) {
        setSuccessToast({ message: result.message || `Successfully updated role.` })
        setEmployees((prev) =>
          prev.map((e) =>
            (e.employee_id === employeeId || e.code === employeeId)
              ? { ...e, role: newRole }
              : e
          )
        )
        await loadEmployees()
      } else {
        setError(result.message || 'Failed to update role.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating role.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Only allow super admin to view this screen
  if (employee?.role !== 'super_admin') {
    return (
      <main className="w-full pt-20 px-4 sm:px-8 pb-14 min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center justify-center pt-20">
           <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
           <p className="text-slate-500 mt-2">Only Super Admins can access this section.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full pt-20 px-4 sm:px-8 pb-14 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-6">
        <div className="flex flex-col pt-4 gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200/70 text-[11px] font-bold text-red-700 uppercase tracking-wider">
              SUPER ADMIN
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Management</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Assign or revoke administrator privileges for employees.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Each employee is its own frosted-glass card */}
        <div className="relative isolate">

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading employees">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`${GLASS} h-40 animate-pulse`} />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className={GLASS}>
              <EmptyState icon="group_off" title="No employees found" />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((emp) => {
                const code = emp.employee_id || emp.code
                const isUpdating = updatingId === code
                return (
                  <li key={emp.id} className={`${GLASS} group/item min-w-0 p-5 flex flex-col gap-4 hover-magnify`}>
                    <div className="flex items-start gap-3.5">
                      {emp.avatar ? (
                        <img src={emp.avatar} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white/80 shadow-sm shrink-0" />
                      ) : (
                        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-sm shrink-0 ${emp.initialsBg || 'bg-white/70'} ${emp.initialsColor || 'text-slate-700 border-white/80'}`}>
                          {emp.initials || emp.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-bold text-slate-900 break-words min-w-0">{emp.name}</span>
                          <ShortcutArrow
                            label={`Open ${emp.name}'s employee details`}
                            onClick={() => openEmployeeScreen('employees', code || emp.id)}
                          />
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {[emp.designation, emp.department].filter(Boolean).join(' · ') || emp.email}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border ${
                        emp.role === 'super_admin' ? 'bg-purple-50/80 text-purple-700 border-purple-200/80' :
                        emp.role === 'admin' ? 'bg-red-50/80 text-red-700 border-red-200/80' :
                        'bg-white/70 text-slate-600 border-slate-200/80'
                      }`}>
                        {emp.role === 'super_admin' ? 'Super Admin' : emp.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                      <span className="text-xs font-semibold text-slate-600 font-mono bg-slate-50/80 px-2 py-1 rounded-md border border-slate-200/70">
                        {code}
                      </span>
                      {emp.role === 'super_admin' ? (
                        <span className="text-xs font-semibold text-slate-400">Full access</span>
                      ) : emp.role === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateRole(emp, 'employee')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50/80 text-amber-700 hover:bg-amber-100 font-semibold text-xs border border-amber-200/80 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">remove_moderator</span>
                          {isUpdating ? 'Updating...' : 'Remove Admin'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateRole(emp, 'admin')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200/80 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">add_moderator</span>
                          {isUpdating ? 'Updating...' : 'Make Admin'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {successToast && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-3 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-xs font-bold text-slate-100">{successToast.message}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
    </main>
  )
}
