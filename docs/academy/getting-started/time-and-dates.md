---
id: getting-started.time-and-dates
title: How SkyTrack handles times and dates
description: Which clock SkyTrack trusts, which day a punch belongs to, and why your times always look right.
category: getting-started
feature: attendance
roles: [employee, admin, super_admin]
keywords: [time, date, timezone, clock, server time]
synonyms: [wrong time, time difference]
related_articles: [employee.attendance.checkin, troubleshooting.checkin.device-clock, payroll.concepts.working-days]
feature_status: live
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How SkyTrack handles times and dates

## What this feature does

Explains where SkyTrack's times come from. This matters because your pay is worked out from them.

## Who can use it

Everyone.

## The three rules

**1. The server's clock is the one that counts.**
When you check in, the time recorded is the **server's**, not your phone's. Changing your phone's clock does
not change your attendance. If your phone's clock is badly wrong, a check-in may be refused.

**2. Times are shown in your own local time.**
Times are stored in a single universal format and converted for display, so you always see them as they were
where you are.

**3. A punch belongs to one day.**
The day a punch counts for is fixed when you make it. For normal office hours this is simply the day you are
having. A punch between **midnight and about 5:30 in the morning** is recorded against the **previous** day.

## Expected outcome

The times you see are the times that were recorded, and the day's totals add up.

## Common mistakes

- **Changing the phone clock to check in earlier.** It does not work and may block the check-in entirely.
- **Expecting a late-night punch to count for the new day.** See rule 3.

## Troubleshooting

If a check-in is refused with a message about your device's time, see
[Your phone's clock is wrong](troubleshooting.checkin.device-clock).

## Related articles

- [How working days are counted](payroll.concepts.working-days)
