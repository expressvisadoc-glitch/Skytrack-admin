---
id: payroll.concepts.working-days
title: How working days are counted
description: The number every payroll figure is built on, and why it changes month to month.
category: payroll
subcategory: concepts
feature: payroll
roles: [employee, admin, super_admin]
keywords: [working days, how many days, divisor, month days]
synonyms: [paid days, days in month]
related_articles: [payroll.concepts.per-day-rate, administrator.holidays.declare, payroll.policy.week-offs-grace]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How working days are counted

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Every payroll figure starts here. Working days are the number your salary is divided by.

## Who can use it

Everyone — employees to understand their pay, administrators to explain it.

## The rule

```
working days = days in the month − week-off days − published holidays
```

A date that is both a week-off and a holiday is counted once.

### Worked example — October 2026

| | |
| :--- | :--- |
| Days in the month | 31 |
| Sundays (the week-off) | − 4 |
| Published holidays (2, 20, 21 Oct) | − 3 |
| **Working days** | **24** |

## Expected outcome

The same number is used for everyone in that month, and you can check it yourself against a calendar.

## Why it changes every month

Months differ in length and in how many week-offs and holidays fall in them. A month with more holidays has
fewer working days — which makes **each** working day worth more.

## It cuts both ways

Declaring a holiday reduces working days, so each remaining day is worth more — **and so is each absence**.
In October 2026 on ₹20,000, one absence costs ₹833. Add a fourth holiday and it costs ₹870.

## Common mistakes

- **Assuming a fixed 30 days.** SkyTrack never does this.
- **Expecting a Saturday to be excluded.** Only days configured as week-offs are. If Saturday is a working
  day for your organisation, it counts.
- **Expecting an unpublished holiday to count.** Only published ones do.

## Related articles

- [How your per-day rate is worked out](payroll.concepts.per-day-rate)
