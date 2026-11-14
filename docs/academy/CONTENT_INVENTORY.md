# SkyTrack Academy — Content Inventory

Every planned article: its id, home, audience and deployment status. This is the Phase 1 completion
artefact — **every SkyTrack feature has an identified documentation location, applicable roles and content
requirements.**

**Date:** 14 November 2026 · **Totals:** 92 articles, 11 tutorials
**Status key:** 🟢 `live` — publish now · 🟡 `branch_only` — write, withhold until rollout · ⚪ not written yet

---

## Summary

| Category | Articles | 🟢 live | 🟡 withheld |
| :--- | ---: | ---: | ---: |
| Getting Started | 8 | 7 | 1 |
| Employee Guide | 22 | 16 | 6 |
| Manager Guide | 0 | — | — |
| Administrator Guide | 24 | 19 | 5 |
| Monitoring | 6 | 3 | 3 |
| Troubleshooting | 16 | 9 | 7 |
| Payroll | 16 | 0 | 16 |
| **Total** | **92** | **54** | **38** |

41 % of the corpus is withheld until the `production` branch ships — entirely the payroll, geofencing,
payslip and notification material.

---

## 1. Getting Started — `getting-started/`

| ID | Title | Roles | Feature | Status |
| :--- | :--- | :--- | :--- | :---: |
| `getting-started.overview` | What SkyTrack is and what it does for you | all | — | 🟢 |
| `getting-started.signin` | How to sign in with your employee ID | all | — | 🟢 |
| `getting-started.app-or-browser` | Using the phone app or the web portal | employee | — | 🟢 |
| `getting-started.install-android` | Installing the SkyTrack app on your phone | employee | — | 🟢 |
| `getting-started.your-first-day` | Your first day: check in, break, check out | employee | attendance | 🟢 |
| `getting-started.password` | Changing your password | all | — | 🟢 |
| `getting-started.theme` | Switching between light and dark | all | — | 🟢 |
| `getting-started.biometric` | Signing in with your fingerprint | employee | — | 🟡 |

## 2. Employee Guide — `employee/`

### Attendance
| ID | Title | Roles | Feature | Status |
| :--- | :--- | :--- | :--- | :---: |
| `employee.attendance.checkin` | How to check in | employee | attendance | 🟢 |
| `employee.attendance.checkout` | How to check out | employee | attendance | 🟢 |
| `employee.attendance.states` | The four states: not checked in, working, on break, checked out | employee | attendance | 🟢 |
| `employee.attendance.location` | Why SkyTrack asks for your location | employee | geofencing | 🟡 |
| `employee.attendance.missed` | What happens if you forget to check out | employee | attendance | 🟢 |

### Breaks
| `employee.break.start` | How to start a break | employee | breaks | 🟢 |
| `employee.break.end` | How to end a break and resume work | employee | breaks | 🟢 |
| `employee.break.limit` | How long a break can be | employee | breaks | 🟢 |

### Monthly
| `employee.monthly.overview` | Reading your monthly attendance | employee | attendance | 🟢 |
| `employee.monthly.hours` | How your working hours are calculated | employee | attendance | 🟢 |
| `employee.monthly.timesheet` | Downloading your timesheet | employee | attendance | 🟢 |

### Leave
| `employee.leave.balances` | Understanding your leave balances | employee | leave_management | 🟢 |
| `employee.leave.apply` | How to apply for leave | employee | leave_management | 🟢 |
| `employee.leave.halfday` | Applying for a half day | employee | leave_management | 🟢 |
| `employee.leave.status` | Tracking your leave request | employee | leave_management | 🟢 |
| `employee.leave.cancel` | Cancelling a pending request | employee | leave_management | 🟢 |
| `employee.leave.unpaid` | What loss of pay (LOP) means for you | employee | leave_management | 🟢 |

### Holidays, profile, pay, notifications
| `employee.holidays.view` | Seeing upcoming holidays | employee | holidays | 🟢 |
| `employee.profile.details` | Your profile and reporting manager | employee | employee_admin | 🟢 |
| `employee.profile.photo` | Changing your profile photo | employee | employee_admin | 🟢 |
| `employee.salary.card` | Seeing this month's salary | employee | payroll | 🟡 |
| `employee.payslip.download` | Downloading your payslip | employee | payslips | 🟡 |
| `employee.notifications.inbox` | Your notification inbox | employee | notifications | 🟡 |
| `employee.notifications.settings` | Turning phone alerts on or off | employee | notifications | 🟡 |

## 3. Manager Guide — `manager/`

**No articles.** The `manager` role is non-functional: the frontend grants the admin portal, the backend
grants nothing, every admin call returns 403 (`PROJECT_AUDIT.md` §5). Writing a manager guide now would
document behaviour that does not exist.

`manager/README.md` and `tutorials/manager/README.md` record the blocker and the two unblocking options.
Leave approval and attendance correction are documented under **Administrator** in the meantime.

## 4. Administrator Guide — `administrator/`

