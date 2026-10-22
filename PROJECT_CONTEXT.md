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
│       │   └── 20261021000000_holiday_admin_policies.sql # Admin policies for public holidays
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

### 4.2. Action Dispatcher Reference
The Edge Function inspects `{ "action": "<action_name>", ... }` in the POST body:

| Action Name | Target Role | Description & Parameters |
| :--- | :--- | :--- |
| `login` | Public | Authenticates credentials (`employeeId`, `password`), returns JWT session and employee details. |
| `public_holidays` | Public / All | Returns merged official and company holidays schedule. |
| `attendance_today` | Authenticated | Returns today's punch record, break status, and accumulated break duration. |
| `start_work` | Authenticated | Clocks in employee with current timestamp. |
| `end_work` | Authenticated | Clocks out employee. Rejects if an active break is currently running. |
| `start_break` | Authenticated | Sets `break_started_at = NOW()`. |
| `resume_work` / `end_break` | Authenticated | Calculates elapsed break time, adds to `total_break_seconds`, and clears `break_started_at`. |
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
```

### Supabase Edge Function (`skytrack-api`)
```bash
# Deploy to Supabase Cloud via Supabase CLI
supabase functions deploy skytrack-api

# Or copy edge_function.ts directly into Supabase Cloud Console -> Edge Functions -> skytrack-api
```
