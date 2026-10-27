# SkyTrack — Unified System Architecture & Developer Context

> **Audience**: AI Agents, Systems Engineers, and Full-Stack Developers  
> **Last Updated**: October 2026  
> **Organization**: Skypass Visa Services  
> **System Scope**: Android Mobile Client (`SkyTrack_01`), Web Application (`skytrack-admin`: Admin Portal & Employee Portal), and Supabase Backend / Edge Functions (`skytrack-api`)

---

## 1. System Overview & Architecture

**SkyTrack** is an enterprise workforce management, attendance tracking, and leave administration ecosystem built for **Skypass Visa Services**. It provides real-time GPS/geofenced mobile clock-ins, intelligent break timers with persistent tracking across device reboots, comprehensive leave workflows with statutory entitlement balancing, and a unified web platform that serves both company administrators and employees.

```
                           ┌────────────────────────────────────────────────┐
                           │               SUPABASE CLOUD                   │
                           │  - PostgreSQL (RLS, Triggers, Foreign Keys)    │
                           │  - Supabase Auth (JWT, Passwords, RBAC)        │
                           │  - Supabase Storage (Profile Photos)           │
                           └───────────────────────┬────────────────────────┘
                                                   │
                                                   ▼
                           ┌────────────────────────────────────────────────┐
                           │      EDGE FUNCTION: `skytrack-api`             │
                           │  (Single-Endpoint Action Router)               │
                           │  POST /functions/v1/skytrack-api               │
                           │  Runs with Admin Service Role (Bypasses RLS)   │
                           └───────────────▲────────────────▲───────────────┘
                                           │                │
                        Bearer JWT / Actions│                │ Bearer JWT / Actions
                                           │                │
            ┌──────────────────────────────┴───┐        ┌───┴──────────────────────────────┐
            │          ANDROID APP             │        │          WEB APPLICATION         │
            │        (`SkyTrack_01`)           │        │        (`skytrack-admin`)        │
            │  - Jetpack Compose + Material 3  │        │  - React 19 + TypeScript         │
            │  - Kotlin Coroutines & Flows     │        │  - Tailwind CSS v4 + Lucide      │
            │  - Dagger Hilt + Retrofit 2      │        │  - Vite Dev & Rolldown Build     │
            │  - GPS Geofencing                │        │  - Dual-Portal Architecture:     │
            │  - Persistent Break Timers       │        │    1. Admin Command Center       │
            │  - Leave Request & Balance View  │        │    2. Employee Web Portal        │
            └──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 2. Web Application (`skytrack-admin`)

The web application is located at `/Volumes/Excelsior/SkyTrack/skytrack-admin`. It is a modern React 19 SPA running with Vite on port `5173`. It features a **Dual-Portal Architecture**:
1. **Admin Command Center** (`/`, `/admin/*`): For HR, managers, and system administrators.
2. **Employee Web Portal** (`/employee/*`): For regular employees to access their attendance, clock-in/out, view leaves, balances, reporting managers, and holidays from desktop browsers with UI parity to the mobile app.

### 2.1. Tech Stack & Dependencies
- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite with Rolldown compiler
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons & Typography**: `lucide-react`, Google Fonts (*Plus Jakarta Sans*, *Inter*)
- **Routing & State**: React Context (`AuthContext.tsx`), client-side tab & path routing, role guards (`ProtectedRoute.tsx`)
- **Backend Client**: Supabase JS SDK (`@supabase/supabase-js`) & consolidated API layer (`api.ts`)

### 2.2. Directory & Component Structure
```
skytrack-admin/
├── src/
│   ├── App.tsx                     # Main router; dispatches to Admin Layout, Employee Layout, or Login
│   ├── main.tsx                    # React entry point wrapped with AuthProvider
│   ├── contexts/
│   │   └── AuthContext.tsx         # Session persistence, auto-login, role resolution (admin vs employee)
│   ├── components/
│   │   ├── Login.tsx               # Universal login screen; redirects admins to / and employees to /employee
│   │   ├── ProtectedRoute.tsx      # Role guard (verifies admin vs employee clearance)
│   │   │
│   │   ├── # --- ADMIN COMMAND CENTER COMPONENTS ---
│   │   ├── Sidebar.tsx             # Glassmorphic sidebar with badge counters and active tabs
│   │   ├── Header.tsx              # Admin avatar, live date/time, global search (⌘K)
│   │   ├── Dashboard.tsx           # Real-time workforce metrics, On Break counts, today's roster
│   │   ├── Attendance.tsx          # Master attendance ledger, On Break tab, audit panel, check-out undo
│   │   ├── Employees.tsx           # Workforce directory, filter pills, quick employee add
│   │   ├── EmployeeDetails.tsx     # Full profile, history, edit modal, reporting manager assignment, 2FA password change
│   │   ├── LeaveManagement.tsx     # Leave approval/rejection queue with manager comments & balance validation
│   │   ├── PublicHolidays.tsx      # Unrestricted public holiday roster: declare, edit, delete any holiday, CSV export
│   │   ├── Settings.tsx            # Admin profile and credentials management
│   │   ├── OfficeGeofence.tsx      # Office location, geofence radius & location-accuracy policy (admin only)
│   │   ├── PayrollSettings.tsx     # Week-off days, late grace/conversion, office timezone (admin only)
│   │   ├── Payroll.tsx             # Monthly payroll view of all employees (admin only)
│   │   ├── EmployeeSalarySection.tsx # Salary panel in Employee Details (admin only)
│   │   ├── SalaryBreakdown.tsx     # Shared salary line items
│   │   │
│   │   └── # --- EMPLOYEE WEB PORTAL COMPONENTS (/employee/*) ---
│   │       └── employee/
│   │           ├── EmployeeSidebar.tsx  # Employee navigation (Home, Leaves, Monthly, Holidays, Profile)
│   │           ├── EmployeeHeader.tsx   # Employee banner with live clock, greeting, and profile chip
│   │           ├── EmployeeHome.tsx     # Mobile-parity circular punch clock, live work timer, break controls
│   │           ├── EmployeeLeaves.tsx   # Leave balances, application modal with disabled 0-balance leaves, manager name
│   │           ├── EmployeeMonthly.tsx  # Monthly calendar, work hours calculation, punch audit log
│   │           ├── EmployeeHolidays.tsx # Upcoming public and gazetted holidays list
│   │           └── EmployeeProfile.tsx  # Employee profile details, designation, department, and reporting manager
│   ├── lib/
│   │   ├── api.ts                  # Consolidated API functions routing to the skytrack-api Edge Function
│   │   └── supabase.ts             # Direct Supabase client configuration
│   └── supabase/
│       ├── migrations/             # SQL migrations for RLS, tables, and roles
│       │   ├── 20260101000000_admin_roles.sql
│       │   ├── 20260101000001_official_holidays.sql
│       │   ├── 20260101000002_attendance_breaks.sql
│       │   ├── 20260101000003_comprehensive_rls.sql
│       │   ├── 20261006000000_seed_mandatory_holidays.sql
│       │   ├── 20261021000000_holiday_admin_policies.sql # Admin policies for public holidays
│       │   ├── 20261025000000_office_geofence.sql # Office geofence settings, location events, atomic attendance RPC
│       │   ├── 20261027000000_payroll_foundations.sql # Payroll settings, late marks trigger
│       │   ├── 20261027010000_payroll_salaries.sql # Salary structures, compute_payroll()
│       │   ├── 20261027020000_rls_hardening.sql # Read-own / admin-read RLS, no direct writes to HR tables
│       │   └── 20261027030000_payroll_runs.sql # Month lock/reopen, versioned payslips, locked-month guards
│       └── functions/
│           └── skytrack-api/
│               └── index.ts        # Local mirror of the Supabase Edge Function (MUST match root edge_function.ts)
```

### 2.3. Key Features & Workflows
1. **Dual-Role Universal Authentication**:
   - Users sign in with their `employee_id` (e.g. `SKY001`) or `email` and password in [Login.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/Login.tsx).
   - [AuthContext.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/contexts/AuthContext.tsx) inspects the employee's `role`. If `role` is `admin` or `super_admin`, they navigate to the Admin Dashboard (`/`). Otherwise, they are routed to the Employee Portal (`/employee`).
2. **Employee Portal Parity with Mobile App**:
   - **Circular Punch Clock**: Built in [EmployeeHome.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/employee/EmployeeHome.tsx) with animated SVG rings reflecting today's completed hours, current status (Not Checked In, Working, On Break, Checked Out), and live elapsed break duration.
   - **Leave Management**: [EmployeeLeaves.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/employee/EmployeeLeaves.tsx) displays Casual, Sick, and LOP cards. In the leave request dialog, Casual and Sick options are automatically disabled if remaining balance is 0.
   - **Reporting Manager Resolution**: Dynamically resolves and displays the assigned reporting manager's actual name rather than showing "Not Assigned" or raw UUIDs.
3. **Admin Attendance & Break Audit**:
   - [Dashboard.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/Dashboard.tsx) and [Attendance.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/Attendance.tsx) track employees currently "On Break" with pulsing amber indicators.
   - **Undo Checkout**: Admins can reverse accidental checkouts with a single click, restoring active working status without wiping previous timestamps.
   - **Manual Adjustments**: Admins can manually enter or override check-in/out timestamps.
4. **Public Holidays Administration**:
   - [PublicHolidays.tsx](file:///Volumes/Excelsior/SkyTrack/skytrack-admin/src/components/PublicHolidays.tsx) allows admins to **delete or edit any holiday** (both statutory gazetted and company-declared).
   - Instant optimistic UI removal backed by the `delete_public_holiday` Edge Function action and `localStorage` exclusion tracking to guarantee deleted items never resurrect on page reloads.

---

## 3. Android Mobile Application (`SkyTrack_01`)

The mobile client is located at `/Volumes/Excelsior/SkyTrack/SkyTrack_01`. It is a native Android application built for employee daily attendance and workforce operations.

### 3.1. Tech Stack & Dependencies
- **Language**: Kotlin 1.9+ (Target JVM: 11)
- **UI Framework**: Jetpack Compose with Material 3 Design
- **Architecture**: Clean Architecture + MVVM (Model-View-ViewModel) with Unidirectional Data Flow (UDF)
- **Dependency Injection**: Dagger Hilt (`@HiltViewModel`, `@AndroidEntryPoint`)
- **Networking**: Retrofit 2, OkHttp 3 with Bearer token interceptor, Moshi & Gson converters
- **Local Persistence**: Jetpack DataStore (`SessionDataStore.kt`)
- **Geofencing & Location**: Google Play Services Location (`FusedLocationProviderClient`)
- **App Updates**: `GithubReleaseApi.kt` comparing version strings against GitHub Releases
- **SDK Targets**: `compileSdk = 36`, `targetSdk = 36`, `minSdk = 26`
- **Package Namespace**: `com.skypass.skytrack`

### 3.2. Directory & Package Structure
```
SkyTrack_01/app/src/main/java/com/skypass/skytrack/
├── SkyTrackApplication.kt         # @HiltAndroidApp application entry point
├── MainActivity.kt                # Root activity, Compose navigation host & session observer
├── di/                            # Dagger Hilt dependency injection modules
│   ├── AppModule.kt
│   ├── NetworkModule.kt           # Retrofit & OkHttp client with Bearer auth interceptors
│   └── RepositoryModule.kt
├── data/
│   ├── local/
│   │   ├── SessionDataStore.kt    # Token, employeeId, name, role, email, reportingManager persistence
│   │   └── ConnectivityObserver.kt# Live network state flow
│   ├── remote/
│   │   ├── SkyTrackApi.kt         # Retrofit interface for POST /functions/v1/skytrack-api
│   │   ├── ApiModels.kt           # Request/response DTOs (AttendanceDto, LeaveDto, ProfileDto, etc.)
│   │   ├── ApiErrorExtractor.kt   # Clean error message extraction from HTTP payloads
│   │   └── GithubReleaseApi.kt    # In-app update check against GitHub releases
│   └── repository/
│       ├── AuthRepository.kt      # Login, session restore, logout
│       ├── AttendanceRepository.kt# Start work, end work, start/resume break, today's status
│       ├── LeaveRepository.kt     # Submit leave, leave history, leave balances, cancel
│       ├── MonthlyStatisticsRepository.kt # Monthly punch summaries & calendar stats
│       └── AppUpdateRepository.kt # In-app APK downloading & package installer intent
└── ui/
    ├── login/LoginScreen.kt       # Employee ID & Password entry with remember me
    ├── home/
    │   ├── HomeScreen.kt          # Circular punch clock, break controls, status indicator
    │   └── HomeViewModel.kt       # State machine, break timer, optimistic UI updates
    ├── leave/
    │   ├── LeaveScreen.kt         # Leave balance cards, history, dynamic reporting manager display
    │   └── LeaveViewModel.kt      # Leave submission, balance checks, zero-balance disabling
    ├── monthly/                   # Monthly calendar with day punches & work hours
    ├── profile/
    │   ├── ProfileScreen.kt       # Employee profile details & logout
    │   └── ProfileViewModel.kt    # Resolves reporting manager, department, and joining date
    └── theme/                     # Compose Color, Type, and Shape definitions
```

### 3.3. Attendance & Break State Machine
The mobile app maintains four distinct visual and functional states:
1. **Not Checked In (State 1)**: Displays large circular punch button. Verifies GPS location within office radius.
2. **Checked In / Working (State 2)**: Displays check-in time and live elapsed work duration. Provides "Punch Out" and "Take Break" buttons.
3. **On Break (State 3)**:
   - Displays amber indicator and live break timer.
   - Primary button toggles to "Resume Work".
   - "Punch Out" is disabled with an explanatory safeguard: *"Cannot end work while a break is active. Please end your break first."*
4. **Checked Out (State 4)**: Shows daily summary with total working hours and break duration.

### 3.4. Persistent Break Timer Implementation
> **Critical Behavior**: If an employee takes a break and the app is terminated, killed by OS memory management, or the device is rebooted, the break timer **must NOT reset to 0**:
- When a break starts, the backend sets `break_started_at = NOW()` (ISO-8601 timestamp).
- When the mobile app fetches attendance or re-opens, `HomeViewModel.kt` calculates elapsed break duration dynamically:
  ```kotlin
  val breakStartInstant = parseInstantSafe(resolvedAttendance?.breakStartedAt)
  val elapsedBreak = if (breakStartInstant != null) {
      maxOf(0L, java.time.Duration.between(breakStartInstant, java.time.Instant.now()).seconds)
  } else 0L
  val totalBreakSeconds = baseBreakSeconds + elapsedBreak
  ```
- This guarantees absolute temporal accuracy regardless of device restarts.

---

## 4. Backend & Supabase Edge Function (`skytrack-api`)

All application endpoints are consolidated into a single Supabase Edge Function:
- **Root Path**: `/Volumes/Excelsior/SkyTrack/edge_function.ts`
- **Admin Mirror Path**: `/Volumes/Excelsior/SkyTrack/skytrack-admin/supabase/functions/skytrack-api/index.ts`
- **Production Endpoint**: `POST https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api`

> [!IMPORTANT]
> **The Dual Edge Function Rule**:
> `/Volumes/Excelsior/SkyTrack/edge_function.ts` and `/Volumes/Excelsior/SkyTrack/skytrack-admin/supabase/functions/skytrack-api/index.ts` must **ALWAYS** remain 100% identical. Whenever you edit one, immediately sync the other!

### 4.1. Core Database Schema & Constraints
| Table Name | Key Columns | Critical Constraints & Notes |
| :--- | :--- | :--- |
| `employees` | `id` (UUID), `employee_id` (e.g. `SKY001`), `name`, `email`, `role`, `status`, `auth_user_id`, `department`, `designation`, `reporting_manager_id` | `role` can be `employee`, `admin`, `super_admin`, `manager`. |
| `attendance` | `id` (UUID), `employee_id` (UUID), `date` (DATE), `check_in` (TIMESTAMPTZ), `check_out` (TIMESTAMPTZ), `break_started_at` (TIMESTAMPTZ), `total_break_seconds` (INT) | Enforces one record per employee per day (`UNIQUE(employee_id, date)`). |
| `leaves` | `id` (UUID), `request_id` (VARCHAR), `employee_id` (UUID), `leave_type` (VARCHAR), `from_date` (DATE), `to_date` (DATE), `leave_days` (NUMERIC), `paid_leave_days` (NUMERIC), `lop_days` (NUMERIC), `status` (VARCHAR) | `status` IN (`pending`, `approved`, `rejected`, `cancelled`). |
| `employee_leave_balances` | `id` (UUID), `employee_id` (UUID), `leave_type` (VARCHAR), `allocated_days` (NUMERIC), `used_days` (NUMERIC), `adjusted_days` (NUMERIC) | **CRITICAL CONSTRAINT**: `CHECK (leave_type IN ('casual', 'sick'))`. Do NOT insert `'lop'` or long text into this table. |
| `public_holidays` | `id` (UUID), `holiday_code`, `holiday_name`, `holiday_date` (DATE), `holiday_type` (`gazetted` \| `restricted`), `status` | Company & statutory holiday calendar. Foreign key in `public_holiday_branches`. |
| `public_holiday_branches` | `id` (UUID), `holiday_id` (UUID -> `public_holidays.id`), `branch_code` (TEXT) | Regional branch associations for declared holidays. |
| `official_public_holidays` | `id` (UUID), `holiday_code`, `holiday_name`, `holiday_date` (DATE), `holiday_type` | Statutory gazetted holidays cache. |
| `office_geofence_settings` | `id` (=1), `latitude`, `longitude`, `radius_m`, `is_active`, `max_accuracy_m`, `max_location_age_s`, `updated_by`, `updated_at` | Single row. Written only via `save_office_geofence_settings` (service role). Admin-only `SELECT`. |
| `office_geofence_settings_history` | `id`, settings snapshot, `changed_by`, `changed_at` | One row per admin save. |
| `payroll_policy` | `id` (=1), `week_off_days` (0=Sun…6=Sat), `late_grace_minutes`, `late_marks_per_unit`, `late_lop_days_per_unit`, `office_timezone`, `updated_by` | Single row; history in `payroll_policy_history`. Written only via `save_payroll_policy` (service role). Admin-only `SELECT`. |
| `salary_structures` | `employee_id`, `monthly_gross`, `effective_from`, `note`, `created_by`, `created_at` | Never edited or deleted; the latest row on or before a date applies. Written only via `add_salary_structure`. Employees see own rows, admins all. |
| `payroll_runs` / `payroll_run_events` | `month`, `status` (`open`/`locked`), `current_version`; events: `event`, `version`, `reason`, `actor` | One row per month; every lock/reopen is logged. |
| `payslips` | `employee_id`, `month`, `version`, `payslip_number`, `net_pay`, `snapshot` (jsonb) | Never edited; employees see their current version for locked months only. Blocks employee deletion. |
| `attendance_late_marks` | `attendance_id`, `employee_id`, `attendance_date`, `is_late`, `minutes_late`, `reason`, shift snapshot | Written by the `attendance_late_mark` trigger; also sets `attendance.status` to `late` / `present`. Employees see own rows, admins all. |
| `attendance_location_events` | `id`, `employee_id`, `attendance_id`, `action`, `outcome`, `reason_code`, `location_status`, coordinates, `accuracy_m`, `distance_m`, `received_at` | Location evidence for every attendance action. Employees see own rows, admins all; writes service role only. |

### 4.2. Action Dispatcher Reference
The Edge Function inspects `{ "action": "<action_name>", ... }` in the POST body:

| Action Name | Target Role | Description & Parameters |
| :--- | :--- | :--- |
| `login` | Public | Authenticates credentials (`employeeId`, `password`), returns JWT session and employee details. |
| `public_holidays` | Public / All | Returns merged official and company holidays schedule. |
| `attendance_today` | Authenticated | Returns today's punch record, break status, and accumulated break duration. |
| `start_work` | Authenticated | Clocks in employee with current timestamp. Requires `location`; rejected outside the office geofence. |
| `end_work` | Authenticated | Clocks out employee. Rejects if an active break is currently running. Requires `location`; rejected outside the office geofence. |
| `start_break` | Authenticated | Sets `break_started_at = NOW()`. Optional `location` is recorded, never enforced. |
| `resume_work` / `end_break` | Authenticated | Calculates elapsed break time, adds to `total_break_seconds`, and clears `break_started_at`. Optional `location` is recorded, never enforced. |
| `geofence_config` | Authenticated | Office location, radius and accuracy policy for in-app guidance only. |
| `leave_submit` | Authenticated | Submits a leave application (`type`, `from`, `to`, `reason`, `is_half_day`). |
| `leave_history` | Authenticated | Returns the employee's past leave applications and balance breakdown. |
| `cancel_leave` | Authenticated | Cancels a pending leave request submitted by the employee. |
| `get_profile` | Authenticated | Returns employee profile with dynamically resolved reporting manager details. |
| `attendance_monthly` | Authenticated | Aggregates punch times and total hours for a specified month and year. |
| `attendance_feed` / `attendance_punches` | Admin | Real-time audit stream of punch and break events for the admin dashboard. |
| `admin_undo_checkout` | Admin | Restores an employee to active working state by nullifying the `check_out` timestamp. |
| `admin_manual_attendance` | Admin | Manually enters or overrides `check_in` and `check_out` timestamps. |
| `approve_leave` | Admin | Approves a leave request; calculates paid vs LOP days and updates `employee_leave_balances`. |
| `reject_leave` | Admin | Rejects a leave request with manager feedback notes. |
| `organization_data` | Admin | Returns list of employees, departments, and shifts for org-wide management. |
| `update_employee_organization` | Admin | Updates employee department, shift, or reporting manager. |
| `delete_public_holiday` | Admin | Deletes branch links and removes holiday from `public_holidays` and `official_public_holidays`. |
| `save_public_holiday` | Admin | Creates or updates public holiday details and branch assignments using service role. |
| `seed_public_holidays` | Admin | Populates default statutory Indian & Kerala public holidays into the database. |
| `super_admin_change_employee_password` | Super Admin | Resets employee password in Supabase Auth via Admin Auth API. |
| `admin_geofence_settings` | Admin | Returns office geofence settings, last-changed-by and recent change history. |
| `admin_save_geofence_settings` | Admin | Validates and saves office location, radius, active flag and accuracy policy. |
| `salary_summary` | Authenticated | Employee's own provisional salary for a month (`month` = `YYYY-MM`, default current). |
| `admin_salary_get` / `admin_salary_save` | Admin | Salary history and current-month figures for one employee / add a salary effective from a date. |
| `admin_payroll_month` | Admin | Every employee's provisional figures for a month. |
| `admin_update_employee_details` | Admin | Edits name, designation, department, email, phone, status, profile photo (not role). Super admins' records only by super admins. |
| `admin_update_work_shift` | Admin | Edits a work shift's start/end time and working minutes. |
| `admin_payroll_lock` / `admin_payroll_reopen` | Admin | Lock a finished month (issues payslips) / reopen it with a reason. |
| `payslip_list` / `payslip_get` | Authenticated | Employee's own payslips for locked months (current version). |
| `admin_payslip_get` | Admin | Any employee's payslip for a month (optional `version`). |
| `admin_payroll_policy` | Admin | Returns payroll settings (week-off days, late grace/conversion, office timezone) and change history. |
| `admin_save_payroll_policy` | Admin | Validates and saves payroll settings. |

### 4.3. Office Geofencing
Check-in and check-out go through `attendance_action_with_location`, which reads the latest `office_geofence_settings`, validates the submitted fix (accuracy, freshness, timestamp, mock flag), checks the radius, calls the existing attendance RPC and records an `attendance_location_events` row in one transaction. Missing or inactive settings block check-in/out (HTTP 409). Location rejections return HTTP 422 with `error` codes such as `outside_geofence`. Full policy, error codes and rollout steps: [docs/OFFICE_GEOFENCING.md](docs/OFFICE_GEOFENCING.md).

### 4.4. Payroll
Planned on branch `feature/payroll` (built on `feature/office-geofencing`). **Phase 0 is implemented** there:
attendance "today" uses the UTC date everywhere, times are displayed in the viewer's local timezone, late marks are
decided from each employee's shift by the `attendance_late_mark` trigger (stored in `attendance_late_marks`, past
days never re-evaluated after shift/setting changes), and admins edit `payroll_policy` on the **Payroll Settings**
page. **Phase 1 is implemented** too: admins set salaries in Employee Details → Salary (`salary_structures`, effective-dated
history), `compute_payroll()` calculates working days, absences, LOP leave and late-mark deductions, employees see a
hidden "This month's salary" card (web Home and Android Home), and admins see all employees on the **Payroll** page.
**Phase 2 is implemented** as well: admins lock a finished month on the Payroll page (frozen, versioned `payslips`),
reopen it with a reason, export CSV and download payslip PDFs on the letterhead; employees download their payslips
from the Monthly page (web and Android). While a month is locked, the database refuses attendance, approved-leave,
published-holiday and backdated-salary changes for it (SQLSTATE `PLOCK`; Edge Function returns 409 `payroll_month_locked`). Rules, architecture, phases and the decision log: [docs/PAYROLL_PLAN.md](docs/PAYROLL_PLAN.md).
Development uses the staging Supabase project only.


**Next steps:** production rollout order and rollback in [docs/PRODUCTION_ROLLOUT.md](docs/PRODUCTION_ROLLOUT.md);
after go-live, the monthly Google Sheets archive in [docs/GOOGLE_SHEETS_EXPORT.md](docs/GOOGLE_SHEETS_EXPORT.md)
(planned, not built).
---

## 5. Critical Guidelines & Gotchas for AI Agents

> [!IMPORTANT]
> **1. The Dual Edge Function Rule**:
> `/Volumes/Excelsior/SkyTrack/edge_function.ts` and `/Volumes/Excelsior/SkyTrack/skytrack-admin/supabase/functions/skytrack-api/index.ts` must **ALWAYS** remain 100% identical. Whenever you modify one file, copy it to the other immediately and verify with `diff -u`.

> [!WARNING]
> **2. Leave Balance Check Constraint**:
> In PostgreSQL, `employee_leave_balances` strictly enforces:
> `CHECK (leave_type IN ('casual', 'sick'))`
> - Never insert strings like `'Casual Leave'`, `'Sick Leave'`, or `'Loss of Pay'` into `employee_leave_balances`.
> - Always normalize types using lowercase identifiers: `'casual'`, `'sick'`, `'lop'`.
> - Loss of Pay (`'lop'`) has **no balance row**; LOP days are tracked only on the `leaves.lop_days` column.

> [!CAUTION]
> **3. Supabase Row-Level Security (RLS) & Mutations**:
> Tables like `public_holidays`, `employees`, and `attendance` have RLS enabled. If a client attempts a direct `DELETE` or `INSERT` through the Supabase JS SDK with an anon or employee key, Postgres may silently ignore the delete (0 rows affected) or return a 401 error.
> - **Always route admin mutations through the Edge Function** (`skytrack-api`), which uses `adminClient` (Service Role Key) to safely bypass RLS.

> [!TIP]
> **4. Public Holiday Deletion Flow**:
> When an admin deletes a holiday:
> - Delete associated foreign key records in `public_holiday_branches` first.
> - Remove matching rows from `public_holidays` and `official_public_holidays`.
> - Store deleted keys in `localStorage` (`skytrack_deleted_holiday_keys`) on the frontend to prevent client-side static fallbacks from resurrecting them on reload.

> [!NOTE]
> **5. Dynamic Reporting Manager Resolution**:
> When an employee has `reporting_manager_id` assigned, always resolve the manager's actual name using `organization_data` or the profile lookup. Never display static fallback names (e.g., "John Doe") or "Not Assigned" when a manager ID exists.

> [!CAUTION]
> **6. Row Level Security on HR tables (fixed on `feature/payroll`, not yet in production)**:
> Production originally had `USING (true)` / `WITH CHECK (true)` INSERT and UPDATE policies for `authenticated` on
> `employees`, `attendance` and `leaves`, plus full table grants to `anon`, so any signed-in user could write those
> tables through `/rest/v1` (e.g. set their own `role` to `super_admin`). Migration
> `20261027020000_rls_hardening.sql` replaces them: employees read only their own rows, active admins read all rows
> (`is_active_admin()`), nobody writes directly, and `anon` has no access to HR tables.
> **All writes must go through the Edge Function** (service role). The web app no longer writes these tables directly:
> employee edits use `admin_update_employee_details`, shift edits `admin_update_work_shift`, attendance edits
> `admin_manual_attendance` / `admin_undo_checkout`.
> **Rollout order**: deploy the Edge Function and the web app first, then apply the migration (older web builds that
> PATCH `employees` / `work_shifts` directly stop working once it is applied).

---

## 6. Common Development Commands

### Web Portal (`skytrack-admin`)
```bash
# Start local dev server (port 5173)
npm run dev

# Run TypeScript check and production build
npm run build

# Push changes to GitHub
git add -A && git commit -m "your message" && git push origin main
```

### Android Mobile App (`SkyTrack_01`)
```bash
# Clean and assemble debug APK
./gradlew clean assembleDebug

# Run unit tests
./gradlew test

# Staging build: separate app id (com.skypass.skytrack.staging, "SkyTrack Staging") that talks to the
# URL in the skytrackStagingApiUrl Gradle property. Installs next to the production app. See section 7.
./gradlew installStaging
```

### Supabase Edge Function (`skytrack-api`)
```bash
# Deploy to Supabase Cloud via Supabase CLI
# WARNING: supabase/.temp/linked-project.json links this folder to PRODUCTION (cwtrrtbodqctntkpnjlv).
# For any test deploy always pass --project-ref <STAGING_REF> explicitly (see section 7).
supabase functions deploy skytrack-api

# Or copy edge_function.ts directly into Supabase Cloud Console -> Edge Functions -> skytrack-api
```

---

## 7. Testing Office Geofencing Safely (Staging Plan)

**Goal**: run and verify the `feature/office-geofencing` branches (both repos) end to end **without touching
the production database, Edge Function, Cloudflare site, or the Android app employees have installed**.
Production is only changed later, deliberately, by following [docs/OFFICE_GEOFENCING.md](docs/OFFICE_GEOFENCING.md#rollout-manual-steps).

```
  Production (untouched)                         Staging (everything under test)
  ─────────────────────                          ───────────────────────────────
  Supabase cwtrrtbodqctntkpnjlv (Tokyo)          Supabase npwwwapbbvkvteycxaab "skytrack-staging" (Singapore)
  Cloudflare site (main)                         Local web: npm run dev -- --mode staging
  Android "SkyTrack" (com.skypass.skytrack)      Android "SkyTrack Staging" (com.skypass.skytrack.staging)
```

### 7.0. Current staging status (October 2026)
| Item | State |
| :--- | :--- |
| Staging project | `npwwwapbbvkvteycxaab`, free plan, same Supabase account as production |
| Schema | Copy of production `public` schema (11 tables, 18 functions, 18 policies, real attendance RPCs); no production data |
| Migration | `20261025000000_office_geofence.sql` applied (including the date-linking fix) |
| Edge Function | `skytrack-api` from `feature/office-geofencing`, `verify_jwt = false`, ACTIVE |
| Test accounts | `TST-ADMIN` (admin), `TST-001`, `TST-002` (employees); passwords in `~/skytrack-staging/test-accounts.txt` |
| Smoke test vs real backend | 26/27 passed; the one failure is the pre-existing UTC/IST date issue (§7.6) |
| Local test suite | 103/103 (stub schema now mirrors the real RPC behaviour) |
| Android | `~/skytrack-staging/SkyTrack-Staging-geofence.apk` built, 29/29 unit tests |

Local files (all outside git): `/Volumes/Excelsior/SkyTrack/skytrack-staging.env` (keys and DB URLs),
`~/skytrack-staging/` (schema dump, test accounts, APK), `skytrack-admin/.env.staging.local` (git-ignored).

### 7.1. Safety rules (read first)
1. **Do not merge** `feature/office-geofencing` into `main` (web) or `development` / `main` (Android) until
   staging sign-off. The Cloudflare site deploys from `main`.
2. **The Supabase CLI in `skytrack-admin` is linked to PRODUCTION** (`supabase/.temp/linked-project.json`).
   Never run `supabase db push`, `supabase functions deploy` or `supabase link` without an explicit
   `--project-ref npwwwapbbvkvteycxaab` / staging `--db-url`. Re-read the ref before pressing Enter.
   The CLI also rewrites the tracked file `supabase/.temp/cli-latest`; discard that change (`git checkout -- supabase/.temp/cli-latest`).
3. **Do not paste the root `/Volumes/Excelsior/SkyTrack/edge_function.ts` into the production console.** It now
   contains the geofencing version, which fails every attendance action on a database without the migration.
   To redeploy the current production function, use the `main` version:
   `git -C skytrack-admin show main:supabase/functions/skytrack-api/index.ts`.
4. **Do not publish a GitHub Release** from the Android feature branch — the in-app update checker would offer it
   to every employee.
5. **Do not install a `debug` or `release` build of the feature branch on any phone.** Those variants use the
   production API and the production application id (they replace the real app). Use only the `staging` variant.
6. **Do not use a Cloudflare preview deploy** for testing: `worker.ts` proxies `/api/skytrack` to production.
7. **Never commit staging secrets** (`skytrack-staging.env`, `.env.staging.local`, test passwords). Revoke the
   personal access token after testing.
8. **Production is read-only during testing.** The Supabase pooler ignores `PGOPTIONS=-c default_transaction_read_only=on`;
   wrap any production query in `BEGIN READ ONLY; … ROLLBACK;` instead. `pg_dump` only reads.

### 7.2. Staging backend setup (as performed)
1. **Create the project**: Dashboard → New project `skytrack-staging`, free plan, in the same account/organization.
2. **Collect values** into `/Volumes/Excelsior/SkyTrack/skytrack-staging.env` (outside every repo):
   ```bash
   STAGING_REF=...            # from the dashboard URL
   STAGING_ANON_KEY=...       # staging → Project Settings → API Keys → publishable/anon (never the secret key)
   STAGING_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'
   PROD_DB_URL='postgresql://postgres.cwtrrtbodqctntkpnjlv:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'
   SUPABASE_ACCESS_TOKEN=sbp_...   # Account → Access Tokens (for CLI deploy without interactive login)
   STAGING_SERVICE_ROLE_KEY=...    # STAGING project only (used to create test users)
   ```
   **Passwords containing `@` (or `:`/`/`) must be URL-encoded** in the URLs (`@` → `%40`), otherwise psql reports
   `could not translate host name "…@aws-0-…"`.
3. **Install client tools** (no Docker needed): `brew install libpq` and `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`.
4. **Pre-checks** (read-only on production): server versions (prod 17.6, staging 17.x), the four attendance RPCs
   exist as `public.start_work(uuid)` etc., staging `public` is empty.
5. **Dump the production schema (no data)** and adapt it for a fresh project:
   ```bash
   mkdir -p ~/skytrack-staging && cd ~/skytrack-staging
   pg_dump "$PROD_DB_URL" --schema-only --schema=public --no-owner -f prod_public_schema.sql
   # A new Supabase project already has the public schema and platform-managed default privileges:
   grep -v -E '^CREATE SCHEMA public;$|^COMMENT ON SCHEMA public IS|^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ' \
     prod_public_schema.sql > staging_restore.sql
   psql "$STAGING_DB_URL" -X -q -1 -v ON_ERROR_STOP=1 -f staging_restore.sql   # -1 = all-or-nothing
   ```
   Without the `grep`, the restore fails with `schema "public" already exists` and then
   `permission denied to change default privileges` (each failure rolls back cleanly because of `-1`).
6. **Apply the geofence migration to staging** (the file is idempotent and can be re-run):
   ```bash
   psql "$STAGING_DB_URL" -X -q -1 -v ON_ERROR_STOP=1 -f skytrack-admin/supabase/migrations/20261025000000_office_geofence.sql
   ```
   `NOTICE: policy … does not exist, skipping` lines are expected. Verify afterwards that `anon`/`authenticated`
   can no longer execute `start_work`, `end_work`, `start_break`, `resume_work` and that `service_role` can.
7. **Deploy the Edge Function to staging** (from `skytrack-admin` on the feature branch):
   ```bash
   diff -u ../edge_function.ts supabase/functions/skytrack-api/index.ts   # must print nothing
   SUPABASE_ACCESS_TOKEN=... npx -y supabase@2.54.11 functions deploy skytrack-api \
     --project-ref npwwwapbbvkvteycxaab --no-verify-jwt --use-api
   ```
   `--use-api` bundles on Supabase's side (no Docker). `--no-verify-jwt` is required because the Android `login`
   request carries no `Authorization` header. Confirm the output says `Deployed Functions on project npwwwapbbvkvteycxaab`.
8. **Create test accounts**: users via the staging Auth Admin API (`POST /auth/v1/admin/users` with the staging
   service-role key, `email_confirm: true`), then matching `employees` rows (`employee_id`, `name`, `email`, `role`,
   `status = 'active'`, `auth_user_id`). Required columns are only `employee_id` and `name`; `role` must be
   `employee` / `admin` / `super_admin`.
9. **Reset test data** between runs (staging only):
   ```sql
   BEGIN;
   DELETE FROM attendance_location_events;
   DELETE FROM office_geofence_settings_history;
   DELETE FROM office_geofence_settings;            -- back to "not configured"
   DELETE FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE employee_id LIKE 'TST-%');
   COMMIT;
   ```

### 7.3. Run the web app against staging (local only)
`skytrack-admin/.env.staging.local` (git-ignored, generated from the env file):
```bash
VITE_SUPABASE_URL=https://npwwwapbbvkvteycxaab.supabase.co
VITE_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
VITE_SKYTRACK_API_URL=/api/skytrack
# Points the local /api/skytrack dev proxy at staging (vite.config.ts; default is production)
SKYTRACK_PROXY_TARGET=https://npwwwapbbvkvteycxaab.supabase.co/functions/v1/skytrack-api
```
```bash
cd skytrack-admin && git checkout feature/office-geofencing
npm run dev -- --mode staging      # http://localhost:5173 (localhost counts as HTTPS for geolocation)
```
**Verify before testing**: a staging test account (`TST-001`) can log in — those accounts exist only in staging —
and DevTools → Network shows only `localhost:5173` / `npwwwapbbvkvteycxaab`, never `cwtrrtbodqctntkpnjlv`.
All four variables are needed: the API client falls back to `/api/skytrack` and the Supabase client uses
`VITE_SUPABASE_URL`.

**Desktop browsers are imprecise.** A laptop has no GPS; the browser estimates position from Wi-Fi or IP and
typically reports ±100–1000 m (±140 m in our test). With the default **Max accuracy ±50 m** every web check-in is
rejected with `location_accuracy_too_low` — this is the policy working, not a bug. Radius and Max accuracy are
separate settings: the fix must first be precise enough (accuracy), then close enough (radius). To test on a
laptop either raise Max accuracy to ~200 m and Radius to ≥150 m in staging, or use DevTools → ⋮ → More tools →
**Sensors** → Location with an Accuracy value (if your Chrome version shows that field). An office pin captured
with "Use my current location" on a laptop inherits that ±140 m error — re-enter the real coordinates (Google Maps
→ long-press the office) before testing on a phone.

### 7.4. Run the Android app against staging (physical phone or emulator)
Build the staging APK from the feature branch (stash any local WIP on `development` first, restore it after):
```bash
cd SkyTrack_01 && git stash push -m "WIP" && git checkout feature/office-geofencing
./gradlew -PskytrackStagingApiUrl=https://npwwwapbbvkvteycxaab.supabase.co/functions/v1/skytrack-api \
  clean testStagingUnitTest assembleStaging
cp ~/.gradle-builds/SkyTrack_01/app/outputs/apk/staging/app-staging.apk ~/skytrack-staging/SkyTrack-Staging-geofence.apk
git checkout development && git stash pop
```
(Instead of `-P…` you can put `skytrackStagingApiUrl=…` in `~/.gradle/gradle.properties`.) Build output lives in
`~/.gradle-builds/SkyTrack_01` (see root `build.gradle.kts`), not in the project folder.

The APK installs as **"SkyTrack Staging"** (`com.skypass.skytrack.staging`, version `1.0.0-staging`) next to the
production app and cannot overwrite or log out the real app. Install on a physical phone either:
- **USB**: enable Developer options → USB debugging, connect, accept the prompt, then
  `~/Library/Android/sdk/platform-tools/adb install -r ~/skytrack-staging/SkyTrack-Staging-geofence.apk`; or
- **File transfer** (Drive/email/USB storage — not a staff group chat): open the APK, allow "Install unknown
  apps", accept the Play Protect warning (development-signed).

On first check-in allow location with **Precise** on. Phones usually report ±5–30 m, so the real settings
(Radius 50–100 m, Max accuracy ±50 m) apply. Emulator: Extended controls (⋯) → **Location** → set a point → Send.
If the update checker offers the production release inside the staging app, dismiss it.

### 7.5. Test checklist (record pass/fail)
✅ = verified against the real staging backend by the automated smoke test; the rest need a manual run on web/phone.

| # | Area | Steps | Expected |
| :-- | :--- | :--- | :--- |
| 1 ✅ | Missing config | Before saving any settings, check in | Rejected (409) "office location has not been configured"; no attendance row |
| 2 ✅ | Admin access | `TST-001` opens `/office-geofence`; calls `admin_save_geofence_settings` | Lands in employee portal; API returns 403 `forbidden` |
| 3 ✅ | Validation | As admin enter lat 91, lng 200, radius 5 / 5001 / 100.5, accuracy 1000, 0,0 | Inline errors; nothing saved. API → 400 `invalid_geofence_settings` |
| 4 ✅ | Save & reload | Save office coords, radius 100; reload | Values, ACTIVE badge, "Changed by Test Admin", time and history row |
| 5 ✅ | Inside | ~40 m from office; check in (phone) | Card "You appear to be at the office"; check-in succeeds |
| 6 ✅ | Outside | ~150 m; check out | Rejected "about 150 m … radius"; still checked in |
| 7 ✅ | Radius change, no app update | Admin sets radius 200; retry the same 150 m checkout | Succeeds without reinstalling |
| 8 | Location change | Admin moves office 1 km; check in from old spot, then new spot | Old spot rejected (~1000 m), new spot accepted |
| 9 ✅ | Inactive | Admin unticks Geofence active | Check-in/out rejected "disabled by your administrator"; breaks still work |
| 10 ✅ | Breaks outside | Check in inside, move 2 km, start & resume break | Both succeed; events with `geofence_enforced = false` and coordinates |
| 11 ✅ | Break rules kept | Start break, try to check out | Existing message "Please resume working before checking out." |
| 12 | Permission denied | Android: deny permission at check-in; web: block location for the site | Clear message; Android card shows Allow / App settings |
| 13 | Location off | Android: turn off location services | Card "Location services are off" + Turn on location |
| 14 ✅ | Poor accuracy / stale | Laptop browser (±140 m) or admin sets max accuracy 5 m | `location_accuracy_too_low` with the measured accuracy |
| 15 | Mock location | Physical phone with a mock-location app | Check-in rejected `mock_location_detected` |
| 16 | Offline | Airplane mode, tap check-in; then start a break | Check-in: "needs an internet connection"; break queued and synced when back online |
| 17 | Timeout | Indoors with poor signal | "Couldn't get your location in time" + Retry |
| 18 ✅ | Duplicate / concurrent | Double-tap check-in; web + Android at the same moment | One attendance row, original check-in time kept; repeat returns success (production RPC is idempotent) |
| 19 ✅ | Direct bypass | `rest/v1/rpc/start_work` etc. with anon key + employee JWT; PATCH `office_geofence_settings` | Denied; settings unchanged |
| 20 ✅ | Old clients | `start_work` without `location` (current production app) | 422 `location_required` "please update the app" |
| 21 | Regression | Manual attendance, undo checkout, dashboard On Break, monthly summary, leaves, break timer after app kill | Unchanged (test after 05:30 IST, see §7.6) |

Useful staging queries:
```sql
SELECT to_char(l.received_at AT TIME ZONE 'Asia/Kolkata','HH24:MI:SS') AS ist, e.employee_id, l.action, l.outcome,
       l.reason_code, round(l.accuracy_m) AS acc_m, round(l.distance_m) AS dist_m, l.geofence_radius_m, l.client_platform,
       l.attendance_id IS NOT NULL AS linked
FROM attendance_location_events l JOIN employees e ON e.id = l.employee_id
ORDER BY l.received_at DESC LIMIT 20;
SELECT * FROM office_geofence_settings_history ORDER BY changed_at DESC;
```
Web attempts usually appear **twice**: the web client retries a failed request against its second endpoint
(existing `fetchSkyTrackApi` behaviour).

### 7.6. Findings from the real (staging) backend
1. **Fixed — event linking**: the production RPCs return `attendance_date` (no `id`) and date rows with
   `current_date` (database timezone UTC). The migration originally looked rows up by the IST date, leaving
   `attendance_id` empty for actions between 00:00 and 05:30 IST. Now uses the RPC's own `attendance_date`
   (commit `274cf6c`). Geofence enforcement itself was never affected.
2. **Existing behaviour — idempotent check-in**: a repeated `start_work` keeps the first `check_in` and returns success.
3. **Pre-existing bug (not part of geofencing, unfixed)**: attendance RPCs use the UTC date while
   `attendance_today`, `admin_undo_checkout` and `admin_manual_attendance` default to the IST date. Between
   **00:00 and 05:30 IST** a successful check-in does not appear on the home screen and undo checkout reports
   "No attendance record found". Test UI flows after 05:30 IST. Affects production employees today.
4. **Pre-existing security gap (closed by the migration)**: in production `anon` and `authenticated` can execute
   the `SECURITY DEFINER` RPCs `start_work` / `end_work` / `start_break` / `resume_work`, which accept any employee
   UUID — anyone with the public anon key could punch for an employee whose UUID they know.
5. **Cron**: production has one job, `skytrack-monthly-leave-allocation` (`allocate_monthly_employee_leaves()`,
   monthly) — unaffected by geofencing.

### 7.7. After staging sign-off
1. Open PRs from `feature/office-geofencing` (do not merge yet) for review.
2. Decide the production accuracy policy: keep ±50 m (phones; desktop users check in from the app) or raise it for
   desktop browsers (weaker evidence). Radius of ~100 m with ±50 m is the recommended default.
3. Production rollout order and the brief "blocked until configured" window are in
   [docs/OFFICE_GEOFENCING.md → Rollout](docs/OFFICE_GEOFENCING.md#rollout-manual-steps). Ship web + Android first
   (they work against the current backend), then migration, Edge Function, and configure the office immediately
   with real coordinates (not a laptop-captured pin).
4. **Rollback**: redeploy the `main` version of the Edge Function (rule 3 above). The migration is additive; the old
   function uses the service role, so it keeps working with the new tables and revoked RPC grants in place.
5. **Cleanup**: delete or pause the staging project; revoke the personal access token; delete
   `skytrack-staging.env`, `skytrack-admin/.env.staging.local`, `~/skytrack-staging/`; uninstall "SkyTrack Staging".
