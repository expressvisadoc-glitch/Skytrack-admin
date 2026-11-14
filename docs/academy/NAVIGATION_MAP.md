# SkyTrack Academy — Phase 0: Navigation Map

A verified inventory of every screen, sidebar item, settings page, modal and major workflow.
Read from source on `ddev/tutorial`. **Date:** 14 November 2026.

---

## 1. How navigation actually works

Not routes — **tab state**. `App.tsx` holds `activeTab: string` and renders through a ternary chain; the URL is
pushed manually to match (`App.tsx:103`) and parsed back on load (`App.tsx:56–62`).

```
sign in → AuthContext resolves role → isAdmin ?
    ├── ADMIN PORTAL      ProtectedRoute(adminOnly) → SidebarFrame + Header + Sidebar
    └── EMPLOYEE PORTAL                              → EmployeeSidebar + EmployeeHeader
```

---

## 2. Dashboards by role — **only two exist**

| Role in database | Portal shown | Landing screen |
| :--- | :--- | :--- |
| `employee` | Employee portal | `EmployeeHome` (tab `home`) |
| `manager` | **Admin portal** (frontend treats it as admin) — but **every admin API call returns 403** | `Dashboard` — would fail to load data |
| `admin` | Admin portal | `Dashboard` (tab `dashboard`) |
| `super_admin` | Admin portal **+ Admin Management** | `Dashboard` |

> **There is no manager dashboard.** See `PROJECT_AUDIT.md` §5. The only role-conditional UI anywhere is the
> super-admin-only **Admin Management** item (`Sidebar.tsx:26`).

---

## 3. Admin sidebar — 10 items (11 for super admin)

Verified at `Sidebar.tsx:16–26`.

| # | Tab id | Label | Component | In production? |
| ---: | :--- | :--- | :--- | :--- |
| 1 | `dashboard` | Dashboard | `Dashboard.tsx` | Yes |
| 2 | `employees` | Employees | `Employees.tsx` | Yes |
| 3 | `attendance` | Attendance | `Attendance.tsx` | Yes |
| 4 | `leave-management` | Leave Management | `LeaveManagement.tsx` | Yes |
| 5 | `public-holidays` | Public Holidays | `PublicHolidays.tsx` | Yes |
| 6 | `settings` | Settings | `Settings.tsx` | Yes |
| 7 | `organization` | Organization | `Organization.tsx` | Yes |
| 8 | `office-geofence` | Office Geofence | `OfficeGeofence.tsx` | **No** |
| 9 | `payroll` | Payroll | `Payroll.tsx` | **No** |
| 10 | `payroll-settings` | Payroll Settings | `PayrollSettings.tsx` | **No** |
| 11 | `admin-management` | Admin Management | `AdminManagement.tsx` | Yes — **super admin only** |

Plus, outside the sidebar: **`EmployeeDetails`** (drill-down from Employees, contains the Salary section) and
**`EmployeeAttendanceHistory`** (drill-down from Attendance).

---

## 4. Employee sidebar — 5 items

Verified at `EmployeeSidebar.tsx:18–22`.

| # | Tab id | Label | Component | In production? |
| ---: | :--- | :--- | :--- | :--- |
| 1 | `home` | Attendance & Breaks | `EmployeeHome.tsx` (+ `EmployeeSalaryCard`) | Page yes; **salary card no** |
| 2 | `leave` | Leave Requests | `EmployeeLeaves.tsx` | Yes |
| 3 | `monthly` | Monthly Overview | `EmployeeMonthly.tsx` (+ `EmployeePayslips`) | Page yes; **payslips no** |
| 4 | `holidays` | Public Holidays | `EmployeeHolidays.tsx` | Yes |
| 5 | `profile` | My Account | `EmployeeProfile.tsx` | Yes |

---

## 5. Android app screens (employee only)

`SplashScreen` → `LoginScreen` → bottom navigation dock:

