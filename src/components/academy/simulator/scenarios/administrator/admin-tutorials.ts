import type { TutorialDefinition, TutorialStep } from '../../engine/types'

/**
 * Administrator walkthroughs, all run in the simulated admin portal as Priya Nair (DEMO-003).
 * Each follows the numbered steps of the article it belongs to, against fictional demo data.
 */

const intro = (detail: string): TutorialStep => ({
  id: 'intro',
  action: 'explain',
  instruction: 'This is a simulated SkyTrack',
  detail: `Everything here is made up — a demo organisation with invented people. Nothing you select changes a real record. ${detail}`,
  screen: 'dashboard',
  placement: 'center',
})

const done = (screen: string, detail: string): TutorialStep => ({
  id: 'done', action: 'complete', instruction: 'That is the whole task', detail, screen, placement: 'center',
})

// --- Correcting a missed check-in ---------------------------------------------------------------
export const fixAttendanceTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.fix-attendance',
  title: 'Correct a missed check-in',
  description: 'Enter attendance for someone whose check-in was refused, and remove the absence it caused.',
  role: 'admin',
  articleId: 'administrator.attendance.manual',
  mock: 'admin',
  initialScreen: 'dashboard',
  steps: [
    intro('Imran Shaikh was at work on 11 November, but his phone could not prove it and the check-in was refused.'),
    { id: 'open_attendance', target: 'nav_attendance', action: 'click', screen: 'dashboard', placement: 'right',
      instruction: 'Open Attendance', detail: 'Every check-in, break and check-out is recorded here, one row per person per day.' },
    { id: 'open_record', target: 'attendance_row_a6', action: 'click', screen: 'attendance', placement: 'top',
      instruction: "Open Imran's record for 11 November", detail: 'It shows no check-in at all — only the refusal.' },
    { id: 'read_absence', target: 'attendance_absent_note', action: 'inspect', screen: 'attendance_edit', placement: 'bottom',
      instruction: 'Why this matters', detail: 'Left alone, payroll treats the day as an absence and deducts a full day. Only correct it if you know he was actually there.' },
    { id: 'enter_checkin', target: 'checkin_time', action: 'input', screen: 'attendance_edit', placement: 'bottom', sampleInput: '09:04',
      instruction: 'Enter the check-in time', detail: 'Use your own local time — SkyTrack converts it. Ask the person, or check the door log.' },
    { id: 'enter_checkout', target: 'checkout_time', action: 'input', screen: 'attendance_edit', placement: 'bottom', sampleInput: '18:10',
      instruction: 'Enter the check-out time', detail: 'Without a check-out the day has no total hours.' },
    { id: 'save', target: 'save_attendance', action: 'confirm', screen: 'attendance_edit', placement: 'top',
      instruction: 'Save the attendance', detail: 'The record is stamped with your name, so anyone reviewing it later can see who entered it.',
      effect: { type: 'attendance.fix', payload: { attendanceId: 'a6', by: 'Priya Nair' } } },
    { id: 'result', target: 'attendance_result', action: 'inspect', screen: 'attendance_edit', placement: 'top',
      instruction: 'The absence is gone', detail: 'He is present for the day, and the next payroll calculation no longer deducts it.' },
    done('attendance_edit', 'If the month were already locked, saving would be refused until an administrator reopened it.'),
  ],
  completion: {
    message: 'Attendance corrected in demo mode — no real record was touched.',
    points: [
      'A refused or forgotten check-in becomes an absence, and an absence costs a full day.',
      'Enter times in your own local time.',
      'Corrections carry your name — only enter what you can vouch for.',
      'A locked month refuses corrections until it is reopened.',
    ],
  },
}