### Daily operations
| ID | Title | Roles | Feature | Status |
| :--- | :--- | :--- | :--- | :---: |
| `administrator.dashboard.overview` | Reading the dashboard | admin, super_admin | attendance | 🟢 |
| `administrator.attendance.ledger` | The attendance ledger | admin, super_admin | attendance | 🟢 |
| `administrator.attendance.manual` | Entering or correcting attendance | admin, super_admin | attendance | 🟢 |
| `administrator.attendance.undo-checkout` | Undoing an accidental checkout | admin, super_admin | attendance | 🟢 |
| `administrator.attendance.breaks` | Seeing who is on a break | admin, super_admin | breaks | 🟢 |

### Leave
| `administrator.leave.approve` | How to approve a leave request | admin, super_admin | leave_management | 🟢 |
| `administrator.leave.reject` | Rejecting a request with feedback | admin, super_admin | leave_management | 🟢 |
| `administrator.leave.paid-vs-lop` | How approval splits paid and unpaid days | admin, super_admin | leave_management | 🟢 |
| `administrator.leave.balance-adjust` | Adjusting a leave balance | admin, super_admin | leave_management | 🟢 |

### People and organisation
| `administrator.employees.add` | Adding an employee | admin, super_admin | employee_admin | 🟢 |
| `administrator.employees.edit` | Editing an employee's details | admin, super_admin | employee_admin | 🟢 |
| `administrator.employees.deactivate` | Deactivating someone who has left | admin, super_admin | employee_admin | 🟢 |
| `administrator.employees.joining-date` | Why the joining date matters | admin, super_admin | payroll | 🟡 |
| `administrator.org.departments` | Managing departments | admin, super_admin | employee_admin | 🟢 |
| `administrator.org.shifts` | Creating and editing work shifts | admin, super_admin | employee_admin | 🟢 |
| `administrator.org.reporting-manager` | Assigning a reporting manager | admin, super_admin | employee_admin | 🟢 |

### Holidays
| `administrator.holidays.declare` | Declaring a holiday | admin, super_admin | holidays | 🟢 |
| `administrator.holidays.edit-delete` | Editing or deleting a holiday | admin, super_admin | holidays | 🟢 |
| `administrator.holidays.seed` | Loading statutory holidays | admin, super_admin | holidays | 🟢 |
| `administrator.holidays.export` | Exporting the calendar | admin, super_admin | holidays | 🟢 |

### Office location
| `administrator.geofence.configure` | Setting the office location and radius | admin, super_admin | geofencing | 🟡 |
| `administrator.geofence.accuracy` | Accuracy and fix-age limits | admin, super_admin | geofencing | 🟡 |
| `administrator.geofence.maplink` | Using a Google or Apple Maps link | admin, super_admin | geofencing | 🟡 |

### Super administrator only
| `administrator.superadmin.accounts` | Managing administrator accounts | super_admin | employee_admin | 🟢 |
| `administrator.superadmin.password-reset` | Resetting an employee's password | super_admin | employee_admin | 🟢 |

## 5. Monitoring — `monitoring/`

| ID | Title | Roles | Feature | Status |
| :--- | :--- | :--- | :--- | :---: |
| `monitoring.roster.live` | Watching the live roster | admin, super_admin | attendance | 🟢 |
| `monitoring.feed.punches` | The punch and activity feed | admin, super_admin | attendance | 🟢 |
| `monitoring.attendance.exceptions` | Spotting absences and late arrivals | admin, super_admin | attendance | 🟢 |
| `monitoring.location.audit` | The location audit trail | admin, super_admin | geofencing | 🟡 |
| `monitoring.notifications.admin` | Administrator alerts | admin, super_admin | notifications | 🟡 |
| `monitoring.payroll.flags` | Payroll warnings: no salary, no shift, no joining date | admin, super_admin | payroll | 🟡 |

## 6. Troubleshooting — `troubleshooting/`

| ID | Title | Roles | Error code | Status |
| :--- | :--- | :--- | :--- | :---: |
| `troubleshooting.signin.failed` | You cannot sign in | all | — | 🟢 |
| `troubleshooting.session.expired` | You were signed out unexpectedly | all | — | 🟢 |
| `troubleshooting.permission.denied` | "Only administrators can…" | all | `forbidden` | 🟢 |
| `troubleshooting.checkin.already` | You are already checked in | employee | — | 🟢 |
| `troubleshooting.checkin.location-permission` | SkyTrack cannot see your location | employee | `location_required` | 🟢 |
| `troubleshooting.checkin.gps-off` | Your location is turned off | employee | `invalid_location` | 🟢 |
| `troubleshooting.checkin.outside-geofence` | You are too far from the office | employee | `outside_geofence` | 🟡 |
| `troubleshooting.checkin.accuracy` | Your location is not precise enough | employee | `location_accuracy_too_low`, `location_stale` | 🟡 |
| `troubleshooting.checkin.device-clock` | Your phone's clock is wrong | employee | `location_timestamp_invalid` | 🟡 |
| `troubleshooting.checkin.mock-location` | A fake location was detected | employee | `mock_location_detected` | 🟡 |
| `troubleshooting.checkout.on-break` | You cannot check out during a break | employee | — | 🟢 |
| `troubleshooting.leave.zero-balance` | A leave type is greyed out | employee | — | 🟢 |
| `troubleshooting.leave.already-approved` | This request has already been decided | admin, super_admin | `leave_not_pending` | 🟢 |
| `troubleshooting.payroll.month-locked` | The month is locked | admin, super_admin | `payroll_month_locked` | 🟡 |
| `troubleshooting.payroll.no-salary` | An employee shows no salary | admin, super_admin | — | 🟡 |
| `troubleshooting.notifications.not-arriving` | You are not getting alerts | employee | — | 🟡 |

