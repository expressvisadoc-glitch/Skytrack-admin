---
id: troubleshooting.checkin.gps-off
title: Your location is turned off
description: Location services are off on the phone itself — turn them on.
category: troubleshooting
feature: attendance
roles: [employee]
keywords: [gps off, location services, turn on location]
synonyms: [enable gps, location disabled]
related_articles: [troubleshooting.checkin.why, troubleshooting.checkin.location-permission, troubleshooting.checkin.accuracy]
feature_status: live
screens: [home]
error_codes: [invalid_location]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Your location is turned off

## Symptom

Check-in fails saying location services are turned off, or that the location reading is invalid.

## Cause

Location is switched off **for the whole phone**, not just for SkyTrack. Granting SkyTrack permission is not
enough while the phone's own location is off.

## Fix

1. Swipe down for quick settings and turn **Location** on.
2. Or open **Settings → Location** and switch it on.
3. If offered, choose high accuracy (sometimes called Google Location Accuracy).
4. Return to SkyTrack and try again.

## Expected outcome

Check-in proceeds and your position is read.

## Two different switches

| Switch | Where | Effect |
| :--- | :--- | :--- |
| Phone location | Settings → Location | Affects every app |
| SkyTrack permission | Settings → Apps → SkyTrack | Affects SkyTrack only |

**Both must be on.** The two are commonly confused.

## Common mistakes

- **Turning on battery saver**, which can restrict location on some phones.
- **Using flight mode indoors** — it turns location services off with everything else.

## Related articles

- [SkyTrack cannot see your location](troubleshooting.checkin.location-permission)
