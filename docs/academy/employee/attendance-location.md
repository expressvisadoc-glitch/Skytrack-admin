---
id: employee.attendance.location
title: Why SkyTrack asks for your location
description: What SkyTrack checks about your position, when it reads it, and what it does not do.
category: employee
subcategory: attendance
feature: geofencing
roles: [employee]
keywords: [location, gps, geofence, privacy, tracking]
synonyms: [why location, is it tracking me]
related_articles: [troubleshooting.checkin.outside-geofence, troubleshooting.checkin.accuracy, monitoring.location.audit]
feature_status: branch_only
screens: [home]
error_codes: [outside_geofence, location_accuracy_too_low, location_stale, mock_location_detected]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Why SkyTrack asks for your location

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

So that attendance means something, SkyTrack accepts a check-in or check-out only from **inside the office**.
To do that it reads your position at that moment.

## Who can use it

Employees. Your administrator sets where the office is and how large the permitted area is.

## When your location is read

**Only when you check in or check out.** Not during the day, not in the background, not while the app is
closed. SkyTrack cannot see where you are at any other time.

Starting and ending a **break** does not require you to be at the office.

## What is checked

| Check | Meaning |
| :--- | :--- |
| **Distance** | Are you inside the permitted radius of the office? |
| **Accuracy** | Is the reading precise enough to trust? |
| **Freshness** | Is the reading recent, rather than an old one? |
| **Authenticity** | Is it a real reading, rather than a fake-location app? |

All four are checked on the server. The app shows friendly guidance such as "you are 40 m away", but the
server makes the decision.

## Expected outcome

Check-in succeeds when you are genuinely at work, and is refused otherwise with a reason.

## Common mistakes

- **Thinking the in-app distance is final.** It is guidance. The server re-checks.
- **Being just outside and expecting it to pass.** The boundary is exact.

## Your privacy

- Position is read **only** at a punch.
- It is stored with that attendance attempt so there is a record if a day is ever disputed.
- Administrators can see where a check-in happened. They cannot see where you are at any other time.

## Troubleshooting

See [Too far from the office](troubleshooting.checkin.outside-geofence) and
[Not precise enough](troubleshooting.checkin.accuracy).

## Related articles

- [The location audit trail](monitoring.location.audit)
