---
id: administrator.leave.paid-vs-lop
title: How approval splits paid and unpaid days
description: The rule that decides which leave days are paid, and when it is applied.
category: administrator
subcategory: leave
feature: leave_management
roles: [admin, super_admin]
keywords: [paid leave, lop, split, unpaid days, balance]
synonyms: [how leave is paid, leave deduction rule]
related_articles: [administrator.leave.approve, administrator.leave.balance-adjust, payroll.deductions.lop-leave]
feature_status: live
screens: [leave-management]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How approval splits paid and unpaid days

## What this feature does

Explains the rule applied the moment you approve a request.

## Who can use it

Administrators and super administrators.

## The rule

```
paid days   = the lesser of (days requested, balance remaining)
unpaid days = days requested − paid days
```

Applied **once, at approval**, using the balance at that moment. The result is stored on the request and
payroll uses it.

### Example

An employee with **1 casual day** left applies for **2 days**:

| | |
| :--- | :--- |
| Requested | 2 days |
| Balance | 1 day |
| **Paid** | **1 day** |
| **Loss of pay** | **1 day** |
| Effect on pay | One day's pay deducted |

## Which days count

Only **working days**. Days falling on a week-off or a published holiday are not counted at all. A half day
counts as 0.5.

## Expected outcome

Every approved request carries an explicit paid/LOP split that both you and the employee can see.

## Common mistakes

- **Adjusting the balance after approving and expecting the split to change.** It does not. The split is
  fixed at approval. To change it, the request must be handled again.
- **Assuming an approved request is fully paid.** Check the split.
- **Approving a request twice.** Refused — and that guard is what stops a split being recalculated and a
  balance being spent twice.

## Related articles

- [Adjusting a leave balance](administrator.leave.balance-adjust)