// --- Adding an employee -------------------------------------------------------------------------
export const addEmployeeTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.add-employee',
  title: 'Add a new employee',
  description: 'Create an employee with the shift and joining date that attendance and payroll depend on.',
  role: 'admin',
  articleId: 'administrator.employees.add',
  mock: 'admin',
  initialScreen: 'dashboard',
  steps: [
    intro('A new consultant starts on Monday. You will add her so she can sign in on day one.'),
    { id: 'open_employees', target: 'nav_employees', action: 'click', screen: 'dashboard', placement: 'right',
      instruction: 'Open Employees', detail: 'Everyone who can sign in to SkyTrack is listed here.' },
    { id: 'add', target: 'add_employee_button', action: 'click', screen: 'employees', placement: 'bottom',
      instruction: 'Select Add employee' },
    { id: 'name', target: 'emp_name', action: 'input', screen: 'employee_new', placement: 'bottom', sampleInput: 'Meera Pillai',
      instruction: 'Enter her full name', detail: 'As it should appear on payslips.' },
    { id: 'department', target: 'emp_department', action: 'select', screen: 'employee_new', placement: 'bottom',
      instruction: 'Choose her department', detail: 'Reports and filters group people by department.' },
    { id: 'shift', target: 'emp_shift', action: 'select', screen: 'employee_new', placement: 'top',
      expectedValue: 'General Shift (10:00 - 19:00)',
      instruction: 'Assign the General Shift', detail: 'The shift sets her expected start time. Late minutes — and the late deduction — are measured against it.' },
    { id: 'joining', target: 'emp_joining_date', action: 'input', screen: 'employee_new', placement: 'top', sampleInput: '2026-11-16',
      instruction: 'Set the joining date', detail: 'Payroll does not count days before it. Leave it empty and her first month is counted in full — as absences.' },
    { id: 'role', target: 'emp_role_field', action: 'inspect', screen: 'employee_new', placement: 'top',
      instruction: 'Check the role and manager', detail: 'Employee is right for almost everyone. The reporting manager is who she reports to.' },
    { id: 'save', target: 'save_employee', action: 'confirm', screen: 'employee_new', placement: 'top',
      instruction: 'Save the employee', effect: { type: 'employee.add' } },
    { id: 'result', target: 'employee_result', action: 'inspect', screen: 'employee_new', placement: 'top',
      instruction: 'She has an employee ID', detail: 'Give her the ID and a first password. Her salary is not set yet — that is a separate step, and payroll flags her until it is done.' },
    done('employee_new', 'Next: set her salary, or payroll cannot produce a payslip for her.'),
  ],
  completion: {
    message: 'Employee added in demo mode — no real record was created.',
    points: [
      'The shift decides when she counts as late.',
      'The joining date decides which days payroll counts.',
      'Salary is set separately, from the Salary tab.',
      'Keep the role as Employee unless they truly need admin access.',
    ],
  },
}

// --- Office geofence ----------------------------------------------------------------------------
export const geofenceTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.geofence',
  title: 'Set up the office geofence',
  description: 'Adjust the radius and accuracy that decide whether a check-in is accepted.',
  role: 'admin',
  articleId: 'administrator.geofence.configure',
  mock: 'admin',
  initialScreen: 'dashboard',
  steps: [
    intro('People at the far end of the building are being refused. You will widen the zone a little.'),
    { id: 'open', target: 'nav_geofence', action: 'click', screen: 'dashboard', placement: 'right',
      instruction: 'Open Office Geofence', detail: 'Check-ins are only accepted inside the zone set here.' },
    { id: 'map', target: 'geofence_map', action: 'inspect', screen: 'geofence', placement: 'bottom',
      instruction: 'The office pin and its zone', detail: 'The circle is the radius around the pin. You can set the pin by coordinates, a map link, or by moving it.' },
    { id: 'radius', target: 'geofence_radius', action: 'input', screen: 'geofence', placement: 'bottom', sampleInput: '40',
      instruction: 'Set the radius in metres', detail: 'Large enough to cover the whole building, small enough to mean something. 30–60 m suits most offices.' },
    { id: 'accuracy', target: 'geofence_accuracy', action: 'select', screen: 'geofence', placement: 'top', expectedValue: '50',
      instruction: 'Keep the accuracy limit at ±50 m', detail: 'A reading less precise than this is refused. Stricter rejects good phones indoors; looser lets a vague reading from down the road through.' },
    { id: 'warning', target: 'geofence_warning', action: 'inspect', screen: 'geofence', placement: 'top',
      instruction: 'Read this before saving', detail: 'A wrong pin locks the whole office out on the next check-in.' },
    { id: 'save', target: 'save_geofence', action: 'confirm', screen: 'geofence', placement: 'top',
      instruction: 'Save the settings', effect: { type: 'geofence.save', payload: { by: 'Priya Nair' } } },
    { id: 'history', target: 'geofence_history', action: 'inspect', screen: 'geofence', placement: 'top',
      instruction: 'Every change is recorded', detail: 'If check-ins start failing, this shows what changed and who changed it.' },
    done('geofence', 'After a change, ask one person to check in and confirm it works.'),
  ],
  completion: {
    message: 'Geofence changed in demo mode — the real office zone is untouched.',
    points: [
      'The radius must cover the whole building.',
      '±50 m accuracy is a sensible default.',
      'A change applies to the very next check-in.',
      'The history shows who changed what.',
    ],
  },
}

