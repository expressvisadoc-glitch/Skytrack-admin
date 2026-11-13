import type { LatePenaltyMode, LatePerMinuteBasis, SalarySummary } from './api'

const FLAG_LABELS: Record<string, string> = {
  joining_date_missing: 'Joining date not set — the whole month is counted.',
  salary_starts_mid_month: 'Salary starts part-way through the month; earlier days are unpaid.',
  salary_not_set: 'No salary has been set.',
  no_shift: 'No work shift assigned — late marks cannot be recorded.',
  calculation_failed: 'The calculation failed for this employee.',
}

export function salaryFlagLabel(flag: string): string {
  return FLAG_LABELS[flag] ?? flag.replace(/_/g, ' ')
}

export function salaryStatusMessage(salary: SalarySummary): string | null {
  switch (salary.status) {
    case 'ok':
      return null
    case 'no_salary':
      return 'Salary not set yet.'
    case 'not_employed':
      return 'Not employed during this month.'
    case 'no_working_days':
      return 'This month has no working days.'
    default:
      return 'Salary could not be calculated.'
  }
}

export function formatDays(days?: number | null): string {
  if (days === null || days === undefined) return '0'
  return Number.isInteger(days) ? String(days) : String(+days.toFixed(2))
}

export function currentUtcMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Rupees with up to two decimals, for per-minute rates that are smaller than a rupee. */
function formatMinuteRate(value: number): string {
  return `₹${value.toFixed(2)}`
}

export function formatMinutes(minutes?: number | null): string {
  const m = Math.max(0, Math.round(minutes ?? 0))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`
}

/**
 * The detail line under "Late check-ins" on the salary breakdown, the employee card and the payslip.
 * Option 1 counts groups of late marks; option 2 charges every late minute.
 */
export function lateDeductionDetail(salary: SalarySummary): string {
  const marks = salary.lateMarks ?? 0
  if (salary.latePenaltyMode === 'per_minute') {
    const rate =
      salary.latePerMinuteBasis === 'fixed' && salary.latePerMinuteAmount
        ? `${formatMinuteRate(salary.latePerMinuteAmount)}/min`
        : salary.latePerMinuteRate
          ? `${formatMinuteRate(salary.latePerMinuteRate)}/min`
          : 'per minute'
    return `${formatMinutes(salary.lateMinutes)} late over ${marks} day${marks === 1 ? '' : 's'} · ${rate}`
  }
  const rule =
    salary.lateMarksPerUnit && salary.lateLopDaysPerUnit
      ? ` (${salary.lateMarksPerUnit} = ${formatDays(salary.lateLopDaysPerUnit)} day)`
      : ''
  return `${marks} late mark${marks === 1 ? '' : 's'}${rule} → ${formatDays(salary.lateLopDays)} day`
}

/** One line describing the late-penalty rule in force, for settings screens and confirmations. */
export function latePolicySummary(policy: {
  latePenaltyMode: LatePenaltyMode
  latePerMinuteBasis: LatePerMinuteBasis
  latePerMinuteAmount: number
  latePerMinuteMaxMinutesPerDay: number
  lateMarksPerUnit: number
  lateLopDaysPerUnit: number
}): string {
  if (policy.latePenaltyMode === 'per_minute') {
    const rate =
      policy.latePerMinuteBasis === 'fixed'
        ? `${formatMinuteRate(policy.latePerMinuteAmount)} per late minute`
        : "each late minute costs that minute's share of the day's pay"
    const cap =
      policy.latePerMinuteMaxMinutesPerDay > 0
        ? `, up to ${formatMinutes(policy.latePerMinuteMaxMinutesPerDay)} a day`
        : ''
    return `Per minute — ${rate}${cap}`
  }
  return `Late marks — ${policy.lateMarksPerUnit} marks = ${formatDays(policy.lateLopDaysPerUnit)} day LOP`
}
