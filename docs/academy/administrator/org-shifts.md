---
id: administrator.org.shifts
title: Creating and editing work shifts
description: Set the start and end times that decide whether a check-in counts as late.
category: administrator
subcategory: organisation
feature: employee_admin
roles: [admin, super_admin]
keywords: [shift, work shift, start time, working hours, timing]
synonyms: [schedule, roster timing]
related_articles: [administrator.employees.edit, payroll.deductions.late-marks, payroll.policy.week-offs-grace]
feature_status: live
screens: [organization]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Creating and editing work shifts

## What this feature does

Defines a shift: its **start time**, **end time** and **working minutes**. Each employee is assigned one.

## Who can use it

Administrators and super administrators.

## Why it matters

The shift **start time** is what a check-in is judged against. Check in after the start time (plus any
grace) and the day is a **late check-in**.

The **working minutes** matter if your organisation charges lateness **by the minute** — a late minute is
then worth the day's pay divided by the shift's working minutes.

## Step-by-step instructions

1. Open **Organization** and find work shifts.
2. Add a shift, or select one to edit.
3. Set start time, end time and working minutes.
4. Save, then assign employees to it on their records.

## Expected outcome

The shift is available to assign, and late decisions use it from now on.

## Changes apply to future days only

Editing a shift's start time **does not** re-judge days already recorded. Every late decision stores the
shift start, the grace and the shift length that applied on that day. This is deliberate — changing a shift
can never silently re-price last month.

## Common mistakes

- **Editing a shift to remove past late marks.** It will not work. Correct the check-in time instead.
- **Leaving an employee with no shift.** They can never be marked late, and payroll flags them.
- **Setting working minutes carelessly.** Under per-minute lateness this changes what a minute costs.

## Related articles

- [Option 1: late marks](payroll.deductions.late-marks)
