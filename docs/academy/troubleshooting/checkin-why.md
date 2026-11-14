---
id: troubleshooting.checkin.why
title: "Why can't I check in?"
description: Start here — the six reasons a check-in is refused, and which article fixes each.
category: troubleshooting
feature: attendance
roles: [employee]
keywords: [cannot check in, check in failed, not working, refused]
synonyms: [check in not working, unable to punch in]
related_articles: [troubleshooting.checkin.location-permission, troubleshooting.checkin.gps-off, troubleshooting.checkin.accuracy, troubleshooting.checkin.outside-geofence, troubleshooting.checkin.device-clock, troubleshooting.checkin.already]
feature_status: live
screens: [home]
error_codes: [location_required, invalid_location, location_accuracy_too_low, outside_geofence, location_stale, location_timestamp_invalid, mock_location_detected]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Why can't I check in?

## What this feature does

A check-in can be refused for six reasons. The message tells you which. Start here and follow the right one.

## Who can use it

Employees.

## Find your message

```
Why can't I check in?
├── "Location permission is required"      → permission is off
├── "Location services are turned off"     → GPS is off
├── "Not precise enough" / "expired"       → weak or stale signal
├── "Too far from the office"              → outside the permitted area
├── "Device time is ahead of the server"   → your clock is wrong
└── "Already checked in"                   → nothing is wrong
```

| Message | Article |
| :--- | :--- |
| Location permission is required | [SkyTrack cannot see your location](troubleshooting.checkin.location-permission) |
| Location services are turned off | [Your location is turned off](troubleshooting.checkin.gps-off) |
| Not precise enough, or the reading expired | [Your location is not precise enough](troubleshooting.checkin.accuracy) |
| Too far from the office | [You are too far from the office](troubleshooting.checkin.outside-geofence) |
| Timestamp is invalid or ahead | [Your phone's clock is wrong](troubleshooting.checkin.device-clock) |
| A fake location was detected | [A fake location was detected](troubleshooting.checkin.mock-location) |
| You have already checked in | [You are already checked in](troubleshooting.checkin.already) |

## The quick checklist

Before reading further, try these — they fix most cases:

1. Are you **inside** the office, not at the gate or car park?
2. Is **Location** on, and set to **Precise** for SkyTrack?
3. Are you online?
4. Move near a window and wait a few seconds for a better signal.
5. Close and reopen the app.

## Common mistakes

- **Trying repeatedly without changing anything.** The refusal has a reason; read it.
- **Using a laptop.** Laptops rarely know where they are precisely enough.

## Expected outcome

You identify which of the six applies and fix it.

## Related articles

- [How to check in](employee.attendance.checkin)
