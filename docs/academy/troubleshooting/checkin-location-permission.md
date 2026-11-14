---
id: troubleshooting.checkin.location-permission
title: SkyTrack cannot see your location
description: Location permission is denied — how to grant it, including "Precise".
category: troubleshooting
feature: attendance
roles: [employee]
keywords: [location permission, allow location, permission denied]
synonyms: [enable location, grant permission]
related_articles: [troubleshooting.checkin.why, troubleshooting.checkin.gps-off, employee.attendance.location]
feature_status: live
screens: [home]
error_codes: [location_required]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# SkyTrack cannot see your location

## Symptom

A card reads **Location permission needed**, or check-in fails saying location permission is required.

## Cause

SkyTrack has not been allowed to read your position, or has only been allowed **approximate** location.

## Fix

**In the app**

1. On the home screen, select **Allow location** on the permission card.
2. Choose **While using the app** and, importantly, **Precise**.

**If you previously chose "Don't allow"**

Android stops asking. Use **App settings** on the same card, or:

1. Open your phone's **Settings → Apps → SkyTrack → Permissions → Location**.
2. Choose **Allow only while using the app**.
3. Turn **Use precise location** on.
4. Return to SkyTrack and try again.

## Why "Precise" matters

Approximate location can be hundreds of metres out — far wider than a typical office radius — so a check-in
will be refused for poor accuracy even though you are standing in the office.

## Expected outcome

The permission card disappears and check-in works.

## Common mistakes

- **Granting location but leaving "Precise" off.** The commonest cause of a check-in that still fails.
- **Choosing "Only this time"** and being asked again every day.

## What SkyTrack does with it

Your position is read **only** when you check in or out — never in the background. See
[Why SkyTrack asks for your location](employee.attendance.location).

## Related articles

- [Why can't I check in?](troubleshooting.checkin.why)
