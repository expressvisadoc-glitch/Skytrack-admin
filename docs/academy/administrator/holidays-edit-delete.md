---
id: administrator.holidays.edit-delete
title: Editing or deleting a holiday
description: Change or remove a holiday, and what that does to attendance and pay.
category: administrator
subcategory: holidays
feature: holidays
roles: [admin, super_admin]
keywords: [edit holiday, delete holiday, remove holiday]
synonyms: [change holiday date, cancel holiday]
related_articles: [administrator.holidays.declare, payroll.concepts.working-days]
feature_status: live
screens: [public-holidays]
error_codes: [payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Editing or deleting a holiday

## What this feature does

Changes or removes any holiday — company-declared or statutory alike.

## Who can use it

Administrators and super administrators.

## Prerequisites

The date must not be in a locked payroll month.

## Step-by-step instructions

1. Open **Public Holidays**.
2. Find the holiday.
3. Edit its name or date, or delete it.
4. Confirm.

## Expected outcome

The calendar updates for everyone immediately.

## Deleting a holiday makes it a working day again

That is the part to think about. If the date has passed and nobody checked in — because it was a holiday —
every one of them now has a **working day with no check-in**, which is recorded as an **absence** and costs
a day's pay.

**Never delete a holiday in the past** unless you intend exactly that and are prepared to enter attendance
for everyone.

## Common mistakes

- **Deleting a past holiday to "tidy up".** It creates absences for the whole workforce.
- **Changing a date instead of deleting and re-adding.** Editing is right; just check the old date is not in
  the past.
- **Expecting a deleted holiday to disappear from a closed month.** Closed months keep their figures.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "Payroll for … is locked." | Reopen the month first. |

## Related articles

- [Declaring a holiday](administrator.holidays.declare)
