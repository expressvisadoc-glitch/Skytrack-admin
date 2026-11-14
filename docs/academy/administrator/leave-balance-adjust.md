---
id: administrator.leave.balance-adjust
title: Adjusting a leave balance
description: Add or remove leave days from an employee's balance.
category: administrator
subcategory: leave
feature: leave_management
roles: [admin, super_admin]
keywords: [adjust balance, add leave days, leave allocation, credit leave]
synonyms: [change leave balance, grant extra leave]
related_articles: [administrator.leave.paid-vs-lop, employee.leave.balances]
feature_status: live
screens: [leave-management]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Adjusting a leave balance

## What this feature does

Changes how much paid leave an employee has, by adding or removing days.

## Who can use it

Administrators and super administrators.

## Prerequisites

Decide the type (casual or sick) and the number of days. **Loss of pay has no balance** and cannot be
adjusted.

## Step-by-step instructions

1. Open **Leave Management**.
2. Find the employee and open the balance adjustment.
3. Choose the type, enter the days, and give a reason.
4. Save.

## Expected outcome

The balance changes as `allocated + adjustments − used`, and the employee sees it immediately.

## Timing matters

Adjust **before** approving a request. The paid/LOP split is decided at approval using the balance at that
moment, so adding days afterwards does not convert an unpaid day into a paid one.

## Common mistakes

- **Adjusting after approval to fix a deduction.** Too late — the split is already stored.
- **Trying to adjust Loss of Pay.** It has no balance.
- **Using an adjustment instead of correcting attendance.** If someone was actually at work, enter the
  attendance; do not grant leave instead.

## Troubleshooting

If a balance looks wrong, check the employee's approved requests — used days come from approvals.

## Related articles

- [Understanding your leave balances](employee.leave.balances)