## 7. Payroll — `payroll/`

**Every article here is withheld until the `production` branch ships.**

### Concepts
| ID | Title | Roles | Status |
| :--- | :--- | :--- | :---: |
| `payroll.concepts.working-days` | How working days are counted | all | 🟡 |
| `payroll.concepts.per-day-rate` | How your per-day rate is worked out | all | 🟡 |
| `payroll.concepts.deductions` | What can reduce your pay | all | 🟡 |

### Salary
| `payroll.salary.set` | Setting an employee's salary | admin, super_admin | 🟡 |
| `payroll.salary.history` | Changing pay and keeping history | admin, super_admin | 🟡 |
| `payroll.salary.mid-month` | A pay change part-way through a month | admin, super_admin | 🟡 |

### Deductions
| `payroll.deductions.absence` | Unapproved absence | all | 🟡 |
| `payroll.deductions.lop-leave` | Unpaid (LOP) leave | all | 🟡 |
| `payroll.deductions.late-marks` | Option 1: late marks | all | 🟡 |
| `payroll.deductions.late-per-minute` | Option 2: per-minute deduction | all | 🟡 |

### Policy and month end
| `payroll.policy.choose-option` | Choosing how lateness affects pay | admin, super_admin | 🟡 |
| `payroll.policy.week-offs-grace` | Week-offs, grace and allowed break | admin, super_admin | 🟡 |
| `payroll.month.review` | Reviewing the month before closing | admin, super_admin | 🟡 |
| `payroll.month.lock` | Closing and locking a payroll month | admin, super_admin | 🟡 |
| `payroll.month.reopen` | Reopening a month to fix a mistake | admin, super_admin | 🟡 |
| `payroll.export.csv` | Exporting payroll for the accountant | admin, super_admin | 🟡 |

---

## 8. Tutorials (ids reserved; specified in Phase 2)

| Tutorial ID | Walks through | Audience | Status |
| :--- | :--- | :--- | :---: |
| `tutorial.employee.first-checkin` | First check in and check out | employee | 🟢 |
| `tutorial.employee.take-break` | Starting and ending a break | employee | 🟢 |
| `tutorial.employee.apply-leave` | Applying for leave | employee | 🟢 |
| `tutorial.employee.read-monthly` | Reading the monthly overview | employee | 🟢 |
| `tutorial.employee.salary-card` | Revealing the salary card | employee | 🟡 |
| `tutorial.administrator.leave-approval` | Approving a leave request | admin | 🟢 |
| `tutorial.administrator.fix-attendance` | Correcting a day's attendance | admin | 🟢 |
| `tutorial.administrator.add-employee` | Adding a new joiner | admin | 🟢 |
| `tutorial.administrator.set-salary` | Setting a salary | admin | 🟡 |
| `tutorial.administrator.month-end` | Running month end | admin | 🟡 |
| `tutorial.administrator.geofence` | Configuring the office geofence | admin | 🟡 |

`tutorials/manager/` is empty — see §3.

---

## 9. Coverage check — Phase 1 completion condition

| Feature | Documentation location | Roles | Status |
| :--- | :--- | :--- | :---: |
| Attendance | `employee/attendance.*`, `administrator/attendance.*`, `monitoring/` | employee, admin, super_admin | ✅ |
| Break management | `employee/break.*`, `administrator.attendance.breaks` | employee, admin, super_admin | ✅ |
| Leave management | `employee/leave.*`, `administrator/leave.*` | employee, admin, super_admin | ✅ |
| Holiday calendar | `employee.holidays.view`, `administrator/holidays.*` | employee, admin, super_admin | ✅ |
| Geofencing | `administrator/geofence.*`, `employee.attendance.location`, `troubleshooting/checkin.*` | employee, admin, super_admin | ✅ |
| Payroll | `payroll/` (16 articles) | all | ✅ |
| Payslips | `employee.payslip.download`, `payroll.payslip.*` | employee, admin, super_admin | ✅ |
| Notifications | `employee/notifications.*`, `monitoring.notifications.admin` | employee, admin, super_admin | ✅ |
| Employee & org administration | `administrator/employees.*`, `administrator/org.*` | admin, super_admin | ✅ |
| Super admin operations | `administrator/superadmin.*` | super_admin | ✅ |
| Device-bound check-in | *not written* — feature disabled | — | deferred |
| Subscriptions, Sheets export | *not written* — planned only | — | deferred |

**Every live and branch-only feature has a documentation location, named roles and defined content
requirements.** The two deferred rows are features that do not exist for any user.
