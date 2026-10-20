# SkyTrack — Unified System Architecture & Developer Context

> **Audience**: AI Agents, Systems Engineers, and Full-Stack Developers  
> **Last Updated**: October 2026  
> **Organization**: Skypass Visa Services  
> **System Scope**: Android Mobile Client (`SkyTrack_01`), Admin Web Portal (`skytrack-admin`), and Supabase Backend / Edge Functions (`skytrack-api`)

---

## 1. System Overview & Architecture

**SkyTrack** is an enterprise workforce management, attendance tracking, and leave administration ecosystem built for **Skypass Visa Services**. It provides real-time GPS/geofenced mobile clock-ins, intelligent break timers with persistent tracking across device reboots, comprehensive leave workflows with statutory entitlement balancing, and an admin web command center.

```
                           ┌────────────────────────────────────────────────┐
                           │               SUPABASE CLOUD                   │
                           │  - PostgreSQL (RLS, Triggers, Views)           │
                           │  - Supabase Auth (JWT, Passwords, RBAC)        │
                           │  - Supabase Storage (Profile Photos)           │
                           └───────────────────────┬────────────────────────┘
                                                   │
                                                   ▼
                           ┌────────────────────────────────────────────────┐
                           │      EDGE FUNCTION: `skytrack-api`             │
                           │  (Single-Endpoint Action Router)               │
                           │  POST /functions/v1/skytrack-api               │
                           └───────────────▲────────────────▲───────────────┘
                                           │                │
                        Bearer JWT / Actions│                │ Bearer JWT / Actions
                                           │                │
            ┌──────────────────────────────┴───┐        ┌───┴──────────────────────────────┐
            │          ANDROID APP             │        │        ADMIN WEB PORTAL          │
            │        (`SkyTrack_01`)           │        │       (`skytrack-admin`)         │
            │  - Jetpack Compose + Material 3  │        │  - React 19 + TypeScript         │
            │  - Kotlin Coroutines & Flows     │        │  - Tailwind CSS v4 + Lucide      │
            │  - Dagger Hilt + Retrofit 2      │        │  - Vite Dev & Rolldown Build     │
            │  - GPS Geofence & Persistent     │        │  - Real-time Dashboards, Audits, │
            │    Break Elapsed Timers          │        │    Leave Approvals & 2FA Admin   │
            └──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 2. Android Mobile Application (`SkyTrack_01`)

### 2.1. Tech Stack & Dependencies
- **Language**: Kotlin 1.9+ (Target JVM: 11)
- **UI Toolkit**: Jetpack Compose with Material 3 Design
- **Architecture**: Clean Architecture + MVVM (Model-View-ViewModel) with Unidirectional Data Flow (UDF)
- **Dependency Injection**: Dagger Hilt (`@HiltViewModel`, `@AndroidEntryPoint`)
- **Networking**: Retrofit 2, OkHttp 3, Moshi / Gson converter
- **Local Storage**: Jetpack DataStore (`SessionDataStore.kt`)
- **Location & Sensors**: Google Play Services Location (`FusedLocationProviderClient`)
- **OTA Updates**: `GithubReleaseApi.kt` comparing SemVer tags with GitHub Releases
- **SDK Versions**: `compileSdk = 36`, `targetSdk = 36`, `minSdk = 26`
- **Package Namespace**: `com.skypass.skytrack`

### 2.2. Directory & Package Structure
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
│   │   ├── SessionDataStore.kt    # Token, employeeId, name, role, email persistence
│   │   └── ConnectivityObserver.kt# Live network state flow
│   ├── remote/
│   │   ├── SkyTrackApi.kt         # Retrofit interface for POST /skytrack-api
│   │   ├── ApiModels.kt           # Request/response DTOs (AttendanceDto, LeaveDto, etc.)
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
    ├── leave/                     # Leave application modal & balance inspector
    ├── monthly/                   # Monthly calendar with day punches & work hours
    ├── profile/                   # Employee profile details & logout
    └── theme/                     # Compose Color, Type, and Shape definitions
```

### 2.3. Attendance & Break State Machine
The mobile app maintains four distinct visual and functional states:
1. **Not Checked In (State 1)**: Large circular button to "Punch In". Checks GPS geofencing against office radius.
2. **Checked In / Working (State 2)**: Displays check-in timestamp and live work duration. Displays active "Punch Out" and "Take Break" buttons.
3. **On Break (State 3)**:
   - Displays amber break indicator and real-time break duration timer.
   - Button changes to "Resume Work".
   - "Punch Out" button is blocked with a safeguard ("Cannot end work while a break is active. Please end your break first").
4. **Checked Out (State 4)**: Shows total hours worked and break duration for the day.

### 2.4. Critical Implementation: Persistent Break Timer
> **Gotcha / Scenario**: If an employee starts a break and then closes the app, kills it from memory, or the phone turns off/reboots, the timer must NOT reset to 0:
- When break is started, the server saves `break_started_at: "ISO_TIMESTAMP"`.
- In `HomeViewModel.kt`, the break duration is calculated dynamically:
  ```kotlin
  val breakStartInstant = parseInstantSafe(resolvedAttendance?.breakStartedAt)
  val elapsedBreak = if (breakStartInstant != null) {
      maxOf(0L, java.time.Duration.between(breakStartInstant, java.time.Instant.now()).seconds)
  } else 0L
  val totalBreakSeconds = baseBreakSeconds + elapsedBreak
  ```
