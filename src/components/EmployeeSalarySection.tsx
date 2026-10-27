import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getEmployeeSalary,
  saveEmployeeSalary,
  formatRupees,
  formatDate,
  type SalaryHistoryEntry,
  type SalarySummary,
} from '../lib/api'
import { currentUtcMonth, salaryStatusMessage } from '../lib/salary'
import { SalaryBreakdown } from './SalaryBreakdown'

const MAX_MONTHLY_GROSS = 10000000

interface EmployeeSalarySectionProps {
  employeeId: string
  employeeName: string
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

/** Admin-only salary panel in Employee Details: current salary, this month's figures, history and changes. */
export function EmployeeSalarySection({ employeeId, employeeName }: EmployeeSalarySectionProps) {
  const { token } = useAuth()
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([])
  const [currentMonth, setCurrentMonth] = useState<SalarySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [gross, setGross] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(`${currentUtcMonth()}-01`)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const load = useCallback(() => {
    if (!token || !employeeId) return Promise.resolve()
    return getEmployeeSalary(token, employeeId)
      .then((res) => {
        setHistory(res.history ?? [])
        setCurrentMonth(res.currentMonth ?? null)
        setLoadError('')
      })
      .catch((err: unknown) => setLoadError(errorMessage(err, 'Unable to load salary.')))
      .finally(() => setIsLoading(false))
  }, [token, employeeId])

  useEffect(() => {
    load()
  }, [load])

  const validate = (): string => {
    const amount = /^\s*\d+(\.\d{1,2})?\s*$/.test(gross) ? Number(gross) : NaN
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_MONTHLY_GROSS) {
      return `Enter a monthly gross between ₹1 and ${formatRupees(MAX_MONTHLY_GROSS)} (up to two decimals).`
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return 'Choose the date the salary takes effect.'
    }
    if (note.trim().length > 200) {
      return 'Note must be at most 200 characters.'
    }
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    const problem = validate()
    setFormError(problem)
    if (!problem) setIsConfirming(true)
  }

  const handleConfirm = async () => {
    if (!token) return
    setIsSaving(true)
    setFormError('')
    try {
      const res = await saveEmployeeSalary(token, {
        employeeId,
        monthlyGross: Number(gross),
        effectiveFrom,
        note: note.trim() || null,
      })
      setSuccessMsg(res.message || 'Salary saved.')
      setIsConfirming(false)
      setIsFormOpen(false)
      setGross('')
      setNote('')
      await load()
    } catch (err: unknown) {
      setIsConfirming(false)
      setFormError(errorMessage(err, 'Failed to save salary.'))
    } finally {
      setIsSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const current = history.find((h) => h.effectiveFrom <= today) ?? null
  const upcoming = history.filter((h) => h.effectiveFrom > today)
  const statusMessage = currentMonth ? salaryStatusMessage(currentMonth) : null

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6">
      {/* Confirm modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Change salary for {employeeName}?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {formatRupees(Number(gross))} per month from {formatDate(effectiveFrom)}. Salary history is kept; this entry
                replaces earlier salaries from that date onward, including in this month's provisional figures.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsConfirming(false)} disabled={isSaving}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleConfirm} disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60">
                {isSaving ? 'Saving…' : 'Save Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">payments</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Salary</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsRevealed((v) => !v)} aria-pressed={isRevealed}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">{isRevealed ? 'visibility_off' : 'visibility'}</span>
            <span>{isRevealed ? 'Hide' : 'Show'}</span>
          </button>
          <button type="button" onClick={() => { setIsFormOpen((v) => !v); setFormError(''); setSuccessMsg('') }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>{isFormOpen ? 'Cancel' : 'Change Salary'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{successMsg}</div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} noValidate className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sal-gross" className="text-[11px] font-bold text-slate-500 uppercase">Monthly gross (₹)</label>
              <input id="sal-gross" type="text" inputMode="decimal" value={gross} onChange={(e) => setGross(e.target.value)}
                placeholder="30000" className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sal-from" className="text-[11px] font-bold text-slate-500 uppercase">Effective from</label>
              <input id="sal-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sal-note" className="text-[11px] font-bold text-slate-500 uppercase">Note (optional)</label>
            <input id="sal-note" type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Annual revision" className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white" />
          </div>
          {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
          <p className="text-[11.5px] text-slate-500">
            Per-day rate = monthly gross ÷ working days in the month. Days before the effective date keep the earlier salary.
          </p>
          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer">
              Save
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading salary…</p>
      ) : loadError ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button type="button" onClick={() => { setIsLoading(true); load() }} className="text-xs font-bold cursor-pointer">Retry</button>
        </div>
      ) : !isRevealed ? (
        <p className="text-sm text-slate-500">
          {current ? 'Salary is set. ' : 'No salary set yet. '}
          Select <span className="font-semibold">Show</span> to view figures.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Current monthly gross</span>
              <span className="text-2xl font-extrabold text-slate-900">{current ? formatRupees(current.monthlyGross) : 'Not set'}</span>
              {current && <span className="text-xs text-slate-500">Since {formatDate(current.effectiveFrom)}</span>}
            </div>
            {upcoming.length > 0 && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                Upcoming: {formatRupees(upcoming[upcoming.length - 1].monthlyGross)} from {formatDate(upcoming[upcoming.length - 1].effectiveFrom)}
              </p>
            )}
            {currentMonth && (
              statusMessage ? (
                <p className="text-sm text-slate-500">This month: {statusMessage}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">This month (provisional)</span>
                    <span className="text-lg font-extrabold text-emerald-700">{formatRupees(currentMonth.netPay)}</span>
                  </div>
                  <button type="button" onClick={() => setShowBreakdown((v) => !v)} className="self-start text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer">
                    {showBreakdown ? 'Hide breakdown' : 'View breakdown'}
                  </button>
                  {showBreakdown && <SalaryBreakdown salary={currentMonth} />}
                </div>
              )
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Salary history</span>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">No salary entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 uppercase tracking-wide">
                      <th className="py-2 pr-3 font-bold">From</th>
                      <th className="py-2 pr-3 font-bold">Monthly gross</th>
                      <th className="py-2 pr-3 font-bold">Changed by</th>
                      <th className="py-2 font-bold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-slate-100 text-slate-700" title={`Saved ${formatDateTime(h.createdAt)}`}>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(h.effectiveFrom)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap font-semibold">{formatRupees(h.monthlyGross, true)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{h.createdBy?.name || '—'}</td>
                        <td className="py-2">{h.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
