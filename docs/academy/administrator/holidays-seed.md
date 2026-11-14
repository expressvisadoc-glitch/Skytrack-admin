---
id: administrator.holidays.seed
title: Loading statutory holidays
description: Populate the calendar with the standard public holidays in one step.
category: administrator
subcategory: holidays
feature: holidays
roles: [admin, super_admin]
keywords: [seed holidays, load holidays, statutory, gazetted]
synonyms: [import holidays, default holidays]
related_articles: [administrator.holidays.declare, administrator.holidays.edit-delete]
feature_status: live
screens: [public-holidays]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Loading statutory holidays

## What this feature does

Fills the calendar with the standard gazetted public holidays, so you do not type each one.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. Open **Public Holidays**.
2. Choose the option to load the statutory holidays.
3. Review what was added.
4. Delete any your organisation does not observe, and add your own company days.

## Expected outcome

A populated calendar you can then tailor.

## Common mistakes

- **Treating the loaded list as final.** Not every organisation observes every gazetted holiday. Review it.
- **Loading it mid-month on a month already worked.** Each added holiday reduces that month's working days
  and changes everybody's per-day rate.
- **Running it twice.** Check for duplicates afterwards; a date counted twice is still one non-working day,
  but a duplicated list is confusing.

## Troubleshooting

If a date falls in a closed payroll month it will be refused — reopen the month first.

## Related articles

- [Declaring a holiday](administrator.holidays.declare)
