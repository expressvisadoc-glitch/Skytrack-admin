# Payroll & Live Salary — Final Plan

Status: **approved plan, not yet implemented**. Branch: `feature/payroll` (both repos), built on
`feature/office-geofencing`. Development and testing use the **staging** Supabase project
(`npwwwapbbvkvteycxaab`) only — never the production project.

## 1. Goal

- Admins and super admins set each employee's monthly salary.
- Employees see their **current month's expected salary after deductions** (unapproved absences, LOP leave,
  late marks) on the web Home and Android Home, updated after every attendance or leave change.
- Admins review the month, **lock** it, and issue payslips (PDF) and a CSV export.

## 2. Salary rules (decided)

| Rule | Definition |
| :--- | :--- |
| Monthly gross | Set per employee by an admin or super admin; effective from a start date; history kept |
| Working days in the month | Days in month − week-off days − published holidays (from `public_holidays`, each date counted once) |
| Per-day rate | Monthly gross ÷ working days in that month |
| Unapproved absence | A past working day with no check-in and no approved leave = **1 day LOP**. An admin can enter check-in/out via manual attendance (on the employee's request), which removes the deduction. |
| LOP leave | Unpaid days of approved leaves; see §4.3 for how a leave's paid/LOP days are placed on dates |
| Paid leave | No deduction |
| Late mark | Check-in later than the employee's shift start + grace (grace = 0). Precision: whole minutes (10:00:45 is on time, 10:01 is late). |
| Late conversion | Only complete pairs count: `late_lop_days = floor(late_marks ÷ 2) × 0.5` → 2–3 marks = 0.5 day, 4–5 = 1 day, 6–7 = 1.5 days |
| Waiving late marks | Not supported |
| Short working hours | No deduction (no half-day rule) |
| Missed checkout | No deduction |
| Joiners | Paid only for working days on/after `joining_date` |
| Leavers | No leaving date. Working days with no check-in after an employee stops attending are absences (LOP) like any other |
| Statutory / fixed deductions | None |
| Net pay | `per_day_rate × (employed_working_days − absence_days − lop_leave_days − late_lop_days)`, never below 0, rounded to the nearest rupee at the end |

**Example — October 2026, holidays as currently configured (2, 20, 21 Oct):**
31 days − 4 Sundays − 3 holidays = **24 working days**. Gross ₹30,000 → per-day rate ₹1,250.
1 unapproved absence (−₹1,250) + 1 LOP leave day (−₹1,250) + 2 late marks = 0.5 day (−₹625) →
**expected net ₹26,875 (provisional)**. If an admin adds a holiday in October, working days become 23 and every
figure updates automatically.

## 3. Nothing hardcoded

All inputs are read from the database at calculation time and are admin-editable:

| Input | Source |
| :--- | :--- |
| Holidays | `public_holidays` where `status = 'published'` (custom and gazetted alike; duplicate dates counted once) |
| Shift start | The employee's `work_shift_id` → `work_shifts.start_time` |
| Week-off days | `payroll_policy.week_off_days` (currently Sunday) |
| Late grace, late conversion | `payroll_policy.late_grace_minutes` (0), `late_marks_per_unit` (2), `late_lop_days_per_unit` (0.5) |
| Office timezone | `payroll_policy.office_timezone` (`Asia/Kolkata`) — used only to interpret shift start times |
| Salaries | `salary_structures` |

**Shift changes apply to future days only.** A late mark is decided when the employee checks in, using the shift
in effect at that moment, and is stored. It is re-decided only if an admin edits that day's check-in time.
Changing a shift's start time or moving an employee to another shift does not alter past days.

## 4. Dates, time and calculation details

### 4.1. Dates
- All timestamps are stored in UTC (unchanged).
- The day an attendance action belongs to is its **UTC date** — the same as production's `start_work` today.
  For office hours (09:00–20:00 India time) the UTC date always equals the India date. A punch between 00:00 and
  05:30 India time is filed under the previous date, exactly as production already does.
- Screens that currently look up the India date (`attendance_today`, undo checkout, manual attendance defaults,
  monthly summary) switch to the UTC date, which removes the existing 00:00–05:30 IST mismatch.
- Web and Android display every time converted to the device's local time.

### 4.2. Late marks
- At check-in: `late = local_time(check_in, office_timezone) > shift.start_time + grace` (minute precision).
- Stored in a new table `attendance_late_marks` (one row per attendance day: shift id and start time used, grace,
  minutes late, decided at, decided by). The `attendance` table is not restructured.
- The attendance row's existing `status` is also set to `late`, so the admin dashboard's existing "Late Check-in"
  badge starts working. This replaces the hardcoded 09:15 IST rule in admin manual attendance.
- Employees without a shift get no late marks and are flagged on the admin payroll page.

### 4.3. Leave days on dates
`leaves` stores totals (`paid_leave_days`, `lop_days`), not per-date values. To split a leave across dates and
months: walk the leave's working days in date order; the first `paid_leave_days` are paid, the remaining
`lop_days` are LOP. Half-day leaves contribute 0.5. Leave dates falling on week-offs or holidays are not counted.

### 4.4. Provisional figure during the month
- Absences are counted only for **completed** working days (today is not counted until it is over).
- Remaining working days are assumed worked, so the figure is "what you will receive if the rest of the month
  goes as scheduled".
- The card is labelled **provisional** until the month is locked.

## 5. Architecture

```
attendance + attendance_late_marks + leaves + public_holidays + work_shifts + salary_structures + payroll_policy
                                         │
                        compute_payroll(employee, month, as_of)   ← one SQL function, single source of truth
               ┌─────────────────────────┼──────────────────────────────┐
     salary_summary (employee)   admin payroll month view     lock → payslips (frozen snapshot)
```

### 5.1. Database (one migration, applied to staging first)
| Object | Purpose |
| :--- | :--- |
| `payroll_policy` | Single settings row (§3) + `updated_by` / `updated_at`; history table for every change |
| `salary_structures` | `employee_id`, `monthly_gross`, `effective_from`, `created_by`, `created_at`, `note`. New pay = new row; rows are never edited or deleted. The structure in effect on a date is the latest `effective_from` ≤ that date. |
| `attendance_late_marks` | Late decision per attendance day (§4.2) |
| `payroll_runs` | One row per month: `status` (`open` / `locked`), `locked_by`, `locked_at`, `reopened_by`, `reopened_at`, `reopen_reason` |
| `payslips` | Per employee per locked month, **versioned**: full calculation snapshot (jsonb), gross, day counts, net, `version`, `generated_at`. A reopen + relock creates version n+1; old versions are kept. |
| `compute_payroll()` | Pure calculation returning line items and per-day reasons |

- RLS on every table. Employees can `SELECT` only their own salary structures and payslips; admins and super
  admins can `SELECT` all. Writes only via the Edge Function (service role), audited with who and when.
- Mid-month salary change: each day is paid at the per-day rate of the structure in effect on that day.

### 5.2. Edge Function actions (`skytrack-api`, same conventions as existing actions)
| Action | Role | Purpose |
| :--- | :--- | :--- |
| `salary_summary` | Employee (own) | Live provisional figure for a month (default: current) with line items and per-day reasons |
| `payslip_list`, `payslip_get` | Employee (own) / Admin | Locked payslips and their versions |
| `admin_salary_get`, `admin_salary_save` | Admin, Super admin | View history / add a new salary from a date |
| `admin_payroll_policy_get`, `admin_payroll_policy_save` | Admin, Super admin | Payroll settings |
| `admin_payroll_month` | Admin, Super admin | All employees' figures for a month, flags (no salary, no shift) |
| `admin_payroll_lock`, `admin_payroll_reopen` | Admin, Super admin | Close / reopen a month (reopen requires a reason) |

### 5.3. Locked months (recommended approach, approved)
- Locking freezes payslips for that month.
- While a month is locked, any change that would alter its pay is **refused** with a clear error
  (`payroll_month_locked`): admin manual attendance or undo checkout on those dates, leave approval/cancellation
  covering those dates, holiday add/edit/delete on those dates, and salary changes effective inside the month.
- To correct a locked month an admin **reopens** it (reason required, logged), makes the correction, and locks it
  again. Payslips are recalculated and saved as a new version; previous versions remain for audit.

### 5.4. "Live" updates
No new realtime infrastructure. `salary_summary` is recalculated on every request; screens refresh it after
check-in/out, breaks, leave changes and on app/page resume. Salary data is **never stored on the phone** (not in
Room or DataStore) and is not logged.

## 6. Screens

### Employee — web Home and Android Home
- "This month's salary" card, **hidden behind an eye icon** by default (state not persisted).
- When revealed: gross, working days, each deduction (days and ₹), expected net, "Provisional" badge.
- Tap → breakdown listing the dates that were absent, late, or LOP leave.
- "Salary not set yet" if no salary exists.
- Payslips for locked months: web Monthly page and Android Monthly screen, downloadable PDF.

### Admin / Super admin — web
- **Employee Details → Salary**: current gross, history, "Change salary from date…".
- **Payroll Settings** (sidebar): week-off days, late grace, late conversion, office timezone; change history.
- **Payroll** (sidebar): month picker; table of every employee (gross, working days, absences, LOP leave, late
  marks, deductions, net, flags); lock / reopen; payslip PDFs; CSV export.

## 7. Phases

| Phase | Deliverables | Done when |
| :--- | :--- | :--- |
| **0. Foundations** | UTC date consistency in edge function and clients; local-time display audit (web + Android); shift-based late marks at check-in and on admin edits; `payroll_policy` | Existing attendance flows unchanged except the fixed midnight issue; late marks visible on admin dashboard |
| **1. Live salary** | `salary_structures`, `compute_payroll`, `salary_summary`, employee card (web + Android), admin salary editing and payroll month view | Card matches hand-calculated test cases |
| **2. Month close** | `payroll_runs`, `payslips` (versioned), lock/reopen, locked-month guards, payslip PDF, CSV export | A month can be locked, reopened, corrected and relocked with versioned payslips |

## 8. Testing

- **Staging only** (`npwwwapbbvkvteycxaab`). Test shifts, holidays, salaries and accounts are created there; the
  production project is not used, not even for reads.
- Calculation tests (local PGlite harness and staging), each compared with a hand calculation:
  joiner mid-month; holiday added mid-month; 0/1/2/3/4/5 late marks; leave spanning two months with partial LOP;
  half-day leave; absence then admin-entered attendance; salary change mid-month; shift change mid-month (past days
  unchanged); no salary; no shift; locked-month edit refused; reopen → version 2.
- Permission tests: employee cannot read another employee's salary or payslip, cannot call admin actions, cannot
  write tables directly through the REST API.
- Regression: geofencing, attendance states, break timers, manual adjustments, checkout undo, leave flows,
  monthly summaries.
- Before relying on it: one month calculated in parallel with the current payroll method.

## 9. Out of scope

Statutory deductions (PF, ESI, PT, TDS), fixed deductions, one-off adjustments/bonuses, leaving dates, waiving
late marks, half-day rules for short hours, multiple branches, bank payment files.

## 10. Decision log

| # | Decision |
| :-- | :--- |
| 1 | Divisor = working days in the month; holidays read from `public_holidays` (published) |
| 2 | 2 late marks = 0.5 day LOP; only complete pairs count |
| 3 | Unapproved absence = 1 day LOP; admins may enter attendance on request |
| 4 | Week-off: Sunday only (stored as a setting) |
| 5 | No statutory or fixed deductions |
| 6 | Visibility: each employee sees own; admins and super admins see all |
| 7 | Hidden behind an eye icon by default |
| 8 | Admins and super admins can edit salaries |
| 9 | UTC everywhere; display in local time |
| 10 | Single branch; no branch logic |
| 11 | Holidays, shifts and rules are dynamic; nothing hardcoded |
| 12 | Late grace 0; no short-hours half day; no deduction for missed checkout |
| 13 | Joiners paid from joining date; no leaving date |
| 14 | No late-mark waivers |
| 15 | Shift changes affect future days only |
| 16 | Month close with lock, reopen (reason, logged), versioned payslips; locked-month edits refused |
| 17 | Built on `feature/office-geofencing`; staging project only |
