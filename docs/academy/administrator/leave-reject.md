---
id: administrator.leave.reject
title: Rejecting a request with feedback
description: Decline a leave request and tell the employee why.
category: administrator
subcategory: leave
feature: leave_management
roles: [admin, super_admin]
keywords: [reject leave, decline leave, refuse leave]
synonyms: [deny leave, turn down request]
related_articles: [administrator.leave.approve, employee.leave.status]
related_tutorials: [tutorial.administrator.leave-approval]
feature_status: live
screens: [leave-management]
error_codes: [leave_not_pending]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.leave-approval
---

# Rejecting a request with feedback

## What this feature does

Declines a pending leave request, with a comment the employee can read.

## Who can use it

Administrators and super administrators.

## Prerequisites

The request is **Pending**.

## Step-by-step instructions

1. Open **Leave Management**.
2. Find the pending request.
3. Write a comment explaining the decision. Always do this — a rejection with no reason creates a
   conversation you then have to have anyway.
4. Select **Reject**.

## Expected outcome

The request becomes **Rejected**. **No balance is used and no deduction is made.** The employee sees the
state and your comment, and can apply again.

## Common mistakes

- **Rejecting without a comment.** The employee only sees "Rejected".
- **Rejecting to "cancel" an approved request.** You cannot reject an approved one; it is no longer pending.
- **Rejecting when the employee has already taken the time.** Rejecting does not create an absence — but a
  working day with no check-in and no approved leave is recorded as an absence anyway, which costs a day's
  pay. If that is not intended, enter the attendance instead.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "This leave request has already been approved." | It is no longer pending. |

## Related articles

- [How to approve a leave request](administrator.leave.approve)
