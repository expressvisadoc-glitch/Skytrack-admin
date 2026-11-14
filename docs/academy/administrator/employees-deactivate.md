---
id: administrator.employees.deactivate
title: Deactivating someone who has left
description: Remove a departed employee from daily operations without destroying their history.
category: administrator
subcategory: people
feature: employee_admin
roles: [admin, super_admin]
keywords: [deactivate, remove employee, leaver, resigned, delete employee]
synonyms: [offboard, terminate employee]
related_articles: [administrator.employees.edit, payroll.month.lock]
feature_status: live
screens: [employees]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Deactivating someone who has left

## What this feature does

Marks an employee **inactive**: they can no longer sign in and they drop out of the daily roster, while
their past records remain.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. Open **Employees** and select the person.
2. Edit them and set their status to **inactive**.
3. Save.

## Expected outcome

They disappear from the live roster and cannot sign in. Their attendance, leave and payslips remain for
audit.

## Deactivate, do not delete

SkyTrack **refuses to delete** an employee who has payslips or attendance in a closed payroll month. This is
deliberate: deleting them would tear a hole in a month you have already paid and signed off.

Deactivating is the correct action for anyone who has ever been paid.

## Important: SkyTrack has no leaving date

There is no "last working day" field. After someone stops attending, their remaining working days in that
month count as **absences**, which would reduce a salary if one is still set.

**So for a leaver, deactivate them promptly**, and make sure their final month is reviewed and closed before
the absences accumulate.

## Common mistakes

- **Leaving a leaver active.** They keep accruing absences.
- **Trying to delete rather than deactivate.** Refused if they have payroll history, and undesirable anyway.

## Troubleshooting

If deletion is refused, that is the protection working. Deactivate instead.

## Related articles

- [Closing and locking a payroll month](payroll.month.lock)
