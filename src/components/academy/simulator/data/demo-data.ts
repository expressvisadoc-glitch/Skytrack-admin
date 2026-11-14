/**
 * SkyTrack Demo Organisation — fictional data for the tutorial simulator.
 *
 * Entirely invented. It never touches Supabase, the Edge Function or any real record, and it is
 * held in memory only: every run starts from this snapshot, so two learners cannot affect each
 * other and nothing survives a refresh.
 */

export interface DemoEmployee {
  id: string
  employeeId: string
  name: string
  role: 'employee' | 'manager' | 'admin' | 'super_admin'
  department: string
  designation: string
  shift: string
  reportingManager: string | null
  joiningDate: string | null
  status: 'active' | 'inactive'
  monthlyGross: number | null
  leaveBalance: { casual: number; sick: number }
}

export interface DemoLeave {
  id: string
  employeeId: string
  employeeName: string
  type: 'casual' | 'sick' | 'lop'
  fromDate: string
  toDate: string
  days: number
  halfDay: boolean
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  paidDays: number | null
  lopDays: number | null
  managerComment: string | null
  balanceAtRequest: number
}

export interface DemoAttendance {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string | null
  checkOut: string | null
  breakMinutes: number
  status: 'present' | 'late' | 'absent' | 'working' | 'on_break'
  lateMinutes: number
  note?: string
}

export interface DemoPayrollRow {
  employeeId: string
  name: string
  monthlyGross: number | null
  workingDays: number
  absenceDays: number
  lopLeaveDays: number
  lateDays: number
  lateMinutes: number
  deductions: number
  netPay: number | null
  flags: string[]
}

export interface DemoPayslip {
  payslipNumber: string
  employeeId: string
  name: string
  month: string
  version: number
  workingDays: number
  paidDays: number
  monthlyGross: number
  absenceAmount: number
  lopLeaveAmount: number
  lateAmount: number
  totalDeductions: number
  netPay: number
}

/** Ananya's own day, as the employee app shows it */
export interface DemoMyDay {
  status: 'not_checked_in' | 'working' | 'on_break' | 'checked_out'
  checkIn: string | null
  checkOut: string | null
  breakMinutes: number
  breakStartedAt: string | null
  totalHours: string | null
  /** Distance from the office pin when the app last read the location */
  distanceMeters: number
}

export interface DemoMonthDay {
  date: string
  day: number
  weekday: string
  kind: 'worked' | 'late' | 'week_off' | 'holiday' | 'future' | 'today'
  checkIn?: string
  checkOut?: string
  breakMinutes?: number
  lateMinutes?: number
  total?: string
}

/** Ananya's provisional salary for the current month (per-minute late option) */
export interface DemoMySalary {
  month: string
  monthlyGross: number
  workingDays: number
  perDayRate: number
  perMinuteRate: number
  absenceDays: number
  lopLeaveDays: number
  lateMinutes: number
  lateAmount: number
  netPay: number
  days: { date: string; type: 'late' | 'absent' | 'lop_leave'; minutes?: number; amount: number }[]
}

export interface DemoState {
  employees: DemoEmployee[]
  leaves: DemoLeave[]
  attendance: DemoAttendance[]
  /** The month being worked on — still open, so figures can change */
  payroll: { month: string; locked: boolean; version: number; rows: DemoPayrollRow[]; skipped?: string[] }
  salaryHistory: { employeeId: string; amount: number; effectiveFrom: string; by: string; at: string }[]
  geofence: {
    officeName: string
    latitude: number
    longitude: number
    radius: number
    accuracy: number
    maxAgeSeconds: number
    active: boolean
    history: { at: string; by: string; radius: number; accuracy: number }[]
  }
  /** The signed-in employee (Ananya) in the employee app */
  me: DemoMyDay
  myMonth: DemoMonthDay[]
  mySalary: DemoMySalary
  /** Open dialogs, tabs, revealed cards — whatever the mock needs to remember for one run */
  ui: Record<string, unknown>
  /** A month already closed, with the payslip it issued */
  closedMonth: { month: string; locked: true; version: number; lockedBy: string; lockedAt: string }
  payslips: DemoPayslip[]
}

/** The four demo identities. Fictional people in a fictional company. */
export const DEMO_IDENTITIES = {
  employee: { employeeId: 'DEMO-001', name: 'Ananya Kumar' },
  manager: { employeeId: 'DEMO-002', name: 'Rahul Menon' },
  admin: { employeeId: 'DEMO-003', name: 'Priya Nair' },
  super_admin: { employeeId: 'DEMO-004', name: 'Arjun Thomas' },
} as const

