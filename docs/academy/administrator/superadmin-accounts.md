---
id: administrator.superadmin.accounts
title: Managing administrator accounts
description: Grant or remove administrator access. Super administrators only.
category: administrator
subcategory: security
feature: employee_admin
roles: [super_admin]
keywords: [admin management, grant admin, administrator accounts, permissions]
synonyms: [make someone admin, admin access]
related_articles: [getting-started.roles, administrator.superadmin.password-reset, administrator.org.reporting-manager]
feature_status: live
screens: [admin-management]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Managing administrator accounts

## What this feature does

Controls who holds administrator access. **Admin Management** is the only screen that appears for super
administrators and not for ordinary administrators.

## Who can use it

**Super administrators only.**

## Step-by-step instructions

1. Open **Admin Management**.
2. Review who currently holds administrator access.
3. Grant or remove access as required.

## What administrator access grants

An administrator can see **everyone's** attendance, leave and salary, approve leave, correct attendance,
configure the geofence and payroll policy, set salaries and close payroll months.

Grant it sparingly. There is no partial administrator.

## The manager role is not an option

SkyTrack's database allows a `manager` role, but **it does not work**: the web portal shows such a user the
full administrator menu while every action is refused. Do not assign it.

If someone needs to approve leave, make them an **administrator**. If they do not, leave them an
**employee** — being somebody's reporting manager grants no access at all.

## Common mistakes

- **Granting administrator access so someone can approve their team's leave.** That grants them everybody's
  salary data too. Consider whether that is acceptable.
- **Assigning the `manager` role.** It produces a portal where nothing works.
- **Removing your own access.** Keep at least two super administrators.

## Related articles

- [Understanding roles and what each one can do](getting-started.roles)
