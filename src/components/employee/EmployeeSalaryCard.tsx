import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Loader2, Wallet, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMySalarySummary, formatRupees, type SalarySummary } from '../../lib/api'
import { salaryStatusMessage } from '../../lib/salary'
import { SalaryBreakdown } from '../SalaryBreakdown'

interface EmployeeSalaryCardProps {
  /** Changes whenever attendance may have changed, so a revealed card refreshes its figures */
  refreshKey: number
}

/**
 * "This month's salary" — hidden by default (eye icon). Figures are fetched only once revealed and are
 * never stored in the browser.
 */
export function EmployeeSalaryCard({ refreshKey }: EmployeeSalaryCardProps) {
  const { token } = useAuth()
  const [isRevealed, setIsRevealed] = useState(false)
  const [salary, setSalary] = useState<SalarySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const load = useCallback(() => {
    if (!token) return Promise.resolve()
    return getMySalarySummary(token)
      .then((res) => {
        setSalary(res.salary)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error && err.message ? err.message : 'Unable to load your salary.')
      })
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    if (isRevealed) {
      load()
    }
  }, [isRevealed, refreshKey, load])

  const toggleReveal = () => {
    if (isRevealed) {
      setIsRevealed(false)
      setSalary(null)
      setShowDetails(false)
      return
    }
    setIsLoading(true)
    setError(null)
    setIsRevealed(true)
  }

  const retry = () => {
    setIsLoading(true)
    setError(null)
    load()
  }

  const statusMessage = salary ? salaryStatusMessage(salary) : null
  const monthLabel = salary?.month
    ? new Date(`${salary.month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'This month'

  return (
    <section className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-slate-900">This month's salary</h2>
            <span className="text-xs text-slate-500">{isRevealed ? `${monthLabel} · provisional` : 'Hidden'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleReveal}
          aria-label={isRevealed ? 'Hide salary' : 'Show salary'}
          aria-pressed={isRevealed}
          className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
        >
          {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {!isRevealed ? (
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-widest text-slate-300 select-none">₹ • • • • •</span>
        </div>
      ) : isLoading && !salary ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculating…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <span>{error}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : salary && statusMessage ? (
        <p className="text-sm text-slate-600">{statusMessage} Please contact your administrator if this looks wrong.</p>
      ) : salary ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500">Expected net pay</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{formatRupees(salary.netPay)}</span>
            </div>
            <div className="flex flex-col items-end text-xs text-slate-500">
              <span>Gross {formatRupees(salary.monthlyGross)}</span>
              <span className="text-red-600 font-semibold">Deductions −{formatRupees(salary.totalDeductions)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="self-start text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
          >
            {showDetails ? 'Hide breakdown' : 'View breakdown'}
          </button>
          {showDetails && <SalaryBreakdown salary={salary} />}
        </>
      ) : null}
    </section>
  )
}