function initialState(): DemoState {
  return {
    employees: [
      { id: 'e1', employeeId: 'DEMO-001', name: 'Ananya Kumar', role: 'employee', department: 'Operations',
        designation: 'Visa Consultant', shift: 'General Shift (10:00 - 19:00)', reportingManager: 'Rahul Menon',
        joiningDate: '2026-02-01', status: 'active', monthlyGross: 20000, leaveBalance: { casual: 1, sick: 2 } },
      { id: 'e2', employeeId: 'DEMO-002', name: 'Rahul Menon', role: 'manager', department: 'Operations',
        designation: 'Team Lead', shift: 'General Shift (10:00 - 19:00)', reportingManager: 'Priya Nair',
        joiningDate: '2025-06-15', status: 'active', monthlyGross: 38000, leaveBalance: { casual: 3, sick: 2 } },
      { id: 'e3', employeeId: 'DEMO-003', name: 'Priya Nair', role: 'admin', department: 'Administration',
        designation: 'HR Manager', shift: 'General Shift (10:00 - 19:00)', reportingManager: null,
        joiningDate: '2024-11-04', status: 'active', monthlyGross: 52000, leaveBalance: { casual: 4, sick: 3 } },
      { id: 'e4', employeeId: 'DEMO-004', name: 'Arjun Thomas', role: 'super_admin', department: 'Administration',
        designation: 'Director', shift: 'General Shift (10:00 - 19:00)', reportingManager: null,
        joiningDate: '2024-01-02', status: 'active', monthlyGross: 90000, leaveBalance: { casual: 6, sick: 4 } },
      // An employee with no manager assigned, and one who has left — both are states admins meet.
      { id: 'e5', employeeId: 'DEMO-005', name: 'Imran Shaikh', role: 'employee', department: 'Sales',
        designation: 'Sales Executive', shift: 'Morning Shift (09:00 - 18:00)', reportingManager: null,
        joiningDate: '2026-10-12', status: 'active', monthlyGross: null, leaveBalance: { casual: 2, sick: 2 } },
      { id: 'e6', employeeId: 'DEMO-006', name: 'Fatima Noor', role: 'employee', department: 'Operations',
        designation: 'Visa Consultant', shift: 'General Shift (10:00 - 19:00)', reportingManager: 'Rahul Menon',
        joiningDate: '2025-03-01', status: 'inactive', monthlyGross: 22000, leaveBalance: { casual: 0, sick: 0 } },
    ],

    leaves: [
      // The one the first tutorial decides: 2 days against a 1-day balance, so it must split.
      { id: 'l1', employeeId: 'DEMO-001', employeeName: 'Ananya Kumar', type: 'casual',
        fromDate: '2026-11-19', toDate: '2026-11-20', days: 2, halfDay: false,
        reason: 'Family function out of town', status: 'pending', paidDays: null, lopDays: null,
        managerComment: null, balanceAtRequest: 1 },
      { id: 'l2', employeeId: 'DEMO-005', employeeName: 'Imran Shaikh', type: 'sick',
        fromDate: '2026-11-24', toDate: '2026-11-24', days: 0.5, halfDay: true,
        reason: 'Dentist appointment', status: 'pending', paidDays: null, lopDays: null,
        managerComment: null, balanceAtRequest: 2 },
      { id: 'l3', employeeId: 'DEMO-002', employeeName: 'Rahul Menon', type: 'casual',
        fromDate: '2026-11-06', toDate: '2026-11-06', days: 1, halfDay: false,
        reason: 'Personal work', status: 'approved', paidDays: 1, lopDays: 0,
        managerComment: 'Approved. Please hand over to Ananya.', balanceAtRequest: 4 },
      { id: 'l4', employeeId: 'DEMO-006', employeeName: 'Fatima Noor', type: 'lop',
        fromDate: '2026-10-28', toDate: '2026-10-30', days: 3, halfDay: false,
        reason: 'Extended personal leave', status: 'rejected', paidDays: 0, lopDays: 0,
        managerComment: 'Cannot spare three days during month end.', balanceAtRequest: 0 },
      { id: 'l5', employeeId: 'DEMO-001', employeeName: 'Ananya Kumar', type: 'casual',
        fromDate: '2026-10-09', toDate: '2026-10-09', days: 1, halfDay: false,
        reason: 'Changed my mind', status: 'cancelled', paidDays: null, lopDays: null,
        managerComment: null, balanceAtRequest: 2 },
    ],

    attendance: [
      { id: 'a1', employeeId: 'DEMO-001', employeeName: 'Ananya Kumar', date: '2026-11-13',
        checkIn: '09:52', checkOut: '19:04', breakMinutes: 45, status: 'present', lateMinutes: 0 },
      { id: 'a2', employeeId: 'DEMO-001', employeeName: 'Ananya Kumar', date: '2026-11-12',
        checkIn: '10:27', checkOut: '19:10', breakMinutes: 30, status: 'late', lateMinutes: 27 },
      { id: 'a3', employeeId: 'DEMO-002', employeeName: 'Rahul Menon', date: '2026-11-13',
        checkIn: '09:48', checkOut: null, breakMinutes: 0, status: 'working', lateMinutes: 0 },
      { id: 'a4', employeeId: 'DEMO-005', employeeName: 'Imran Shaikh', date: '2026-11-13',
        checkIn: '09:05', checkOut: null, breakMinutes: 20, status: 'on_break', lateMinutes: 5 },
      { id: 'a5', employeeId: 'DEMO-006', employeeName: 'Fatima Noor', date: '2026-11-13',
        checkIn: null, checkOut: null, breakMinutes: 0, status: 'absent', lateMinutes: 0,
        note: 'No check-in and no approved leave' },
      { id: 'a6', employeeId: 'DEMO-005', employeeName: 'Imran Shaikh', date: '2026-11-11',
        checkIn: null, checkOut: null, breakMinutes: 0, status: 'absent', lateMinutes: 0,
        note: 'Check-in refused — outside the office geofence' },
    ],

    closedMonth: {
      month: '2026-09', locked: true, version: 1,
      lockedBy: 'Priya Nair', lockedAt: '2026-10-01',
    },

    payslips: [
      // Issued when September was locked. Frozen: reopening would produce version 2, not edit this.
      { payslipNumber: 'PS-2026-09-0001', employeeId: 'DEMO-001', name: 'Ananya Kumar', month: '2026-09',
        version: 1, workingDays: 26, paidDays: 25, monthlyGross: 20000,
        absenceAmount: 769.23, lopLeaveAmount: 0, lateAmount: 0,
        totalDeductions: 769.23, netPay: 19231 },
      { payslipNumber: 'PS-2026-09-0002', employeeId: 'DEMO-002', name: 'Rahul Menon', month: '2026-09',
        version: 1, workingDays: 26, paidDays: 26, monthlyGross: 38000,
        absenceAmount: 0, lopLeaveAmount: 0, lateAmount: 0,
        totalDeductions: 0, netPay: 38000 },
    ],

    salaryHistory: [
      { employeeId: 'DEMO-001', amount: 20000, effectiveFrom: '2026-02-01', by: 'Priya Nair', at: '2026-01-28' },
      { employeeId: 'DEMO-002', amount: 38000, effectiveFrom: '2025-06-15', by: 'Arjun Thomas', at: '2025-06-10' },
    ],

    geofence: {
      officeName: 'SkyTrack Demo Office', latitude: 9.9312, longitude: 76.2673,
      radius: 30, accuracy: 50, maxAgeSeconds: 120, active: true,
      history: [{ at: '2 Nov 2026, 10:14', by: 'Priya Nair', radius: 30, accuracy: 50 }],
    },

    me: {
      status: 'not_checked_in', checkIn: null, checkOut: null, breakMinutes: 0,
      breakStartedAt: null, totalHours: null, distanceMeters: 12,
    },

    // November 2026: 30 days - 5 Sundays = 25 working days. Ananya was 27 minutes late on the 12th.
    myMonth: [
      { date: '2026-11-01', day: 1, weekday: 'Sun', kind: 'week_off' },
      { date: '2026-11-02', day: 2, weekday: 'Mon', kind: 'worked', checkIn: '09:52', checkOut: '18:42', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-03', day: 3, weekday: 'Tue', kind: 'worked', checkIn: '09:53', checkOut: '18:43', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-04', day: 4, weekday: 'Wed', kind: 'worked', checkIn: '09:54', checkOut: '18:44', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-05', day: 5, weekday: 'Thu', kind: 'worked', checkIn: '09:55', checkOut: '18:45', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-06', day: 6, weekday: 'Fri', kind: 'worked', checkIn: '09:56', checkOut: '18:46', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-07', day: 7, weekday: 'Sat', kind: 'worked', checkIn: '09:57', checkOut: '18:47', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-08', day: 8, weekday: 'Sun', kind: 'week_off' },
      { date: '2026-11-09', day: 9, weekday: 'Mon', kind: 'worked', checkIn: '09:59', checkOut: '18:49', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-10', day: 10, weekday: 'Tue', kind: 'worked', checkIn: '09:50', checkOut: '18:40', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-11', day: 11, weekday: 'Wed', kind: 'worked', checkIn: '09:51', checkOut: '18:41', breakMinutes: 45, total: '8h 05m' },
      { date: '2026-11-12', day: 12, weekday: 'Thu', kind: 'late', checkIn: '10:27', checkOut: '19:10', breakMinutes: 30, lateMinutes: 27, total: '8h 13m' },
      { date: '2026-11-13', day: 13, weekday: 'Fri', kind: 'today' },
      { date: '2026-11-14', day: 14, weekday: 'Sat', kind: 'future' },
      { date: '2026-11-15', day: 15, weekday: 'Sun', kind: 'week_off' },
      { date: '2026-11-16', day: 16, weekday: 'Mon', kind: 'future' },
      { date: '2026-11-17', day: 17, weekday: 'Tue', kind: 'future' },
      { date: '2026-11-18', day: 18, weekday: 'Wed', kind: 'future' },
      { date: '2026-11-19', day: 19, weekday: 'Thu', kind: 'future' },
      { date: '2026-11-20', day: 20, weekday: 'Fri', kind: 'future' },
      { date: '2026-11-21', day: 21, weekday: 'Sat', kind: 'future' },
      { date: '2026-11-22', day: 22, weekday: 'Sun', kind: 'week_off' },
      { date: '2026-11-23', day: 23, weekday: 'Mon', kind: 'future' },
      { date: '2026-11-24', day: 24, weekday: 'Tue', kind: 'future' },
      { date: '2026-11-25', day: 25, weekday: 'Wed', kind: 'future' },
      { date: '2026-11-26', day: 26, weekday: 'Thu', kind: 'future' },
      { date: '2026-11-27', day: 27, weekday: 'Fri', kind: 'future' },
      { date: '2026-11-28', day: 28, weekday: 'Sat', kind: 'future' },
      { date: '2026-11-29', day: 29, weekday: 'Sun', kind: 'week_off' },
      { date: '2026-11-30', day: 30, weekday: 'Mon', kind: 'future' },
    ],

    // Per-minute late option, pro-rata: 20000 / 25 = 800 a day; 800 / 480 = 1.6667 a minute.
    mySalary: {
      month: 'November 2026', monthlyGross: 20000, workingDays: 25, perDayRate: 800, perMinuteRate: 1.67,
      absenceDays: 0, lopLeaveDays: 0, lateMinutes: 27, lateAmount: 45, netPay: 19955,
      days: [{ date: '2026-11-12', type: 'late', minutes: 27, amount: 45 }],
    },

    ui: {},

    payroll: {
      month: '2026-10', locked: false, version: 0,
      rows: [
        { employeeId: 'DEMO-001', name: 'Ananya Kumar', monthlyGross: 20000, workingDays: 24,
          absenceDays: 1, lopLeaveDays: 1, lateDays: 5, lateMinutes: 152,
          deductions: 1930.56, netPay: 18069, flags: [] },
        { employeeId: 'DEMO-002', name: 'Rahul Menon', monthlyGross: 38000, workingDays: 24,
          absenceDays: 0, lopLeaveDays: 0, lateDays: 1, lateMinutes: 12,
          deductions: 19.79, netPay: 37980, flags: [] },
        { employeeId: 'DEMO-005', name: 'Imran Shaikh', monthlyGross: null, workingDays: 24,
          absenceDays: 2, lopLeaveDays: 0, lateDays: 0, lateMinutes: 0,
          deductions: 0, netPay: null, flags: ['salary_not_set'] },
      ],
    },
  }
}

/** A deep copy, so every tutorial run and every learner starts from the same clean snapshot. */
export function freshDemoState(): DemoState {
  return structuredClone(initialState())
}