- This guarantees absolute temporal accuracy regardless of device status.

---

## 3. Admin Web Portal (`skytrack-admin`)

### 3.1. Tech Stack & Dependencies
- **Framework**: React 19 + TypeScript (~6.0) + Vite (with Rolldown/Vite 8 bundling)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@tailwindcss/postcss`)
- **Icons & Typography**: `lucide-react`, Google Fonts (*Plus Jakarta Sans*, *Inter*)
- **State Management & Routing**: React Context (`AuthContext.tsx`), client-side tab state navigation
- **Backend Client**: `@supabase/supabase-js` v2.109+
- **Dev Server**: Vite local server running on `http://localhost:5173` with proxy to Supabase functions

### 3.2. Directory & Component Structure
```
skytrack-admin/
├── src/
│   ├── App.tsx                     # Main dashboard layout, active tab router, search bar
│   ├── main.tsx                    # React root render with AuthProvider wrapper
│   ├── contexts/
│   │   └── AuthContext.tsx         # Admin login, session expiry, role checks
│   ├── components/
│   │   ├── Sidebar.tsx             # Glassmorphic sidebar with badge counts & live status
│   │   ├── Header.tsx              # Admin avatar, live date/time, global search (⌘K)
│   │   ├── Dashboard.tsx           # Real-time workforce metrics, On Break counts, today's roster
│   │   ├── Attendance.tsx          # Master attendance ledger, On Break tab, audit panel
│   │   ├── Employees.tsx           # Workforce directory, filter pills, quick employee add
│   │   ├── EmployeeDetails.tsx     # Full profile, history, edit modal, 2FA password change
│   │   ├── LeaveManagement.tsx     # Leave approval/rejection queue with manager notes
│   │   ├── PublicHolidays.tsx      # 2026 Indian statutory holiday roster, CSV export
│   │   ├── Settings.tsx            # Admin profile and credentials management
│   │   └── ProtectedRoute.tsx      # RBAC protection guard for administrative clearance
│   └── lib/
│       ├── api.ts                  # Consolidated API functions & Supabase RPC callers
│       └── supabase.ts             # Supabase client initialization
└── supabase/
    └── functions/
        └── skytrack-api/
            └── index.ts            # Local mirror of the Supabase Edge Function
```

### 3.3. Key Features & Administrative Capabilities
1. **Real-Time Break Monitoring**:
   - `Dashboard.tsx` shows dynamic break badges on the Present card (`X on break`).
   - Attendance roster displays amber badge with pulsing dot for employees currently on break.
   - `Attendance.tsx` includes a dedicated `On Break` filter tab and counter.
   - **Focused Employee Audit Card**: Live "Currently On Break" banner showing exact break start time and live elapsed duration.
2. **Accidental Check-out Reversal (`Undo Checkout`)**:
   - If an employee accidentally punches out, admins can click "Undo Check Out" inside the Focused Employee Audit card.
   - Clears `check_out` timestamp and restores employee to active working status without altering prior check-in or break logs.
3. **Manual Check-In / Check-Out Overrides**:
   - Admins can manually set or correct check-in and check-out timestamps directly from the audit drawer.
4. **Super Admin 2FA Password Change**:
   - Inside `EmployeeDetails.tsx`, super admins can change employee passwords.
   - Requires 2FA verification (e.g., admin password or TOTP confirmation) before modifying credentials in Supabase Auth.
5. **Leave Approval Engine**:
   - Single-click approval / rejection with manager comments.
   - Automatically computes paid vs Loss of Pay (LOP) days.
   - Updates `employee_leave_balances` without violating Postgres check constraints.

---

## 4. Backend & Supabase Edge Function (`skytrack-api`)

The backend is exposed as a single consolidated Supabase Edge Function written in Deno TypeScript:
- **Root Path**: `/Volumes/Excelsior/SkyTrack/edge_function.ts`
- **Admin Mirror Path**: `/Volumes/Excelsior/SkyTrack/skytrack-admin/supabase/functions/skytrack-api/index.ts`
- **Production Endpoint**: `POST https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api`

