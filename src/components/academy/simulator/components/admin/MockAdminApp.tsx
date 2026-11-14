import type { TutorialEngine } from '../../engine/TutorialEngine'
import type { DemoLeave } from '../../data/demo-data'
import { DEMO_IDENTITIES } from '../../data/demo-data'
import { Target, MockField, MockChoice, MockModal, MockRows } from '../primitives'

/**
 * A simulated SkyTrack admin portal. It resembles the real screens closely enough to transfer, but
 * shares no code with them — a tutorial can never reach a real action, and changing the real app
 * cannot break a walkthrough mid-sentence.
 */

const NAV = [
  { id: 'nav_dashboard', label: 'Dashboard', icon: 'dashboard', screens: ['dashboard'] },
  { id: 'nav_employees', label: 'Employees', icon: 'badge', screens: ['employees', 'employee_new', 'employee_detail', 'employee_salary'] },
  { id: 'nav_attendance', label: 'Attendance', icon: 'how_to_reg', screens: ['attendance', 'attendance_edit'] },
  { id: 'nav_leave_management', label: 'Leave Management', icon: 'event_busy', badge: 2, screens: ['leave_management', 'leave_detail'] },
  { id: 'nav_geofence', label: 'Office Geofence', icon: 'location_on', screens: ['geofence'] },
  { id: 'nav_payroll', label: 'Payroll', icon: 'account_balance_wallet', screens: ['payroll'] },
]

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', employees: 'Employees', employee_new: 'Add employee', employee_detail: 'Employee details',
  employee_salary: 'Employee details · Salary', attendance: 'Attendance', attendance_edit: 'Correct attendance',
  leave_management: 'Leave Management', leave_detail: 'Leave request', geofence: 'Office Geofence', payroll: 'Payroll',
}

const rupees = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`)

export function MockAdminApp({ engine }: { engine: TutorialEngine }) {
  const screen = engine.getScreen()
  const state = engine.getState()
  const admin = DEMO_IDENTITIES.admin

  return (
    <div className="relative flex h-full min-h-[32rem] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 select-none">
      <aside className="w-14 sm:w-48 shrink-0 bg-white border-r border-slate-200 py-3 flex flex-col gap-0.5">
        <div className="px-2 sm:px-4 pb-3 mb-1 border-b border-slate-100 text-center sm:text-left">
          <span className="text-[12px] font-extrabold tracking-tight text-slate-900">
            <span className="sm:hidden">ST</span><span className="hidden sm:inline">SkyTrack</span>
          </span>
          <span className="hidden sm:block text-[9.5px] font-bold uppercase tracking-wider text-red-500">Demo</span>
        </div>
        {NAV.map((item) => {
          const active = item.screens.includes(screen)
          return (
            <Target key={item.id} engine={engine} target={item.id} action="click"
              className={`mx-1.5 sm:mx-2 px-2 sm:px-2.5 py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 text-[12px] font-semibold text-left ${
                active ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
              <span className="material-symbols-outlined text-[17px] shrink-0" title={item.label}>{item.icon}</span>
              <span className="hidden sm:block flex-1">{item.label}</span>
              {item.badge && <span className="hidden sm:inline px-1.5 rounded-full bg-red-600 text-white text-[9.5px] font-bold">{item.badge}</span>}
            </Target>
          )
        })}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-slate-800 truncate">{TITLES[screen] ?? 'SkyTrack'}</span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[11px] text-slate-500">{admin.name}</span>
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">PN</span>
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'leave_management' && <LeaveQueue engine={engine} leaves={state.leaves} />}
          {screen === 'leave_detail' && <LeaveDetail engine={engine} leave={state.leaves.find((l) => l.id === 'l1')!} />}
          {screen === 'attendance' && <AttendanceList engine={engine} />}
          {screen === 'attendance_edit' && <AttendanceEdit engine={engine} />}
          {screen === 'employees' && <EmployeeList engine={engine} />}
          {screen === 'employee_new' && <EmployeeNew engine={engine} />}
          {screen === 'employee_detail' && <EmployeeDetail engine={engine} tab="profile" />}
          {screen === 'employee_salary' && <EmployeeDetail engine={engine} tab="salary" />}
          {screen === 'geofence' && <Geofence engine={engine} />}
          {screen === 'payroll' && <Payroll engine={engine} />}
        </div>
      </div>

      {/* Dialogs come last and carry no z-index, so a target inside one still rises above the dimming. */}
      {screen === 'payroll' && Boolean(state.ui.lockDialog) && !state.payroll.locked && (
        <MockModal title="Lock October 2026?">
          <p className="text-[12px] text-slate-600 leading-relaxed">
            Payslips are issued and the month is frozen. Attendance, leave, holiday and salary changes for October will
            be refused until it is reopened with a reason.
          </p>
          <div className="flex justify-end gap-2">
            <span className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-500">Cancel</span>
            <Target engine={engine} target="confirm_lock" action="confirm"
              className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-bold">Lock month</Target>
          </div>
        </MockModal>
      )}
    </div>
  )
}

