import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getPayrollMonth, formatRupees, type PayrollMonthRow } from '../lib/api'
import { currentUtcMonth, formatDays, salaryFlagLabel, salaryStatusMessage } from '../lib/salary'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Admin view of every employee's salary figures for a month (provisional; locking comes in Phase 2). */
export function Payroll() {
  const { token } = useAuth()
  const [month, setMonth] = useState(currentUtcMonth())
  const [rows, setRows] = useState<PayrollMonthRow[]>([])
  const [asOf, setAsOf] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)

  const load = useCallback((target: string) => {
    if (!token) return Promise.resolve()
    return getPayrollMonth(token, target)
      .then((res) => {
        setRows(res.rows ?? [])
        setAsOf(res.asOf ?? null)
        setError('')
      })
      .catch((err: unknown) => setError(errorMessage(err, 'Unable to load payroll.')))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    load(month)
  }, [load, month])

  const changeMonth = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value) || value > currentUtcMonth()) return
    setIsLoading(true)
    setMonth(value)
  }

  const amount = (value?: number | null) => (isRevealed ? formatRupees(value) : '••••')
  const okRows = rows.filter((r) => r.salary.status === 'ok')
  const totals = okRows.reduce(
    (acc, r) => ({
      gross: acc.gross + (r.salary.earnedGross ?? 0),
      deductions: acc.deductions + (r.salary.totalDeductions ?? 0),
      net: acc.net + (r.salary.netPay ?? 0),
    }),
    { gross: 0, deductions: 0, net: 0 }
  )
  const needsAttention = rows.filter((r) => r.salary.status !== 'ok' || r.salary.flags.length > 0).length

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#faf9fd] min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              PAYROLL
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">MONTHLY</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll — {monthLabel(month)}</h1>
              <p className="text-[13.5px] text-slate-500 mt-0.5">
                Provisional figures{asOf ? ` as of ${asOf}` : ''}. Set salaries in each employee's details; rules in Payroll Settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                max={currentUtcMonth()}
                onChange={(e) => changeMonth(e.target.value)}
                aria-label="Payroll month"
                className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button type="button" onClick={() => setIsRevealed((v) => !v)} aria-pressed={isRevealed}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">{isRevealed ? 'visibility_off' : 'visibility'}</span>
                {isRevealed ? 'Hide amounts' : 'Show amounts'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Employees', String(rows.length)],
            ['Payable gross', amount(totals.gross)],
            ['Deductions', amount(totals.deductions)],
            ['Expected net', amount(totals.net)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
              <span className="text-xl font-extrabold text-slate-900">{value}</span>
            </div>
          ))}
        </div>

        {needsAttention > 0 && !isLoading && !error && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {needsAttention} employee{needsAttention === 1 ? ' needs' : 's need'} attention (no salary, no shift or missing joining date).
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-2 sm:p-4">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-400">Calculating payroll…</p>
          ) : error ? (
            <div className="p-6 flex items-center justify-between gap-3 text-sm text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => { setIsLoading(true); load(month) }} className="text-xs font-bold cursor-pointer">Retry</button>
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No employees for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wide">
                    <th className="py-2.5 px-3 font-bold">Employee</th>
                    <th className="py-2.5 px-3 font-bold text-right">Gross</th>
                    <th className="py-2.5 px-3 font-bold text-right">Working days</th>
                    <th className="py-2.5 px-3 font-bold text-right">Absent</th>
                    <th className="py-2.5 px-3 font-bold text-right">LOP leave</th>
                    <th className="py-2.5 px-3 font-bold text-right">Late marks</th>
                    <th className="py-2.5 px-3 font-bold text-right">Deductions</th>
                    <th className="py-2.5 px-3 font-bold text-right">Expected net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ employee, salary }) => {
                    const message = salaryStatusMessage(salary)
                    return (
                      <tr key={employee.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{employee.name}</span>
                            <span className="text-[11.5px] text-slate-400">{employee.employeeId}{employee.designation ? ` · ${employee.designation}` : ''}</span>
                            {salary.flags.map((flag) => (
                              <span key={flag} className="mt-1 text-[11px] text-amber-700">{salaryFlagLabel(flag)}</span>
                            ))}
                          </div>
                        </td>
                        {message ? (
                          <td colSpan={7} className="py-3 px-3 text-slate-500">{message}</td>
                        ) : (
                          <>
                            <td className="py-3 px-3 text-right whitespace-nowrap">{amount(salary.monthlyGross)}</td>
                            <td className="py-3 px-3 text-right">{formatDays(salary.paidWorkingDays)} / {formatDays(salary.workingDaysInMonth)}</td>
                            <td className="py-3 px-3 text-right">{formatDays(salary.absenceDays)}</td>
                            <td className="py-3 px-3 text-right">{formatDays(salary.lopLeaveDays)}</td>
                            <td className="py-3 px-3 text-right">
                              {salary.lateMarks ?? 0}
                              {salary.lateLopDays ? <span className="text-[11px] text-slate-400"> ({formatDays(salary.lateLopDays)} d)</span> : null}
                            </td>
                            <td className="py-3 px-3 text-right text-red-600 whitespace-nowrap">{amount(salary.totalDeductions)}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">{amount(salary.netPay)}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
