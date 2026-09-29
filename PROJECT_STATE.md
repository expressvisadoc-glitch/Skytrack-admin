# SkyTrack Admin Portal — Project Working State & Changelog

> **Document Status**: Living Documentation  
> **Last Updated**: September 26, 2026  
> **Application Version**: Enterprise v2.4.0  
> **Organization**: Skypass Visa Services  

---

## 1. Project Overview

**SkyTrack Admin Portal** is an enterprise web administration dashboard built for **Skypass Visa Services**. It provides real-time monitoring and administrative management of workforce operations, attendance logs, leave submissions, employee directory records, and portal security.

---

## 2. Technology Stack & Architecture

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Framework & Core** | [React 19.2.8](https://react.dev/), [TypeScript ~6.0.2](https://www.typescriptlang.org/), [Vite 8.3.0](https://vite.dev/) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite`, `@tailwindcss/postcss`, `@tailwindcss/forms`, `@tailwindcss/container-queries` |
| **Icons & Typography** | Google Fonts ([Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), [Inter](https://fonts.google.com/specimen/Inter)), Google Material Symbols Outlined, [lucide-react](https://lucide.dev/) |
| **Routing & Navigation** | Client-side tab-based state navigation (`App.tsx`) with `react-router-dom 7.18.4` available |
| **Backend & Cloud Services** | [Supabase](https://supabase.com/) (`@supabase/supabase-js 2.109.0`), Supabase Edge Functions (`skytrack-api`), Supabase Postgres with Row Level Security (RLS) |
| **Dev Server & Proxy** | Vite dev proxy forwarding `/api/skytrack` to Supabase Edge Function |

---

## 3. Current Working State by Module

### 3.1. Authentication & Security
- **Files**:
  - [`src/contexts/AuthContext.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/contexts/AuthContext.tsx)
  - [`src/components/Login.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Login.tsx)
  - [`src/components/ProtectedRoute.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/ProtectedRoute.tsx)
  - [`supabase/migrations/20260101000000_admin_roles.sql`](file:///Volumes/Excelsior/skytrack-admin/supabase/migrations/20260101000000_admin_roles.sql)
- **Status**: **Working & Active**
- **Features**:
  - Edge function authentication via `loginWithSkyTrack`.
  - Role-Based Access Control (RBAC): enforces administrative clearance (`admin`, `super_admin`, `administrator`, `system_admin`, `manager`, or `is_admin: true`). Non-admin employees receive explicit access denial screens.
  - Session management supporting "Remember this device" (`localStorage` vs `sessionStorage`) with token expiration validation.
  - Automatic session restore on app launch and graceful session-expired logout handlers.

### 3.2. Layout & Shell
- **Files**:
  - [`src/App.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/App.tsx)
  - [`src/components/Sidebar.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Sidebar.tsx)
  - [`src/components/Header.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Header.tsx)
- **Status**: **Working & Active**
- **Features**:
  - Fixed modern glassmorphic sidebar with brand logo, live connection status indicator (`Online Link v2.4.0 • Live`), active tab highlight, and dynamic badge counters.
  - Global top header with operational status pill, date indicator, live notifications icon, and administrator avatar/profile summary.
  - Global search bar with `⌘K` keyboard shortcut support.

### 3.3. Dashboard Module
- **Files**:
  - [`src/components/Dashboard.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Dashboard.tsx)
  - [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) (`getAdminDashboardData`)
- **Status**: **Working & Active**
- **Features**:
  - Real-time KPI Metric cards: Total Employees, Present Today %, Absent Today %, On Leave, and Pending Leave Requests.
  - Filterable Today's Attendance table (All, Present, Late, Absent, Leave).
  - Quick Pending Leave Requests drawer/modal with one-click approval/rejection actions.
  - Comprehensive skeleton loader matching the production layout for smooth perceived performance.

### 3.4. Workforce / Employees Registry
- **Files**:
  - [`src/components/Employees.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Employees.tsx)
  - [`src/components/EmployeeDetails.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/EmployeeDetails.tsx)
  - [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) (`getEmployeesDirectory`, `getEmployeeHistory`, `updateEmployeeDetails`)
- **Status**: **Working & Active**
- **Features**:
  - Employee list and directory with live search (name, employee code, role, department).
  - Quick category tabs (`All`, `Present`, `Leave`, `Absent`) with dynamic headcount counters.
  - Deep-dive Employee Detail view:
    - Profile header with photo, designation, department, contact info, and status tag.
    - Attendance history ledger and leave history logs.
    - "Edit Details" modal allowing updates to name, department, role, email, phone, and account status with instant sync to the Supabase database.

### 3.5. Daily Attendance Module
- **Files**:
  - [`src/components/Attendance.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Attendance.tsx)
  - [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) (`getDailyAttendance`)
- **Status**: **Working & Active**
- **Features**:
  - Daily workforce attendance logs with date selector.
  - Metric breakdown counters (`Present`, `Late`, `Absent`, `Half Day`, `Leave`).
  - Attendance record inspection side-panel detailing check-in/out timestamps and work duration.
  - Export attendance report action with UI notification.

### 3.6. Leave Management Module
- **Files**:
  - [`src/components/LeaveManagement.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/LeaveManagement.tsx)
  - [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) (`getLeaveSubmissions`, `updateLeaveStatus`)
- **Status**: **Working & Active**
- **Features**:
  - Complete leave requests repository with status categorization (`Pending`, `Approved`, `Rejected`, `Cancelled`).
  - Search filter across employee names, IDs, and leave reasons.
  - Leave detail inspector showing dates, duration, reason, employee notes, and review history.
  - Action buttons to Approve, Reject, or Cancel leave requests with immediate server updates.

### 3.7. Public Holidays Management Module
- **Files**:
  - [`src/components/PublicHolidays.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/PublicHolidays.tsx)
  - [`src/components/Sidebar.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Sidebar.tsx)
  - [`src/App.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/App.tsx)
  - [`src/index.css`](file:///Volumes/Excelsior/skytrack-admin/src/index.css)
- **Status**: **Working & Active**
- **Features**:
  - Official 2026 Indian Holiday Schedule preloaded with statutory Gazetted National and Restricted/Optional holidays (26 total: 14 gazetted, 12 restricted).
  - Streamlined 3-card Bento Metric Pods: Gazetted Holidays (14 closed days), Restricted/Optional count (12 options), and Upcoming Holiday countdown pill (Gandhi Jayanti with dynamic remaining days).
  - Multi-tab navigation: All Holidays, Gazetted National, Restricted / Optional, Regional Observances, and an Annual Holiday Calendar Matrix view (Q1–Q4 quarterly distribution cards).
  - Focused glass filter toolbar with live search and dual classification dropdown (`Gazetted National` and `Restricted Holiday`).
  - Interactive table with active row highlighting, status badges, branch coverage progress bars, edit populator, and deletion confirmation.
  - Streamlined "Declare / Edit Public Holiday" form dossier: Holiday Name, Date with auto-computed Day of Week, and dual classification buttons (`Gazetted` vs `Restricted`).
  - Export Holiday Schedule CSV generation (`SkyTrack_Indian_Public_Holidays_2026.csv`).
  - Persistent state synchronization using `localStorage`.

### 3.8. Settings & Account Profile
- **Files**:
  - [`src/components/Settings.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Settings.tsx)
  - [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) (`getAdminProfile`, `updateAdminPassword`)
- **Status**: **Working & Active**
- **Features**:
  - Admin identity card and system role details.
  - Admin password reset with validation (length verification, confirmation match).
  - System environment and connection status view.
  - Secure sign-out with confirmation modal dialog.

---

## 4. API & Integration Surface

All backend interactions are consolidated in [`src/lib/api.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/api.ts) and [`src/lib/supabase.ts`](file:///Volumes/Excelsior/skytrack-admin/src/lib/supabase.ts):

| Function | Endpoint / Target | Description |
| :--- | :--- | :--- |
| `loginWithSkyTrack` | `POST /functions/v1/skytrack-api` (`action: "login"`) | Authenticates credentials and returns session tokens |
| `getAdminDashboardData` | `POST /functions/v1/skytrack-api` or REST fallback | Retrieves aggregated KPI metrics and today's attendance |
| `getEmployeesDirectory` | `POST /functions/v1/skytrack-api` or REST fallback | Lists all staff records with attendance status |
| `getEmployeeHistory` | `POST /functions/v1/skytrack-api` or REST fallback | Loads attendance punch logs and leave requests for a single employee |
| `getDailyAttendance` | `POST /functions/v1/skytrack-api` or REST fallback | Fetches day-specific attendance roster |
| `getLeaveSubmissions` | `POST /functions/v1/skytrack-api` or REST fallback | Fetches leave submissions across all staff |
| `updateLeaveStatus` | `POST /functions/v1/skytrack-api` or REST `leave_requests` | Updates status (`Approved`, `Rejected`, `Cancelled`) |
| `getAdminProfile` | REST `/rest/v1/employees` | Retrieves authenticated administrator profile |
| `updateAdminPassword` | `POST /functions/v1/skytrack-api` (`action: "changePassword"`) | Updates administrator login password |
| `updateEmployeeDetails` | REST `/rest/v1/employees` or Edge function | Edits employee directory attributes |

---

## 5. Maintenance Rule: Updating This Document

Whenever modifications, additions, or refactors are made to the codebase:
1. **Locate this file**: [`PROJECT_STATE.md`](file:///Volumes/Excelsior/skytrack-admin/PROJECT_STATE.md).
2. **Update the relevant module section**: Update status, component descriptions, or new capabilities.
3. **Record an entry in the Change Log below**: Include the timestamp, modified files, summary of changes, and rationale.

---

## 6. Change Log

### [2026-09-27] — Official Government Holidays Integration
- **Author**: Antigravity Assistant & User
- **Scope**: Backend sync mechanism and Component Architecture
- **Details**:
  - Designed and documented a Supabase Edge Function `sync-official-holidays` to securely fetch authoritative holiday datasets (e.g. Nager.Date) and import them into `official_public_holidays`.
  - Refactored `PublicHolidays.tsx` to dynamically query and combine both `official_public_holidays` (read-only government holidays) and `public_holidays` (company-declared holidays) using the Supabase client.
  - Implemented dynamic UI safeguards in `PublicHolidays.tsx`: editing and deletion functions are disabled for official government holidays, maintaining data integrity.
  - Updated all temporal references in `PublicHolidays.tsx` to dynamically reference the current calendar year (`new Date().getFullYear()`) ensuring the module remains functional across calendar years without hardcoded updates.


### [2026-09-26] — Public Holidays Layout & Form Streamlining
- **Author**: Antigravity Assistant & User
- **Scope**: Screen Refinement & Simplification
- **Details**:
  - Streamlined the "Declare Public Holiday" form dossier in [`src/components/PublicHolidays.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/PublicHolidays.tsx) to focus on Holiday Name, Date (auto-calculating Day of Week), and dual classification (`Gazetted` vs `Restricted`).
  - Removed supplementary branch checkboxes, manual compensatory toggle, and circular inputs from the declaration form for faster input workflow.
  - Refactored Bento Pods to a balanced 3-card layout: Gazetted Holidays (14 Mandatory), Restricted / Optional (12 Choices), and Upcoming Holiday countdown.
  - Simplified the type filter dropdown to `All Types`, `Gazetted National`, and `Restricted Holiday`.
  - Re-aligned full schedule to 14 Gazetted and 12 Restricted holidays (26 total).
  - Validated production build (`tsc -b && vite build`) with zero errors.

### [2026-09-26] — Public Holidays Management Screen & Navigation
- **Author**: Antigravity Assistant
- **Scope**: Feature Addition & Layout Expansion
- **Details**:
  - Implemented the complete **Public Holidays Management** module ([`src/components/PublicHolidays.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/PublicHolidays.tsx)) based on the enterprise HTML specification.
  - Added Bento Metric Glass Pods (Gazetted Holidays, Restricted/Optional, Upcoming Holiday countdown, Regional Hubs).
  - Implemented multi-mode filtering (Pill tabs, search filter, classification dropdown, regional hub dropdown).
  - Integrated Holiday Calendar Matrix quarterly view (Q1-Q4).
  - Built interactive "Declare Public Holiday" / "Edit Holiday" dossier form with automatic day-of-week calculation, multi-hub coverage checkboxes, and paid holiday toggle.
  - Built CSV holiday schedule export action (`SkyTrack_Indian_Public_Holidays_2026.csv`).
  - Added `'public-holidays'` to [`Sidebar.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/components/Sidebar.tsx) navigation and mapped routes in [`App.tsx`](file:///Volumes/Excelsior/skytrack-admin/src/App.tsx).
  - Added Tailwind v4 theme variables for `slateDock-900`, `slateDock-800`, `slateDock-700`, `shadow-dock`, and `shadow-glow-red` in [`index.css`](file:///Volumes/Excelsior/skytrack-admin/src/index.css).
  - Validated production build (`tsc -b && vite build`) with zero errors.

### [2026-09-26] — Project State Initialization & Architecture Audit
- **Author**: Antigravity Assistant
- **Scope**: Documentation & State Tracking
- **Details**:
  - Established `PROJECT_STATE.md` documenting all active components, layouts, APIs, and authorization layers.
  - Audited current application modules: Authentication (`AuthContext`, `Login`, `ProtectedRoute`), Layout (`Sidebar`, `Header`), Dashboard, Employees & Details (`Employees`, `EmployeeDetails`), Daily Attendance (`Attendance`), Leave Management (`LeaveManagement`), and Settings (`Settings`).
  - Documented Supabase integration endpoints, database migrations, and build configurations.
