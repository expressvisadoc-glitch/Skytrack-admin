# SkyTrack — Product Overview

**Workforce attendance, leave and payroll for a single-office organisation.**

SkyTrack replaces paper registers, spreadsheet timesheets and end-of-month payroll guesswork with one system:
employees clock in from their phone only when they are physically at the office, managers approve leave against
real balances, and the month's salary is calculated continuously from the attendance that actually happened.

Built by Skypass Visa Services. Android app for employees, web portal for employees and administrators,
Supabase/PostgreSQL backend.

---

## Who it is for

Organisations of roughly 5–200 staff working from one office location, who need:

- attendance they can trust enough to pay against,
- a leave process with real balances rather than informal approvals,
- a defensible monthly payroll figure that an employee can see for themselves.

It suits companies that currently run attendance in a spreadsheet and settle payroll by hand at month end.

---

## What it does

### 1. Attendance and time tracking

- **Punch clock on the phone and in the browser.** Check in, take a break, resume work, check out. The Android
  home screen and the web employee portal show the same circular clock, live elapsed work timer and current state.
- **Four clear states** — Not checked in, Working, On break, Checked out — with the backend as the single source
  of truth. Close the app, restart the phone, switch to the web portal: the state you see is the state the server
  holds.
- **Break timers survive everything.** Breaks persist across app restarts and device reboots; working hours stop
  accumulating while a break runs.
- **Net hours are computed, not typed.** `net = (check-out − check-in) − total break time`, calculated on the
  server from its own clock.
- **Admins can correct the record.** Manual entry and editing of check-in/check-out times, and a one-click undo
  for an accidental checkout that restores working status without losing earlier timestamps.
- **A full monthly view** per employee: calendar, daily punches, totals, and an audit log of every punch event.

### 2. Location verification (geofencing)

Attendance is only accepted from inside the office.

- **Office location, radius and policy are set by an administrator** on a map — no code changes, no redeploy.
- **The server decides, not the phone.** The app shows friendly in-app guidance ("you are 40 m away"), but every
  check-in and check-out is re-validated server-side against the current settings inside a single transaction.
  A client cannot assert that it is inside.
- **Quality checks, not just distance.** A fix is rejected if it is too imprecise (accuracy worse than the
  configured limit), too old (stale beyond the configured age), timestamped in the future, or at invalid
  coordinates.
- **Breaks are deliberately not geofence-restricted** — employees are not blocked from pausing work because they
  stepped outside. Check-in and check-out are.
- **Every attempt is recorded** — accepted or rejected — with coordinates, accuracy, distance, outcome, reason
  code and the geofence settings in force at that moment. This is the audit trail that makes attendance
  defensible.
- **Maps with no API key or billing**, using OpenStreetMap on both the admin page and the Android home screen.

### 3. Leave management

- **Three leave types**: Casual, Sick and Loss of Pay (LOP).
- **Balances are enforced.** Employees apply from the app or portal; leave types with a zero balance are
  disabled in the request dialog.
- **Approval splits paid from unpaid automatically.** If someone with one casual day left applies for two days,
  approval records one paid day and one LOP day — and payroll deducts exactly one day.
- **Half-day leave** is supported and counts as 0.5.
- **Managers approve or reject with comments**, and employees can cancel a pending request.
- **Reporting managers are resolved dynamically**, so the app always shows the real assigned manager.

### 4. Holiday calendar

- Statutory gazetted holidays and company-declared holidays in one calendar, maintained by administrators.
- Add, edit or delete any holiday; regional branch associations supported; CSV export.
- Published holidays automatically become non-working days for both attendance and payroll.

### 5. Payroll and salary

The part that turns attendance into money.

- **Per-employee monthly salary**, effective-dated. A pay change is a new record from a chosen date; history is
  never edited or deleted, so every past month stays reproducible.
- **Working days are derived, never hardcoded**: days in the month − configured week-off days − published
  holidays. October 2026, for example: 31 days − 4 Sundays − 3 holidays = 24 working days.
