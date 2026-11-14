---
id: troubleshooting.checkin.device-clock
title: Your phone's clock is wrong
description: SkyTrack refused a reading because your device's time does not match the server's.
category: troubleshooting
feature: geofencing
roles: [employee]
keywords: [clock, time wrong, timestamp, date time]
synonyms: [device time, wrong time]
related_articles: [troubleshooting.checkin.why, getting-started.time-and-dates]
feature_status: branch_only
screens: [home]
error_codes: [location_timestamp_invalid]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Your phone's clock is wrong

> **Not available yet.** This refusal applies once geofenced check-in is released.

## Symptom

Check-in is refused with a message that your device's time is ahead of the server, or that the reading's
timestamp is invalid.

## Cause

Your location reading carries the time your phone thinks it is. If that is noticeably ahead of the real
time, SkyTrack cannot judge whether the reading is fresh, so it refuses it.

## Fix

1. Open **Settings → System → Date & time**.
2. Turn on **Set time automatically** and **Set time zone automatically**.
3. Return to SkyTrack and try again.

## Expected outcome

The reading is accepted and check-in proceeds.

## This does not change your recorded time

Your check-in time is always taken from the **server**, never from your phone. A wrong phone clock cannot
make you look early or late — it only stops the check-in going through at all.

## Common mistakes

- **Changing the phone clock deliberately to check in earlier.** It cannot work, and it blocks you entirely.
- **Assuming it is a SkyTrack fault.** The app is comparing against real time and declining to guess.

## Related articles

- [How SkyTrack handles times and dates](getting-started.time-and-dates)
