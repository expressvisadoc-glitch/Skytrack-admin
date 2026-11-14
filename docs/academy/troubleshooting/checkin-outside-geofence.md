---
id: troubleshooting.checkin.outside-geofence
title: You are too far from the office
description: Your position was read successfully, but it was outside the permitted area.
category: troubleshooting
feature: geofencing
roles: [employee]
keywords: [outside geofence, too far, not at office, radius]
synonyms: [out of range, wrong location]
related_articles: [troubleshooting.checkin.why, troubleshooting.checkin.accuracy, administrator.geofence.configure, employee.attendance.location]
feature_status: branch_only
screens: [home]
error_codes: [outside_geofence]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# You are too far from the office

> **Not available yet.** This refusal applies once geofenced check-in is released.

## Symptom

Check-in or check-out is refused because you are outside the office area. The app usually shows how far away
you are.

## Cause

Your position was read fine — it was simply outside the permitted radius. The boundary is exact: on the line
counts as inside, a metre beyond does not.

## Fix

1. **Go inside the office.** The car park, the gate and the building next door may all be outside.
2. Check the distance shown. A few metres means move further in; hundreds of metres means something else is
   wrong.
3. Wait a few seconds for the reading to settle, then try again.

## If you are definitely at the office

| Situation | What is happening |
| :--- | :--- |
| Distance shown is a few metres over | You are near the edge. Move further inside. |
| Distance is hundreds of metres | Your phone has a poor fix, or the office pin is wrong |
| Everyone is affected today | The office location or radius has been changed — tell your administrator urgently |
| Only you are affected | Likely your phone's signal. See [Not precise enough](troubleshooting.checkin.accuracy) |

## Expected outcome

Check-in succeeds from inside the office.

## Common mistakes

- **Checking in from the gate to save time.** Usually outside.
- **Assuming the in-app distance is final.** It is guidance; the server decides.
- **Waiting until the end of the month to report it.** A refused check-in on a working day becomes an
  **absence**, which costs a day's pay. Report it the same day.

## For administrators

If several people are refused, check **Office Geofence** immediately — the pin may have been set from a
device that did not know where it was. See [Setting the office location and radius](administrator.geofence.configure).

## Related articles

- [Why SkyTrack asks for your location](employee.attendance.location)
