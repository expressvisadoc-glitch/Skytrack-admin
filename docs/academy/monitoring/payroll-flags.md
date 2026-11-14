---
id: monitoring.payroll.flags
title: "Payroll warnings: no salary, no shift, no joining date"
description: The flags on the Payroll screen that mean somebody's figure cannot be trusted.
category: monitoring
feature: payroll
roles: [admin, super_admin]
keywords: [payroll flags, warnings, no salary, no shift, missing data]
synonyms: [payroll errors, payroll problems]
related_articles: [payroll.month.review, administrator.employees.joining-date, payroll.salary.set]
feature_status: branch_only
screens: [payroll]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Payroll warnings: no salary, no shift, no joining date

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

The Payroll screen flags employees whose figures are incomplete, so you find them **before** closing the
month rather than after paying it.

## Who can use it

Administrators and super administrators.

## The flags

| Flag | Meaning | Consequence | Fix |
| :--- | :--- | :--- | :--- |
| **No salary set** | No salary on the record | No figure can be produced and **no payslip is issued** when the month is locked | [Set a salary](payroll.salary.set) |
| **Joining date missing** | No joining date | The **whole month** is counted, including days before they joined | Set the joining date |
| **Salary starts mid-month** | The salary begins part way through | Earlier working days are unpaid | Correct the effective date if wrong |
| **No shift assigned** | No work shift | They can never be marked late | Assign a shift |

## Step-by-step instructions

1. Open **Payroll** and choose the month.
2. Work down the list looking for flagged rows.
3. Fix each one, then re-check the figures.
4. Only then lock the month.

## Expected outcome

Every employee has a figure you can defend.

## Common mistakes

- **Locking a month with flags outstanding.** Employees with no salary simply get **no payslip**, and you
  will hear about it.
- **Ignoring a missing joining date for a long-standing employee.** It is harmless for them — but it hides
  the flag you need for the next genuine joiner.

## Related articles

- [Reviewing the month before closing](payroll.month.review)
