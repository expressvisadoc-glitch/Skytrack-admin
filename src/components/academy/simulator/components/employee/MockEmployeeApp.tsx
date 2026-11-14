import type { TutorialEngine } from '../../engine/TutorialEngine'
import { leaveDays } from '../../engine/effects'
import { Target, MockField, MockChoice, MockRows } from '../primitives'

/**
 * A simulated SkyTrack phone app, signed in as Ananya Kumar (DEMO-001). Like the admin mock it
 * shares no code with the real Android app: it only draws the demo state and reports taps to the
 * engine, so there is no location, no network and no record behind any button.
 */

const NAV = [
  { id: 'nav_home', label: 'Attendance', icon: 'fingerprint', screens: ['home'] },
  { id: 'nav_leave', label: 'Leave', icon: 'event_note', screens: ['leave', 'leave_new'] },
  { id: 'nav_monthly', label: 'Monthly', icon: 'calendar_month', screens: ['monthly'] },
]

const TITLES: Record<string, string> = {
  home: 'Attendance & Breaks', leave: 'Leave Requests', leave_new: 'New leave request', monthly: 'Monthly Overview',
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
const LEAVE_LABEL: Record<string, string> = { casual: 'Casual leave', sick: 'Sick leave', lop: 'Loss of pay' }

export function MockEmployeeApp({ engine }: { engine: TutorialEngine }) {
  const screen = engine.getScreen()
  return (
    // Fixed hex for the bezel: theme colours are remapped in dark mode and a pale phone looks wrong.
    <div className="relative mx-auto w-full max-w-[380px] rounded-[2rem] border-[7px] border-[#1e293b] bg-[#1e293b] shadow-lg select-none">
      <div className="relative flex flex-col h-[36rem] rounded-[1.6rem] overflow-hidden bg-slate-50">
        <div className="h-6 shrink-0 px-5 flex items-center justify-between text-[10px] font-semibold text-slate-500 bg-white">
          <span>9:52</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[12px]">battery_5_bar</span>
          </span>
        </div>
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-slate-900 truncate">{TITLES[screen] ?? 'SkyTrack'}</span>
          <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">AK</span>
        </header>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {screen === 'home' && <Home engine={engine} />}
          {screen === 'leave' && <LeaveList engine={engine} />}
          {screen === 'leave_new' && <LeaveNew engine={engine} />}
          {screen === 'monthly' && <Monthly engine={engine} />}
        </div>

        <nav className="shrink-0 bg-white border-t border-slate-200 grid grid-cols-3">
          {NAV.map((item) => {
            const active = item.screens.includes(screen)
            return (
              <Target key={item.id} engine={engine} target={item.id} action="click"
                className={`py-2 flex flex-col items-center gap-0.5 text-[10.5px] font-semibold ${active ? 'text-red-700' : 'text-slate-500'}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Target>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

// --- Attendance & Breaks ----------------------------------------------------------------------------
function Home({ engine }: { engine: TutorialEngine }) {
  const state = engine.getState()
  const me = state.me
  const g = state.geofence

  const circle = 'w-40 h-40 rounded-full flex flex-col items-center justify-center gap-1 border-[6px] shadow-sm'
  const status = {
    not_checked_in: 'Ready to check in. Your shift starts at 10:00.',
    working: `Checked in at ${me.checkIn} — on time for your 10:00 shift.`,
    on_break: `On break since ${me.breakStartedAt}. Your working time is paused.`,
    checked_out: `Checked out at ${me.checkOut}. See you tomorrow.`,
  }[me.status]

  return (
    <>
      <Target engine={engine} target="location_card" action="inspect" as="div"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-emerald-600 text-[20px]">where_to_vote</span>
        <span className="min-w-0">
          <span className="block text-[12px] font-bold text-emerald-800">Inside the office zone</span>
          <span className="block text-[11px] text-emerald-700">{me.distanceMeters} m from {g.officeName} · allowed {g.radius} m</span>
        </span>
      </Target>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-400">Friday, 13 November 2026</span>
        {me.status === 'not_checked_in' && (
          <Target engine={engine} target="punch_button" action="click"
            className={`${circle} border-emerald-200 bg-emerald-500 text-white disabled:opacity-100`}>
            <span className="material-symbols-outlined text-[34px]">fingerprint</span>
            <span className="text-[15px] font-extrabold">Check-In</span>
            <span className="text-[10.5px] font-semibold opacity-90">Ready</span>
          </Target>
        )}
        {me.status === 'working' && (
          <Target engine={engine} target="checkout_button" action="click"
            className={`${circle} border-red-200 bg-red-600 text-white disabled:opacity-100`}>
            <span className="material-symbols-outlined text-[34px]">logout</span>
            <span className="text-[15px] font-extrabold">Check-Out</span>
            <span className="text-[10.5px] font-semibold opacity-90">Working</span>
          </Target>
        )}
        {me.status === 'on_break' && (
          <Target engine={engine} target="break_timer" action="inspect" as="div"
            className={`${circle} border-amber-200 bg-amber-400 text-white`}>
            <span className="material-symbols-outlined text-[34px]">coffee</span>
            <span className="text-[15px] font-extrabold">On break</span>
            <span className="text-[10.5px] font-semibold">since {me.breakStartedAt}</span>
          </Target>
        )}
        {me.status === 'checked_out' && (
          <div className={`${circle} border-slate-200 bg-slate-100 text-slate-500`}>
            <span className="material-symbols-outlined text-[34px]">task_alt</span>
            <span className="text-[15px] font-extrabold">Done</span>
            <span className="text-[10.5px] font-semibold">for today</span>
          </div>
        )}

        <Target engine={engine} target="punch_status" action="inspect" as="div"
          className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center text-[11.5px] text-slate-600">
          {status}
        </Target>

        {me.status === 'working' && (
          <Target engine={engine} target="break_button" action="click"
            className="w-full py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[12.5px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-100">
            <span className="material-symbols-outlined text-[17px]">coffee</span> Break
          </Target>
        )}
        {me.status === 'on_break' && (
          <>
            <Target engine={engine} target="resume_button" action="click"
              className="w-full py-2 rounded-lg bg-amber-500 text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-100">
              <span className="material-symbols-outlined text-[17px]">play_arrow</span> End break
            </Target>
            <Target engine={engine} target="checkout_disabled" action="inspect" as="div"
              className="w-full py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-[12px] font-semibold text-center">
              Check-Out is unavailable during a break
            </Target>
          </>
        )}
        {me.status === 'working' && me.breakMinutes > 0 && (
          <Target engine={engine} target="break_total" action="inspect" as="div"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11.5px] text-slate-600 flex justify-between">
            <span>Break taken today</span><span className="font-bold text-slate-800">{me.breakMinutes} min</span>
          </Target>
        )}
        {me.status === 'checked_out' && (
          <Target engine={engine} target="day_summary" action="inspect" as="div"
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <MockRows rows={[['Check-in', me.checkIn ?? '—'], ['Check-out', me.checkOut ?? '—'],
              ['Breaks', `${me.breakMinutes} min`], ['Worked', me.totalHours ?? '—']]} />
          </Target>
        )}
      </div>

      <SalaryCard engine={engine} />
    </>
  )
}

function SalaryCard({ engine }: { engine: TutorialEngine }) {
  const state = engine.getState()
  const s = state.mySalary
  const revealed = Boolean(state.ui.salaryRevealed)
  const open = Boolean(state.ui.breakdownOpen)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">This month's salary</span>
        <span className="text-[10px] font-semibold text-slate-400">{s.month} · provisional</span>
      </div>
      {!revealed ? (
        <Target engine={engine} target="salary_card_hidden" action="inspect" as="div" className="flex items-center justify-between gap-2">
          <span className="text-[20px] font-extrabold tracking-[0.2em] text-slate-800">₹ • • • • •</span>
          <Target engine={engine} target="reveal_salary" action="click"
            className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center disabled:opacity-100">
            <span className="material-symbols-outlined text-[19px]">visibility</span>
          </Target>
        </Target>
      ) : (
        <>
          <Target engine={engine} target="salary_net" action="inspect" as="div" className="flex flex-col gap-1.5">
            <span className="text-[22px] font-extrabold text-slate-900">{rupees(s.netPay)}</span>
            <MockRows rows={[['Monthly gross', rupees(s.monthlyGross)], ['Deductions so far', `−${rupees(s.monthlyGross - s.netPay)}`]]} />
          </Target>
          <Target engine={engine} target="salary_breakdown_toggle" action="click"
            className="self-start text-[12px] font-bold text-red-700 flex items-center gap-1 disabled:opacity-100">
            <span className="material-symbols-outlined text-[17px]">{open ? 'expand_less' : 'expand_more'}</span>
            {open ? 'Hide breakdown' : 'Show breakdown'}
          </Target>
          {open && (
            <Target engine={engine} target="salary_days" action="inspect" as="div"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex flex-col gap-1.5">
              <MockRows rows={[['Working days', s.workingDays], ['Per day', rupees(s.perDayRate)], ['Per late minute', `₹${s.perMinuteRate}`],
                ['Absences', s.absenceDays], ['Unpaid leave days', s.lopLeaveDays]]} />
              <div className="border-t border-slate-200 pt-1.5">
                {s.days.map((d) => (
                  <div key={d.date} className="flex justify-between text-[11.5px] text-slate-700">
                    <span>12 Nov · late {d.minutes} min</span><span className="font-bold text-red-600">−{rupees(d.amount)}</span>
                  </div>
                ))}
              </div>
            </Target>
          )}
        </>
      )}
    </div>
  )
}

// --- Leave Requests ---------------------------------------------------------------------------------
function LeaveList({ engine }: { engine: TutorialEngine }) {
  const state = engine.getState()
  const me = state.employees.find((e) => e.employeeId === 'DEMO-001')!
  const mine = state.leaves.filter((l) => l.employeeId === 'DEMO-001')
  return (
    <>
      <Target engine={engine} target="leave_balances" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3.5 grid grid-cols-3 gap-2 text-center">
        {[['Casual', me.leaveBalance.casual], ['Sick', me.leaveBalance.sick], ['Loss of pay', '—']].map(([k, v]) => (
          <span key={k} className="rounded-lg bg-slate-50 border border-slate-100 py-2">
            <span className="block text-[18px] font-extrabold text-slate-900">{v}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k}</span>
          </span>
        ))}
      </Target>
      <Target engine={engine} target="apply_leave_button" action="click"
        className="py-2.5 rounded-lg bg-red-600 text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-100">
        <span className="material-symbols-outlined text-[17px]">add</span> Apply for leave
      </Target>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">My requests</div>
        <ul className="divide-y divide-slate-100">
          {mine.map((l) => {
            const row = (
              <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-slate-800">{LEAVE_LABEL[l.type]} · {l.days} day{l.days === 1 ? '' : 's'}</span>
                  <span className="block text-[11px] text-slate-500">{l.fromDate} to {l.toDate}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                  l.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'}`}>{l.status}</span>
              </span>
            )
            return (
              <li key={l.id}>
                {l.id === 'l9'
                  ? <Target engine={engine} target="leave_pending_row" action="inspect" as="div" className="bg-amber-50/50">{row}</Target>
                  : row}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

function LeaveNew({ engine }: { engine: TutorialEngine }) {
  const state = engine.getState()
  const me = state.employees.find((e) => e.employeeId === 'DEMO-001')!
  const type = engine.getInput('leave_type') || 'casual'
  const from = engine.getInput('leave_from')
  const to = engine.getInput('leave_to') || from || ''
  const days = from ? leaveDays(from, to) : 0
  const balance = type === 'lop' ? 0 : me.leaveBalance[type as 'casual' | 'sick']
  const paid = Math.min(days, balance)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-3">
      <MockChoice engine={engine} target="leave_type" label="Leave type"
        options={[
          { value: 'casual', label: 'Casual leave', hint: `${me.leaveBalance.casual} day left` },
          { value: 'sick', label: 'Sick leave', hint: `${me.leaveBalance.sick} days left — for illness` },
          { value: 'lop', label: 'Loss of pay', hint: 'Unpaid — always available' },
        ]} />
      <div className="grid grid-cols-2 gap-2.5">
        <MockField engine={engine} target="leave_from" label="From" type="date" placeholder="dd-mm-yyyy" />
        <MockField engine={engine} target="leave_to" label="To" type="date" placeholder="dd-mm-yyyy" />
      </div>
      <Target engine={engine} target="leave_split_preview" action="inspect" as="div"
        className={`rounded-lg border p-2.5 ${days > paid ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
        {days === 0 ? (
          <p className="text-[11.5px] text-slate-500">Choose your dates to see how the request would be paid.</p>
        ) : (
          <>
            <MockRows rows={[['Days requested', days], [`${LEAVE_LABEL[type]} balance`, type === 'lop' ? '—' : balance],
              ['Paid if approved', paid], ['Unpaid (loss of pay)', days - paid]]} />
            <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">Sundays are not counted. Your balance only changes once it is approved.</p>
          </>
        )}
      </Target>
      <MockField engine={engine} target="leave_reason" label="Reason" multiline placeholder="A short reason" />
      <Target engine={engine} target="submit_leave" action="confirm"
        className="py-2.5 rounded-lg bg-red-600 text-white text-[12.5px] font-bold disabled:opacity-40">Submit request</Target>
    </div>
  )
}

// --- Monthly Overview -------------------------------------------------------------------------------
const KIND_STYLE: Record<string, string> = {
  worked: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  late: 'bg-amber-100 text-amber-900 border-amber-300',
  week_off: 'bg-slate-100 text-slate-400 border-slate-200',
  holiday: 'bg-sky-50 text-sky-700 border-sky-200',
  today: 'bg-white text-red-700 border-red-400',
  future: 'bg-white text-slate-300 border-slate-100',
}

function Monthly({ engine }: { engine: TutorialEngine }) {
  const state = engine.getState()
  const month = state.myMonth
  const selected = month.find((d) => d.day === Number(state.ui.selectedDay))
  const worked = month.filter((d) => d.kind === 'worked' || d.kind === 'late').length
  const late = month.filter((d) => d.kind === 'late')
  const lead = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(month[0].weekday)

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        <span className="material-symbols-outlined text-[20px] text-slate-400">chevron_left</span>
        <span className="text-[13px] font-bold text-slate-800">November 2026</span>
        <span className="material-symbols-outlined text-[20px] text-slate-400">chevron_right</span>
      </div>

      <Target engine={engine} target="month_summary" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-3 gap-2 text-center">
        {[['Days worked', worked], ['Late', late.length], ['Absent', 0]].map(([k, v]) => (
          <span key={k}>
            <span className="block text-[17px] font-extrabold text-slate-900">{v}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{k}</span>
          </span>
        ))}
      </Target>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="grid grid-cols-7 gap-1 text-center text-[9.5px] font-bold uppercase text-slate-400 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
          {month.map((d) => {
            const cls = `aspect-square rounded-md border text-[11.5px] font-bold flex items-center justify-center w-full ${KIND_STYLE[d.kind]} ${
              selected?.day === d.day ? 'ring-2 ring-red-500' : ''}`
            return d.day === 12
              ? <Target key={d.day} engine={engine} target="calendar_day_12" action="click" className={`${cls} disabled:opacity-100`}>{d.day}</Target>
              : <span key={d.day} className={cls}>{d.day}</span>
          })}
        </div>
        <Target engine={engine} target="calendar_legend" action="inspect" as="div"
          className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-600">
          {[['worked', 'Worked'], ['late', 'Late'], ['week_off', 'Week off'], ['today', 'Today']].map(([k, label]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm border ${KIND_STYLE[k]}`} />{label}
            </span>
          ))}
        </Target>
      </div>

      <Target engine={engine} target="day_detail" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3.5">
        {selected ? (
          <>
            <span className="block text-[12.5px] font-bold text-slate-800 mb-2">{selected.weekday} {selected.day} November</span>
            <MockRows rows={[['Check-in', selected.checkIn ?? '—'], ['Check-out', selected.checkOut ?? '—'],
              ['Breaks', `${selected.breakMinutes ?? 0} min`], ['Worked', selected.total ?? '—']]} />
            {selected.lateMinutes ? (
              <p className="mt-2 text-[11.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 leading-relaxed">
                Late by {selected.lateMinutes} minutes — your shift starts at 10:00. At ₹{state.mySalary.perMinuteRate} a minute this
                costs {rupees(state.mySalary.lateAmount)} this month.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-[12px] text-slate-400">Select a day to see its punches.</p>
        )}
      </Target>
    </>
  )
}
