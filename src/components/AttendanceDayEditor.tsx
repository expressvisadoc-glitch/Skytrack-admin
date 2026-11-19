import { useEffect, useState } from 'react'
import {
  adminSetAttendance,
  adminSetBreak,
  timeToIso,
  isoToTimeInput,
  getCurrentTimeInput,
  formatTime,
} from '../lib/api'

export interface AttendanceDayEditorProps {
  token: string
  employeeDbId: string
  employeeName: string
  /** 'YYYY-MM-DD' — the day being corrected */
  date: string
  rawCheckIn?: string | null
  /** The check-out actually recorded (not an assumed end of shift) */
  rawCheckOut?: string | null
  breakMinutes?: number | null
  isOnBreak?: boolean
  breakStartedAt?: string | null
  /** Called after any successful save so the parent can reload */
  onSaved: () => void | Promise<void>
  /** Optional: report results through the parent's toast instead of the inline message */
  onMessage?: (type: 'success' | 'error', message: string) => void
}

type BreakMode = 'set' | 'add' | 'subtract'

const fmtBreak = (mins: number) => {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return h ? `${h}h ${m}m` : `${m} min`
}

const inputCls =
  'px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800'
const chipCls =
  'text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer'
const Spinner = () => <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>

/**
 * Check-in, check-out and break correction for ONE employee on ONE date. Used by the Attendance
 * side panel and by each employee's monthly attendance screen, so both behave identically.
 */
