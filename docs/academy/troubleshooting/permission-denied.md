---
id: troubleshooting.permission.denied
title: "“Only administrators can…”"
description: You tried something your role does not allow — or you hold a role that does not work.
category: troubleshooting
feature: employee_admin
roles: [employee, admin, super_admin]
keywords: [permission denied, forbidden, not allowed, 403]
synonyms: [access denied, no permission]
related_articles: [getting-started.roles, administrator.superadmin.accounts]
feature_status: live
error_codes: [forbidden]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# "Only administrators can…"

## Symptom

A message saying only administrators can do this, or a screen that will not load its data.

## Cause

Your role does not permit the action. SkyTrack checks permissions on the **server**, so hiding a button is
never what protects data — the refusal is the real control.

| Your role | What you can reach |
| :--- | :--- |
| Employee | Your own records only |
| Administrator | Everyone's attendance, leave, payroll and settings |
| Super administrator | The above, plus administrator accounts and password resets |

## Fix

If you genuinely need the access, ask a **super administrator**. Note that administrator access shows
everybody's salary data — it is not granted lightly.

## If you see admin screens but everything fails

This is a specific, known situation. If your role is **manager**, the portal shows you the full
administrator menu but **every action is refused**, because the manager role grants nothing on the server.

It is not something you can fix. Ask a super administrator to set your role to **administrator** if you need
that access, or to **employee** if you do not. See
[Managing administrator accounts](administrator.superadmin.accounts).

## Expected outcome

You either gain the right role or use the screens your role covers.

## Common mistakes

- **Assuming being a reporting manager grants access.** It does not. It is a label, not a permission.
- **Asking for administrator access to approve one person's leave.** It grants far more than that.

## Related articles

- [Understanding roles and what each one can do](getting-started.roles)
