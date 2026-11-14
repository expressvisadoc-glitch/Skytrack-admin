---
id: payroll.salary.history
title: Changing pay and keeping history
description: Give someone a rise without losing the ability to reproduce past months.
category: payroll
subcategory: salary
feature: payroll
roles: [admin, super_admin]
keywords: [salary change, pay rise, increment, salary history]
synonyms: [increase salary, change pay]
related_articles: [payroll.salary.set, payroll.salary.mid-month]
feature_status: branch_only
screens: [employees]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Changing pay and keeping history

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Records a new salary from a date, keeping every earlier one.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. Open **Employees → [the person] → Salary**.
2. Add a new salary with the new amount.
3. Set **effective from** to the date the rise takes effect.
4. Note the reason.
5. Save.

## Expected outcome

The history lists every salary with its date and who recorded it. Payroll uses whichever was in force on
each day.

## Why records are never edited

If a salary could be edited, last year's payslip could silently change. Keeping an append-only history means
any past month can be recalculated and produce the same answer.

## Expected outcome of a mistake

If you record the wrong amount, add **another** record with the correct amount and an appropriate effective
date. The wrong one stays visible — which is the point, because it explains any figure already issued.

## Common mistakes

- **Looking for delete.** There is none.
- **Back-dating into a closed month.** Refused; reopen it first.
- **Two records with the same effective date.** The most recently saved one applies. Avoid it — it is
  confusing to read later.

## Related articles

- [A pay change part-way through a month](payroll.salary.mid-month)
