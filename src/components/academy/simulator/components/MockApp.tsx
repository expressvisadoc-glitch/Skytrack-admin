import type { TutorialEngine } from '../engine/TutorialEngine'
import type { DemoLeave } from '../data/demo-data'
import { DEMO_IDENTITIES } from '../data/demo-data'

interface MockProps {
  engine: TutorialEngine
  /** Bumped by the host on every engine change so the mock re-renders */
  tick: number
}

/**
 * A simulated SkyTrack admin portal: sidebar, header, dashboard, leave queue and request detail.
 *
 * It resembles the real screens closely enough to transfer, but shares no code with them — so a
 * tutorial can never reach a real action, and changing the real app cannot break a walkthrough
 * mid-sentence. Interactivity is granted by the engine, one element at a time.
 */

function Target({
  engine, target, action, children, className = '', as = 'button', value,
}: {
  engine: TutorialEngine
  target: string
  action: Parameters<TutorialEngine['attempt']>[1]
  children: React.ReactNode
  className?: string
  as?: 'button' | 'div'
  value?: string
}) {
  const live = engine.isInteractive(target)
  const common = {
    'data-tutorial-target': target,
    className: `${className} ${live ? 'relative z-30 cursor-pointer' : ''}`.trim(),
  }
  if (as === 'div') return <div {...common}>{children}</div>
  return (
    <button
      type="button"
      {...common}
      onClick={() => engine.attempt(target, action, value)}
      disabled={!live}
      tabIndex={live ? 0 : -1}
    >
      {children}
    </button>
  )
}

const NAV = [
  { id: 'nav_dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'nav_employees', label: 'Employees', icon: 'badge' },
  { id: 'nav_attendance', label: 'Attendance', icon: 'how_to_reg' },
  { id: 'nav_leave_management', label: 'Leave Management', icon: 'event_busy', badge: 2 },
  { id: 'nav_holidays', label: 'Public Holidays', icon: 'event_available' },
  { id: 'nav_payroll', label: 'Payroll', icon: 'account_balance_wallet' },
]

export function MockApp({ engine }: MockProps) {
  const screen = engine.getScreen()
  const state = engine.getState()
  const admin = DEMO_IDENTITIES.admin
  const request = state.leaves.find((l) => l.id === 'l1')!

  return (
    <div className="relative flex h-full min-h-[30rem] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 select-none">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-white border-r border-slate-200 py-3 hidden sm:flex flex-col gap-0.5">
        <div className="px-4 pb-3 mb-1 border-b border-slate-100">
          <span className="text-[12px] font-extrabold tracking-tight text-slate-900">SkyTrack</span>
          <span className="block text-[9.5px] font-bold uppercase tracking-wider text-red-500">Demo</span>
        </div>
        {NAV.map((item) => {
          const active = screen === 'leave_management' && item.id === 'nav_leave_management'
            || screen === 'dashboard' && item.id === 'nav_dashboard'
          return (
            <Target key={item.id} engine={engine} target={item.id} action="click"
              className={`mx-2 px-2.5 py-2 rounded-lg flex items-center gap-2 text-[12px] font-semibold text-left ${
                active ? 'bg-red-50 text-red-700' : 'text-slate-600'
              }`}>
              <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 rounded-full bg-red-600 text-white text-[9.5px] font-bold">{item.badge}</span>
              )}
            </Target>
          )
        })}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-slate-800">
            {screen === 'dashboard' ? 'Dashboard' : screen === 'leave_management' ? 'Leave Management' : 'Leave Request'}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{admin.name}</span>
            <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
              {admin.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {screen === 'dashboard' && <MockDashboard />}
          {screen === 'leave_management' && <MockLeaveQueue engine={engine} leaves={state.leaves} />}
          {screen === 'leave_detail' && <MockLeaveDetail engine={engine} leave={request} />}
        </div>
      </div>
    </div>
  )
}

