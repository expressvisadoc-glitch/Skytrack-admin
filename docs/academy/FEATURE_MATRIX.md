# SkyTrack Academy — Phase 0: Feature Matrix

Every row verified against source and, where relevant, the staging database.
"Production status" means the live deployment: web built from `main`, the production Supabase project
(6 migrations applied), and the released Android app.

**Date:** 14 November 2026 · **Branch audited:** `ddev/tutorial` (= `production` content)

---

## Legend

- **Exists in code** — present on the audited branch.
- **Production status** — Live / On branch only / Built, disabled / Planned.
- **Documentation status** — existing written material an Academy course could draw on.

---

## Core feature matrix

| Feature | Exists in code | Production status | Documentation status |
| :--- | :--- | :--- | :--- |
| **Attendance** (check-in / check-out) | **Yes** — `Attendance.tsx`, `EmployeeHome.tsx`, Android `HomeScreen.kt`; actions `start_work`, `end_work`, `attendance_today`, `attendance_monthly` | **Live** | Partial — architecture in `PROJECT_CONTEXT.md` §3.3; QA evidence in `SKYTRACK_QA_REPORT.md` §14. **No user-facing guide** |
| **Break management** | **Yes** — `start_break`, `resume_work` / `end_break`; persistent timers on Android | **Live** | Partial — QA report §15. **No user guide.** Note: no per-break records exist (`attendance_breaks` is empty) |
| **Leave management** | **Yes** — `LeaveManagement.tsx`, `EmployeeLeaves.tsx`; `leave_submit`, `approve_leave`, `reject_leave`, `cancel_leave`, `leave_balance`, `leave_balance_adjustment` | **Live** | Partial — rules scattered; paid/LOP split documented only in `PAYROLL_PLAN.md` §4.3. **No user guide** |
| **Holiday calendar** | **Yes** — `PublicHolidays.tsx`, `EmployeeHolidays.tsx`; `save_public_holiday`, `delete_public_holiday`, `seed_public_holidays` | **Live** | Thin — a gotcha note in `PROJECT_CONTEXT.md` §5.4 only |
| **Geofencing** | **Yes** — `OfficeGeofence.tsx`, `GeofenceMap.tsx`, `GeofenceEvaluator.kt`; `attendance_action_with_location` | **On branch only** — `OfficeGeofence.tsx` does **not** exist on `main`; migration not applied to production | **Good** — `docs/OFFICE_GEOFENCING.md` + QA report §13 |
| **Payroll** | **Yes** — `Payroll.tsx`, `PayrollSettings.tsx`, `EmployeeSalarySection.tsx`, `SalaryBreakdown.tsx`; `compute_payroll()` | **On branch only** — neither page exists on `main` | **Good** — `docs/PAYROLL_PLAN.md` (rules, decision log, worked example) |
| **Payslips** | **Yes** — `EmployeePayslips.tsx`, `payslipPdf.ts`, Android `PayslipsSection.kt`; `payslip_list`, `payslip_get`, `admin_payslip_get` | **On branch only** — `EmployeePayslips.tsx` not on `main` | Partial — `PAYROLL_PLAN.md` §11 |
| **Notifications** | **Yes** — `notifications` table, 23 types, FCM dispatch, in-app inbox | **On branch only.** The production bell is a *different* component: it shows leave requests + punch feed, not notifications | **Good** — `docs/NOTIFICATIONS.md`. ⚠️ Push cannot work in a production release build (blank Firebase app id) |

---

## Supporting capabilities

| Capability | Exists in code | Production status | Documentation status |
| :--- | :--- | :--- | :--- |
| Employee directory & profiles | Yes — `Employees.tsx`, `EmployeeDetails.tsx` | Live | None |
| Organisation (departments, shifts) | Yes — `Organization.tsx`; `admin_update_work_shift` | Live | None |
| Admin management (super admin only) | Yes — `AdminManagement.tsx` | Live | None |
| Dashboard / live roster | Yes — `Dashboard.tsx` | Live | None |
| Manual attendance & undo checkout | Yes — `admin_manual_attendance`, `admin_undo_checkout` | Live | Mentioned in QA report |
| Monthly overview & timesheet PDF | Yes — `EmployeeMonthly.tsx`, `TimesheetPdfGenerator.kt` | Live | None |
| Password change / reset | Yes — `change_own_password`, `super_admin_change_employee_password` | Live | None |
| Light / dark theme | Yes — `ThemeToggle.tsx` | Live | None |
| Month lock & versioned payslips | Yes — `admin_payroll_lock`, `admin_payroll_reopen` | On branch only | `PAYROLL_PLAN.md` §11 |
| Late-penalty options (marks / per minute) | Yes — `payroll_policy.late_penalty_mode` | On branch only | `PAYROLL_PLAN.md` §14 |
| Location audit trail | Yes — `attendance_location_events` | On branch only | `OFFICE_GEOFENCING.md` |
| Device-bound check-in (anti-proxy) | **Yes, but not on this branch** — stashed WIP on `security/checkIn` | **Built, disabled** — all rules default `off` | `PROJECT_CONTEXT.md` §4.7 |
| Offline action queue (Android) | Yes — `OfflineSyncManager.kt` | On branch only | None; **untested** (QA report §4–8) |
| Biometric sign-in (Android) | Yes — `BiometricSetupDialog.kt` | On branch only | None |
| Multi-organisation subscriptions | Landing page only | **Planned** | `docs/SUBSCRIPTION_PLAN.md` |
| Google Sheets monthly archive | No | **Planned** | `docs/GOOGLE_SHEETS_EXPORT.md` |

---

## What this means for Academy scope

**Live today and safe to teach now (5 areas):**
attendance · breaks · leave · holidays · employee/admin administration.

**Cannot be taught to production users yet (4 of the 8 headline features):**
geofencing · payroll · payslips · notifications. All are complete and staging-tested, but a production
employee cannot open these screens — the components are not in the `main` build and the supporting
migrations are not applied.

**Documentation gap:** every existing document is written for engineers. `PAYROLL_PLAN.md`,
`OFFICE_GEOFENCING.md` and `NOTIFICATIONS.md` are design and architecture records, not user guides.
**There is no end-user documentation of any kind in either repository.** The Academy would be the first.

**Sequencing recommendation:** author Academy content for the five live areas first. Hold geofencing,
payroll, payslips and notifications content until the `production` branch is actually rolled out — otherwise
the Academy teaches screens that do not exist, which is worse than no Academy.
