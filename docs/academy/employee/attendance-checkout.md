---
id: employee.attendance.checkout
title: How to check out
description: Close your working day and see your total hours.
category: employee
subcategory: attendance
feature: attendance
roles: [employee]
keywords: [check out, punch out, clock out, end work, leaving]
synonyms: [finish work, sign off]
related_articles: [employee.attendance.checkin, employee.break.end, troubleshooting.checkout.on-break, employee.monthly.hours]
feature_status: live
screens: [home]
error_codes: [outside_geofence]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How to check out

## What this feature does

Closes your working day and works out your total hours.

## Who can use it

Employees, for themselves, once a day.

## Prerequisites

- You have checked in today.
- **No break is running.** You must resume work before you can check out.
- You are at the office — check-out is location-checked, like check-in.

## Step-by-step instructions

1. Open SkyTrack.
2. If a break is running, select the break button to **resume work** first.
3. Select **Check-Out**.

## Expected outcome

The day closes and shows a summary: your check-in time, your total break time, and your total hours — for
example `Check-In 09:50 AM · Break 45:01 · Total Hours 7h 15m`.

Your total is `(check-out − check-in) − break time`.

## Common mistakes

- **Trying to check out while on a break.** SkyTrack refuses and tells you to resume work first. This is
  deliberate — it stops a break running forever.
- **Checking out from outside the office.** Refused, the same as check-in.
- **Checking out twice.** Refused; your original time stands.
- **Forgetting entirely.** The day is closed for you automatically. You are not docked pay, but the hours
  will not be exact. Ask an administrator to correct it if it matters.

## Troubleshooting

| Message | What to do |
| :--- | :--- |
| "Please resume working before checking out." | End your break, then check out. See [Cannot check out during a break](troubleshooting.checkout.on-break). |
| "You have already checked out." | Your day is closed. |
| "You have not checked in today." | There is nothing to close. |
| Too far from the office | Move inside the office and try again. |

## Related articles

- [How to end a break and resume work](employee.break.end)
- [How your working hours are calculated](employee.monthly.hours)
