---
id: troubleshooting.payroll.month-locked
title: The month is locked
description: A change was refused because its payroll month is closed — how to proceed properly.
category: troubleshooting
feature: payroll
roles: [admin, super_admin]
keywords: [month locked, payroll locked, cannot edit, closed month]
synonyms: [locked payroll, frozen month]
related_articles: [payroll.month.reopen, payroll.month.lock, administrator.attendance.manual]
feature_status: branch_only
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# The month is locked

> **Not available yet.** This applies once payroll is released.

## Symptom

An action is refused with *"Payroll for [month] is locked. Reopen it on the Payroll page before making
changes."*

## Cause

That month has been closed and its payslips issued. SkyTrack refuses **any** change that would alter pay for
a closed month:

- entering or correcting attendance on those dates
- approving or cancelling leave covering those dates
- adding, editing or deleting a holiday on those dates
- a salary change effective on or before the month's last day
- deleting an employee with records in that month

This is enforced by the database itself, so no screen can bypass it.

## Fix — reopen, correct, lock again

1. Open **Payroll** and select the month.
2. Choose **Reopen** and give a reason of at least a few words. It is recorded against your name.
3. Make the correction.
4. Review the figures.
5. **Lock** the month again.

Relocking issues **version 2** of the affected payslips. Earlier versions are kept for audit, so the history
of the correction is visible.

## Expected outcome

The correction is made, and both the original and corrected payslips exist on the record.

## Common mistakes

- **Reopening and forgetting to lock again.** The month stays open and employees cannot see payslips.
- **Reopening for a change that does not affect pay.** Check whether you actually need to.
- **Giving a reason like "fix".** The reason is the audit trail; write what changed and why.

## Related articles

- [Reopening a month to fix a mistake](payroll.month.reopen)
