import type { DemoState } from '../data/demo-data'

/**
 * Every change a tutorial can make to the demo data, by effect type.
 *
 * Effects are pure: (state, payload, context) -> new state. They are the ONLY writes in the
 * simulator and they never leave the browser. A tutorial names an effect on a step; the engine
 * applies it once the step validates.
 */
export interface EffectContext {
  /** The value the learner supplied on this step (input text, selected option, branch) */
  value?: string
  /** Everything typed or chosen so far in this run, by target */
  inputs: Record<string, string>
}

type Effect = (state: DemoState, payload: Record<string, unknown>, ctx: EffectContext) => DemoState

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
const fmtDuration = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
const daysBetween = (from: string, to: string) => {
  const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1
  let n = 0
  for (let t = a; t <= b; t += 86400000) if (new Date(t).getUTCDay() !== 0) n++   // Sundays are week-offs
  return Math.max(1, n)
}

export const EFFECTS: Record<string, Effect> = {
  /** UI state the mock reads: open dialogs, chosen tabs, revealed cards */
  'ui.set': (state, payload) => ({ ...state, ui: { ...state.ui, [String(payload.key)]: payload.value ?? true } }),

  // --- leave decisions (admin) -------------------------------------------------------------------
  'leave.decide': (state, payload, ctx) => {
    const leaveId = String(payload.leaveId ?? '')
    const decision = String(payload.decision ?? ctx.value ?? '')
    const comment = typeof payload.comment === 'string' ? payload.comment : null
    return {
      ...state,
      leaves: state.leaves.map((l) => {
        if (l.id !== leaveId) return l
        if (decision === 'approve') {
          // The real rule: paid days are capped at the balance, the rest become loss of pay.
          const paid = Math.min(l.days, l.balanceAtRequest)
          return { ...l, status: 'approved' as const, paidDays: paid,
                   lopDays: Math.round((l.days - paid) * 100) / 100, managerComment: comment ?? l.managerComment }
        }
        return { ...l, status: 'rejected' as const, paidDays: 0, lopDays: 0, managerComment: comment ?? l.managerComment }
      }),
    }
  },
  'leave.comment': (state, payload, ctx) => ({
    ...state,
    leaves: state.leaves.map((l) => (l.id === String(payload.leaveId) ? { ...l, managerComment: ctx.value ?? '' } : l)),
  }),

  // --- attendance correction (admin) -------------------------------------------------------------
  'attendance.fix': (state, payload, ctx) => {
    const id = String(payload.attendanceId)
    const checkIn = ctx.inputs.checkin_time || '09:00'
    const checkOut = ctx.inputs.checkout_time || null
    return {
      ...state,
      attendance: state.attendance.map((a) => a.id !== id ? a : {
        ...a, checkIn, checkOut, status: 'present' as const, lateMinutes: 0,
        note: `Entered by ${String(payload.by ?? 'an administrator')} — absence removed`,
      }),
    }
  },

  // --- people (admin) ----------------------------------------------------------------------------
  'employee.add': (state, _payload, ctx) => ({
    ...state,
    employees: [...state.employees, {
      id: 'e7', employeeId: 'DEMO-007', name: ctx.inputs.emp_name || 'New Employee', role: 'employee',
      department: ctx.inputs.emp_department || 'Operations', designation: 'Visa Consultant',
      shift: ctx.inputs.emp_shift || 'General Shift (10:00 - 19:00)', reportingManager: 'Rahul Menon',
      joiningDate: ctx.inputs.emp_joining_date || null, status: 'active', monthlyGross: null,
      leaveBalance: { casual: 0, sick: 0 },
    }],
  }),
  'salary.set': (state, payload, ctx) => {
    const employeeId = String(payload.employeeId)
    const amount = Number(String(ctx.inputs.salary_amount || '0').replace(/[^0-9.]/g, '')) || 0
    const effectiveFrom = ctx.inputs.salary_effective_from || ''
    return {
      ...state,
      employees: state.employees.map((e) => (e.employeeId === employeeId ? { ...e, monthlyGross: amount } : e)),
      salaryHistory: [{ employeeId, amount, effectiveFrom, by: String(payload.by ?? 'Priya Nair'), at: 'just now' },
                      ...state.salaryHistory],
      payroll: {
        ...state.payroll,
        rows: state.payroll.rows.map((r) => (r.employeeId === employeeId
          ? { ...r, monthlyGross: amount, flags: r.flags.filter((f) => f !== 'salary_not_set') } : r)),
      },
    }
  },

  // --- office geofence (admin) -------------------------------------------------------------------
  'geofence.save': (state, payload, ctx) => {
    const radius = Number(ctx.inputs.geofence_radius) || state.geofence.radius
    const accuracy = Number(ctx.inputs.geofence_accuracy) || state.geofence.accuracy
    return {
      ...state,
      geofence: {
        ...state.geofence, radius, accuracy,
        history: [{ at: 'just now', by: String(payload.by ?? 'Priya Nair'), radius, accuracy }, ...state.geofence.history],
      },
    }
  },

  // --- month end (admin) -------------------------------------------------------------------------
  'payroll.lock': (state) => ({
    ...state,
    ui: { ...state.ui, lockDialog: false },
    payroll: {
      ...state.payroll, locked: true, version: state.payroll.version + 1,
      skipped: state.payroll.rows.filter((r) => r.flags.includes('salary_not_set')).map((r) => r.name),
    },
  }),

  // --- the employee's own day --------------------------------------------------------------------
  'punch.checkin': (state, payload) => ({
    ...state, me: { ...state.me, status: 'working', checkIn: String(payload.at ?? '09:52') },
  }),
  'punch.break': (state, payload) => ({
    ...state, me: { ...state.me, status: 'on_break', breakStartedAt: String(payload.at ?? '13:05') },
  }),
  'punch.resume': (state, payload) => ({
    ...state,
    me: { ...state.me, status: 'working', breakStartedAt: null,
          breakMinutes: state.me.breakMinutes + Number(payload.minutes ?? 32) },
  }),
  'punch.checkout': (state, payload) => {
    const out = String(payload.at ?? '18:41')
    const worked = Math.max(0, minutes(out) - minutes(state.me.checkIn ?? out) - state.me.breakMinutes)
    return { ...state, me: { ...state.me, status: 'checked_out', checkOut: out, totalHours: fmtDuration(worked) } }
  },

  // --- the employee's leave ----------------------------------------------------------------------
  'leave.apply': (state, _payload, ctx) => {
    const type = (ctx.inputs.leave_type || 'casual') as 'casual' | 'sick' | 'lop'
    const from = ctx.inputs.leave_from || '2026-11-27'
    const to = ctx.inputs.leave_to || from
    const me = state.employees.find((e) => e.employeeId === 'DEMO-001')!
    const balance = type === 'lop' ? 0 : me.leaveBalance[type]
    return {
      ...state,
      leaves: [{
        id: 'l9', employeeId: 'DEMO-001', employeeName: me.name, type, fromDate: from, toDate: to,
        days: daysBetween(from, to), halfDay: false, reason: ctx.inputs.leave_reason || '',
        status: 'pending', paidDays: null, lopDays: null, managerComment: null, balanceAtRequest: balance,
      }, ...state.leaves],
    }
  },
}

/** Working days in a leave request, excluding Sundays — used for the live split preview. */
export const leaveDays = daysBetween