function MockDashboard() {
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
          {[
            ['Ananya Kumar', 'Checked in 09:52'],
            ['Rahul Menon', 'Working since 09:48'],
            ['Imran Shaikh', 'On break (20 min)'],
            ['Fatima Noor', 'No check-in'],
          ].map(([name, detail]) => (
            <li key={name} className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-slate-700">{name}</span>
              <span className="text-slate-500">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MockLeaveQueue({ engine, leaves }: { engine: TutorialEngine; leaves: DemoLeave[] }) {
  const pending = leaves.filter((l) => l.status === 'pending' || l.id === 'l1')
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Awaiting a decision</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {pending.map((l) => (
          <li key={l.id}>
            <Target engine={engine} target={`leave_row_${l.id}`} action="click"
              className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-slate-800">{l.employeeName}</span>
                <span className="block text-[11px] text-slate-500">
                  {l.type === 'lop' ? 'Loss of pay' : l.type === 'casual' ? 'Casual' : 'Sick'} ·
                  {' '}{l.fromDate} to {l.toDate} · {l.days} day{l.days === 1 ? '' : 's'}
                </span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                l.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {l.status}
              </span>
            </Target>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MockLeaveDetail({ engine, leave }: { engine: TutorialEngine; leave: DemoLeave }) {
  const decided = leave.status === 'approved' || leave.status === 'rejected'
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">{leave.employeeName}</h3>
            <p className="text-[11.5px] text-slate-500">Visa Consultant · Operations</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            leave.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>{leave.status}</span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <dt className="text-slate-500">Type</dt><dd className="font-semibold text-slate-800 text-right">Casual leave</dd>
          <dt className="text-slate-500">Dates</dt><dd className="font-semibold text-slate-800 text-right">{leave.fromDate} → {leave.toDate}</dd>
          <dt className="text-slate-500">Days requested</dt><dd className="font-semibold text-slate-800 text-right">{leave.days}</dd>
          <dt className="text-slate-500">Reason</dt><dd className="font-semibold text-slate-800 text-right">{leave.reason}</dd>
        </dl>
      </div>

      <Target engine={engine} target="leave_detail_balance" action="inspect" as="div"
        className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Balance check</span>
        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <span className="text-amber-900/70">Casual days remaining</span>
          <span className="font-bold text-amber-900 text-right">{leave.balanceAtRequest}</span>
          <span className="text-amber-900/70">Days requested</span>
          <span className="font-bold text-amber-900 text-right">{leave.days}</span>
        </div>
        <p className="mt-2 text-[11.5px] text-amber-900 leading-relaxed">
          One day is covered by her balance. The second would become loss of pay.
        </p>
      </Target>

      {decided && (
        <Target engine={engine} target="leave_split_result" action="inspect" as="div"
          className={`rounded-xl border p-3.5 ${
            leave.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          }`}>
          <span className={`text-[11px] font-bold uppercase tracking-wide ${
            leave.status === 'approved' ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {leave.status === 'approved' ? 'Approved — how it was split' : 'Rejected'}
          </span>
          {leave.status === 'approved' ? (
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              <span className="text-emerald-900/70">Paid days</span>
              <span className="font-bold text-emerald-900 text-right">{leave.paidDays}</span>
              <span className="text-emerald-900/70">Loss of pay days</span>
              <span className="font-bold text-emerald-900 text-right">{leave.lopDays}</span>
              <span className="text-emerald-900/70">Approximate deduction</span>
              <span className="font-bold text-emerald-900 text-right">₹833</span>
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] text-red-900 leading-relaxed">
              No balance used, no deduction made. Your comment is shown to the employee.
            </p>
          )}
          {leave.managerComment && (
            <p className="mt-2 text-[11.5px] italic text-slate-600">“{leave.managerComment}”</p>
          )}
        </Target>
      )}

      {!decided && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Manager comment</span>
            <Target engine={engine} target="reject_comment_box" action="input" as="div" className="">
              <MockCommentBox engine={engine} />
            </Target>
            <Target engine={engine} target="leave_decision" action="conditional" as="div"
              className="flex items-center gap-2 pt-1">
              <MockDecisionButtons engine={engine} />
            </Target>
          </div>

          <div className="flex items-center gap-2">
            <Target engine={engine} target="confirm_approve" action="confirm"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-bold disabled:opacity-40">
              Confirm approval
            </Target>
            <Target engine={engine} target="confirm_reject" action="confirm"
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-[12px] font-bold disabled:opacity-40">
              Confirm rejection
            </Target>
          </div>
        </>
      )}
    </div>
  )
}

function MockCommentBox({ engine }: { engine: TutorialEngine }) {
  const live = engine.isInteractive('reject_comment_box')
  const step = engine.getStep()
  return (
    <textarea
      rows={2}
      disabled={!live}
      defaultValue=""
      placeholder={live ? (step?.sampleInput ?? 'Explain your decision…') : 'Manager comment'}
      onBlur={(e) => engine.attempt('reject_comment_box', 'input', e.target.value || step?.sampleInput)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          const el = e.target as HTMLTextAreaElement
          engine.attempt('reject_comment_box', 'input', el.value || step?.sampleInput)
        }
      }}
      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] disabled:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-500"
    />
  )
}

function MockDecisionButtons({ engine }: { engine: TutorialEngine }) {
  const live = engine.isInteractive('leave_decision')
  return (
    <>
      <button
        type="button" disabled={!live}
        onClick={() => engine.attempt('leave_decision', 'conditional', 'approve')}
        className="px-3.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 text-[12px] font-bold disabled:opacity-40 enabled:cursor-pointer"
      >
        Approve
      </button>
      <button
        type="button" disabled={!live}
        onClick={() => engine.attempt('leave_decision', 'conditional', 'reject')}
        className="px-3.5 py-1.5 rounded-lg border border-red-300 text-red-700 bg-red-50 text-[12px] font-bold disabled:opacity-40 enabled:cursor-pointer"
      >
        Reject
      </button>
    </>
  )
}
