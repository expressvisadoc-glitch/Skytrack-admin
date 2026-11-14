---
id: administrator.geofence.configure
title: Setting the office location and radius
description: Define where staff are allowed to check in from — the single most consequential setting in SkyTrack.
category: administrator
subcategory: geofence
feature: geofencing
roles: [admin, super_admin]
keywords: [geofence, office location, radius, where staff check in]
synonyms: [set office, check-in area, boundary]
related_articles: [administrator.geofence.accuracy, administrator.geofence.maplink, troubleshooting.checkin.outside-geofence, monitoring.location.audit]
related_tutorials: [tutorial.administrator.geofence]
feature_status: branch_only
screens: [office-geofence]
error_codes: [geofence_not_configured, outside_geofence]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.geofence
---

# Setting the office location and radius

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Sets where your office is and how far from it a check-in is accepted.

## Who can use it

Administrators and super administrators.

> **Get this wrong and nobody can check in.** Change it carefully, and check it the same day.

## Prerequisites

The office's real coordinates. The most reliable way is to find the building in Google Maps, press and hold
on it, and copy the coordinates.

## Step-by-step instructions

1. Open **Office Geofence**.
2. Set the office position — enter coordinates, paste a map link, or move the pin on the map.
3. Set the **radius** in metres. Large enough to cover the building, small enough to mean something.
4. Set the accuracy policy — see [Accuracy and fix-age limits](administrator.geofence.accuracy).
5. Make sure it is **active**.
6. Save and confirm.

## Expected outcome

The map shows the office and its radius, and check-ins from inside are accepted. Every change is recorded
with who made it and when.

## Choosing a radius

| Radius | Suits |
| :--- | :--- |
| 30–50 m | A single floor or a small building |
| 50–100 m | A building with a courtyard or car park |
| Over 150 m | Usually too loose — it may include the street |

The boundary is exact: standing **on** the line counts as inside; one metre beyond is outside.

## Common mistakes

- **Capturing the office pin with "use my current location" on a laptop.** A laptop's position can be
  hundreds of metres out, and that error becomes your office. Use real coordinates.
- **Setting a radius so tight that staff at the far end of the building are refused.** Walk the building.
- **Turning it off and assuming check-in is unrestricted.** With no active configuration, check-in is
  **blocked entirely**, not opened up.
- **Changing it at month end.** Refused check-ins become absences, which cost people money.

## Troubleshooting

| Message | Meaning |
| :--- | :--- |
| "Geofence not configured" | No office is set, or it is inactive. Nobody can check in. |
| Everyone is suddenly outside | The pin is wrong. Check the coordinates. |
| Only some people are refused | Likely accuracy rather than distance. See [Accuracy and fix-age limits](administrator.geofence.accuracy). |

## Interactive tutorial

**Configuring the office geofence.**

## Related articles

- [The location audit trail](monitoring.location.audit)