- **Per-day rate** = monthly salary ÷ that month's working days.
- **Deductions calculated automatically**:
  - *Unapproved absence* — a completed working day with no check-in and no approved leave = one day's pay.
  - *Unpaid (LOP) leave* — the unpaid portion of approved leave, placed on the correct dates.
  - *Late arrivals* — see below.
- **Two late-arrival policies, chosen by the administrator:**

  | Option | Rule |
  | :--- | :--- |
  | **Late marks** | Every *n* late arrivals cost a fraction of a day (default: 2 marks = half a day). Only complete groups count. |
  | **Per minute** | Every minute after the shift start is deducted. A minute is worth either its share of the day's pay (per-day rate ÷ shift length) or a flat amount you set. Optional daily cap; a day is never deducted more than that day's own pay. |

- **Live salary, visible to the employee.** A "This month's salary" card on the Android home screen and the web
  portal — hidden behind an eye icon, never cached on the device — showing gross, working days, each deduction in
  days and rupees, and the expected net. It updates on the next refresh after any punch, leave change or
  correction. Employees see what their lateness actually costs, the day it happens.
- **Nothing is retroactively re-priced.** The shift start, grace period and shift length used to judge a late
  arrival are frozen on the day it happens. Changing a shift, a grace period or the penalty option affects future
  days and open months — never a month you have already closed.
- **Month close** — an administrator locks a finished month. Payslips are frozen and versioned. While a month is
  locked, the database itself refuses attendance edits, leave approvals, holiday changes and backdated salary
  changes that would alter it. Reopening requires a written reason and is logged; relocking issues a new payslip
  version and keeps the old one for audit.
- **Payslip PDFs on the company letterhead** with employee details, working and paid days, gross, itemised
  deductions and net pay — downloadable by the employee from the app or portal, and by the administrator for
  anyone. **CSV export** of the whole month for the accountant.

### 6. Notifications

- **Push notifications and an in-app inbox** for employees: shift reminders, not-checked-in alerts, absence
  notices, late-arrival warnings, break-overrun reminders, missed-checkout prompts, leave decisions, holiday
  announcements, payslip availability and salary changes.
- **Administrator alerts** in the web notification panel: leave requests awaiting approval, daily not-checked-in
  digests, suspicious location activity and payroll setup warnings.
- **23 notification types** are implemented and firing.
- **Employees can turn phone notifications off** with a single switch in their profile.

### 7. Administration

- **Command centre dashboard** — live workforce metrics, who is in, who is on break, today's roster.
- **Attendance ledger** with a real-time punch feed and audit panel.
- **Employee directory** — add, edit, deactivate; department, designation, work shift and reporting manager.
- **Work shifts** with start/end times and working minutes.
- **Four roles** — employee, manager, admin, super admin — with clear separation. Only super admins can reset
  another employee's password or alter another super admin's record.
- **Settings pages** for office geofence, payroll policy (week-offs, grace, late penalty, allowed break length,
  office timezone) and the administrator's own credentials. Every settings change is written to a history table
  with who changed it and when.

### 8. Employee self-service

Identical capability on Android and in the browser: punch clock, monthly calendar and hours, leave balances and
applications, holiday list, payslips, salary card, profile and password change. An employee who forgets their
phone can do everything from a desktop browser.

---

## Representative use cases

**Daily attendance for an office team.** Staff arrive, open the app, check in. Anyone outside the office radius
is refused with a clear reason. The manager sees the roster fill in live.

**Settling an attendance dispute.** An employee says they were at work on the 12th. The administrator opens the
location audit trail and sees every attempt that day — accepted or rejected — with distance and reason.

**Month-end payroll.** On the 1st, the administrator opens the Payroll page for last month: every employee's
working days, absences, LOP leave, late deductions and net pay, with flags for anyone missing a salary or shift.
They export the CSV for the accountant, lock the month, and payslips are issued.

