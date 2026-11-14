---
id: employee.salary.card
title: Seeing this month's salary
description: Reveal your expected pay for the current month and the deductions behind it.
category: employee
subcategory: salary
feature: payroll
roles: [employee]
keywords: [salary, my pay, this month salary, expected salary, salary card]
synonyms: [how much will i get, my wages]
related_articles: [payroll.concepts.deductions, employee.payslip.download, payroll.concepts.per-day-rate]
related_tutorials: [tutorial.employee.salary-card]
feature_status: branch_only
screens: [home]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.employee.salary-card
---

# Seeing this month's salary

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Shows what you can expect to be paid this month, and exactly what has reduced it. It updates as the month
goes on.

## Who can use it

Employees, for their own salary only. Nobody else's figures are ever shown.

## Prerequisites

An administrator must have set your salary. Without one the card says so.

## Step-by-step instructions

1. Open **Attendance & Breaks**.
2. Find **This month's salary**. It reads `₹ • • • • •` — hidden on purpose.
3. Select the eye icon to reveal it.
4. Open the breakdown to see each deduction and the dates behind it.

## What you will see

| Line | Meaning |
| :--- | :--- |
| Monthly gross | Your full salary, with the month's working days and your per-day rate |
| Absences | Working days with no check-in and no approved leave |
| Unpaid (LOP) leave | The unpaid part of approved leave |
| Late check-ins | What your late arrivals have cost, under whichever rule your organisation uses |
| **Expected net pay** | What you can expect, if the rest of the month goes as scheduled |
| Days affecting pay | The individual dates, so you can check each one |

## Expected outcome

You can see the day after a late arrival or an absence what it cost you, rather than finding out at month
end.

## Why it is hidden by default

So your salary is not on screen when someone glances at your phone. The figure is fetched only when you
reveal it and is never stored on the device.

## Common mistakes

- **Treating it as final.** It is marked **provisional** while the month is open. Remaining working days are
  assumed worked, and today is not counted until it is over.
- **Expecting it to show a past month.** The card is always the current month. For a finished month use your
  [payslip](employee.payslip.download).
- **Reading "Salary not set yet" as an error.** It means no salary has been recorded for you — ask an
  administrator.

## Troubleshooting

| What you see | Meaning |
| :--- | :--- |
| "Salary not set yet." | No salary on your record. |
| A warning about your joining date | Your joining date is missing, so the whole month is counted. |
| The figure changed since yesterday | Expected — it recalculates after every attendance or leave change. |

## Interactive tutorial

**Revealing the salary card.**

## Related articles

- [What can reduce your pay](payroll.concepts.deductions)
