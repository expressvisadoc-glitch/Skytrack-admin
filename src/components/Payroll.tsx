import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getPayrollMonth,
  lockPayrollMonth,
  reopenPayrollMonth,
  getEmployeePayslip,
  formatRupees,
  type PayrollMonthRow,
  type PayrollRunInfo,
} from '../lib/api'
import { currentUtcMonth, formatDays, salaryFlagLabel, salaryStatusMessage } from '../lib/salary'
import { downloadPayslipPdf } from '../lib/payslipPdf'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

// Quotes a CSV cell and neutralises spreadsheet formulas in text values
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportCsv(month: string, run: PayrollRunInfo, rows: PayrollMonthRow[]) {
  const header = [
    'Employee ID', 'Name', 'Designation', 'Month', 'Payslip number', 'Version', 'Monthly gross', 'Working days',
    'Paid days', 'Absence days', 'Absence amount', 'LOP leave days', 'LOP leave amount', 'Late marks',
    'Late LOP days', 'Late amount', 'Total deductions', 'Net pay', 'Status',
  ]
  const lines = rows.map(({ employee, salary, payslip }) => {
    const ok = salary.status === 'ok'
    const paidDays = ok ? Math.max(0, (salary.paidWorkingDays ?? 0) - (salary.totalLopDays ?? 0)) : ''
    return [
      employee.employeeId, employee.name, employee.designation ?? '', month, payslip?.payslipNumber ?? '', payslip?.version ?? '',
      ok ? salary.monthlyGross : '', ok ? salary.workingDaysInMonth : '', paidDays,
      ok ? salary.absenceDays : '', ok ? salary.absenceAmount : '', ok ? salary.lopLeaveDays : '', ok ? salary.lopLeaveAmount : '',
      ok ? salary.lateMarks : '', ok ? salary.lateLopDays : '', ok ? salary.lateAmount : '',
      ok ? salary.totalDeductions : '', ok ? salary.netPay : '', ok ? 'Payslip issued' : (salaryStatusMessage(salary) ?? salary.status),
    ].map(csvCell).join(',')
  })
  const csv = [header.join(','), ...lines].join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SkyTrack-Payroll-${month}-v${run.version}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Admin payroll for a month: live provisional figures while open; frozen payslips once locked. */
export function Payroll() {
  const { token } = useAuth()
  const [month, setMonth] = useState(currentUtcMonth())
  const [rows, setRows] = useState<PayrollMonthRow[]>([])
  const [run, setRun] = useState<PayrollRunInfo | null>(null)
  const [asOf, setAsOf] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmLock, setConfirmLock] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const load = useCallback((target: string) => {
    if (!token) return Promise.resolve()
    return getPayrollMonth(token, target)
      .then((res) => {
        setRows(res.rows ?? [])
        setRun(res.run ?? null)
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
    setNotice(null)
    setMonth(value)
  }

  const handleLock = async () => {
    if (!token) return
    setIsWorking(true)
    try {
      const res = await lockPayrollMonth(token, month)
      setNotice({ type: 'success', text: res.message || 'Payroll locked.' })
      setConfirmLock(false)
      setIsLoading(true)
      await load(month)
    } catch (err: unknown) {
      setConfirmLock(false)
      setNotice({ type: 'error', text: errorMessage(err, 'Failed to lock payroll.') })
    } finally {
      setIsWorking(false)
    }
  }

  const handleReopen = async () => {
    if (!token) return
    const reason = reopenReason.trim()
    if (reason.length < 5) {
      setNotice({ type: 'error', text: 'Enter a reason of at least 5 characters.' })
      return
    }
    setIsWorking(true)
    try {
      const res = await reopenPayrollMonth(token, month, reason)
      setNotice({ type: 'success', text: res.message || 'Payroll reopened.' })
      setReopenOpen(false)
      setReopenReason('')
      setIsLoading(true)
      await load(month)
    } catch (err: unknown) {
      setNotice({ type: 'error', text: errorMessage(err, 'Failed to reopen payroll.') })
    } finally {
      setIsWorking(false)
    }
  }

  const handleDownload = async (row: PayrollMonthRow) => {
    if (!token || !row.payslip) return
    setDownloading(row.employee.id)
    try {
      const res = await getEmployeePayslip(token, row.employee.id, month, row.payslip.version)
      await downloadPayslipPdf(res.payslip)
    } catch (err: unknown) {
      setNotice({ type: 'error', text: errorMessage(err, 'Failed to download payslip.') })
    } finally {
      setDownloading(null)
    }
  }

  const isLocked = run?.status === 'locked'
  const amount = (value?: number | null) => (isRevealed ? formatRupees(value) : '••••')
  const okRows = rows.filter((r) => r.salary.status === 'ok')
  const withoutPayslip = rows.filter((r) => r.salary.status !== 'ok')
  const totals = okRows.reduce(
    (acc, r) => ({
      gross: acc.gross + (r.salary.earnedGross ?? 0),
      deductions: acc.deductions + (r.salary.totalDeductions ?? 0),
      net: acc.net + (r.salary.netPay ?? 0),
    }),
    { gross: 0, deductions: 0, net: 0 }
  )
  const needsAttention = rows.filter((r) => r.salary.status !== 'ok' || (r.salary.flags ?? []).length > 0).length

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#faf9fd] min-h-screen">
      {/* Lock confirmation */}
      {confirmLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="lock-title">
            <h3 id="lock-title" className="text-base font-bold text-slate-900">Lock payroll for {monthLabel(month)}?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every employee's figures are frozen and payslips are issued ({okRows.length} payslip{okRows.length === 1 ? '' : 's'}).
              While locked, attendance, leave approvals, published holidays and backdated salaries for this month are refused
              until you reopen it.
            </p>
            {withoutPayslip.length > 0 && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-semibold mb-1">No payslip for {withoutPayslip.length} employee{withoutPayslip.length === 1 ? '' : 's'}:</p>
                <ul className="list-disc pl-4">
                  {withoutPayslip.map((r) => (
                    <li key={r.employee.id}>{r.employee.name} — {salaryStatusMessage(r.salary)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setConfirmLock(false)} disabled={isWorking}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleLock} disabled={isWorking}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60">
                {isWorking ? 'Locking…' : 'Lock and Issue Payslips'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen with reason */}
      {reopenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="reopen-title">
            <h3 id="reopen-title" className="text-base font-bold text-slate-900">Reopen payroll for {monthLabel(month)}?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Employees will not see this month's payslip until it is locked again. Locking again issues revised payslips
              (version {(run?.version ?? 0) + 1}); earlier versions are kept.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reopen-reason" className="text-[11px] font-bold text-slate-500 uppercase">Reason (required)</label>
              <textarea id="reopen-reason" rows={3} maxLength={500} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Attendance for 3 Sep was missed"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setReopenOpen(false)} disabled={isWorking}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleReopen} disabled={isWorking || reopenReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60">
                {isWorking ? 'Reopening…' : 'Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3 flex-wrap">
                Payroll — {monthLabel(month)}
                {run && (
                  isLocked ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">LOCKED · v{run.version}</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                      {run.version > 0 ? `REOPENED · v${run.version} issued` : 'OPEN · PROVISIONAL'}
                    </span>
                  )
                )}
              </h1>
              <p className="text-[13.5px] text-slate-500 mt-0.5">
                {isLocked
                  ? `Frozen figures from the payslips issued ${formatDateTime(run?.lockedAt)}.`
                  : `Provisional figures${asOf ? ` as of ${asOf}` : ''}. Set salaries in each employee's details; rules in Payroll Settings.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="month" value={month} max={currentUtcMonth()} onChange={(e) => changeMonth(e.target.value)} aria-label="Payroll month"
                className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
              <button type="button" onClick={() => setIsRevealed((v) => !v)} aria-pressed={isRevealed}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">{isRevealed ? 'visibility_off' : 'visibility'}</span>
                {isRevealed ? 'Hide amounts' : 'Show amounts'}
              </button>
              {isLocked ? (
                <>
                  <button type="button" onClick={() => run && exportCsv(month, run, rows)}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                  </button>
                  <button type="button" onClick={() => { setReopenOpen(true); setNotice(null) }}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-50 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">lock_open</span> Reopen
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => { setConfirmLock(true); setNotice(null) }} disabled={!run?.canLock || isLoading || !!error}
                  title={run?.canLock ? undefined : 'A month can be locked once it has ended.'}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">lock</span> Lock Month
                </button>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <div className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-xs font-bold cursor-pointer">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Employees', String(rows.length)],
            ['Payable gross', amount(totals.gross)],
            ['Deductions', amount(totals.deductions)],
            [isLocked ? 'Net payable' : 'Expected net', amount(totals.net)],
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
            <p className="p-6 text-sm text-slate-400">Loading payroll…</p>
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
                    <th className="py-2.5 px-3 font-bold text-right">{isLocked ? 'Net pay' : 'Expected net'}</th>
                    {isLocked && <th className="py-2.5 px-3 font-bold text-right">Payslip</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const { employee, salary } = row
                    const message = salaryStatusMessage(salary)
                    return (
                      <tr key={employee.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{employee.name}</span>
                            <span className="text-[11.5px] text-slate-400">{employee.employeeId}{employee.designation ? ` · ${employee.designation}` : ''}</span>
                            {(salary.flags ?? []).map((flag) => (
                              <span key={flag} className="mt-1 text-[11px] text-amber-700">{salaryFlagLabel(flag)}</span>
                            ))}
                          </div>
                        </td>
                        {message ? (
                          <td colSpan={isLocked ? 8 : 7} className="py-3 px-3 text-slate-500">{message}{isLocked ? ' No payslip issued.' : ''}</td>
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
                            {isLocked && (
                              <td className="py-3 px-3 text-right">
                                {row.payslip && (
                                  <button type="button" onClick={() => handleDownload(row)} disabled={downloading === employee.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                                    aria-label={`Download payslip for ${employee.name}`}>
                                    <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                                    {downloading === employee.id ? '…' : 'PDF'}
                                  </button>
                                )}
                              </td>
                            )}
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

        {run && run.events.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight mb-3">Lock history</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {run.events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold w-fit ${e.event === 'locked' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                    {e.event === 'locked' ? `Locked · v${e.version}` : `Reopened · v${e.version}`}
                  </span>
                  <span className="text-slate-600">{formatDateTime(e.at)} by {e.by?.name || '—'}</span>
                  {e.event === 'locked' && e.payslipCount !== null && <span className="text-slate-400 text-xs">{e.payslipCount} payslip(s)</span>}
                  {e.reason && <span className="text-slate-500 text-xs italic">“{e.reason}”</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
