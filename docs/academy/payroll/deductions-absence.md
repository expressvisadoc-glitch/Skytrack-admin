---
id: payroll.deductions.absence
title: Unapproved absence
description: A working day with no check-in and no approved leave costs a full day's pay.
category: payroll
subcategory: deductions
feature: payroll
roles: [employee, admin, super_admin]
keywords: [absence, absent, no check in, missing day, deduction]
synonyms: [marked absent, day missing]
related_articles: [payroll.concepts.deductions, administrator.attendance.manual, monitoring.attendance.exceptions]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Unapproved absence

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Records a working day where nothing happened — no check-in, and no approved leave — and deducts a full
day's pay.

## The rule

A day is an absence when **all** of these are true:

1. It is a **working day** — not a week-off, not a published holiday.
2. It is **complete** — today is never counted until it is over.
3. There is **no check-in**.
4. There is **no approved leave** covering it.

## What it costs

One day's pay — your monthly salary divided by that month's working days. On ₹20,000 across 24 working
days, **₹833.33**.

## Expected outcome

The date appears on your salary card under "Days affecting pay", so you can see exactly which day it was.

## The commonest causes

| Cause | Fix |
| :--- | :--- |
| You were at work but forgot to check in | Ask an administrator to enter the attendance |
| Leave was agreed verbally but never entered | Submit it; it must be **approved** to count |
| Leave was submitted but never approved | Chase the approval |
| A holiday was deleted after the fact | Tell an administrator — it turned a holiday into a working day |

## Common mistakes

- **Waiting until payday to raise it.** Once the month is locked, correcting it needs a reopen and a new
  payslip version. Check your monthly overview weekly.
- **Assuming a verbal "take tomorrow off" counts.** It does not. Only approved leave in SkyTrack counts.

## For administrators

An absence removed by entering the attendance recalculates immediately while the month is open. See
[Entering or correcting attendance](administrator.attendance.manual).

## Related articles

- [Spotting absences and late arrivals](monitoring.attendance.exceptions)