// --- dashboard --------------------------------------------------------------------------------------
function Dashboard() {
  const stats = [
    { label: 'Checked in', value: 3, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { label: 'On break', value: 1, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: 'Not in', value: 2, tone: 'text-slate-600 bg-slate-50 border-slate-200' },
    { label: 'Leave pending', value: 2, tone: 'text-red-700 bg-red-50 border-red-100' },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.tone}`}>
            <span className="block text-xl font-extrabold">{s.value}</span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-wide opacity-80">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Today</span>
        <ul className="mt-2 flex flex-col gap-1.5">
          {[['Ananya Kumar', 'Checked in 09:52'], ['Rahul Menon', 'Working since 09:48'],
            ['Imran Shaikh', 'On break (20 min)'], ['Fatima Noor', 'No check-in']].map(([name, detail]) => (
            <li key={name} className="flex items-center justify-between text-[12px] gap-2">
              <span className="font-semibold text-slate-700">{name}</span>
              <span className="text-slate-500 text-right">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// --- leave --------------------------------------------------------------------------------------
const Pill = ({ status }: { status: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
    status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
      : status === 'approved' || status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200'}`}>{status}</span>
)

function LeaveQueue({ engine, leaves }: { engine: TutorialEngine; leaves: DemoLeave[] }) {
  const rows = leaves.filter((l) => l.status === 'pending' || l.id === 'l1')
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Awaiting a decision</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((l) => (
          <li key={l.id}>
            <Target engine={engine} target={`leave_row_${l.id}`} action="click"
              className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-slate-800">{l.employeeName}</span>
                <span className="block text-[11px] text-slate-500">
                  {l.type === 'lop' ? 'Loss of pay' : l.type === 'casual' ? 'Casual' : 'Sick'} · {l.fromDate} to {l.toDate} · {l.days} day{l.days === 1 ? '' : 's'}
                </span>
              </span>
              <Pill status={l.status} />
            </Target>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LeaveDetail({ engine, leave }: { engine: TutorialEngine; leave: DemoLeave }) {
  const decided = leave.status === 'approved' || leave.status === 'rejected'
  const live = engine.isInteractive('leave_decision')
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">{leave.employeeName}</h3>
            <p className="text-[11.5px] text-slate-500">Visa Consultant · Operations</p>
          </div>
          <Pill status={leave.status} />
        </div>
        <div className="mt-3">
          <MockRows rows={[['Type', 'Casual leave'], ['Dates', `${leave.fromDate} → ${leave.toDate}`],
            ['Days requested', leave.days], ['Reason', leave.reason]]} />
        </div>
      </div>

      <Target engine={engine} target="leave_detail_balance" action="inspect" as="div"
        className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Balance check</span>
        <div className="mt-1.5">
          <MockRows rows={[['Casual days remaining', leave.balanceAtRequest], ['Days requested', leave.days]]} />
        </div>
        <p className="mt-2 text-[11.5px] text-amber-900 leading-relaxed">
          One day is covered by her balance. The second would become loss of pay.
        </p>
      </Target>

      {decided ? (
        <Target engine={engine} target="leave_split_result" action="inspect" as="div"
          className={`rounded-xl border p-3.5 ${leave.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wide ${leave.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
            {leave.status === 'approved' ? 'Approved — how it was split' : 'Rejected'}
          </span>
          {leave.status === 'approved' ? (
            <div className="mt-1.5">
              <MockRows rows={[['Paid days', leave.paidDays], ['Loss of pay days', leave.lopDays], ['Approximate deduction', '₹833']]} />
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] text-red-900 leading-relaxed">No balance used, no deduction made. Your comment is shown to the employee.</p>
          )}
          {leave.managerComment && <p className="mt-2 text-[11.5px] italic text-slate-600">“{leave.managerComment}”</p>}
        </Target>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2.5">
            <MockField engine={engine} target="reject_comment_box" label="Manager comment" multiline
              placeholder="Explain your decision…" />
            <Target engine={engine} target="leave_decision" action="conditional" as="div" className="flex items-center gap-2 pt-1">
              {(['approve', 'reject'] as const).map((choice) => (
                <button key={choice} type="button" disabled={!live} data-value={choice}
                  onClick={() => engine.attempt('leave_decision', 'conditional', choice)}
                  className={`px-3.5 py-1.5 rounded-lg border text-[12px] font-bold disabled:opacity-40 enabled:cursor-pointer ${
                    choice === 'approve' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}`}>
                  {choice === 'approve' ? 'Approve' : 'Reject'}
                </button>
              ))}
            </Target>
          </div>
          <div className="flex items-center gap-2">
            <Target engine={engine} target="confirm_approve" action="confirm"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-bold disabled:opacity-40">Confirm approval</Target>
            <Target engine={engine} target="confirm_reject" action="confirm"
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Confirm rejection</Target>
          </div>
        </>
      )}
    </div>
  )
}

// --- attendance ---------------------------------------------------------------------------------
function AttendanceList({ engine }: { engine: TutorialEngine }) {
  const rows = engine.getState().attendance
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent records</span>
        <span className="text-[10.5px] text-slate-400">Week of 9 Nov</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((a) => (
          <li key={a.id}>
            <Target engine={engine} target={`attendance_row_${a.id}`} action="click"
              className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-slate-800">{a.employeeName}</span>
                <span className="block text-[11px] text-slate-500">
                  {a.date} · {a.checkIn ? `${a.checkIn}${a.checkOut ? ` – ${a.checkOut}` : ''}` : 'No check-in'}
                  {a.note ? ` · ${a.note}` : ''}
                </span>
              </span>
              <Pill status={a.status === 'on_break' ? 'on break' : a.status} />
            </Target>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AttendanceEdit({ engine }: { engine: TutorialEngine }) {
  const rec = engine.getState().attendance.find((a) => a.id === 'a6')!
  const fixed = rec.status === 'present'
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <h3 className="text-[14px] font-bold text-slate-900">{rec.employeeName}</h3>
        <p className="text-[11.5px] text-slate-500">Wednesday 11 November 2026 · Morning Shift (09:00 – 18:00)</p>
      </div>
      {!fixed && (
        <Target engine={engine} target="attendance_absent_note" action="inspect" as="div"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-red-700">Recorded as absent</span>
          <p className="mt-1 text-[12px] text-red-900 leading-relaxed">
            His check-in was refused — outside the office geofence. With no check-in and no approved leave, this
            working day counts as an absence and costs a full day's pay.
          </p>
        </Target>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MockField engine={engine} target="checkin_time" label="Check-in time" type="time" placeholder="--:--" />
        <MockField engine={engine} target="checkout_time" label="Check-out time" type="time" placeholder="--:--" />
      </div>
      {fixed ? (
        <Target engine={engine} target="attendance_result" action="inspect" as="div"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Saved</span>
          <div className="mt-1.5">
            <MockRows rows={[['Status', 'Present'], ['Check-in', rec.checkIn], ['Check-out', rec.checkOut ?? '—'], ['Absence deduction', 'Removed']]} />
          </div>
        </Target>
      ) : (
        <Target engine={engine} target="save_attendance" action="confirm"
          className="self-end px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Save attendance</Target>
      )}
    </div>
  )
}

// --- employees ----------------------------------------------------------------------------------
function EmployeeList({ engine }: { engine: TutorialEngine }) {
  const employees = engine.getState().employees.filter((e) => e.status === 'active')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Target engine={engine} target="add_employee_button" action="click"
          className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-90">
          <span className="material-symbols-outlined text-[16px]">person_add</span> Add employee
        </Target>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {employees.map((e) => (
            <li key={e.id}>
              <Target engine={engine} target={`employee_row_${e.employeeId}`} action="click"
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-slate-800">{e.name}</span>
                  <span className="block text-[11px] text-slate-500">{e.employeeId} · {e.designation} · {e.department}</span>
                </span>
                {e.monthlyGross == null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 shrink-0">No salary</span>
                )}
              </Target>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmployeeNew({ engine }: { engine: TutorialEngine }) {
  const created = engine.getState().employees.find((e) => e.employeeId === 'DEMO-007')
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-3">
        <MockField engine={engine} target="emp_name" label="Full name" placeholder="Employee's name" />
        <MockChoice engine={engine} target="emp_department" label="Department" inline
          options={[{ value: 'Operations', label: 'Operations' }, { value: 'Sales', label: 'Sales' }, { value: 'Administration', label: 'Administration' }]} />
        <MockChoice engine={engine} target="emp_shift" label="Work shift"
          options={[
            { value: 'General Shift (10:00 - 19:00)', label: 'General Shift', hint: '10:00 – 19:00' },
            { value: 'Morning Shift (09:00 - 18:00)', label: 'Morning Shift', hint: '09:00 – 18:00' },
            { value: 'Late Shift (11:00 - 20:00)', label: 'Late Shift', hint: '11:00 – 20:00' },
          ]} />
        <MockField engine={engine} target="emp_joining_date" label="Joining date" type="date" placeholder="dd-mm-yyyy" />
        <Target engine={engine} target="emp_role_field" action="inspect" as="div"
          className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <MockRows rows={[['Role', 'Employee'], ['Reporting manager', 'Rahul Menon']]} />
          <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
            Leave the role as Employee. Administrator access shows everybody's salary.
          </p>
        </Target>
      </div>
      {created ? (
        <Target engine={engine} target="employee_result" action="inspect" as="div"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Employee added</span>
          <div className="mt-1.5">
            <MockRows rows={[['Employee ID', created.employeeId], ['Name', created.name], ['Shift', created.shift],
              ['Joining date', created.joiningDate ?? '—'], ['Salary', 'Not set yet']]} />
          </div>
        </Target>
      ) : (
        <Target engine={engine} target="save_employee" action="confirm"
          className="self-end px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Save employee</Target>
      )}
    </div>
  )
}

function EmployeeDetail({ engine, tab }: { engine: TutorialEngine; tab: 'profile' | 'salary' }) {
  const state = engine.getState()
  const emp = state.employees.find((e) => e.employeeId === 'DEMO-005')!
  const history = state.salaryHistory.filter((h) => h.employeeId === 'DEMO-005')
  const saved = history.length > 0
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <h3 className="text-[14px] font-bold text-slate-900">{emp.name}</h3>
        <p className="text-[11.5px] text-slate-500">{emp.employeeId} · {emp.designation} · Joined {emp.joiningDate ?? '—'}</p>
        <div className="mt-3 flex gap-1.5">
          <span className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${tab === 'profile' ? 'bg-red-50 text-red-700' : 'text-slate-500'}`}>Profile</span>
          <Target engine={engine} target="salary_tab" action="click"
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${tab === 'salary' ? 'bg-red-50 text-red-700' : 'text-slate-500'}`}>Salary</Target>
        </div>
      </div>

      {tab === 'profile' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <MockRows rows={[['Department', emp.department], ['Shift', emp.shift], ['Reporting manager', emp.reportingManager ?? 'Not assigned'], ['Status', 'Active']]} />
        </div>
      ) : (
        <>
          <Target engine={engine} target="salary_status" action="inspect" as="div"
            className={`rounded-xl border p-3.5 ${saved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${saved ? 'text-emerald-700' : 'text-amber-700'}`}>Current salary</span>
            <p className={`mt-1 text-[12.5px] leading-relaxed ${saved ? 'text-emerald-900' : 'text-amber-900'}`}>
              {saved ? `${rupees(emp.monthlyGross)} a month` : 'Not set. Payroll cannot produce a figure or a payslip for him.'}
            </p>
          </Target>
          {!saved && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-3">
              <MockField engine={engine} target="salary_amount" label="Monthly gross (₹)" type="number" placeholder="e.g. 24000" />
              <Target engine={engine} target="salary_effective_hint" action="inspect" as="div"
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11.5px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Effective from</strong> decides which days are paid. Use his joining date,
                12 Oct 2026 — not today — or every working day before today is unpaid.
              </Target>
              <MockField engine={engine} target="salary_effective_from" label="Effective from" type="date" placeholder="dd-mm-yyyy" />
              <Target engine={engine} target="save_salary" action="confirm"
                className="self-end px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Save salary</Target>
            </div>
          )}
          <Target engine={engine} target="salary_history" action="inspect" as="div"
            className="rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">History</span>
            {history.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-slate-400">No salary recorded yet.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1">
                {history.map((h, i) => (
                  <li key={i} className="text-[12px] text-slate-700 flex justify-between gap-2">
                    <span>{rupees(h.amount)} from {h.effectiveFrom}</span>
                    <span className="text-slate-400">{h.by}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-slate-400">Salaries are never edited — a change is a new record from a date.</p>
          </Target>
        </>
      )}
    </div>
  )
}

// --- office geofence ----------------------------------------------------------------------------
function Geofence({ engine }: { engine: TutorialEngine }) {
  const g = engine.getState().geofence
  const saved = g.history.length > 1
  const shownRadius = Number(engine.getInput('geofence_radius')) || g.radius
  return (
    <div className="flex flex-col gap-3">
      <Target engine={engine} target="geofence_map" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.officeName}</span>
        <div className="mt-2 h-32 rounded-lg bg-[linear-gradient(135deg,#e2e8f0_25%,#f1f5f9_25%,#f1f5f9_50%,#e2e8f0_50%,#e2e8f0_75%,#f1f5f9_75%)] bg-[length:24px_24px] relative overflow-hidden flex items-center justify-center">
          <span className="absolute rounded-full bg-red-500/15 border border-red-400/60 transition-all"
            style={{ width: Math.min(120, 40 + shownRadius), height: Math.min(120, 40 + shownRadius) }} />
          <span className="material-symbols-outlined text-red-600 text-[26px] relative">location_on</span>
        </div>
        <p className="mt-2 text-[11.5px] text-slate-500">
          {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)} · radius {shownRadius} m · {g.active ? 'Active' : 'Inactive'}
        </p>
      </Target>
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-3">
        <MockField engine={engine} target="geofence_radius" label="Radius (metres)" type="number" unit="m" placeholder={`${g.radius} m`} />
        <MockChoice engine={engine} target="geofence_accuracy" label="Max location accuracy" inline
          options={[{ value: '20', label: '±20 m', hint: 'Strict' }, { value: '50', label: '±50 m', hint: 'Recommended' }, { value: '100', label: '±100 m', hint: 'Loose' }]} />
        <Target engine={engine} target="geofence_warning" action="inspect" as="div"
          className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-900 leading-relaxed">
          This applies to every check-in from the moment you save. A pin or radius that is wrong blocks the whole office —
          and a refused check-in becomes an absence.
        </Target>
        {!saved && (
          <Target engine={engine} target="save_geofence" action="confirm"
            className="self-end px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">Save settings</Target>
        )}
      </div>
      <Target engine={engine} target="geofence_history" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Change history</span>
        <ul className="mt-1.5 flex flex-col gap-1">
          {g.history.map((h, i) => (
            <li key={i} className="text-[12px] text-slate-700 flex justify-between gap-2">
              <span>Radius {h.radius} m · accuracy ±{h.accuracy} m</span>
              <span className="text-slate-400 text-right">{h.by}, {h.at}</span>
            </li>
          ))}
        </ul>
      </Target>
    </div>
  )
}

// --- payroll ------------------------------------------------------------------------------------
function Payroll({ engine }: { engine: TutorialEngine }) {
  const p = engine.getState().payroll
  const total = p.rows.reduce((sum, r) => sum + (r.netPay ?? 0), 0)
  return (
    <div className="flex flex-col gap-3">
      {p.locked ? (
        <Target engine={engine} target="payroll_locked_banner" action="inspect" as="div"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">October 2026 locked · version {p.version}</span>
          <p className="mt-1 text-[12px] text-emerald-900 leading-relaxed">
            Payslips issued to {p.rows.length - (p.skipped?.length ?? 0)} employees.
            {p.skipped && p.skipped.length > 0 && ` Skipped: ${p.skipped.join(', ')} — no salary set, so no payslip.`}
          </p>
        </Target>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-slate-700">October 2026 · Open</span>
          <Target engine={engine} target="lock_month_button" action="click"
            className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-90">
            <span className="material-symbols-outlined text-[16px]">lock</span> Lock month
          </Target>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wide">
              <th className="px-3 py-2">Employee</th><th className="px-2 py-2 text-right">Gross</th>
              <th className="px-2 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => {
              const flagged = r.flags.length > 0
              const row = (
                <>
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    {r.name}
                    {flagged && <span className="block text-[10px] font-bold text-amber-700">No salary set — no payslip possible</span>}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-600">{rupees(r.monthlyGross)}</td>
                  <td className="px-2 py-2 text-right text-red-600">{r.deductions ? `−₹${r.deductions.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">{rupees(r.netPay)}</td>
                </>
              )
              return flagged ? (
                <tr key={r.employeeId} className="border-t border-slate-100 bg-amber-50/60">
                  <td colSpan={4} className="p-0">
                    <Target engine={engine} target="payroll_flag_row" action="inspect" as="div" className="">
                      <table className="w-full text-[11.5px]"><tbody><tr>{row}</tr></tbody></table>
                    </Target>
                  </td>
                </tr>
              ) : <tr key={r.employeeId} className="border-t border-slate-100">{row}</tr>
            })}
          </tbody>
        </table>
      </div>
      <Target engine={engine} target="payroll_totals" action="inspect" as="div"
        className="rounded-xl border border-slate-200 bg-white p-3.5">
        <MockRows rows={[['Employees', p.rows.length], ['Working days', 24], ['Total net pay', rupees(total)]]} />
      </Target>
    </div>
  )
}
