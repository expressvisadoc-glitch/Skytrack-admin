import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getEmployeesDirectory, updateEmployeeRole, type EmployeeDirectoryItem } from '../lib/api'

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
      <main className="w-full pt-20 px-4 sm:px-8 bg-background pb-14 min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center justify-center pt-20">
           <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
           <p className="text-slate-500 mt-2">Only Super Admins can access this section.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full pt-20 px-4 sm:px-8 bg-background pb-14 min-h-[calc(100vh-4rem)]">
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

        <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6" scope="col">Employee</th>
                  <th className="py-3.5 px-4" scope="col">Employee ID</th>
                  <th className="py-3.5 px-4" scope="col">Current Role</th>
                  <th className="py-3.5 px-6 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400 font-medium">
                      Loading registry...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">No employees found.</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-900">{emp.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60">
                          {emp.employee_id || emp.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                          emp.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          emp.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {emp.role === 'super_admin' ? 'Super Admin' : emp.role === 'admin' ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {emp.role === 'super_admin' ? (
                          <button disabled className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-semibold text-xs border border-slate-200 opacity-70 cursor-not-allowed">
                            Super Admin
                          </button>
                        ) : emp.role === 'admin' ? (
                          <button
                            onClick={() => handleUpdateRole(emp, 'employee')}
                            disabled={updatingId === (emp.employee_id || emp.code)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-xs border border-amber-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {updatingId === (emp.employee_id || emp.code) ? 'Updating...' : 'Remove Admin'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateRole(emp, 'admin')}
                            disabled={updatingId === (emp.employee_id || emp.code)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {updatingId === (emp.employee_id || emp.code) ? 'Updating...' : 'Make Admin'}
                          </button>
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
