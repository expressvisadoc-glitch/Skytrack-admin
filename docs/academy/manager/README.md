# Manager Guide — blocked, intentionally empty

No articles are written here, and no article anywhere lists `manager` in its `roles`.

**Why.** The `manager` role does not function. The web frontend treats it as an administrator
(`src/contexts/AuthContext.tsx:116` includes `'manager'` in `adminRoles`), so the full admin portal renders.
The backend grants it nothing — `isAdminRole()` (`supabase/functions/skytrack-api/index.ts:1746`) accepts only
`admin` and `super_admin`, and the string `'manager'` appears nowhere else as a privileged role. A manager
would therefore see every admin screen and receive **HTTP 403** on every admin action.

No account currently holds the role, so the defect is latent rather than active.

**To unblock, one product decision is needed:**

- **(a)** Give `manager` a real scoped permission set in the backend — for example, approve leave and view
  attendance for direct reports only — then author this guide against what it can actually do; or
- **(b)** Remove `manager` from `adminRoles` so managers use the employee portal, and delete this category.

Until then, leave approval and attendance correction are documented under **Administrator**.

See `../PROJECT_AUDIT.md` §5 and `../ROLE_PERMISSIONS.md` §4.