// --- Setting a salary ---------------------------------------------------------------------------
export const setSalaryTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.set-salary',
  title: 'Set an employee’s salary',
  description: 'Give an employee a monthly gross from the right date, so payroll can pay them.',
  role: 'admin',
  articleId: 'payroll.salary.set',
  mock: 'admin',
  initialScreen: 'dashboard',
  steps: [
    intro('Imran Shaikh joined on 12 October and still has no salary, so October payroll cannot pay him.'),
    { id: 'open_employees', target: 'nav_employees', action: 'click', screen: 'dashboard', placement: 'right',
      instruction: 'Open Employees' },
    { id: 'open_imran', target: 'employee_row_DEMO-005', action: 'click', screen: 'employees', placement: 'top',
      instruction: 'Select Imran Shaikh', detail: 'The No salary tag marks people payroll cannot pay.' },
    { id: 'salary_tab', target: 'salary_tab', action: 'click', screen: 'employee_detail', placement: 'bottom',
      instruction: 'Open the Salary tab' },
    { id: 'status', target: 'salary_status', action: 'inspect', screen: 'employee_salary', placement: 'bottom',
      instruction: 'No salary yet', detail: 'Until one exists, he has no figure and no payslip.' },
    { id: 'amount', target: 'salary_amount', action: 'input', screen: 'employee_salary', placement: 'bottom', sampleInput: '24000',
      instruction: 'Enter the monthly gross', detail: 'The full monthly amount before deductions. Per-day and per-minute rates are worked out from it.' },
    { id: 'hint', target: 'salary_effective_hint', action: 'inspect', screen: 'employee_salary', placement: 'top',
      instruction: 'The date matters more than it looks', detail: 'Days before the effective date have no salary behind them.' },
    { id: 'effective', target: 'salary_effective_from', action: 'input', screen: 'employee_salary', placement: 'top', sampleInput: '2026-10-12',
      instruction: 'Set Effective from to his joining date', detail: 'For a new joiner, that is the day they started.' },
    { id: 'save', target: 'save_salary', action: 'confirm', screen: 'employee_salary', placement: 'top',
      instruction: 'Save the salary', effect: { type: 'salary.set', payload: { employeeId: 'DEMO-005', by: 'Priya Nair' } } },
    { id: 'history', target: 'salary_history', action: 'inspect', screen: 'employee_salary', placement: 'top',
      instruction: 'A new record, not an edit', detail: 'A raise later is another record from its own date, so past months keep the salary they were paid on.' },
    done('employee_salary', 'Payroll for October can now include him — as long as the month is not locked yet.'),
  ],
  completion: {
    message: 'Salary set in demo mode — no real salary was changed.',
    points: [
      'Enter the monthly gross, before deductions.',
      'Effective from decides which days are paid.',
      'Changes are new records from a date; history is never rewritten.',
      'Set salaries before locking the month.',
    ],
  },
}

// --- Month end ----------------------------------------------------------------------------------
export const monthEndTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.month-end',
  title: 'Close the month and issue payslips',
  description: 'Review October payroll, then lock it so payslips are issued and the figures freeze.',
  role: 'admin',
  articleId: 'payroll.month.lock',
  mock: 'admin',
  initialScreen: 'dashboard',
  steps: [
    intro('October has ended. Your job is to check the figures, then close the month.'),
    { id: 'open', target: 'nav_payroll', action: 'click', screen: 'dashboard', placement: 'right',
      instruction: 'Open Payroll', detail: 'The current month is calculated live until it is locked.' },
    { id: 'flag', target: 'payroll_flag_row', action: 'inspect', screen: 'payroll', placement: 'bottom',
      instruction: 'Look for flagged rows first', detail: 'Imran has no salary. Locking now skips him — he gets no payslip. Normally you would set his salary first.' },
    { id: 'totals', target: 'payroll_totals', action: 'inspect', screen: 'payroll', placement: 'top',
      instruction: 'Review the totals one last time', detail: 'Pending leave, missing check-ins and unset salaries all change these figures. After locking, they cannot.' },
    { id: 'lock', target: 'lock_month_button', action: 'click', screen: 'payroll', placement: 'bottom',
      instruction: 'Select Lock month', effect: { type: 'ui.set', payload: { key: 'lockDialog', value: true } } },
    { id: 'confirm', target: 'confirm_lock', action: 'confirm', screen: 'payroll', placement: 'bottom',
      instruction: 'Confirm the lock', detail: 'This issues payslips and freezes October.',
      effect: { type: 'payroll.lock' } },
    { id: 'locked', target: 'payroll_locked_banner', action: 'inspect', screen: 'payroll', placement: 'bottom',
      instruction: 'October is closed', detail: 'Payslips are issued, and anyone who was skipped is listed. A correction now needs the month reopened with a reason — which creates a new version.' },
    done('payroll', 'Restart if you want to look at the review steps again.'),
  ],
  completion: {
    message: 'Month locked in demo mode — no real payroll was closed.',
    points: [
      'Resolve flagged rows before locking.',
      'Locking issues payslips and freezes the month.',
      'Anyone without a salary is skipped.',
      'Reopening needs a reason and creates a new version.',
    ],
  },
}
