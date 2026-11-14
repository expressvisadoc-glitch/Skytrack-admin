# SkyTrack Academy — Phase 0: Integration Plan

Where an in-app Academy can attach to SkyTrack, what each option costs, and what must be decided before
Phase 1. **No application behaviour has been changed.** **Date:** 14 November 2026.

---

## 1. Constraints inherited from the audit

| Constraint | Consequence |
| :--- | :--- |
| Navigation is `activeTab` state, not routes (`PROJECT_AUDIT.md` §3) | A new screen = a branch in `App.tsx` + a sidebar entry + an entry in `getInitialTab`. Not a `<Route>`. |
| Two portals, one build | Any global element must be added **twice** — admin shell and employee shell — or lifted into a shared wrapper. |
| No shared modal or component library | An Academy overlay must bring its own, styled with `.glass-panel` and Material Symbols to match. |
| No manager portal (§5) | Author for three audiences: employee, admin, super admin. |
| 4 of 8 headline features are not in production | Content for geofencing, payroll, payslips, notifications must be gated or held. |
| Staging-only development rule | Build and test the Academy against staging, as with every other feature. |

---

## 2. Integration points

### 2.1 Employee portal — a sixth sidebar item

**Where:** `EmployeeSidebar.tsx:18–22`, plus an `activeTab === 'academy'` branch in `App.tsx:195–210`.

```
{ id: 'academy', label: 'Help & Training', icon: 'school' }
```

**Cost:** low. Five items become six; the sidebar has room.
**Value:** high — this is where new joiners live.
**Recommended: yes.**

### 2.2 Admin portal — a sidebar item, with a placement decision

**Where:** `Sidebar.tsx:16–26`, plus a branch in `App.tsx:130–157`.

The admin sidebar already carries **10 items (11 for super admins)**. Appending a 12th makes a long list
longer. Two options:

- **(a) Append "Academy"** at the end, after Payroll Settings. Simple; slightly buries it.
- **(b) Pin it to the sidebar footer**, visually separated from the operational items, the way settings
  usually sit. Better information architecture; needs a small change to `SidebarFrame.tsx`.

**Recommended: (b).** Training is not a daily operational task and should not compete with Attendance.

### 2.3 Global help button in the header — **the highest-value hook**

**Where:** `Header.tsx` (admin) and `EmployeeHeader.tsx` (employee), beside `NotificationPanel` and
`ThemeToggle`.

A `?` button that opens an Academy drawer, defaulted to the article for the **current `activeTab`**. Because
`activeTab` is already lifted into `App.tsx` state, the current screen is trivially available — this is the one
place the tab-state architecture is an advantage rather than an obstacle.

**Cost:** medium (needs the overlay component). **Value:** highest — help arrives without leaving the task.
**Recommended: yes.**

### 2.4 Contextual help inside individual screens

**Where:** next to the heading of a specific screen, or beside a specific control.

`ShortcutArrow.tsx` already establishes an inline "jump somewhere" affordance; an Academy hint marker can
follow the same visual language.

Prioritise the four screens where a wrong action has real consequences:

| Screen | Why it needs help at the point of action |
| :--- | :--- |
| **Payroll** | Lock / reopen are consequential; reopen demands a written reason and issues a new payslip version |
| **Payroll Settings** | Switching the late-penalty option re-prices the **open** month on the next calculation |
| **Office Geofence** | A wrong radius or accuracy limit blocks check-in for everyone |
| **Leave Management** | Approval fixes the paid/LOP split that payroll then deducts |

**Recommended: yes, for these four first**, then widen.

### 2.5 Android app

Out of scope for Phase 1. Android employees are the largest audience, but an Academy there is a second
implementation in Compose. **Recommendation:** ship the web Academy first, then decide — a WebView pointed at
the same content is likely cheaper than a native port.

### 2.6 Empty states and onboarding

`EmptyState.tsx` is already used where there is no data. "No payslips yet" is a natural place for
"How payroll works". **Cheap, incremental — recommended as a later pass.**

---

## 3. Recommended integration shape

```
Academy content (source of truth)
        │
        ├── Academy screen        employee sidebar item 6 · admin sidebar footer
        ├── Help drawer           header "?" in both shells, opens at the current activeTab
        ├── Contextual markers    Payroll · Payroll Settings · Office Geofence · Leave Management
        └── Empty-state links     later pass
```

One content store, four surfaces. The drawer and the full screen should render the **same** articles — do not
fork the content.

---

## 4. Decisions needed before Phase 1

1. **Where does content live?** Bundled MDX/JSON in the repo (simple, versioned, needs a deploy to update) or
   a database table (editable by admins, needs schema + RLS + an editor UI). **Recommendation: bundled for
   Phase 1**, since there is no admin-authoring requirement in the brief and it avoids a migration.
2. **Does the Academy need to track progress?** "Completed" state per employee implies a table, RLS and
   writes. Not mentioned in the brief — **assume no** unless told otherwise.
3. **How is unreleased content handled?** Geofencing, payroll, payslips and notifications are not in
   production. Either gate articles on feature availability, or hold them until rollout. **Recommendation:
   hold** — an Academy that describes screens the user cannot open damages trust in the Academy.
4. **Admin sidebar placement** — append (a) or footer (b).
5. **Is the role mismatch fixed first?** (`PROJECT_AUDIT.md` §5.) If `manager` stays a pseudo-admin that gets
   403s, no coherent manager curriculum can be written.

---

## 5. What Phase 1 should not do

- Do not add `react-router` routes for the Academy; follow the existing `activeTab` pattern so navigation stays
  consistent.
- Do not introduce a component library or design-system dependency for this feature alone.
- Do not write Academy content for the four unreleased features until they are live.
- Do not touch the shared `skytrack-api` Edge Function unless content moves to the database — a bundled
  Academy needs no backend change at all.

---

## 6. Phase 0 completion

| Condition | Status |
| :--- | :--- |
| Actual application architecture documented | `PROJECT_AUDIT.md` |
| Feature availability verified, not assumed | `FEATURE_MATRIX.md` |
| Navigation, settings, modals, workflows inventoried | `NAVIGATION_MAP.md` |
| Integration points identified | this document |
| No existing application behaviour changed | **Confirmed** — audit was read-only; no source file outside `docs/academy/` was modified |
