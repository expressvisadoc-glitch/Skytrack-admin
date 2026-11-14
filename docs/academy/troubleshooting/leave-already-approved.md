---
id: troubleshooting.leave.already-approved
title: This request has already been decided
description: A leave request can only be approved or rejected once — and why that guard matters.
category: troubleshooting
feature: leave_management
roles: [admin, super_admin]
keywords: [already approved, already decided, cannot approve, duplicate approval]
synonyms: [approve twice, decision already made]
related_articles: [administrator.leave.approve, administrator.leave.paid-vs-lop]
feature_status: live
screens: [leave-management]
error_codes: [leave_not_pending]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# This request has already been decided

## Symptom

Approving or rejecting gives *"This leave request has already been approved."*

## Cause

The request is no longer **Pending**. Only a pending request can be decided. This usually means:

- somebody else decided it moments ago, or
- the Approve button was pressed twice, or
- your list is out of date.

## Fix

Refresh the list. The request will show its real state.

## Why this guard exists — and it matters

Without it, a second approval would recalculate the paid/unpaid split using the balance **as it now stands**,
after the first approval already spent it. The result was an employee's unpaid day silently turning back
into a paid day, and their balance being charged twice.

A concrete case: an employee with one casual day applies for two. The first approval correctly records one
paid day and one unpaid day. A second approval would record **two paid days**, hand back a day's pay, and
leave the balance double-counted.

The refusal is the protection. Do not look for a way around it.

## If the decision really is wrong

Do not re-approve. Instead:

- Adjust the leave balance, or
- Correct the attendance for those days, or
- If the month is closed, reopen it, correct it, and lock it again.

## Expected outcome

The original decision stands, with its paid and unpaid split intact.

## Related articles

- [How approval splits paid and unpaid days](administrator.leave.paid-vs-lop)
