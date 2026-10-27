import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyPayslips, getMyPayslip, formatRupees, type PayslipListItem } from '../../lib/api'
import { downloadPayslipPdf } from '../../lib/payslipPdf'

function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** The employee's own payslips for locked payroll months, downloadable as PDF on the company letterhead. */
export function EmployeePayslips() {
  const { token } = useAuth()
  const [payslips, setPayslips] = useState<PayslipListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showAmounts, setShowAmounts] = useState(false)

  const load = useCallback(() => {
    if (!token) return Promise.resolve()
    return getMyPayslips(token)
      .then((res) => {
        setPayslips(res.payslips ?? [])
        setError(null)
      })
      .catch((err: unknown) => setError(err instanceof Error && err.message ? err.message : 'Unable to load payslips.'))
      .finally(() => setIsLoading(false))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const download = async (item: PayslipListItem) => {
    if (!token) return
    setDownloading(item.month)
    setError(null)
    try {
      const res = await getMyPayslip(token, item.month)
      await downloadPayslipPdf(res.payslip)
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to download payslip.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <section className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-slate-900">Payslips</h2>
            <span className="text-xs text-slate-500">Issued once payroll for a month is locked</span>
          </div>
        </div>
        {payslips.length > 0 && (
          <button type="button" onClick={() => setShowAmounts((v) => !v)} aria-pressed={showAmounts}
            aria-label={showAmounts ? 'Hide amounts' : 'Show amounts'}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center cursor-pointer">
            {showAmounts ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading payslips…
        </div>
      ) : payslips.length === 0 ? (
        <p className="text-sm text-slate-500">No payslips yet. They appear here after payroll for a month is locked.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {payslips.map((p) => (
            <li key={p.payslipNumber} className="flex items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">{monthLabel(p.month)}</span>
                <span className="text-[11.5px] text-slate-400">
                  {p.payslipNumber}{p.version > 1 ? ` · revised` : ''} · Net {showAmounts ? formatRupees(p.netPay) : '••••'}
                </span>
              </div>
              <button type="button" onClick={() => download(p)} disabled={downloading === p.month}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                aria-label={`Download payslip for ${monthLabel(p.month)}`}>
                {downloading === p.month ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
