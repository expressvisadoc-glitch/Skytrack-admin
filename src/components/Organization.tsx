import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getOrganizationData, updateWorkShift, type Department, type WorkShift } from '../lib/api'

export function Organization() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Edit Shift State
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    getOrganizationData(token)
      .then(data => {
        setDepartments(data.departments)
        setShifts(data.work_shifts)
      })
      .catch(err => {
        console.error(err)
        setErrorMsg('Failed to load organization data')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  const handleEditClick = (shift: WorkShift) => {
    setEditingShiftId(shift.id)
    setEditStartTime(shift.start_time.substring(0, 5)) // HH:mm
    setEditEndTime(shift.end_time.substring(0, 5))     // HH:mm
  }

  const handleCancelEdit = () => {
    setEditingShiftId(null)
    setEditStartTime('')
    setEditEndTime('')
  }

  const handleSaveShift = async (shift: WorkShift) => {
    if (!token) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      // Calculate working minutes
      const [startH, startM] = editStartTime.split(':').map(Number)
      const [endH, endM] = editEndTime.split(':').map(Number)
      let diffMins = (endH * 60 + endM) - (startH * 60 + startM)
      if (diffMins < 0) {
        diffMins += 24 * 60 // cross midnight shift
      }

      const formattedStart = `${editStartTime}:00`
      const formattedEnd = `${editEndTime}:00`

      await updateWorkShift(token, shift.id, formattedStart, formattedEnd, diffMins)
      
      // Update local state
      setShifts(prev => prev.map(s => 
        s.id === shift.id 
          ? { ...s, start_time: formattedStart, end_time: formattedEnd, working_minutes: diffMins } 
          : s
      ))
      
      setSuccessMsg('Work shift updated successfully.')
      setEditingShiftId(null)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to update work shift')
    }
  }

  const formatShiftTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  if (isLoading) {
    return (
      <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Loading Organization Data...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#faf9fd] min-h-screen">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Page Breadcrumb & Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              ORGANIZATION
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">
              DEPARTMENTS & SHIFTS
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Configuration</h1>
              <p className="text-[13.5px] text-slate-500 mt-0.5">
                View departments and manage work shifts schedules.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Departments</h2>
                <p className="text-[12px] text-slate-500">Currently active departments in DB</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3 flex-1">
              {departments.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No departments found.</div>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{dept.department_name}</span>
                    <span className="px-2 py-1 bg-white rounded text-[11px] font-bold text-slate-500 border border-slate-200">ID: {dept.id.substring(0, 8)}...</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Work Shifts */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Work Shifts</h2>
                <p className="text-[12px] text-slate-500">Manage shift timings</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-4 flex-1">
              {shifts.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No work shifts found.</div>
              ) : (
                shifts.map(shift => {
                  const isEditing = editingShiftId === shift.id;
                  const workHrs = Math.round(shift.working_minutes / 60)

                  return (
                    <div key={shift.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[15px]">{shift.shift_name}</span>
                        {!isEditing && (
                          <button
                            onClick={() => handleEditClick(shift)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">From Time</label>
                              <input
                                type="time"
                                value={editStartTime}
                                onChange={e => setEditStartTime(e.target.value)}
                                className="h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">To Time</label>
                              <input
                                type="time"
                                value={editEndTime}
                                onChange={e => setEditEndTime(e.target.value)}
                                className="h-9 px-3 rounded-md border border-slate-200 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveShift(shift)}
                              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer"
                            >
                              Save Shift
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 bg-white rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
                            {formatShiftTime(shift.start_time)} – {formatShiftTime(shift.end_time)}
                          </div>
                          <div className="px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100 text-xs font-bold text-emerald-600">
                            {workHrs} hrs working
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
