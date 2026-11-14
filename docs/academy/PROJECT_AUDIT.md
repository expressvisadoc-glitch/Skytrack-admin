# SkyTrack Academy — Phase 0: Project Audit

**Purpose:** record the SkyTrack implementation as it actually is, before any Academy work begins.
**Method:** read from the codebase and the staging database on branch `ddev/tutorial` (branched from `production`).
Statements here were verified against source or a live query, not against the product overview.
**Date:** 14 November 2026 · **Behaviour changed:** none.

---

## 1. Repository layout

Two repositories plus a shared Edge Function source:

| Path | Contents |
| :--- | :--- |
| `skytrack-admin/` | React web application (admin portal + employee portal) and the Supabase migrations |
| `SkyTrack_01/` | Android employee application (Kotlin / Jetpack Compose) |
| `edge_function.ts` (repo root) | Mirror of `skytrack-admin/supabase/functions/skytrack-api/index.ts`; the two **must stay byte-identical** |

---

## 2. Frontend framework and build

| Item | Verified value |
| :--- | :--- |
| Framework | React **19.2.8** with TypeScript (`typescript ~6.0.2`) |
| Bundler | Vite **8.3** with the Rolldown compiler |
| Styling | Tailwind CSS **v4** via `@tailwindcss/vite`, plus `src/index.css` (165 CSS custom properties) |
| Icons | Material Symbols (`material-symbols-outlined`, 262 usages) and `lucide-react` |
| Routing | `react-router-dom` **7.18** — but see §3, the app is **not** route-driven |
| Backend client | `@supabase/supabase-js` 2.109 and a consolidated `src/lib/api.ts` |

### Design system

There is a lightweight house style rather than a component library:

- **Glassmorphic surfaces** — the `.glass-panel` / `.glass-card` classes (59 usages) defined in `src/index.css`.
- **Theme** — light/dark via a `.dark` class on the document root, declared with Tailwind v4's
  `@custom-variant dark (&:where(.dark, .dark *))`. Toggled by `ThemeToggle.tsx` in the header.
- **Tables** — a shared `.item-list` class (19 usages).
- **No design-token package, no Storybook, no component catalogue.** An Academy UI must follow the existing
  classes by hand.

---

## 3. Routing structure — important for integration

**The application is tab-state driven, not router driven.** `react-router-dom` is installed and
`ProtectedRoute` is used, but `App.tsx` renders screens from a single `activeTab` string through a long
ternary chain (`App.tsx:130–157` for admin, `App.tsx:195–210` for employee). The URL is kept in sync manually:

```
App.tsx:103   const targetPath = (tab === 'dashboard' || tab === 'home') ? '/' : `/${tab}`
```

and the initial tab is derived back from the path (`App.tsx:56–62`).

**Consequence for the Academy:** adding a screen means adding an `activeTab` branch in `App.tsx` *and* a
sidebar entry — not registering a route. Deep links work only for paths the `getInitialTab` mapping knows.

---

## 4. Authentication and session

- `src/contexts/AuthContext.tsx` holds the session, persists it, auto-restores on load and resolves the role.
- Sign-in accepts an **employee ID** (`SKY001`) or an email, with a password, through the `login` action.
- `ProtectedRoute` guards the admin tree with a single `adminOnly` boolean.

---

## 5. Role and permission system — **a mismatch worth flagging**

The database allows four roles (`employees.role`): `employee`, `manager`, `admin`, `super_admin`.

| Layer | Treatment |
| :--- | :--- |
| **Frontend** (`AuthContext.tsx:116`) | `adminRoles = ['admin', 'super_admin', 'superadmin', 'administrator', 'system_admin', 'manager']` → **`manager` is given the full admin portal** |
| **Backend** (`index.ts:1746`) | `isAdminRole()` returns true only for `admin` and `super_admin`. The string `'manager'` appears **zero** times as a privileged role |

So an employee whose role is `manager` would see every admin page — Dashboard, Employees, Payroll, Payroll
Settings — and every admin API call would return **403**. The UI would load and then fail.

**Current exposure: latent, not active.** No account in staging holds the `manager` role today
(roles present: `super_admin`, `admin`, `employee`). Creating one would expose the mismatch immediately.

Only `super_admin` gets an extra UI item: **Admin Management** (`Sidebar.tsx:26`).

**Consequence for the Academy:** there is **no manager portal to document**. The brief's "Manager dashboard"
does not exist. Academy content should be authored for three audiences — employee, admin, super admin — and the
role mismatch should be resolved as product work before any manager-specific material is written.

---

## 6. Portal separation

One build serves two portals, chosen by role at sign-in:

- **Admin command centre** — `/`, `/employees`, `/attendance`, … rendered inside `SidebarFrame` + `Header`.
- **Employee portal** — `/employee`-style tabs rendered inside `EmployeeSidebar` + `EmployeeHeader`.

