---
id: administrator.employees.joining-date
title: Why the joining date matters
description: A missing joining date makes SkyTrack count the whole month, including days before someone joined.
category: administrator
subcategory: people
feature: payroll
roles: [admin, super_admin]
keywords: [joining date, start date, new joiner pay, mid month joiner]
synonyms: [date of joining, hire date]
related_articles: [administrator.employees.add, payroll.concepts.working-days, monitoring.payroll.flags]
feature_status: branch_only
screens: [employees]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Why the joining date matters

> **Not available yet.** The payroll effect described here applies once payroll is released.

## What this feature does

The joining date tells payroll which working days an employee should be paid for.

## Who can use it

Administrators and super administrators set it on the employee record.

## Why it matters

Payroll pays for working days **on or after** the joining date.

| Joining date | Effect |
| :--- | :--- |
| Set correctly | Only days from that date are counted. A mid-month joiner is paid pro rata |
| **Missing** | **The whole month is counted**, including days before they joined — which become absences and deductions |

An employee with no joining date is flagged on the Payroll screen with `joining_date_missing`.

## Expected outcome

A joiner is paid for the days they were actually employed.

## Common mistakes

- **Leaving it blank for an existing employee.** It is invisible until payroll runs, then produces a wrong
  figure that has to be explained.
- **Setting it to the offer date rather than the first working day.**
- **Assuming it is only informational.** It changes money.

## Troubleshooting

If someone's expected pay looks too low, check the Payroll screen for a joining-date flag first.

## Related articles

- [Payroll warnings: no salary, no shift, no joining date](monitoring.payroll.flags)
