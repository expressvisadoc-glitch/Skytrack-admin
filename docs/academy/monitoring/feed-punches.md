---
id: monitoring.feed.punches
title: The punch and activity feed
description: A running record of attendance events as they happen.
category: monitoring
feature: attendance
roles: [admin, super_admin]
keywords: [feed, punch log, activity, events, audit]
synonyms: [attendance log, event stream]
related_articles: [monitoring.roster.live, administrator.attendance.ledger, monitoring.location.audit]
feature_status: live
screens: [attendance, dashboard]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# The punch and activity feed

## What this feature does

Lists attendance events — check-ins, check-outs, breaks — in the order they happened.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. Open **Attendance**, or the notification panel in the top bar.
2. Read the feed newest first.
3. Select an entry to open that employee's day.

## Expected outcome

You can see the sequence of the day rather than only its end state.

## Expected outcome vs the ledger

| Use the feed | Use the ledger |
| :--- | :--- |
| "What just happened?" | "What did this person do on the 12th?" |
| Watching the morning arrive | Checking or correcting a record |

## Limitations

- **Breaks are shown as events, but only the day's total is stored.** You cannot reconstruct a list of every
  separate break afterwards.
- **It is attendance, not location.** For accepted and rejected location attempts see
  [The location audit trail](monitoring.location.audit).

## Common mistakes

- **Using the feed as the record of truth for a dispute.** Use the ledger and the location audit trail.

## Related articles

- [The attendance ledger](administrator.attendance.ledger)
