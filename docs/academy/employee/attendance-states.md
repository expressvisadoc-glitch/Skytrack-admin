---
id: employee.attendance.states
title: "The four states: not checked in, working, on break, checked out"
description: What each state on your attendance screen means and what you can do in it.
category: employee
subcategory: attendance
feature: attendance
roles: [employee]
keywords: [status, state, working, on break, checked out]
synonyms: [what does ready mean, attendance status]
related_articles: [employee.attendance.checkin, employee.break.start, employee.attendance.checkout]
feature_status: live
screens: [home]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# The four states: not checked in, working, on break, checked out

## What this feature does

Your attendance screen is always in exactly one of four states. The state decides which buttons work.

## Who can use it

Employees.

## The four states

| State | Screen shows | You can | You cannot |
| :--- | :--- | :--- | :--- |
| **Not checked in** | **Check-In**, status *Ready* | Check in | Take a break, check out |
| **Working** | Check-in time and a running timer | Take a break, check out | Check in again |
| **On break** | Break indicator and a break timer | Resume work | Check out, start a second break |
| **Checked out** | Day summary with total hours | Nothing more today | Check in again, take a break |

## Expected outcome

The buttons available always match your state, so you cannot record something impossible.

## Common mistakes

- **Expecting to check in again after checking out.** The day is closed. If that is wrong, an administrator
  can correct it.
- **Thinking a second break is blocked.** It is not — you can take several breaks a day. You simply cannot
  start one while another is running.

## Troubleshooting

If the screen looks out of date, refresh it. The state shown always comes from the server, so what you see
after a refresh is the truth.

## Related articles

- [How to check in](employee.attendance.checkin)
- [How to start a break](employee.break.start)
