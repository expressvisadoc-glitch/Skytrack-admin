---
id: monitoring.location.audit
title: The location audit trail
description: Every check-in attempt, accepted or rejected, with where it came from and why it was judged that way.
category: monitoring
feature: geofencing
roles: [admin, super_admin]
keywords: [audit trail, location log, rejected attempts, evidence, dispute]
synonyms: [location history, check-in attempts]
related_articles: [administrator.geofence.configure, employee.attendance.location, monitoring.privacy]
feature_status: branch_only
error_codes: [outside_geofence, location_accuracy_too_low, location_stale, mock_location_detected]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# The location audit trail

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Records **every** attendance attempt — the ones that worked and the ones that were refused — with the
position, how far from the office it was, the outcome and the reason.

This is what makes attendance defensible when somebody disputes a day.

## Who can use it

Administrators and super administrators.

## What each entry holds

| Field | Meaning |
| :--- | :--- |
| Action | Check-in, check-out, break, resume |
| Outcome | Accepted, rejected, or no change |
| Reason | Why it was refused, if it was |
| Position and accuracy | The reading that was submitted |
| Distance | How far from the office |
| Settings in force | The radius and limits that applied **at that moment** |

Storing the settings alongside each attempt matters: if the radius is changed later, you can still see what
the rule was on the day.

## Expected outcome

A question like "I tried to check in on the 12th and it would not let me" has a factual answer.

## Common reasons for refusal

| Reason | Meaning |
| :--- | :--- |
| Outside geofence | Genuinely too far away |
| Accuracy too low | The reading was not precise enough to trust |
| Stale | The reading was too old |
| Mock location detected | A fake-location app was flagged |

## Limitations — read this before relying on it

- **It records attempts, not movements.** There is no record of where anyone is between punches.
- **Fake positions are not fully preventable.** Detection relies in part on what the phone reports. A
  determined user with a modified app can submit a position of their choosing. The audit trail shows what
  was submitted, not proof it was genuine.
- **Breaks are recorded but not enforced**, so a break entry may legitimately be far from the office.

## Common mistakes

- **Treating an accepted entry as proof of presence.** It is strong evidence, not proof.
- **Using it to monitor people during the day.** It cannot do that, and staff should be told so.

## Related articles

- [Monitoring limits and employee privacy](monitoring.privacy)
