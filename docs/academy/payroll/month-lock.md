---
id: payroll.month.lock
title: Closing and locking a payroll month
description: Freeze a finished month, issue payslips, and understand what locking prevents.
category: payroll
subcategory: month-end
feature: payroll
roles: [admin, super_admin]
keywords: [lock payroll, close month, issue payslips, finalise]
synonyms: [finish payroll, month close]
related_articles: [payroll.month.review, payroll.month.reopen, employee.payslip.download, troubleshooting.payroll.month-locked]
related_tutorials: [tutorial.administrator.month-end]
feature_status: branch_only
screens: [payroll]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.month-end
---

# Closing and locking a payroll month

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Freezes a finished month. Payslips are issued and the figures can no longer drift.

## Who can use it

Administrators and super administrators.

## Prerequisites

- **The month has ended.** A month in progress cannot be locked.
- You have reviewed it — see [Reviewing the month before closing](payroll.month.review).
- Flags are cleared. An employee with no salary gets **no payslip**.

## Step-by-step instructions

1. Open **Payroll** and select the month.
2. Review the table one last time.
3. Select **Lock**.
4. Confirm.

## Expected outcome

- Payslips are issued at **version 1** and employees can download them.
- The figures are frozen — the screen now shows the payslip figures, not a live calculation.
- The lock is recorded with your name and the time.

## What locking prevents

The database itself refuses anything that would change that month's pay:

| Refused while locked |
| :--- |
| Entering or correcting attendance on those dates |
| Approving or cancelling leave covering those dates |
| Adding, editing or deleting a holiday on those dates |
| A salary effective on or before the month's last day |
| Deleting an employee with records in that month |

No screen can bypass this, which is what makes a closed month trustworthy.

## Changing settings afterwards does not move it

Switching the late-penalty rule, changing week-offs or editing a shift **never** alters a locked month.
Payslips keep the figures they were issued with.

## Common mistakes

- **Locking before the month has ended.** Not permitted.
- **Locking with flags outstanding.** Those employees get no payslip and will ask why.
- **Locking and then needing one correction.** Possible, but it costs a reopen and a version 2.

## Interactive tutorial

**Running month end.**

## Related articles

- [Reopening a month to fix a mistake](payroll.month.reopen)
