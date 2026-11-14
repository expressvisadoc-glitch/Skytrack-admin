---
id: payroll.concepts.per-day-rate
title: How your per-day rate is worked out
description: What one day of your salary is worth, and what that means for a deduction.
category: payroll
subcategory: concepts
feature: payroll
roles: [employee, admin, super_admin]
keywords: [per day rate, daily rate, one day pay, day value]
synonyms: [cost of a day, daily salary]
related_articles: [payroll.concepts.working-days, payroll.concepts.deductions, employee.salary.card]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How your per-day rate is worked out

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Turns a monthly salary into the value of a single day, which is what every deduction is measured in.

## The rule

```
per-day rate = monthly salary ÷ working days in that month
```

### Worked example

| | |
| :--- | :--- |
| Monthly salary | ₹20,000 |
| Working days in October 2026 | 24 |
| **Per-day rate** | **₹833.33** |

So one absence costs ₹833.33, and one unpaid leave day costs the same.

## Expected outcome

You can work out in your head what a missed day costs.

## It is not based on hours

SkyTrack pays by **days**, not hours. A short day is a full day's pay; there is no short-hours rule and no
deduction for leaving early. Only three things reduce pay: unapproved absence, unpaid leave and lateness.

## If your salary changes mid-month

Each day is paid at the rate of the salary in force **on that day**, so a month with a pay rise is part at
the old rate and part at the new.

## Common mistakes

- **Dividing by 30.** The divisor is working days, not calendar days.
- **Expecting the rate to be the same every month.** It is not — the divisor changes.
- **Expecting overtime.** SkyTrack does not calculate it.

## Related articles

- [How working days are counted](payroll.concepts.working-days)
