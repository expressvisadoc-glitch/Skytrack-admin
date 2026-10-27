import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getPayrollPolicy,
  savePayrollPolicy,
  type PayrollPolicy,
  type PayrollPolicyHistoryEntry,
  type PayrollPolicyInput,
} from '../lib/api'

// Mirrors PAYROLL_POLICY_LIMITS in the skytrack-api Edge Function and the table CHECK constraints.
const LIMITS = {
  lateGraceMinutes: { min: 0, max: 240 },
  lateMarksPerUnit: { min: 1, max: 31 },
  lateLopDaysPerUnit: { min: 0.01, max: 1 },
  maxWeekOffDays: 6,
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface FormState {
  weekOffDays: number[]
  lateGraceMinutes: string
  lateMarksPerUnit: string
  lateLopDaysPerUnit: string
  officeTimezone: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

function formFromPolicy(p: PayrollPolicy | null): FormState {
  return {
    weekOffDays: p?.weekOffDays ?? [],
    lateGraceMinutes: p ? String(p.lateGraceMinutes) : '',
    lateMarksPerUnit: p ? String(p.lateMarksPerUnit) : '',
    lateLopDaysPerUnit: p ? String(p.lateLopDaysPerUnit) : '',
    officeTimezone: p?.officeTimezone ?? '',
  }
}

function validate(form: FormState, timezones: Set<string>): { errors: FieldErrors; value: PayrollPolicyInput | null } {
  const errors: FieldErrors = {}

  if (form.weekOffDays.length > LIMITS.maxWeekOffDays) {
    errors.weekOffDays = 'At least one day of the week must be a working day.'
  }

  const wholeNumber = (key: keyof FormState, raw: string, limits: { min: number; max: number }, label: string) => {
    const n = /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN
    if (!Number.isInteger(n) || n < limits.min || n > limits.max) {
      errors[key] = `Enter a whole number from ${limits.min} to ${limits.max}${label}.`
    }
    return n
  }
  const grace = wholeNumber('lateGraceMinutes', form.lateGraceMinutes, LIMITS.lateGraceMinutes, ' minutes')
  const marks = wholeNumber('lateMarksPerUnit', form.lateMarksPerUnit, LIMITS.lateMarksPerUnit, '')

  const lop = /^\s*\d*(\.\d{1,2})?\s*$/.test(form.lateLopDaysPerUnit) ? Number(form.lateLopDaysPerUnit) : NaN
  if (!Number.isFinite(lop) || lop < LIMITS.lateLopDaysPerUnit.min || lop > LIMITS.lateLopDaysPerUnit.max) {
    errors.lateLopDaysPerUnit = 'Enter a value from 0.01 to 1 (e.g. 0.5) with at most two decimals.'
  }

  const tz = form.officeTimezone.trim()
  if (!tz || (timezones.size > 0 && !timezones.has(tz))) {
    errors.officeTimezone = 'Choose a timezone from the list.'
  }

  if (Object.keys(errors).length > 0) return { errors, value: null }
  return {
    errors,
    value: {
      weekOffDays: [...form.weekOffDays].sort((a, b) => a - b),
      lateGraceMinutes: grace,
      lateMarksPerUnit: marks,
      lateLopDaysPerUnit: lop,
      officeTimezone: tz,
    },
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function describeLateRule(marks: number, lop: number): string {
  if (!Number.isFinite(marks) || !Number.isFinite(lop)) return ''
  const examples = [1, 2, 3, 4].map((n) => n * marks)
  return examples
    .map((count, i) => `${count} late mark${count === 1 ? '' : 's'} = ${+(lop * (i + 1)).toFixed(2)} day LOP`)
    .join(' · ')
}

function weekOffLabel(days: number[]): string {
  return days.length ? days.map((d) => WEEKDAYS[d]).join(', ') : 'None'
}

export function PayrollSettings() {
  const { token } = useAuth()
  const [policy, setPolicy] = useState<PayrollPolicy | null>(null)
  const [history, setHistory] = useState<PayrollPolicyHistoryEntry[]>([])
  const [form, setForm] = useState<FormState>(formFromPolicy(null))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pendingSave, setPendingSave] = useState<PayrollPolicyInput | null>(null)

  const timezoneList = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return []
    }
  }, [])
  const timezoneSet = useMemo(() => new Set(timezoneList), [timezoneList])

  const load = useCallback(() => {
    if (!token) return Promise.resolve()
    return getPayrollPolicy(token)
      .then((res) => {
        setPolicy(res.policy)
        setHistory(res.history ?? [])
        setForm(formFromPolicy(res.policy))
        setFieldErrors({})
        setLoadError('')
      })
      .catch((err: unknown) => {
        console.error('Failed to load payroll settings:', err)
        setLoadError(errorMessage(err, 'Failed to load payroll settings.'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleRetryLoad = () => {
    setIsLoading(true)
    setLoadError('')
    load()
  }

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    setSuccessMsg('')
  }

  const toggleWeekOff = (day: number) => {
    setForm((prev) => ({
      ...prev,
      weekOffDays: prev.weekOffDays.includes(day)
        ? prev.weekOffDays.filter((d) => d !== day)
        : [...prev.weekOffDays, day].sort((a, b) => a - b),
    }))
    setFieldErrors((prev) => ({ ...prev, weekOffDays: undefined }))
    setSuccessMsg('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const { errors, value } = validate(form, timezoneSet)
    setFieldErrors(errors)
    if (!value) {
      setErrorMsg('Please correct the highlighted fields.')
      return
    }
    setPendingSave(value)
  }

  const handleConfirmSave = async () => {
    if (!token || !pendingSave) return
    setIsSaving(true)
    setErrorMsg('')
    try {
      const res = await savePayrollPolicy(token, pendingSave)
      setPendingSave(null)
      setSuccessMsg(res.message || 'Payroll settings saved.')
      await load()
    } catch (err: unknown) {
      console.error('Failed to save payroll settings:', err)
      setPendingSave(null)
      setErrorMsg(errorMessage(err, 'Failed to save payroll settings.'))
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(formFromPolicy(policy))
  const ruleExample = describeLateRule(Number(form.lateMarksPerUnit), Number(form.lateLopDaysPerUnit))

  if (isLoading) {
    return (
      <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Loading Payroll Settings...</p>
        </div>
      </main>
    )
  }

  if (loadError || !policy) {
    return (
      <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-red-500">error</span>
          <p className="text-sm text-slate-600">{loadError || 'Payroll settings are unavailable.'}</p>
          <button
            onClick={handleRetryLoad}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  const inputClass = (key: keyof FormState) =>
    `h-10 px-3 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 ${
      fieldErrors[key]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/40'
        : 'border-slate-200 focus:border-red-500 focus:ring-red-500'
    }`

  const fieldError = (key: keyof FormState) =>
    fieldErrors[key] ? <p className="text-[11.5px] text-red-600 font-medium">{fieldErrors[key]}</p> : null

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#faf9fd] min-h-screen">
      {/* Save Confirmation Modal */}
      {pendingSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">rule</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-900">Apply new payroll settings?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Late marks already recorded are not changed; the new late rules apply to check-ins from now on.
                  Week-off days apply to working-day counts for the whole month.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-slate-50 rounded-xl border border-slate-100 p-4">
              <dt className="text-slate-500">Week-off days</dt>
              <dd className="font-semibold text-slate-800 text-right">{weekOffLabel(pendingSave.weekOffDays)}</dd>
              <dt className="text-slate-500">Late grace</dt>
              <dd className="font-semibold text-slate-800 text-right">{pendingSave.lateGraceMinutes} min</dd>
              <dt className="text-slate-500">Late deduction</dt>
              <dd className="font-semibold text-slate-800 text-right">
                {pendingSave.lateMarksPerUnit} marks = {pendingSave.lateLopDaysPerUnit} day
              </dd>
              <dt className="text-slate-500">Office timezone</dt>
              <dd className="font-semibold text-slate-800 text-right">{pendingSave.officeTimezone}</dd>
            </dl>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPendingSave(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isSaving ? 'Saving…' : 'Save and Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Page Breadcrumb & Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              PAYROLL
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">SETTINGS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll Settings</h1>
            <p className="text-[13.5px] text-slate-500 mt-0.5">
              Week-off days and late-arrival rules used for attendance and salary calculations. Holidays come from
              Public Holidays and shift times from Organization.
            </p>
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

        {/* Current saved settings */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Current Settings</h2>
              <p className="text-[12px] text-slate-500">In effect now</p>
            </div>
          </div>
          <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Week-off days', weekOffLabel(policy.weekOffDays)],
              ['Late grace', `${policy.lateGraceMinutes} min after shift start`],
              ['Late deduction', `${policy.lateMarksPerUnit} marks = ${policy.lateLopDaysPerUnit} day LOP`],
              ['Office timezone', policy.officeTimezone],
              ['Last changed', formatDateTime(policy.updatedAt)],
              ['Changed by', policy.updatedBy?.name ? `${policy.updatedBy.name}${policy.updatedBy.employeeId ? ` (${policy.updatedBy.employeeId})` : ''}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                <span className="text-sm font-semibold text-slate-800 break-words">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Edit form */}
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Edit Settings</h2>
              <p className="text-[12px] text-slate-500">Changes to late rules affect future check-ins only</p>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[11px] font-bold text-slate-500 uppercase mb-2">Week-off days</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((name, day) => {
                const checked = form.weekOffDays.includes(day)
                return (
                  <label
                    key={name}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-colors ${
                      checked ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleWeekOff(day)} />
                    {name}
                  </label>
                )
              })}
            </div>
            {fieldError('weekOffDays') ?? (
              <p className="text-[11.5px] text-slate-400">Unticked days are working days. Published public holidays are also non-working.</p>
            )}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pp-grace" className="text-[11px] font-bold text-slate-500 uppercase">Late grace (minutes)</label>
              <input id="pp-grace" type="number" min={LIMITS.lateGraceMinutes.min} max={LIMITS.lateGraceMinutes.max} step={1}
                value={form.lateGraceMinutes} onChange={(e) => updateField('lateGraceMinutes', e.target.value)} className={inputClass('lateGraceMinutes')} />
              {fieldError('lateGraceMinutes')}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pp-marks" className="text-[11px] font-bold text-slate-500 uppercase">Late marks per deduction</label>
              <input id="pp-marks" type="number" min={LIMITS.lateMarksPerUnit.min} max={LIMITS.lateMarksPerUnit.max} step={1}
                value={form.lateMarksPerUnit} onChange={(e) => updateField('lateMarksPerUnit', e.target.value)} className={inputClass('lateMarksPerUnit')} />
              {fieldError('lateMarksPerUnit')}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pp-lop" className="text-[11px] font-bold text-slate-500 uppercase">LOP days per deduction</label>
              <input id="pp-lop" type="text" inputMode="decimal"
                value={form.lateLopDaysPerUnit} onChange={(e) => updateField('lateLopDaysPerUnit', e.target.value)} className={inputClass('lateLopDaysPerUnit')} />
              {fieldError('lateLopDaysPerUnit')}
            </div>
          </div>
          <p className="text-[11.5px] text-slate-500 -mt-2 leading-relaxed">
            A check-in later than the employee's shift start plus the grace (to the minute) is a late mark. Only
            complete groups count{ruleExample ? `: ${ruleExample}.` : '.'}
          </p>

          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <label htmlFor="pp-tz" className="text-[11px] font-bold text-slate-500 uppercase">Office timezone</label>
            {timezoneList.length > 0 ? (
              <select id="pp-tz" value={form.officeTimezone} onChange={(e) => updateField('officeTimezone', e.target.value)} className={inputClass('officeTimezone')}>
                {!timezoneSet.has(form.officeTimezone) && <option value={form.officeTimezone}>{form.officeTimezone || 'Select…'}</option>}
                {timezoneList.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            ) : (
              <input id="pp-tz" type="text" value={form.officeTimezone} onChange={(e) => updateField('officeTimezone', e.target.value)} className={inputClass('officeTimezone')} />
            )}
            {fieldError('officeTimezone') ?? (
              <p className="text-[11.5px] text-slate-400">Used to read shift start times. Times are stored in UTC and shown in each viewer's local time.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            {isDirty && (
              <button type="button" onClick={() => { setForm(formFromPolicy(policy)); setFieldErrors({}) }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                Discard changes
              </button>
            )}
            <button type="submit" disabled={isSaving || !isDirty}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer disabled:opacity-60">
              Save
            </button>
          </div>
        </form>

        {/* Change history */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Change History</h2>
              <p className="text-[12px] text-slate-500">Last 10 changes</p>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="pt-4 text-sm text-slate-400">No changes recorded yet. The current values are the starting defaults.</p>
          ) : (
            <div className="pt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide">
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold">By</th>
                    <th className="py-2 pr-3 font-bold">Week-off</th>
                    <th className="py-2 pr-3 font-bold">Grace</th>
                    <th className="py-2 pr-3 font-bold">Late deduction</th>
                    <th className="py-2 font-bold">Timezone</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 text-slate-700">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(h.changedAt)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{h.changedBy?.name || '—'}</td>
                      <td className="py-2 pr-3">{weekOffLabel(h.weekOffDays)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{h.lateGraceMinutes} min</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{h.lateMarksPerUnit} = {h.lateLopDaysPerUnit} day</td>
                      <td className="py-2 whitespace-nowrap">{h.officeTimezone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
