---
id: payroll.deductions.lop-leave
title: Unpaid (LOP) leave
description: How the unpaid part of approved leave is charged.
category: payroll
subcategory: deductions
feature: payroll
roles: [employee, admin, super_admin]
keywords: [lop, loss of pay, unpaid leave deduction]
synonyms: [leave without pay, unpaid days]
related_articles: [employee.leave.unpaid, administrator.leave.paid-vs-lop, payroll.concepts.deductions]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Unpaid (LOP) leave

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Charges the part of an approved leave that your balance did not cover.

## The rule

The paid/unpaid split is decided **when the leave is approved**, using the balance at that moment. The
unpaid days are then placed on the leave's **working days**, in order, and each costs one day's pay.

### Worked example

An employee with **1 casual day** left is approved for **2 days**:

| | |
| :--- | :--- |
| Paid | 1 day |
| Unpaid (LOP) | 1 day |
| Cost on ₹20,000 over 24 working days | **₹833.33** |

## Which days are charged

Only **working days**. Days falling on a week-off or a published holiday are not counted, so leave spanning
a holiday costs less than its calendar length. A half day counts as 0.5 and costs half a day's pay.

## Expected outcome

The dates appear individually on your salary card.

## Common mistakes

- **Expecting a balance adjustment afterwards to undo it.** The split is fixed at approval. Adjusting the
  balance later does not convert an unpaid day into a paid one.
- **Expecting a rejected or cancelled request to cost money.** Neither does. Only **approved** leave can be
  unpaid.
- **Counting calendar days.** A Friday-to-Monday leave over a Sunday week-off is three working days, not
  four.

## For administrators

Check the balance **before** approving. If the leave should be paid, adjust the balance first. See
[How approval splits paid and unpaid days](administrator.leave.paid-vs-lop).

## Related articles

- [What loss of pay (LOP) means for you](employee.leave.unpaid)
