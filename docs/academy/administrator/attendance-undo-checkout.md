---
id: administrator.attendance.undo-checkout
title: Undoing an accidental checkout
description: Put an employee back to working after they checked out by mistake.
category: administrator
subcategory: attendance
feature: attendance
roles: [admin, super_admin]
keywords: [undo checkout, reverse checkout, checked out by mistake]
synonyms: [cancel checkout, reopen day]
related_articles: [administrator.attendance.manual, administrator.attendance.ledger]
feature_status: live
screens: [attendance]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Undoing an accidental checkout

## What this feature does

Removes a check-out so the employee is working again, keeping their original check-in and break totals.

## Who can use it

Administrators and super administrators.

## Prerequisites

- The employee has checked out.
- The date is not in a locked payroll month.

## Step-by-step instructions

1. Open **Attendance** and find the employee on that date.
2. Choose the undo-checkout action.
3. Confirm.

## Expected outcome

The check-out is cleared and the employee is **Working** again. Their check-in time and break total are
untouched, and they can carry on and check out properly later.

## Common mistakes

- **Using it to delete a whole day.** It only removes the check-out. To change the check-in, use
  [manual attendance](administrator.attendance.manual).
- **Using it on a day that is simply old.** If the employee is not coming back, correcting the check-out
  time is better than reopening the day.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "Payroll for … is locked." | Reopen the month first. |
| No undo option | They have not checked out. |

## Related articles

- [Entering or correcting attendance](administrator.attendance.manual)
