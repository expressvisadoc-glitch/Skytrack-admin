---
id: payroll.payslip.pdf
title: Issuing and downloading payslips
description: Where payslips come from, what is on them, and how to get one for an employee.
category: payroll
subcategory: month-end
feature: payslips
roles: [admin, super_admin]
keywords: [payslip, pdf, issue payslip, salary slip]
synonyms: [pay slip, payslip for employee]
related_articles: [payroll.month.lock, employee.payslip.download, payroll.month.reopen]
feature_status: branch_only
screens: [payroll]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Issuing and downloading payslips

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Payslips are produced automatically when a month is **locked** — there is no separate "generate" step.

## Who can use it

Administrators and super administrators can download anyone's. Employees download their own.

## Step-by-step instructions

1. Open **Payroll** and select a locked month.
2. Find the employee and download their payslip PDF.

Employees get theirs from **Monthly Overview**.

## What is on it

On the company letterhead: employee name, ID, designation and department; the month; working and paid days;
monthly gross; absences, unpaid leave and lateness in days and amounts; total deductions; and net pay.

Amounts use Indian digit grouping and are written as "Rs." rather than the ₹ symbol, for PDF font
compatibility.

## Who gets one

Only employees whose figures were complete when the month was locked. Anyone flagged — typically **no
salary set** — gets **no payslip** and is reported as skipped. Fix flags before locking.

## Versions

Reopening and relocking issues version 2, 3 and so on. Employees see the current version; earlier ones are
kept for audit and an administrator can retrieve any of them.

## Common mistakes

- **Looking for payslips in an open month.** They do not exist until it is locked.
- **Expecting statutory deductions on it.** There are none — see
  [Exporting payroll for the accountant](payroll.export.csv).

## Related articles

- [Downloading your payslip](employee.payslip.download)
