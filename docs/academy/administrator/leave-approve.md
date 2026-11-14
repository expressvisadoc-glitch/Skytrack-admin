---
id: administrator.leave.approve
title: How to approve a leave request
description: Approve a pending request and understand how it splits into paid and unpaid days.
category: administrator
subcategory: leave
feature: leave_management
roles: [admin, super_admin]
keywords: [approve leave, accept leave, leave approval, grant leave]
synonyms: [sanction leave, authorise leave]
related_articles: [administrator.leave.reject, administrator.leave.paid-vs-lop, administrator.leave.balance-adjust, payroll.deductions.lop-leave]
related_tutorials: [tutorial.administrator.leave-approval]
feature_status: live
screens: [leave-management]
error_codes: [leave_not_pending, payroll_month_locked]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.leave-approval
---

# How to approve a leave request

## What this feature does

Approves a pending leave request. Approval is a **financial action**: it decides how many days are paid and
how many become loss of pay, and payroll deducts accordingly.

## Who can use it

Administrators and super administrators.

## Prerequisites

- The request is **Pending**. An already-decided request cannot be approved again.
- The dates are **not** in a locked payroll month.

## Step-by-step instructions

1. Open **Leave Management**.
2. Find the pending request. Check the employee, the dates, the type and the number of days.
3. Check their remaining balance for that type.
4. Add a comment if you want the employee to see one.
5. Select **Approve**.

## Expected outcome

The request becomes **Approved** and is split automatically:

- Days covered by the employee's balance → **paid**
- Days beyond it → **loss of pay**, deducted from that month's salary

A two-day request against a one-day balance gives **one paid day and one LOP day**. The employee sees the
split on their request.

## Common mistakes

- **Approving twice.** SkyTrack refuses a second approval with *"This leave request has already been
  approved."* This guard matters: without it the paid/LOP split would be recalculated and the employee's
  balance spent twice.
- **Approving without checking the balance.** The split is decided from the balance **at the moment of
  approval**. Adjust the balance first if you intend the leave to be paid.
- **Approving leave inside a closed month.** Refused. Reopen the month first.
- **Expecting week-offs and holidays to be counted.** They are not — only working days.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "This leave request has already been approved." | Already decided. Refresh the list. |
| "Payroll for … is locked." | Reopen the month before approving. |

## Interactive tutorial

**Approving a leave request** — including the reject branch.

## Related articles

- [Rejecting a request with feedback](administrator.leave.reject)
- [How approval splits paid and unpaid days](administrator.leave.paid-vs-lop)