**Correcting a genuine mistake after close.** An employee forgot to check in on the 20th but was present. The
administrator reopens the month with a reason, enters the attendance, and relocks — producing payslip version 2
while version 1 remains on file.

**Changing policy without touching code.** Management decides lateness should cost by the minute instead of in
half-day blocks. An administrator switches the option on the Payroll Settings page. The current open month
re-prices on the next calculation; closed months keep their payslips.

**Reducing chronic lateness.** Employees can see, the same day, that arriving 25 minutes late cost them a
specific amount. The deduction stops being an end-of-month surprise.

---

## Platform and technical capabilities

| | |
| :--- | :--- |
| **Android app** | Kotlin, Jetpack Compose, Material 3. Android 8.0+ (minSdk 26). GPS geofencing, persistent break timers, offline action queueing, in-app PDF viewer, biometric sign-in, in-app update checks. |
| **Web application** | React 19 + TypeScript, Tailwind CSS. Dual portal — admin command centre and employee portal — from one build, with light and dark themes. |
| **Backend** | Supabase: PostgreSQL with Row Level Security, plus a single Edge Function exposing **59 actions** through one authenticated endpoint. |
| **Calculations** | Payroll is one SQL function used by the employee card, the admin view and the payslip, so all three can never disagree. |
| **Times and dates** | Stored in UTC, displayed in each viewer's local time, interpreted against a configurable office timezone. |
| **Documents** | Payslip and timesheet PDFs generated on the company letterhead; CSV exports for payroll and holidays. |
| **Deployment** | Cloudflare for the web portal; Supabase Cloud for the backend. Separate staging environment that never touches production data. |

---

## Security and data integrity

- **Row Level Security on every table.** Employees can read only their own attendance, leave, salary and
  payslips. Administrators read across the organisation. No client writes HR tables directly — every change goes
  through the Edge Function under a service role, which is where authorisation is enforced.
- **Server-side time and position.** Client clocks and client claims about location are never trusted for a
  stored value.
- **Audit trails** on attendance punches, location attempts, payroll settings, salary changes, and every month
  lock and reopen with its reason and author.
- **Append-only financial history.** Salary records and payslips are never edited or deleted; corrections create
  new versions.
- **Protected deletion.** An employee with payslips or attendance in a locked month cannot be deleted, only
  deactivated.
- **Password policy** with a strength requirement and full session invalidation on change.

---

## Release status

| Capability | Status |
| :--- | :--- |
| Attendance, breaks, leave, holidays, employee and admin portals | **Live in production** |
| Geofenced check-in, payroll, payslips, push notifications | **Complete and tested on staging**, on the `production` branch, awaiting rollout |
| Device-bound check-in (anti-proxy-attendance) | **Built, not released**, disabled by default |
| Multi-organisation subscription platform | **Planned** |
| Monthly archive to Google Sheets | **Planned** |

Rolling out the second row requires deploying the backend function, applying seven database migrations and
publishing the apps — in that order. Two items must be settled first: registering the production app for push
notifications, and strengthening mock-location detection before the geofence is relied on as a control rather
than a deterrent.

---

## Deliberate limits

Stated plainly, because they are design decisions rather than gaps:

- **One office.** A single geofenced location; no multi-branch or multi-site logic yet.
- **No statutory deductions.** PF, ESI, professional tax and TDS are out of scope — SkyTrack produces gross,
  deductions for attendance, and net. It is not a tax engine.
- **No bank payment files.**
- **No short-hours rule.** Leaving early is not deducted; only absence, unpaid leave and lateness are.
- **No missed-checkout penalty.** An open day is auto-closed rather than docked.
- **Late marks cannot be waived individually.** The policy applies uniformly.
- **Foreground location only.** The app never tracks anyone in the background — location is read at the moment
  of a punch and at no other time.

---

*Technical architecture: `PROJECT_CONTEXT.md`. Payroll rules and decision log: `docs/PAYROLL_PLAN.md`.
Quality assurance: `docs/SKYTRACK_QA_REPORT.md`.*
