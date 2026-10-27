import { useState } from 'react'
import { formatRupees, formatDate, type SalarySummary } from '../lib/api'
import { formatDays, salaryFlagLabel } from '../lib/salary'

const DAY_TYPE_LABEL: Record<string, string> = {
  absent: 'Absent (no check-in)',
  lop_leave: 'Unpaid (LOP) leave',
  late: 'Late check-in',
}

interface SalaryBreakdownProps {
  salary: SalarySummary
  showDays?: boolean
}

/** Line items for a computed salary; used by the employee card and the admin views. */
export function SalaryBreakdown({ salary, showDays = true }: SalaryBreakdownProps) {
  const [showAllDays, setShowAllDays] = useState(false)
  const days = salary.days ?? []
  const lateText =
    salary.lateMarksPerUnit && salary.lateLopDaysPerUnit
      ? `${salary.lateMarks ?? 0} late mark${salary.lateMarks === 1 ? '' : 's'} (${salary.lateMarksPerUnit} = ${salary.lateLopDaysPerUnit} day)`
      : `${salary.lateMarks ?? 0} late marks`
  const earnedIsProrated = salary.earnedGross !== null && salary.monthlyGross !== null && salary.earnedGross !== salary.monthlyGross

  const rows: [string, string, string, boolean][] = [
    ['Monthly gross', `${formatDays(salary.workingDaysInMonth)} working days · ${formatRupees(salary.perDayRate, true)}/day`, formatRupees(salary.monthlyGross), false],
    ...(earnedIsProrated
      ? [['Payable for days employed', `${formatDays(salary.paidWorkingDays)} of ${formatDays(salary.workingDaysInMonth)} working days`, formatRupees(salary.earnedGross), false] as [string, string, string, boolean]]
      : []),
    ['Absences', `${formatDays(salary.absenceDays)} day${salary.absenceDays === 1 ? '' : 's'}`, `−${formatRupees(salary.absenceAmount)}`, true],
    ['Unpaid (LOP) leave', `${formatDays(salary.lopLeaveDays)} day${salary.lopLeaveDays === 1 ? '' : 's'}`, `−${formatRupees(salary.lopLeaveAmount)}`, true],
    ['Late check-ins', `${lateText} → ${formatDays(salary.lateLopDays)} day`, `−${formatRupees(salary.lateAmount)}`, true],
  ]

  const visibleDays = showAllDays ? days : days.slice(0, 8)

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y divide-slate-100 text-sm">
        {rows.map(([label, detail, amount, isDeduction]) => (
          <div key={label} className="flex items-start justify-between gap-3 py-2">
            <div className="flex flex-col min-w-0">
              <dt className="font-semibold text-slate-700">{label}</dt>
              <span className="text-[11.5px] text-slate-400">{detail}</span>
            </div>
            <dd className={`font-bold whitespace-nowrap ${isDeduction ? 'text-red-600' : 'text-slate-800'}`}>{amount}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="font-bold text-slate-900">Expected net pay</dt>
          <dd className="font-extrabold text-emerald-700 text-base whitespace-nowrap">{formatRupees(salary.netPay)}</dd>
        </div>
      </dl>

      {salary.flags.length > 0 && (
        <ul className="flex flex-col gap-1">
          {salary.flags.map((flag) => (
            <li key={flag} className="text-[11.5px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              {salaryFlagLabel(flag)}
            </li>
          ))}
        </ul>
      )}

      {showDays && days.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Days affecting pay</span>
          <ul className="flex flex-col gap-1">
            {visibleDays.map((d) => (
              <li key={`${d.date}-${d.type}`} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                <span className="text-slate-700">
                  <span className="font-semibold">{formatDate(d.date)}</span> · {DAY_TYPE_LABEL[d.type] ?? d.type}
                </span>
                <span className="font-semibold text-slate-500">
                  {d.type === 'late' ? 'late mark' : `−${formatRupees(d.amount)}`}
                </span>
              </li>
            ))}
          </ul>
          {days.length > 8 && (
            <button type="button" onClick={() => setShowAllDays((v) => !v)}
              className="self-start text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer">
              {showAllDays ? 'Show fewer' : `Show all ${days.length}`}
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Provisional until payroll is locked. Remaining working days are assumed worked; today is counted once it is over.
      </p>
    </div>
  )
}