### 4.1. Core Database Tables & Constraints
| Table Name | Key Columns | Critical Constraints & Notes |
| :--- | :--- | :--- |
| `employees` | `id` (UUID), `employee_id` (e.g. `SKY001`), `name`, `email`, `role`, `status`, `auth_user_id`, `department`, `designation` | `role` can be `employee`, `admin`, `super_admin`, `manager`. |
| `attendance` | `id` (UUID), `employee_id` (UUID), `date` (DATE), `check_in` (TIMESTAMPTZ), `check_out` (TIMESTAMPTZ), `break_started_at` (TIMESTAMPTZ), `total_break_seconds` (INT) | Only one record per employee per day (`UNIQUE(employee_id, date)`). |
| `leaves` | `id` (UUID), `request_id` (VARCHAR), `employee_id` (UUID), `leave_type` (VARCHAR), `from_date` (DATE), `to_date` (DATE), `leave_days` (NUMERIC), `paid_leave_days` (NUMERIC), `lop_days` (NUMERIC), `status` (VARCHAR) | `status` IN (`pending`, `approved`, `rejected`, `cancelled`). |
| `employee_leave_balances` | `id` (UUID), `employee_id` (UUID), `leave_type` (VARCHAR), `allocated_days` (NUMERIC), `used_days` (NUMERIC), `adjusted_days` (NUMERIC) | **CRITICAL CONSTRAINT**: `CHECK (leave_type IN ('casual', 'sick'))`. Do NOT insert `'lop'` or long strings here. |
| `public_holidays` | `id` (UUID), `name`, `holiday_date` (DATE), `type` (`gazetted` \| `restricted`) | Company-declared holidays. |
| `official_public_holidays` | `id` (UUID), `name`, `holiday_date` (DATE), `type` (`gazetted` \| `restricted`) | Statutory government holidays. |

### 4.2. Action Dispatcher Reference
The Edge Function inspects `{ "action": "<action_name>", ... }` in the POST body:

| Action Name | Target / User | Description & Key Parameters |
| :--- | :--- | :--- |
| `login` | Public | Authenticates credentials (`employeeId`, `password`), returns JWT & session DTO. |
| `attendance_today` | Employee | Returns today's attendance record, current break status, and total break time. |
| `start_work` | Employee | Clocks in employee with current timestamp. |
| `end_work` | Employee | Clocks out employee. Rejects if an active break is currently running. |
| `start_break` | Employee | Sets `break_started_at = NOW()`. |
| `resume_work` / `end_break` | Employee | Computes `elapsed = NOW() - break_started_at`, adds to `total_break_seconds`, clears `break_started_at`. |
| `admin_undo_checkout` | Admin | Clears `check_out` timestamp for an employee's daily attendance record. |
| `admin_manual_attendance` | Admin | Manually sets or overrides `check_in` and `check_out` times. |
| `leave_submit` | Employee | Submits a leave request (`type`, `from`, `to`, `reason`, `is_half_day`). |
| `approve_leave` | Admin | Approves leave (`requestId`, `managerComment`). Normalizes type to `casual`/`sick`/`lop`, updates balances safely. |
| `reject_leave` | Admin | Rejects leave request and records rejection reason. |
| `cancel_leave` | Employee | Cancels own pending leave request. |
| `super_admin_change_employee_password` | Super Admin | Updates employee's auth password via Supabase Admin Auth API. |
| `attendance_feed` / `attendance_punches` | Admin | Returns activity stream of punches and breaks for the dashboard. |
| `attendance_monthly` | Employee/Admin | Aggregates daily punch records and hours worked for a given month/year. |
| `public_holidays` | All | Returns merged official and company holiday schedule. |

---

## 5. Critical Guidelines & Gotchas for AI Agents

> [!IMPORTANT]
> **The Dual Edge Function Rule**:
> `/Volumes/Excelsior/SkyTrack/edge_function.ts` and `/Volumes/Excelsior/SkyTrack/skytrack-admin/supabase/functions/skytrack-api/index.ts` must **ALWAYS** remain 100% identical. Whenever you edit one, immediately sync the other!

> [!WARNING]
> **Leave Balance Check Constraint**:
> In PostgreSQL, `employee_leave_balances` enforces:
> `CHECK (leave_type IN ('casual', 'sick'))`
> - Never write `Casual Leave`, `Sick Leave`, or `Loss of Pay` directly into `employee_leave_balances`.
> - Always normalize types using canonical lowercase keys: `'casual'`, `'sick'`, `'lop'`.
> - Loss of Pay (`'lop'`) does NOT have a row in `employee_leave_balances`; it only updates `leaves.lop_days`.

> [!TIP]
> **Break Elapsed Time Calculation**:
> When querying if someone is on break:
> - If `break_started_at IS NOT NULL` and `check_out IS NULL`, the employee is currently **On Break**.
> - Live Break Seconds = `total_break_seconds + (NOW() - break_started_at)`.
> - When resuming work: add the elapsed difference into `total_break_seconds` and set `break_started_at = NULL`.

---

## 6. Development & Deployment Commands

### Admin Portal (`skytrack-admin`)
```bash
# Run local dev server (port 5173)
npm run dev

# Run full TypeScript validation & production build
npm run build

# Push commits to remote
git add . && git commit -m "your message" && git push origin main
```

### Android App (`SkyTrack_01`)
```bash
# Clean & assemble debug APK
./gradlew clean assembleDebug

# Run unit tests
./gradlew test
```

### Supabase Edge Function (`skytrack-api`)
```bash
# Deploy updated edge function to Supabase
supabase functions deploy skytrack-api

# Or copy edge_function.ts directly into Supabase Cloud Console -> Edge Functions -> skytrack-api
```
