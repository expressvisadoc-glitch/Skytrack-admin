---
id: troubleshooting.payroll.no-salary
title: An employee shows no salary
description: No salary has been recorded, so no figure and no payslip can be produced.
category: troubleshooting
feature: payroll
roles: [admin, super_admin]
keywords: [no salary, salary not set, missing salary, no payslip]
synonyms: [salary missing, pay not showing]
related_articles: [payroll.salary.set, monitoring.payroll.flags, administrator.employees.joining-date]
feature_status: branch_only
screens: [payroll, employees]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# An employee shows no salary

> **Not available yet.** This applies once payroll is released.

## Symptom

On **Payroll** the employee shows no figure and is flagged. The employee's own card reads
*"Salary not set yet."*

## Cause

No salary has ever been recorded for them, or the salary on record starts **after** the month you are
looking at.

## Fix

1. Open **Employees** and select the person.
2. Go to the **Salary** section.
3. Add a salary with the correct **effective from** date — usually their joining date, not today.
4. Return to **Payroll** and re-check the month.

## The effective date matters

A salary applies from its effective date onward. Set it to today and the earlier working days of this month
count as unpaid, and the row is flagged *salary starts mid-month*.

For an existing employee who should have been paid all along, set the effective date to the start of the
period they should be paid from.

## If the month is already locked

A salary effective on or before a locked month's last day is **refused**. Reopen the month, add the salary,
then lock again.

## What happens if you lock the month anyway

The employee gets **no payslip at all**. They are reported as skipped. Fix the flag before locking.

## Common mistakes

- **Adding the salary with today's date for a long-standing employee.** Most of the month becomes unpaid.
- **Assuming a salary can be edited.** It cannot. A change is a **new record** from a date; history is kept
  deliberately.

## Related articles

- [Setting an employee's salary](payroll.salary.set)
