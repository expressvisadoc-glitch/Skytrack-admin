---
id: employee.attendance.checkin
title: How to check in
description: Record the start of your working day, and what SkyTrack checks before it accepts it.
category: employee
subcategory: attendance
feature: attendance
roles: [employee]
keywords: [check in, punch in, clock in, start work, mark attendance]
synonyms: [attendance marking, sign in for work]
related_articles: [employee.attendance.checkout, employee.attendance.location, employee.attendance.states, troubleshooting.checkin.outside-geofence]
related_tutorials: [tutorial.employee.first-checkin]
feature_status: live
screens: [home]
error_codes: [outside_geofence, location_required, invalid_location]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.employee.first-checkin
---

# How to check in

## What this feature does

Records the start of your working day. The time recorded is the **server's**, so it cannot be changed from
your phone.

## Who can use it

Employees, for themselves. You can check in **once a day**.

## Prerequisites

- You are at the office.
- Location is allowed for SkyTrack, set to **Precise**.
- You have an internet connection.

## Step-by-step instructions

1. Open SkyTrack. The large circle reads **Check-In** with the status **Ready**.
2. Select the circle.
3. Wait a moment while your position is read and checked.

## Expected outcome

The circle changes to show you are working, your check-in time appears below it, and a timer starts counting
your hours.

If you arrived after your shift start, the day is also recorded as a **late check-in**. See
[Option 1: late marks](payroll.deductions.late-marks).

## Common mistakes

- **Checking in from the car park, the gate or a nearby café.** You must be inside the permitted radius.
- **Using a laptop.** A laptop estimates its position from Wi-Fi and is usually not precise enough.
- **Checking in twice.** The second attempt changes nothing; your original time is kept.
- **Waiting until you are settled at your desk.** Your check-in time is when you press the button, not when
  you arrived.

## Troubleshooting

| Message | Meaning | Article |
| :--- | :--- | :--- |
| You are too far from the office | Outside the radius | [Too far from the office](troubleshooting.checkin.outside-geofence) |
| Location is not precise enough | Weak GPS | [Not precise enough](troubleshooting.checkin.accuracy) |
| Location permission needed | SkyTrack cannot read your position | [Cannot see your location](troubleshooting.checkin.location-permission) |
| Nothing happens | No internet | Reconnect and try again |

## Interactive tutorial

**Your first check in and check out** — practise safely without touching your record.

## Related articles

- [How to check out](employee.attendance.checkout)
- [Why SkyTrack asks for your location](employee.attendance.location)
