---
id: payroll.deductions.late-marks
title: "Option 1: late marks"
description: How groups of late arrivals convert into a deduction, with examples.
category: payroll
subcategory: deductions
feature: payroll
roles: [employee, admin, super_admin]
keywords: [late mark, late arrival, late penalty, coming late]
synonyms: [late deduction, tardiness]
related_articles: [payroll.deductions.late-per-minute, payroll.policy.choose-option, administrator.org.shifts]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Option 1: late marks

> **Not available yet.** This feature is built and tested but is not in the version you are using today.
> Your organisation uses **either** this rule or [per-minute](payroll.deductions.late-per-minute), not both.

## What this feature does

Counts your late arrivals and converts complete groups of them into a deduction.

## When a day is late

You check in **after your shift start plus any grace period**. Judged to the whole minute: for a 10:00
shift with no grace, **10:00:45 is on time** and **10:01 is late**.

A late mark is never recorded on a week-off or a published holiday, or for an employee with no shift.

## The rule

```
deduction in days = floor(late marks ÷ marks per group) × days per group
```

The common setting is **2 marks = 0.5 day**. Only **complete groups** count.

| Late marks | Deduction | On ₹20,000 / 24 days |
| ---: | :--- | :--- |
| 1 | none | ₹0 |
| 2 | 0.5 day | ₹416.67 |
| 3 | 0.5 day | ₹416.67 |
| 4 | 1 day | ₹833.33 |
| 5 | 1 day | ₹833.33 |

## Expected outcome

Each late day is listed on your salary card, and the total shows the days charged.

## How late does not matter

Under this rule, **one minute late and two hours late cost exactly the same** — both are one mark. If that
seems unfair, your organisation can switch to the per-minute rule instead.

## Common mistakes

- **Expecting the third late day to cost extra.** It does not — only complete pairs count.
- **Expecting a shift change to remove past marks.** It cannot. Every late decision stores the shift and
  grace that applied on that day.
- **Assuming lateness also reduces hours.** It does not; hours come from your punches.

## If a late mark is wrong

Only an administrator can correct the check-in time, which re-makes the late decision for that day.

## Related articles

- [Option 2: per-minute deduction](payroll.deductions.late-per-minute)