export function AttendanceDayEditor({
  token, employeeDbId, employeeName, date, rawCheckIn, rawCheckOut, breakMinutes,
  isOnBreak, breakStartedAt, onSaved, onMessage,
}: AttendanceDayEditorProps) {
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')
  const [savingIn, setSavingIn] = useState(false)
  const [savingOut, setSavingOut] = useState(false)
  const [mode, setMode] = useState<BreakMode>('set')
  const [hours, setHours] = useState('0')
  const [mins, setMins] = useState('0')
  const [savingBreak, setSavingBreak] = useState(false)
  const [inline, setInline] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const hasCheckIn = Boolean(rawCheckIn)
  const current = Math.max(0, Math.round(breakMinutes ?? 0))
  const label = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // Start from what is recorded whenever the person, the date or the record changes.
  useEffect(() => {
    setCheckInTime(isoToTimeInput(rawCheckIn))
    setCheckOutTime(isoToTimeInput(rawCheckOut))
    setInline(null)
  }, [employeeDbId, date, rawCheckIn, rawCheckOut])

  // "Set total" starts from the recorded break; "Add" and "Subtract" start from zero.
  useEffect(() => {
    const start = mode === 'set' ? current : 0
    setHours(String(Math.floor(start / 60)))
    setMins(String(start % 60))
  }, [employeeDbId, date, current, mode])

  const report = (type: 'success' | 'error', message: string) => {
    if (onMessage) onMessage(type, message)
    else setInline({ type, message })
  }

  const saveTime = async (which: 'in' | 'out') => {
    const value = which === 'in' ? checkInTime : checkOutTime
    if (!value) return
    const setBusy = which === 'in' ? setSavingIn : setSavingOut
    setBusy(true)
    try {
      const iso = timeToIso(date, value)
      await adminSetAttendance(token, {
        employeeDbId,
        date,
        ...(which === 'in' ? { checkIn: iso } : { checkOut: iso }),
      })
      report('success', `${which === 'in' ? 'Check in' : 'Check out'} set to ${formatTime(iso)} on ${label} for ${employeeName}.`)
      await onSaved()
    } catch (err) {
      report('error', err instanceof Error && err.message ? err.message : `Failed to update check ${which}.`)
    } finally {
      setBusy(false)
    }
  }

  const entered = (Number(hours) || 0) * 60 + (Number(mins) || 0)
  const newTotal = mode === 'set' ? entered : mode === 'add' ? current + entered : current - entered
  const breakValid =
    hasCheckIn &&
    /^\d{1,2}$/.test(hours || '0') && /^\d{1,2}$/.test(mins || '0') &&
    Number(mins || 0) < 60 && entered <= 720 &&
    (mode === 'set' || entered > 0) &&
    newTotal >= 0 && newTotal <= 720

  const saveBreak = async () => {
    if (!breakValid) return
    setSavingBreak(true)
    try {
      const res = await adminSetBreak(token, {
        employeeDbId,
        date,
        ...(mode === 'set' ? { breakMinutes: entered } : { adjustMinutes: mode === 'add' ? entered : -entered }),
      })
      const total = fmtBreak(res.breakMinutes ?? newTotal)
      report('success', res.closedOpenBreak
        ? `Break ended for ${employeeName} and set to ${total} on ${label}. They can now check out.`
        : `Break on ${label} is now ${total} for ${employeeName}.`)
      setMode('set')
      await onSaved()
    } catch (err) {
      report('error', err instanceof Error && err.message ? err.message : 'Failed to update break time.')
    } finally {
      setSavingBreak(false)
    }
  }

  const timeRow = (which: 'in' | 'out') => {
    const isIn = which === 'in'
    const value = isIn ? checkInTime : checkOutTime
    const setValue = isIn ? setCheckInTime : setCheckOutTime
    const busy = isIn ? savingIn : savingOut
    return (
      <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isIn ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span>{isIn ? 'Check In Time' : 'Check Out Time'}</span>
          </label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setValue(getCurrentTimeInput())} className={chipCls} title="Set to current time">Now</button>
            <button type="button" onClick={() => setValue(isIn ? '09:00' : '18:00')} className={chipCls}
              title={isIn ? 'Set to standard shift start' : 'Set to standard shift end'}>
              {isIn ? '09:00 AM' : '06:00 PM'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="time" value={value} onChange={(e) => setValue(e.target.value)} aria-label={isIn ? 'Check in time' : 'Check out time'}
            className={`flex-1 ${inputCls}`} />
          <button type="button" disabled={busy || !value} onClick={() => saveTime(which)}
            className={`px-3.5 py-1.5 rounded-lg ${isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} active:scale-95 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer`}>
            {busy ? <Spinner /> : <span className="material-symbols-outlined text-[15px]">{isIn ? 'login' : 'logout'}</span>}
            <span>{isIn ? 'Set Check In' : 'Set Check Out'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" data-day-editor={date}>
      {inline && (
        <div role="status" className={`p-2.5 rounded-lg text-[11px] font-semibold leading-relaxed border ${
          inline.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {inline.message}
        </div>
      )}

      {/* Check in & check out */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-red-600">schedule</span>
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Manual Check In & Check Out</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">{label}</span>
        </div>
        {timeRow('in')}
        {timeRow('out')}
      </div>

      {/* Break time */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-red-600">free_breakfast</span>
          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Break Time</span>
        </div>

        {!hasCheckIn && (
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            No check-in on this date. Set the check-in time above first, then enter the break.
          </div>
        )}
        {isOnBreak && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold">Still on break</span>
            {breakStartedAt ? ` since ${formatTime(breakStartedAt)}` : ''}. If they forgot to select Resume Work, enter their
            actual break below. Saving ends the break so they can work and check out normally.
          </div>
        )}

        <div className="flex flex-col gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-700">
            Recorded break: <span className="text-slate-900">{fmtBreak(current)}</span>
          </span>
          <div role="radiogroup" aria-label="Break correction" className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100">
            {([['set', 'Set total'], ['add', 'Add'], ['subtract', 'Subtract']] as const).map(([m, text]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                className={`py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  mode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
                {text}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-bold text-slate-700">
              {mode === 'set' ? 'Actual total break for the day' : mode === 'add' ? 'Minutes to add' : 'Minutes to remove'}
            </label>
            <div className="flex items-center gap-1">
              {(mode === 'set' ? [30, 45, 60] : [15, 30, 60]).map((n) => (
                <button key={n} type="button" className={chipCls}
                  onClick={() => { setHours(String(Math.floor(n / 60))); setMins(String(n % 60)) }}>
                  {n === 60 ? '1h' : `${n}m`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5">
              <input type="number" min={0} max={12} inputMode="numeric" aria-label="Break hours" value={hours}
                onChange={(e) => setHours(e.target.value)} className={`w-16 ${inputCls}`} />
              <span className="text-[11px] font-semibold text-slate-500">h</span>
              <input type="number" min={0} max={59} inputMode="numeric" aria-label="Break minutes" value={mins}
                onChange={(e) => setMins(e.target.value)} className={`w-16 ${inputCls}`} />
              <span className="text-[11px] font-semibold text-slate-500">min</span>
            </div>
            <button type="button" data-break-save disabled={savingBreak || !breakValid} onClick={saveBreak}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 active:scale-95 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer">
              {savingBreak ? <Spinner /> : <span className="material-symbols-outlined text-[15px]">save</span>}
              <span>{isOnBreak ? 'End Break & Save' : mode === 'set' ? 'Set Break' : mode === 'add' ? 'Add' : 'Subtract'}</span>
            </button>
          </div>
          <span className={`text-[10px] ${newTotal < 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {newTotal < 0
              ? `Only ${fmtBreak(current)} is recorded — that much can't be removed.`
              : `${fmtBreak(current)} → ${fmtBreak(newTotal)} for the day. Worked hours are recalculated.`}
          </span>
        </div>
      </div>
    </div>
  )
}
