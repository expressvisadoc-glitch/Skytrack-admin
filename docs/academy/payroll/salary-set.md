---
id: payroll.salary.set
title: Setting an employee's salary
description: Record a monthly salary, and why the effective date matters as much as the amount.
category: payroll
subcategory: salary
feature: payroll
roles: [admin, super_admin]
keywords: [set salary, add salary, employee pay, monthly gross]
synonyms: [enter salary, salary setup]
related_articles: [payroll.salary.history, payroll.salary.mid-month, troubleshooting.payroll.no-salary]
related_tutorials: [tutorial.administrator.set-salary]
feature_status: branch_only
screens: [employees]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.set-salary
---

# Setting an employee's salary

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Records an employee's **monthly gross** salary from a chosen date.

## Who can use it

Administrators and super administrators.

## Prerequisites

The effective date must not fall on or before the last day of a **locked** payroll month.

## Step-by-step instructions

1. Open **Employees** and select the person.
2. Open the **Salary** section.
3. Enter the **monthly gross**.
4. Set **effective from** — the date this salary starts.
5. Add a note explaining it, for the record.
6. Save.

## Expected outcome

The salary applies from that date, and the employee's card shows a figure instead of "Salary not set yet".

## The effective date decides everything

| Effective date | Result |
| :--- | :--- |
| Their joining date | Paid correctly from the start |
| Today, for a long-standing employee | Earlier working days this month are **unpaid**, and the row is flagged |
| A future date | No salary applies until then |

For a new employee, use their **joining date**.

## A salary is never edited

A change is a **new record** from a new date. Nothing is overwritten and nothing is deleted. That is what
lets a past month be reproduced exactly — the salary in force on each day is known.

## Common mistakes

- **Using today's date for an existing employee.** Most of the month becomes unpaid.
- **Looking for an edit button.** There is none by design — add a new salary instead.
- **Setting a salary into a closed month.** Refused; reopen it first.

## Interactive tutorial

**Setting a salary.**

## Related articles

- [Changing pay and keeping history](payroll.salary.history)
