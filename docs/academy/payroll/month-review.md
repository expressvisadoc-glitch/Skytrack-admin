---
id: payroll.month.review
title: Reviewing the month before closing
description: The checks to make before you lock a payroll month.
category: payroll
subcategory: month-end
feature: payroll
roles: [admin, super_admin]
keywords: [review payroll, check month, before closing, month end]
synonyms: [payroll check, verify salaries]
related_articles: [payroll.month.lock, monitoring.payroll.flags, monitoring.attendance.exceptions]
feature_status: branch_only
screens: [payroll]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Reviewing the month before closing

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

The Payroll screen shows every employee's figures for a month: gross, working days, absences, unpaid leave,
late deductions, total deductions and net pay.

## Who can use it

Administrators and super administrators.

## Prerequisites

The month should have ended. A month cannot be locked until it has.

## The review checklist

1. **Clear every flag.** No salary, missing joining date, no shift. See
   [Payroll warnings](monitoring.payroll.flags).
2. **Check the absences.** Each one costs somebody a day's pay. Are they genuine, or did someone forget to
   check in?
3. **Check the unpaid leave.** Does each approved leave's paid/unpaid split look right?
4. **Check the late deductions.** Under per-minute, an unusually large figure usually means a very late
   day — confirm the check-in time is real.
5. **Check anyone who left.** A leaver still active accrues absences for the rest of the month.
6. **Sense-check the totals** against last month. A large swing has a reason; find it now.

## Expected outcome

Every figure is one you could explain to the employee it belongs to.

## Correct now, not later

While the month is open, a correction simply recalculates. Once locked, it needs a reopen with a reason and
produces a new payslip version. Five minutes now saves that.

## Common mistakes

- **Locking on the 1st without reviewing.** Late check-ins and absences from the last working days are
  exactly the ones nobody has queried yet.
- **Reviewing only the totals.** The deductions are per person.

## Related articles

- [Closing and locking a payroll month](payroll.month.lock)
