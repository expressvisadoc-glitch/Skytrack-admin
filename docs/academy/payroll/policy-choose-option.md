---
id: payroll.policy.choose-option
title: Choosing how lateness affects pay
description: Pick between late marks and per-minute deduction, and understand what switching does.
category: payroll
subcategory: policy
feature: payroll
roles: [admin, super_admin]
keywords: [late policy, penalty option, late marks or per minute, lateness rule]
synonyms: [late setting, choose late rule]
related_articles: [payroll.deductions.late-marks, payroll.deductions.late-per-minute, payroll.policy.week-offs-grace]
feature_status: branch_only
screens: [payroll-settings]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Choosing how lateness affects pay

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Chooses which of two rules prices late arrivals. One is active at a time, for everyone.

## Who can use it

Administrators and super administrators.

## The two options

| | **Option 1 — Late marks** | **Option 2 — Per minute** |
| :--- | :--- | :--- |
| How | Groups of late days cost part of a day | Every late minute is charged |
| Typical setting | 2 marks = 0.5 day | Share of the day's pay, about ₹1.74/min |
| 1 minute late | Often nothing | About ₹1.74 |
| 2 hours late | 1 mark — often nothing | About ₹209 |
| Feels | Blunt; a slip and a disaster cost the same | Proportionate |

## Step-by-step instructions

1. Open **Payroll Settings**.
2. Under **How late check-ins affect pay**, choose an option.
3. For per-minute, choose the basis:
   - **Share of the day's pay** — scales with each person's salary and shift. Recommended.
   - **Fixed amount** — the same rupees per minute for everyone; enter the amount.
4. Optionally set a **daily cap** on charged minutes. 0 means no cap.
5. Save and confirm.

## Expected outcome

The rule applies from the next calculation. The employee's salary card shows it in their own terms.

## What switching does — read before you change it

| | Effect |
| :--- | :--- |
| **The open month** | **Re-priced on the next calculation.** Lateness already recorded this month is re-charged under the new rule |
| Closed months | Untouched. Payslips are frozen |
| Recorded late marks | Unchanged. Only their price changes |

**Switch between months, not mid-month**, unless you intend to re-price the month in progress — employees
will see their figure move.

## Common mistakes

- **Switching mid-month without telling anyone.** People watch this card.
- **Choosing a fixed amount without doing the arithmetic.** At ₹5 a minute, half an hour costs ₹150 — far
  more than the pro-rata ₹52 on a ₹20,000 salary. Fixed amounts hit lower salaries hardest.
- **Setting no daily cap with a high fixed amount.** The per-day limit still protects a single day, but the
  monthly total can mount.

## Related articles

- [Option 1: late marks](payroll.deductions.late-marks) · [Option 2: per-minute deduction](payroll.deductions.late-per-minute)
