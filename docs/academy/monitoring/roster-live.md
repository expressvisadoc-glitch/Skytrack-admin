---
id: monitoring.roster.live
title: Watching the live roster
description: Follow who is present, on a break or missing as the day happens.
category: monitoring
feature: attendance
roles: [admin, super_admin]
keywords: [live roster, who is in, real time, present today]
synonyms: [current attendance, live view]
related_articles: [administrator.dashboard.overview, monitoring.feed.punches, monitoring.attendance.exceptions]
feature_status: live
screens: [dashboard]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Watching the live roster

## What this feature does

Shows the workforce as it stands right now, updating as people punch.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. Open **Dashboard**.
2. Read the counts at the top, then the roster beneath.
3. Refresh to pull the latest state.

## What the states mean right now

| State | Means |
| :--- | :--- |
| Checked in | Working |
| On break | Away, timer running |
| Not checked in | No check-in **yet** — not necessarily absent |
| Checked out | Finished for the day |

## Expected outcome

An accurate picture of the present moment.

## Limitations worth knowing

- **It is a snapshot, not a feed.** Refresh for the newest state.
- **It shows attendance, not location.** You can see that somebody checked in, not where they are now.
  SkyTrack reads position only at a punch.
- **"Not checked in" is not an absence** until the working day is over.

## Common mistakes

- **Chasing people at 09:05 on a 10:00 shift.** Check the shift before assuming lateness.
- **Treating inactive employees as missing.** They are excluded from the roster.

## Related articles

- [The punch and activity feed](monitoring.feed.punches)
