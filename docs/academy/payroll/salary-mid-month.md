---
id: payroll.salary.mid-month
title: A pay change part-way through a month
description: How a month is calculated when the salary changes during it.
category: payroll
subcategory: salary
feature: payroll
roles: [admin, super_admin]
keywords: [mid month, pay rise mid month, part month, prorata]
synonyms: [salary change during month, split month]
related_articles: [payroll.salary.history, payroll.concepts.per-day-rate]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# A pay change part-way through a month

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Each working day is paid at the rate of the salary in force **on that day**, so a month containing a rise is
part old rate and part new.

## The rule

```
earned = (days before the change × old per-day rate)
       + (days from the change   × new per-day rate)
```

Both rates use the **same** divisor — that month's working days.

### Worked example — October 2026, 24 working days

A rise from ₹20,000 to ₹30,000 effective 15 October:

| | |
| :--- | :--- |
| Working days 1–14 Oct | 11, at ₹833.33 = ₹9,166.67 |
| Working days 15–31 Oct | 13, at ₹1,250.00 = ₹16,250.00 |
| **Earned gross** | **₹25,416.67** |

Deductions then apply at the rate of the day they fall on: an absence on 29 October costs ₹1,250, not
₹833.33.

## Late deductions

Under the per-minute rule, a late minute on 5 October is priced from the old salary and one on 27 October
from the new. Nothing is averaged.

## Expected outcome

A figure that is defensible day by day.

## Common mistakes

- **Expecting the whole month at the new rate.** Only from the effective date.
- **Setting the effective date to the first of the month "to keep it simple"** when the rise was agreed
  mid-month. That overpays the earlier days — and the record will say so.

## Related articles

- [Changing pay and keeping history](payroll.salary.history)
