---
id: administrator.attendance.manual
title: Entering or correcting attendance
description: Fix a wrong or missing check-in or check-out on an employee's behalf.
category: administrator
subcategory: attendance
feature: attendance
roles: [admin, super_admin]
keywords: [manual attendance, correct attendance, fix check in, forgot to check in]
synonyms: [edit attendance, add attendance]
related_articles: [administrator.attendance.undo-checkout, troubleshooting.payroll.month-locked, payroll.deductions.absence]
related_tutorials: [tutorial.administrator.fix-attendance]
feature_status: live
screens: [attendance]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.fix-attendance
---

# Entering or correcting attendance

## What this feature does

Lets you set or change a check-in or check-out time for an employee — for a day they forgot, or where the
recorded time is wrong.

## Who can use it

Administrators and super administrators.

## Prerequisites

- The date is **not** in a locked payroll month.
- You know the correct times. Entering attendance changes pay, so get it right.

## Step-by-step instructions

1. Open **Attendance** and go to the date.
2. Find the employee, or use the manual-entry option if there is no record at all.
3. Enter the **check-in** and, if needed, the **check-out** time. Enter them in your own local time; SkyTrack
   stores them correctly.
4. Save.

## Expected outcome

The day's record is updated. Hours recalculate, and **the late decision is re-made** from the new check-in
time against the shift that applied on that day.

Correcting an absent day to a present one removes the absence deduction immediately.

## Common mistakes

- **Entering a check-out earlier than the check-in.** Refused.
- **Correcting a day in a closed month and expecting it to take.** It is refused; reopen the month first.
- **Assuming the late rule uses today's settings.** It does not — a corrected day is re-judged against the
  shift and grace that applied **on that day**. Changing a shift now never re-prices the past.
- **Using this to "give" someone attendance they did not work.** It changes their pay. Treat it as a
  financial action.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "Payroll for … is locked." | Reopen the month first. See [The month is locked](troubleshooting.payroll.month-locked). |
| The late mark did not change | The new time is still after the shift start plus grace. |

## Interactive tutorial

**Correcting a day's attendance.**

## Related articles

- [Undoing an accidental checkout](administrator.attendance.undo-checkout)
