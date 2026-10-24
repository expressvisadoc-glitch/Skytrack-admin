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
│       │   └── 20261025000000_office_geofence.sql # Office geofence settings, location events, atomic attendance RPC
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

### 4.3. Office Geofencing
Check-in and check-out go through `attendance_action_with_location`, which reads the latest `office_geofence_settings`, validates the submitted fix (accuracy, freshness, timestamp, mock flag), checks the radius, calls the existing attendance RPC and records an `attendance_location_events` row in one transaction. Missing or inactive settings block check-in/out (HTTP 409). Location rejections return HTTP 422 with `error` codes such as `outside_geofence`. Full policy, error codes and rollout steps: [docs/OFFICE_GEOFENCING.md](docs/OFFICE_GEOFENCING.md).

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
  Supabase cwtrrtbodqctntkpnjlv                  New Supabase project <STAGING_REF>
  Cloudflare site (main)                         Local web: npm run dev --mode staging
  Android "SkyTrack" (com.skypass.skytrack)      Android "SkyTrack Staging" (…skytrack.staging)
```

### 7.1. Safety rules (read first)
1. **Do not merge** `feature/office-geofencing` into `main` (web) or `development` / `main` (Android) until
   staging sign-off. The Cloudflare site deploys from `main`.
2. **The Supabase CLI in `skytrack-admin` is linked to PRODUCTION** (`supabase/.temp/linked-project.json`).
   Never run `supabase db push`, `supabase functions deploy` or `supabase link` without an explicit
   `--project-ref <STAGING_REF>` / staging `--db-url`. Re-read the ref before pressing Enter.
3. **Do not paste the root `/Volumes/Excelsior/SkyTrack/edge_function.ts` into the production console.** It now
   contains the geofencing version, which fails every attendance action on a database without the migration.
   To redeploy the current production function, use the `main` version:
   `git -C skytrack-admin show main:supabase/functions/skytrack-api/index.ts`.
4. **Do not publish a GitHub Release** from the Android feature branch — the in-app update checker would offer it
   to every employee.
5. **Do not install a `debug` or `release` build of the feature branch on an employee's phone.** Those variants
   use the production API and the production application id (they replace the real app). Use only the
   `staging` variant.
6. **Do not use a Cloudflare preview deploy** for testing: `worker.ts` proxies `/api/skytrack` to production.
7. Never commit staging secrets. `.env.*` files are git-ignored; keep the Android URL in `~/.gradle/gradle.properties`.

### 7.2. Create the staging backend
1. **New Supabase project** (free tier is enough): Dashboard → New project, e.g. `skytrack-staging`. Note its
   project ref `<STAGING_REF>`, the anon/publishable key, and the database connection string.
2. **Copy the production schema (read-only, no data).** Production RPCs (`start_work`, `end_work`, `start_break`,
   `resume_work`) are not in the repo, so they must come from a dump:
   ```bash
   brew install libpq   # provides pg_dump / psql (Docker-free)
   export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
   # Production connection string: Dashboard (production) → Connect → Session pooler. This is a READ of the schema only.
   pg_dump "<PRODUCTION_DB_URL>" --schema-only --schema=public --no-owner --no-privileges -f ~/skytrack_prod_schema.sql
   psql "<STAGING_DB_URL>" -v ON_ERROR_STOP=1 -f ~/skytrack_prod_schema.sql
   ```
   Keep `~/skytrack_prod_schema.sql` outside the repo.
3. **Apply the new migration to staging only:**
   ```bash
   psql "<STAGING_DB_URL>" -v ON_ERROR_STOP=1 \
     -f skytrack-admin/supabase/migrations/20261025000000_office_geofence.sql
   ```
   If it stops with `office_geofence migration requires existing function public.start_work(uuid)`, the production
   RPC signature differs from what the migration expects — stop and review before going further.
4. **Seed test accounts.** In staging: Authentication → Users → Add user (auto-confirm) for e.g.
   `admin.test@…`, `emp1.test@…`, `emp2.test@…` with passwords. Then in the SQL editor (add any other NOT NULL
   columns your `employees` table requires):
   ```sql
   INSERT INTO public.employees (employee_id, name, email, role, status) VALUES
     ('TST-ADMIN', 'Test Admin', 'admin.test@example.com', 'admin', 'active'),
     ('TST-001', 'Test Employee 1', 'emp1.test@example.com', 'employee', 'active'),
     ('TST-002', 'Test Employee 2', 'emp2.test@example.com', 'employee', 'active');
   ```
   `auth_user_id` is linked automatically on first login (matched by email).
5. **Deploy the Edge Function to staging** (from `skytrack-admin` on the feature branch):
   ```bash
   cd skytrack-admin && git checkout feature/office-geofencing
   diff -u ../edge_function.ts supabase/functions/skytrack-api/index.ts   # must print nothing
   npx supabase@latest functions deploy skytrack-api --project-ref <STAGING_REF> --no-verify-jwt
   ```
   `--no-verify-jwt` matches production (the `login` action is called without a user JWT). Double-check the
   output names `<STAGING_REF>`, not `cwtrrtbodqctntkpnjlv`.

### 7.3. Run the web app against staging (local only)
Create `skytrack-admin/.env.staging.local` (git-ignored):
```bash
VITE_SUPABASE_URL=https://<STAGING_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
VITE_SKYTRACK_API_URL=/api/skytrack
# Points the local /api/skytrack dev proxy at staging (vite.config.ts; default is production)
SKYTRACK_PROXY_TARGET=https://<STAGING_REF>.supabase.co/functions/v1/skytrack-api
```
```bash
npm run dev -- --mode staging      # http://localhost:5173 (localhost counts as HTTPS for geolocation)
```
**Verify before testing**: DevTools → Network: every `api/skytrack` / `functions/v1` / `auth/v1` request must go
to `localhost:5173` or `<STAGING_REF>.supabase.co`, never `cwtrrtbodqctntkpnjlv`. All four variables are needed:
the API client falls back to `/api/skytrack` and the Supabase client uses `VITE_SUPABASE_URL`.

Simulate locations in Chrome: DevTools → ⋮ → More tools → **Sensors** → Location → custom latitude/longitude.

### 7.4. Run the Android app against staging (side by side with production)
```bash
# ~/.gradle/gradle.properties (not committed)
skytrackStagingApiUrl=https://<STAGING_REF>.supabase.co/functions/v1/skytrack-api
```
```bash
cd SkyTrack_01 && git checkout feature/office-geofencing   # stash local WIP first if needed
./gradlew testStagingUnitTest installStaging
```
This installs **"SkyTrack Staging"** (`com.skypass.skytrack.staging`, version `1.0.0-staging`) next to the
production app; it cannot overwrite or log out the real app. Prefer the emulator first:
Extended controls (⋯) → **Location** → set a point → Send. On a physical test phone, walk in and out of the radius.
If the update checker offers the production release inside the staging app, dismiss it.

### 7.5. Test checklist (record pass/fail)
| # | Area | Steps | Expected |
| :-- | :--- | :--- | :--- |
| 1 | Missing config | Before saving any settings, check in (web & Android) | Rejected (409): "office location has not been configured"; no attendance row created |
| 2 | Admin access | Log in as `TST-001`, open `/office-geofence` URL; call `admin_save_geofence_settings` via curl with employee token | Employee lands in employee portal; API returns 403 `forbidden` |
| 3 | Validation | As admin enter lat 91, lng 200, radius 5 / 5001 / 100.5, accuracy 1000, 0,0 | Inline errors; nothing saved. Same values via curl → 400 `invalid_geofence_settings` |
| 4 | Save & reload | Save office coords, radius 100; reload page | Values, ACTIVE badge, "Changed by Test Admin", time and history row shown |
| 5 | Inside | Simulate ~40 m from office; check in | Card "You appear to be at the office"; check-in succeeds |
| 6 | Outside | Simulate ~150 m; check out | Rejected "about 150 m … 100 m radius"; still checked in |
| 7 | Radius change, no app update | Admin sets radius 200; retry the same 150 m checkout | Succeeds without reinstalling or rebuilding |
| 8 | Location change | Admin moves office 1 km; check in from old spot, then new spot | Old spot rejected (~1000 m), new spot accepted |
| 9 | Inactive | Admin unticks Geofence active | Check-in/out rejected "disabled by your administrator"; breaks still work |
| 10 | Breaks outside | Check in inside, move 2 km, start & resume break | Both succeed; rows in `attendance_location_events` with `geofence_enforced = false` and coordinates |
| 11 | Break rules kept | Start break, try to check out | Existing "end your break first" message |
| 12 | Permission denied | Android: deny permission at check-in; web: block location for the site | Clear message; Android card shows Allow / App settings |
| 13 | Location off | Android: turn off location services | Card "Location services are off" + Turn on location |
| 14 | Poor accuracy / stale | Emulator: low-accuracy fix, or admin sets max accuracy 5 m | "Location accuracy is low" (card) and server rejection `location_accuracy_too_low` |
| 15 | Mock location | Physical phone with a mock-location app | Check-in rejected `mock_location_detected` |
| 16 | Offline | Airplane mode, tap check-in; then start a break | Check-in: "needs an internet connection"; break queued and synced when back online |
| 17 | Timeout | Emulator with no location sent, indoors device | "Couldn't get your location in time" + Retry |
| 18 | Duplicate / concurrent | Double-tap check-in; check in on web and Android at the same moment | Exactly one check-in; second gets the existing "already started" error |
| 19 | Direct bypass | `curl https://<STAGING_REF>.supabase.co/rest/v1/rpc/start_work` with anon key + employee JWT; try `UPDATE office_geofence_settings` via REST | `permission denied` / 401–403; settings unchanged |
| 20 | Old clients | Call `start_work` without `location` (simulates current production app) | 422 `location_required` "please update the app" |
| 21 | Regression | Admin manual attendance, undo checkout, dashboard On Break count, monthly summary, leave flows, break timer after app kill | Unchanged behaviour |

Useful staging queries:
```sql
SELECT action, outcome, reason_code, location_status, round(distance_m) AS m, accuracy_m, received_at
FROM attendance_location_events ORDER BY received_at DESC LIMIT 20;
SELECT * FROM office_geofence_settings_history ORDER BY changed_at DESC;
```

### 7.6. After staging sign-off
1. Open PRs from `feature/office-geofencing` (do not merge yet) for review.
2. Production rollout order and the brief "blocked until configured" window are in
   [docs/OFFICE_GEOFENCING.md → Rollout](docs/OFFICE_GEOFENCING.md#rollout-manual-steps). Ship web + Android first
   (they work against the current backend), then migration, Edge Function, and configure the office immediately.
3. **Rollback**: redeploy the `main` version of the Edge Function (rule 3 above). The migration is additive; the old
   function uses the service role, so it keeps working with the new tables and revoked RPC grants in place.
4. **Cleanup**: delete or pause the staging project, remove `.env.staging.local`, the `skytrackStagingApiUrl`
   property, the schema dump, and uninstall "SkyTrack Staging".