Employees who sign in on the web get feature parity with the Android app.

---

## 7. Reusable components available to the Academy

| Component | Exports | Useful for |
| :--- | ---: | :--- |
| `Skeleton.tsx` | 6 | loading states (`SkeletonPage`, `SkeletonLines`, …) |
| `EmptyState.tsx` | 1 | "nothing here yet" panels |
| `SidebarFrame.tsx` | 2 | the collapsible shell both portals sit in |
| `GlassBackdrop.tsx` | 1 | the glass background treatment |
| `ThemeToggle.tsx` | 1 | light/dark switch |
| `ShortcutArrow.tsx` | 1 | inline "jump to this screen" affordance — **a natural hook for contextual help** |
| `NotificationPanel.tsx` | 3 | the header bell panel |
| `ProtectedRoute.tsx` | 1 | role gate |

**Modal pattern:** there is no `<Modal>` component. Fifteen screens hand-roll dialogs with
`fixed inset-0 … backdrop-blur` (`Payroll`, `Employees`, `Settings`, `EmployeeDetails`, `Dashboard`,
`PayrollSettings`, `Login`, `Attendance`, `OfficeGeofence`, `EmployeeLeaves`, and others). An Academy overlay
should either extract a shared modal or copy this pattern for consistency.

---

## 8. Notification system — two different things share the name

| | On `main` (production) | On `production` branch |
| :--- | :--- | :--- |
| `NotificationPanel.tsx` imports | `getLeaveSubmissions`, `approveLeave`, `rejectLeave`, `getAttendancePunchFeed` | `getNotifications` |
| What the bell shows | pending leave requests + a live punch feed + password-reset requests | rows from the `notifications` table |

The production bell is an **activity panel**, not a notification inbox. The real notification system
(`notifications` table, 23 types, FCM push, `notifications_dispatch` driven by `pg_cron`) exists only on the
`production` branch and in staging.

**Consequence for the Academy:** an "announce new training" feature cannot reuse a production notification
system, because one is not live yet.

---

## 9. Backend architecture

- **Single Edge Function, action router.** `POST /functions/v1/skytrack-api` with `{"action": "..."}`.
  **59 distinct actions** on this branch (verified by parsing the router).
- Runs under the **service role**, so it bypasses RLS and is itself the authorisation boundary — every handler
  calls `ensureAdmin` / `isAdminRole` as appropriate.
- Clients never write HR tables directly; the web app uses the Supabase SDK directly only for
  `public_holidays` / `public_holiday_branches`.

### Database — 27 tables in staging

`attendance`, `attendance_breaks`*, `attendance_late_marks`, `attendance_location_events`,
`attendance_security_events`†, `attendance_security_settings`†, `departments`, `device_tokens`,
`employee_devices`†, `employee_leave_balances`, `employees`, `leave_accruals`,
`leave_balance_transactions`, `leaves`, `notifications`, `office_geofence_settings`,
`office_geofence_settings_history`, `payroll_policy`, `payroll_policy_history`, `payroll_run_events`,
`payroll_runs`, `payslips`, `public_holiday_branches`, `public_holidays`, `salary_estimate_snapshots`,
`salary_structures`, `work_shifts`.

\* `attendance_breaks` is **dead schema** — 0 rows, written by no function and referenced by no code.
† check-in security tables, present in staging but not on this branch.

Row Level Security is on throughout: employees read their own rows, active admins read all
(`is_active_admin()`), nobody writes directly.

### Migrations

13 files on this branch; **6** have been applied to production. The other 7 carry geofencing, payroll,
notifications and the RLS hardening.

---

## 10. Environments

| | Production | Staging |
| :--- | :--- | :--- |
| Supabase | `cwtrrtbodqctntkpnjlv` (Tokyo) | `npwwwapbbvkvteycxaab` (Singapore) |
| Web | Cloudflare, built from `main` | `wrangler.staging.jsonc` → separate worker |
| Android | `com.skypass.skytrack` (release) | `com.skypass.skytrack.staging` |
| Config | — | `.env.staging.local`, `.env.development.local` (both git-ignored) |

All development and testing uses staging. **An Academy build must follow the same rule.**

---

## 11. Findings that affect Academy planning

1. **No manager portal exists** (§5). The brief assumes one.
2. **Navigation is tab-state, not routes** (§3) — integration is an `App.tsx` edit plus a sidebar entry.
3. **No shared modal or component library** (§7) — an Academy overlay must bring its own, styled to match.
4. **The production bell is not a notification system** (§8).
5. **The admin sidebar already has 10–11 items** (§ NAVIGATION_MAP). Adding "Academy" as a 12th needs a
   deliberate placement decision rather than an append.
6. **Most of what the Academy would teach is not in production yet** — geofencing, payroll, payslips and
   notifications are all on the `production` branch. Content written now would describe software employees
   cannot yet use.
