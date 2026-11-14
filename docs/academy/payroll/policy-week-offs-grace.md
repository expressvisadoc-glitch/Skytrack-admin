---
id: payroll.policy.week-offs-grace
title: Week-offs, grace and allowed break
description: The settings that decide which days are working days and when a check-in is late.
category: payroll
subcategory: policy
feature: payroll
roles: [admin, super_admin]
keywords: [week off, grace period, settings, payroll settings, sunday]
synonyms: [weekly off, late grace]
related_articles: [payroll.concepts.working-days, payroll.policy.choose-option, administrator.settings.break-policy]
feature_status: branch_only
screens: [payroll-settings]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Week-offs, grace and allowed break

> **Not available yet.** Payroll Settings is released with payroll.

## What this feature does

Three settings on one screen, with very different weight.

| Setting | Effect | Weight |
| :--- | :--- | :--- |
| **Week-off days** | Which weekdays are never working days | **Changes everyone's pay** |
| **Late grace** | Minutes after shift start before a check-in is late | Changes late deductions |
| **Allowed break** | Break length before a reminder | **None on pay** |

## Who can use it

Administrators and super administrators.

## Week-off days

Ticked days are non-working. Untick a day and it becomes a working day for everyone.

This is the **most consequential setting in SkyTrack**. Changing it changes the month's working days, which
changes everyone's per-day rate and therefore the cost of every absence and leave day. It also means days
with no check-in on the newly-working day become **absences**.

Change it between months, never mid-month.

## Late grace

Minutes after the shift start that are still on time. With a grace of 10 on a 10:00 shift, 10:08 is on time
and 10:11 is late.

**Grace is frozen per day.** Each late decision records the grace that applied when it was made, so raising
the grace never forgives past days. A new grace affects future check-ins only.

## Allowed break

A reminder threshold only — see [Setting the allowed break length](administrator.settings.break-policy). It
does not reduce pay.

## Expected outcome

Settings that match how your organisation actually works, with a recorded history of every change.

## Common mistakes

- **Changing week-offs mid-month.** Working days shift under everybody's feet.
- **Raising the grace to forgive last week's lateness.** It cannot; past days keep their own grace.
- **Expecting the allowed break to enforce anything.** It does not.

## Related articles

- [How working days are counted](payroll.concepts.working-days)
