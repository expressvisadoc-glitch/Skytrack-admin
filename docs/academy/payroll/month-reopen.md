---
id: payroll.month.reopen
title: Reopening a month to fix a mistake
description: Unlock a closed month, correct it, and lock it again with a new payslip version.
category: payroll
subcategory: month-end
feature: payroll
roles: [admin, super_admin]
keywords: [reopen payroll, unlock month, correct closed month, payslip version]
synonyms: [undo lock, fix closed month]
related_articles: [payroll.month.lock, troubleshooting.payroll.month-locked, employee.payslip.download]
feature_status: branch_only
screens: [payroll]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Reopening a month to fix a mistake

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Unlocks a closed month so a correction can be made, then relocks it and issues a new payslip version.

## Who can use it

Administrators and super administrators.

## Prerequisites

A reason of at least a few words. It is required, recorded against your name, and visible in the month's
history.

## Step-by-step instructions

1. Open **Payroll** and select the locked month.
2. Select **Reopen**.
3. Write the reason — what is being corrected and why.
4. Make the correction: attendance, leave, a holiday, or a salary.
5. Review the figures.
6. Select **Lock** again.

## Expected outcome

- The correction is applied and figures recalculate.
- Relocking issues **version 2** of the affected payslips.
- **Version 1 is kept.** Both remain on record; employees see the current one.
- The reopen and the relock both appear in the month's history with reasons and names.

## Why versions rather than edits

A payslip you have already given someone is a statement you made. Replacing it silently would make the
record untrustworthy. Issuing version 2 and keeping version 1 shows what changed and why — which is exactly
what you want if anyone ever asks.

## Common mistakes

- **Reopening and forgetting to lock again.** The month stays open and employees lose access to payslips.
- **A reason like "correction".** Useless in six months. Write what changed.
- **Reopening for something that does not affect pay.** Check first.
- **Reopening repeatedly.** Each cycle adds a version. Make all corrections in one reopen.

## Related articles

- [Closing and locking a payroll month](payroll.month.lock)
