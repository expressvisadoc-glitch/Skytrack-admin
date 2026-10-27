import type { SalarySummary } from './api'

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
