---
id: administrator.attendance.ledger
title: The attendance ledger
description: Look up any employee's attendance for any day and see every punch.
category: administrator
subcategory: attendance
feature: attendance
roles: [admin, super_admin]
keywords: [attendance, ledger, records, history, punches]
synonyms: [attendance list, all attendance]
related_articles: [administrator.attendance.manual, administrator.attendance.undo-checkout, monitoring.feed.punches]
feature_status: live
screens: [attendance]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# The attendance ledger

## What this feature does

The master record of everybody's attendance: check-in and check-out times, break totals, hours and status.

## Who can use it

Administrators and super administrators. Employees see only their own.

## Step-by-step instructions

1. Open **Attendance**.
2. Choose the date you want.
3. Use the tabs to narrow the list — for example to those currently on a break.
4. Select a row to see that day's punches in detail.

## What the statuses mean

| Status | Meaning |
| :--- | :--- |
| Present | Checked in on time |
| Late | Checked in after their shift start |
| Working | Checked in, not yet checked out |
| Completed | Checked out |
| Absent | A working day with no check-in and no approved leave |

## Expected outcome

You can answer any question about a particular day for a particular person.

## Common mistakes

- **Expecting a list of individual breaks.** SkyTrack records the **total** break time for a day, not each
  break separately.
- **Reading "Working" late in the evening as a fault.** It usually means a forgotten check-out.
- **Editing a day in a closed payroll month.** That is refused until the month is reopened.

## Troubleshooting

If a day cannot be edited, see [The month is locked](troubleshooting.payroll.month-locked).

## Related articles

- [Entering or correcting attendance](administrator.attendance.manual)
