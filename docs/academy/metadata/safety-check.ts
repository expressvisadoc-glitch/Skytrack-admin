/**
 * Data-safety checks for the tutorial simulator (Phase 5.4).
 *
 * The simulator must be incapable of reaching real data. These assert the properties that make that
 * true, rather than trusting that nobody will wire it up later.
 */
import { freshDemoState, DEMO_IDENTITIES } from './components/academy/simulator/data/demo-data'
import { TutorialEngine } from './components/academy/simulator/engine/TutorialEngine'
import { TUTORIALS } from './components/academy/simulator/scenarios'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let pass = 0, fail = 0
const check = (name: string, expected: unknown, actual: unknown) => {
  const ok = JSON.stringify(expected) === JSON.stringify(actual)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`        expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`)
}

console.log('\n--- the demo data is fictional ---')
const s = freshDemoState()
const names = s.employees.map((e) => e.name)
check('four demo identities are defined', 4, Object.keys(DEMO_IDENTITIES).length)
check('every employee id is a DEMO- id', true, s.employees.every((e) => e.employeeId.startsWith('DEMO-')))
check('no real staging/production employee id leaks in', true, !JSON.stringify(s).includes('SKY'))
check('no real employee names leak in', true, !names.includes('John Doe') && !names.includes('Amal Ramachandran'))

console.log('\n--- Phase 5.2 record coverage ---')
check('active employee', true, s.employees.some((e) => e.status === 'active'))
check('inactive employee (a leaver)', true, s.employees.some((e) => e.status === 'inactive'))
check('employee assigned to a manager', true, s.employees.some((e) => e.reportingManager !== null))
check('employee with no manager', true, s.employees.some((e) => e.reportingManager === null && e.role === 'employee'))
check('employee with no salary set', true, s.employees.some((e) => e.monthlyGross === null))
for (const st of ['pending', 'approved', 'rejected', 'cancelled'] as const) {
  check(`leave: ${st}`, true, s.leaves.some((l) => l.status === st))
}
check('leave: half day', true, s.leaves.some((l) => l.halfDay && l.days === 0.5))
check('leave: request exceeding the paid balance', true, s.leaves.some((l) => l.days > l.balanceAtRequest))
for (const st of ['present', 'late', 'absent', 'working', 'on_break'] as const) {
  check(`attendance: ${st}`, true, s.attendance.some((a) => a.status === st))
}
check('attendance: missing check-in', true, s.attendance.some((a) => a.checkIn === null))
check('attendance: completed checkout', true, s.attendance.some((a) => a.checkOut !== null))
check('attendance: a refused geofence attempt', true, s.attendance.some((a) => (a.note ?? '').includes('geofence')))
check('payroll: a normal salary row', true, s.payroll.rows.some((r) => r.monthlyGross !== null && r.deductions < 100))
check('payroll: an absence deduction', true, s.payroll.rows.some((r) => r.absenceDays > 0))
check('payroll: an LOP deduction', true, s.payroll.rows.some((r) => r.lopLeaveDays > 0))
check('payroll: a late-arrival deduction', true, s.payroll.rows.some((r) => r.lateMinutes > 0))
check('payroll: a flagged row', true, s.payroll.rows.some((r) => r.flags.length > 0))
check('payroll: a locked month', true, s.closedMonth.locked)
check('payroll: a sample payslip', true, s.payslips.length > 0 && s.payslips[0].netPay > 0)

console.log('\n--- isolation ---')
const a = new TutorialEngine(TUTORIALS[0]); a.start()
const b = new TutorialEngine(TUTORIALS[0]); b.start()
a.next(); a.attempt('nav_leave_management', 'click'); a.attempt('leave_row_l1', 'click'); a.next()
a.attempt('leave_decision', 'conditional', 'approve'); a.attempt('confirm_approve', 'confirm')
check('one learner cannot affect another', 'pending', b.getState().leaves.find((l) => l.id === 'l1')!.status)
check('the shared snapshot is never mutated', 'pending', freshDemoState().leaves.find((l) => l.id === 'l1')!.status)
check('restart restores the original data', 'pending', (a.restart(), a.getState().leaves.find((l) => l.id === 'l1')!.status))

console.log('\n--- the simulator cannot reach real data ---')
// Any of these imports would mean a tutorial could issue a real request.
const dir = 'src/components/academy/simulator'
const files: string[] = []
const walk = (d: string) => {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('._')) continue
    const full = join(d, f.name)
    if (f.isDirectory()) walk(full)
    else if (/\.tsx?$/.test(f.name)) files.push(full)
  }
}
walk(dir)
const banned = ['lib/api', 'supabase', 'fetchSkyTrackApi', 'skytrack-api', 'VITE_SUPABASE']
const offenders = files.filter((f) => {
  const text = readFileSync(f, 'utf8')
  return banned.some((b) => text.includes(b))
})
check('no simulator file imports the API layer or Supabase', [], offenders)
const usesNetwork = files.filter((f) => /\b(fetch|XMLHttpRequest|navigator\.sendBeacon)\s*\(/.test(readFileSync(f, 'utf8')))
check('no simulator file makes a network call', [], usesNetwork)
const writesStorage = files.filter((f) => /localStorage|sessionStorage|indexedDB/.test(readFileSync(f, 'utf8')))
check('no simulator file persists anything', [], writesStorage)
console.log(`        (${files.length} simulator files scanned)`)

console.log(`\n${pass}/${pass + fail} passed`)
if (fail) process.exit(1)
