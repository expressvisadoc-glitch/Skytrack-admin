# SkyTrack Academy — Role & Permission Reference

Who can do what, verified against the backend rather than the UI. This is the authority for the `roles`
field in every article. **Date:** 14 November 2026.

---

## 1. The four roles

`employees.role` accepts `employee`, `manager`, `admin`, `super_admin`.

| Role | Portal | Functional | Documented |
| :--- | :--- | :---: | :---: |
| `employee` | Employee (web + Android) | ✅ | ✅ |
| `manager` | Admin portal renders, backend refuses | ❌ | **no — see §4** |
| `admin` | Admin portal | ✅ | ✅ |
| `super_admin` | Admin portal + Admin Management | ✅ | ✅ |

**Authorisation is enforced in the Edge Function, not the UI.** The function runs under the service role and
bypasses RLS, so `isAdminRole()` (`index.ts:1746`) is the real gate:

```js
function isAdminRole(employee) {
  const role = String(employee?.role || "").toLowerCase();
  return role === "admin" || role === "super_admin";
}
```

Row Level Security is the second line: employees read only their own rows, active admins read all
(`is_active_admin()`), nobody writes HR tables directly.

---

## 2. Permission matrix

✅ allowed · ❌ refused (HTTP 403) · — not applicable

| Capability | employee | manager | admin | super_admin |
| :--- | :---: | :---: | :---: | :---: |
| Check in / out, break / resume | ✅ own | ✅ own | ✅ own | ✅ own |
| View own attendance & monthly | ✅ | ✅ | ✅ | ✅ |
| Apply for / cancel own leave | ✅ | ✅ | ✅ | ✅ |
| View own leave balances | ✅ | ✅ | ✅ | ✅ |
| View holiday calendar | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| View own salary card | ✅ | ✅ | ✅ | ✅ |
| Download own payslips | ✅ | ✅ | ✅ | ✅ |
| View another employee's data | ❌ | ❌ | ✅ | ✅ |
| Live roster / dashboard | ❌ | ❌ | ✅ | ✅ |
| Approve / reject leave | ❌ | ❌ | ✅ | ✅ |
| Adjust leave balances | ❌ | ❌ | ✅ | ✅ |
| Manual attendance / undo checkout | ❌ | ❌ | ✅ | ✅ |
| Add / edit / deactivate employees | ❌ | ❌ | ✅ | ✅ |
| Departments, shifts, reporting managers | ❌ | ❌ | ✅ | ✅ |
| Declare / edit / delete holidays | ❌ | ❌ | ✅ | ✅ |
| Configure office geofence | ❌ | ❌ | ✅ | ✅ |
| Configure payroll policy | ❌ | ❌ | ✅ | ✅ |
| Set employee salaries | ❌ | ❌ | ✅ | ✅ |
| Lock / reopen a payroll month | ❌ | ❌ | ✅ | ✅ |
| Export payroll CSV, any payslip | ❌ | ❌ | ✅ | ✅ |
| Manage administrator accounts | ❌ | ❌ | ❌ | ✅ |
| Reset another employee's password | ❌ | ❌ | ❌ | ✅ |
| Edit a super admin's record | ❌ | ❌ | ❌ | ✅ |

The `manager` column is identical to `employee` **in effect**, despite the admin portal being rendered.

---

## 3. Verified behaviour

Confirmed by live request against the deployed staging function (`SKYTRACK_QA_REPORT.md` §20):

| Attempt | Result |
| :--- | :--- |
| Employee reads another employee's attendance via `employeeId` | ignored; own record returned |
| Employee calls `admin_payroll_month` | **403** |
| Employee calls `admin_salary_save` | **403** |
| Employee checks in on another employee's behalf | no row created for the other employee |
| Employee requests another employee's `salary_summary` | own figures returned |
| Employee reads payroll settings | **403** |

---

## 4. The manager problem

| Layer | Behaviour | Source |
| :--- | :--- | :--- |
| Frontend | `adminRoles` includes `'manager'` → full admin portal renders | `AuthContext.tsx:116` |
| Backend | `'manager'` appears **zero** times as a privileged role | `index.ts:1746` |

A manager would see Dashboard, Employees, Attendance, Leave Management, Public Holidays, Settings,
Organization, Office Geofence, Payroll and Payroll Settings — and every one would fail to load or save.

**Current exposure: latent.** No staging account holds the role; present roles are `super_admin`, `admin`,
`employee`. The defect appears the moment someone is made a manager.

**Academy position:** no article lists `manager` in `roles`, and
`ARTICLE_METADATA_SPEC.md` validation rule 4 enforces it mechanically. The Manager Guide stays empty until
the product decision in `DOCUMENTATION_ARCHITECTURE.md` §6 is taken.

---

## 5. Writing roles into articles

- Take roles from `metadata/roles.json`; never assert them in prose.
- "Who can use it" (§5 of every article) is **rendered from** `roles`, so the two cannot drift.
- If a capability is super-admin-only, say so in the title or description — those two articles are
  `administrator.superadmin.accounts` and `administrator.superadmin.password-reset`.
- Employee-facing articles never mention admin-only controls; an employee cannot see them and it only
  invites a support request.
