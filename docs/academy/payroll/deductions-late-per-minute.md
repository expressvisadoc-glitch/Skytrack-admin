---
id: payroll.deductions.late-per-minute
title: "Option 2: per-minute deduction"
description: How every late minute is charged, what a minute is worth, and the limits that apply.
category: payroll
subcategory: deductions
feature: payroll
roles: [employee, admin, super_admin]
keywords: [per minute, late minutes, minute deduction, late penalty]
synonyms: [charged by the minute, per-minute late]
related_articles: [payroll.deductions.late-marks, payroll.policy.choose-option, administrator.org.shifts]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Option 2: per-minute deduction

> **Not available yet.** This feature is built and tested but is not in the version you are using today.
> Your organisation uses **either** this rule or [late marks](payroll.deductions.late-marks), not both.

## What this feature does

Charges **every minute** you are late, on every late day. Five minutes costs five minutes; an hour costs an
hour.

## What a minute is worth

Your organisation chooses one of two bases:

| Basis | A minute is worth |
| :--- | :--- |
| **Share of the day's pay** (usual) | per-day rate ÷ the shift's working minutes |
| **Fixed amount** | A set number of rupees, the same for everyone |

### Worked example — share of the day's pay

| | |
| :--- | :--- |
| Monthly salary | ₹20,000 |
| Working days in October 2026 | 24 |
| Per-day rate | ₹833.33 |
| Shift working minutes | 480 (8 hours) |
| **Per minute** | **₹1.74** |

So 30 minutes late costs about **₹52**, and 5 minutes costs about **₹8.70**.

## Two limits protect you

1. **A daily cap**, if your organisation sets one — for example "charge at most 30 minutes a day", so one
   very bad morning does not become an enormous deduction.
2. **A day is never deducted more than that day's own pay**, whatever the arithmetic says. You cannot go
   backwards on a single day.

## Expected outcome

Your salary card shows the minutes charged on each late day and what each cost — for example
*27 Oct · 60 min · −₹104.17*.

## How this differs from late marks

| | Late marks | Per minute |
| :--- | :--- | :--- |
| 1 minute late | Possibly nothing | About ₹1.74 |
| 5 minutes late, twice | 0.5 day — about ₹417 | About ₹17 |
| 2 hours late, once | 1 mark, often nothing | About ₹209 |

Per-minute is gentler on small slips and firmer on large ones.

## Common mistakes

- **Expecting the grace period to be free and then charged from zero.** Minutes are counted after the grace,
  not from the shift start, when a grace is set.
- **Expecting a shift change to re-price past days.** It never does — the shift length used is stored with
  each late day.
- **Assuming switching rules re-prices a closed month.** It does not. Closed months keep their payslips.

## Related articles

- [Choosing how lateness affects pay](payroll.policy.choose-option)
