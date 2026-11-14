---
id: troubleshooting.checkin.mock-location
title: A fake location was detected
description: Your phone reported a simulated position, so the check-in was refused.
category: troubleshooting
feature: geofencing
roles: [employee]
keywords: [mock location, fake gps, spoofing, simulated location]
synonyms: [gps spoof, location faker]
related_articles: [troubleshooting.checkin.why, monitoring.location.audit, employee.attendance.location]
feature_status: branch_only
screens: [home]
error_codes: [mock_location_detected]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# A fake location was detected

> **Not available yet.** This refusal applies once geofenced check-in is released.

## Symptom

Check-in is refused because a mock or simulated location was detected.

## Cause

Android reported that the position came from a **fake-location app** rather than the real GPS. SkyTrack will
not accept it, and the attempt is recorded.

## Fix

If you did not do this deliberately:

1. Open **Settings → System → Developer options**.
2. Find **Select mock location app** and set it to **none**.
3. Uninstall any GPS-spoofing or location-changer app.
4. Restart your phone and try again.

Some testing and game apps enable this without making it obvious.

## Expected outcome

Your real position is used and check-in works.

## This is recorded

Rejected attempts, including this one, are kept in the location audit trail and may be reported to your
administrator. If it was accidental, say so rather than leaving it to be noticed.

## Common mistakes

- **Leaving a developer option set from months ago.** Check it before assuming a fault.

## Related articles

- [The location audit trail](monitoring.location.audit)
