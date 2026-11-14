---
id: administrator.holidays.declare
title: Declaring a holiday
description: Add a company or public holiday and understand its effect on attendance and pay.
category: administrator
subcategory: holidays
feature: holidays
roles: [admin, super_admin]
keywords: [declare holiday, add holiday, public holiday, company holiday]
synonyms: [create holiday, festival day]
related_articles: [administrator.holidays.edit-delete, administrator.holidays.seed, payroll.concepts.working-days]
feature_status: live
screens: [public-holidays]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Declaring a holiday

## What this feature does

Adds a non-working day to the calendar. Every employee sees it, and attendance and payroll both respect it.

## Who can use it

Administrators and super administrators.

## Prerequisites

The date must **not** fall in a locked payroll month — adding a holiday changes that month's pay.

## Step-by-step instructions

1. Open **Public Holidays**.
2. Add a holiday.
3. Enter the **name**, the **date** and the type.
4. Save and publish it.

## Expected outcome

The date becomes a non-working day:

- No check-in is expected and no absence is recorded.
- Leave spanning it does not consume that day.
- A check-in on it never produces a late mark.
- The month's **working days drop by one**.

## It changes everybody's pay

Working days are the divisor for pay. Removing one makes each remaining day worth slightly more.

**Example — October 2026:** 31 days − 4 Sundays − 3 holidays = **24 working days**. On ₹20,000 that is
₹833.33 a day. Declare a fourth holiday and it becomes 23 days at ₹869.57.

Declare holidays **before** the month is worked wherever possible.

## Common mistakes

- **Adding a holiday to a closed month.** Refused. Reopen the month first.
- **Adding one retrospectively mid-month** and surprising everyone when the per-day rate shifts.
- **Creating it but not publishing it.** Only published holidays count.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "Payroll for … is locked." | Reopen the month first. |
| Employees cannot see it | It is not published. |

## Related articles

- [How working days are counted](payroll.concepts.working-days)