| Screen | Contents |
| :--- | :--- |
| `HomeScreen` | Punch clock, `GeofenceStatusCard`, `GeofenceMap`, `SalaryCard`, notification bell |
| `MonthlyStatisticsScreen` | Calendar, hours, `PayslipsSection`, timesheet PDF |
| `LeaveScreen` | Balances, apply, history |
| `ProfileScreen` | Details, notification switch, biometric setup, `ChangePasswordScreen` |
| `NotificationsScreen` | In-app inbox |

No admin capability exists on Android.

---

## 6. Settings pages

| Page | Audience | What it configures |
| :--- | :--- | :--- |
| **Settings** (`settings`) | Admin | The signed-in administrator's own profile and credentials |
| **Organization** (`organization`) | Admin | Departments, work shifts (start/end/working minutes), employee assignment |
| **Office Geofence** (`office-geofence`) | Admin | Office coordinates, radius, accuracy limit, fix age limit, active flag + change history |
| **Payroll Settings** (`payroll-settings`) | Admin | Week-off days, late grace, **late-penalty option**, allowed break length, office timezone + change history |
| **Admin Management** (`admin-management`) | **Super admin** | Administrator accounts, password resets |
| **My Account** (`profile`) | Employee | Profile, photo, password |
| Android **Profile** | Employee | Punch-in alerts switch, biometric sign-in, password |

---

## 7. Modals and forms

No shared `<Modal>` component — 15 screens hand-roll `fixed inset-0 … backdrop-blur` dialogs.

| Screen | Dialogs / forms |
| :--- | :--- |
| `Login` | Sign-in form, forgot-password |
| `Dashboard` | Quick actions |
| `Employees` | Quick add employee; filter pills |
| `EmployeeDetails` | Edit profile; reporting manager; password change; **salary: add / history** |
| `Attendance` | Manual attendance entry; undo checkout; audit panel |
| `EmployeeAttendanceHistory` | Day detail |
| `LeaveManagement` | Approve / reject with comment; balance adjustment |
| `PublicHolidays` | Declare / edit / delete holiday; CSV export |
| `Settings` | Profile + credential forms |
| `OfficeGeofence` | Location picker, map-link resolver, save confirmation |
| `Payroll` | Month picker; **lock**; **reopen (reason required)**; CSV export; payslip PDF |
| `PayrollSettings` | Edit form + **save confirmation dialog** |
| `NotificationPanel` | Bell panel; password-reset actions |
| `EmployeeLeaves` | Leave application (zero-balance types disabled) |
| `EmployeeHome` | Salary card reveal (eye icon) |

---

## 8. Major user workflows

**Employee**
1. Sign in → check in → take break → resume → check out
2. Apply for leave → see balance → track status → cancel if pending
3. Review month → hours, punches → download timesheet / payslip
4. Reveal this month's salary and its deductions
5. Change password / enable biometric (Android)

**Administrator**
1. Monitor the live roster; see who is in, out or on break
2. Correct attendance — manual entry, undo checkout
3. Approve or reject leave; adjust balances
4. Maintain the holiday calendar
5. Add and manage employees, departments, shifts, reporting managers
6. Configure the office geofence
7. Configure payroll policy, including the late-penalty option
8. Set salaries (Employee Details → Salary)
9. Run month end — review Payroll, export CSV, **lock**, issue payslips, reopen if a correction is needed

**Super administrator** — all of the above, plus administrator accounts and password resets.

---

## 9. Where there is currently no help of any kind

Every screen. There is no help button, no tooltip system, no onboarding, no empty-state guidance beyond
`EmptyState.tsx`, and no end-user documentation in either repository. The highest-value targets — screens where
a wrong action has real consequences — are **Payroll** (lock / reopen), **Payroll Settings** (changing the
late-penalty option re-prices the open month), **Office Geofence** (a bad radius blocks all check-ins) and
**Leave Management** (approval sets the paid/LOP split that payroll then deducts).
