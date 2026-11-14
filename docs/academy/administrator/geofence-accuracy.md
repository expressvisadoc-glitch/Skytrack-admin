---
id: administrator.geofence.accuracy
title: Accuracy and fix-age limits
description: The two quality checks that decide whether a location reading is trusted at all.
category: administrator
subcategory: geofence
feature: geofencing
roles: [admin, super_admin]
keywords: [accuracy, gps accuracy, stale location, fix age, location quality]
synonyms: [precision setting, location limits]
related_articles: [administrator.geofence.configure, troubleshooting.checkin.accuracy, monitoring.location.audit]
feature_status: branch_only
screens: [office-geofence]
error_codes: [location_accuracy_too_low, location_stale]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Accuracy and fix-age limits

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Two settings decide whether a location reading is trustworthy **before** distance is even considered.

| Setting | Question | Typical |
| :--- | :--- | :--- |
| **Max accuracy** | Is the reading precise enough? | 50 m |
| **Max location age** | Is the reading recent enough? | 120 seconds |

## Who can use it

Administrators and super administrators.

## How they are applied

A reading less precise than the accuracy limit is refused as **not precise enough**. A reading older than
the age limit is refused as **stale**. Only then is distance checked.

Radius and accuracy are **separate**: the reading must first be good enough, then close enough.

## Expected outcome

Check-ins are judged on readings you can rely on.

## Choosing values

- **Accuracy 50 m** suits phones outdoors or near windows. Phones typically report 5–30 m.
- **Tightening below about 20 m** will refuse staff deep inside a building where GPS is weak.
- **Loosening beyond about 100 m** starts accepting readings less precise than your own radius, which makes
  the geofence meaningless.
- **Age 120 s** is sensible. Shorter forces a fresh fix and more waiting; longer allows a position from
  somewhere the employee has since left.

## Common mistakes

- **Loosening accuracy because laptops are refused.** Laptops are refused because they genuinely do not know
  where they are. Tell staff to use the phone rather than weakening the rule for everyone.
- **Confusing accuracy with radius.** A 30 m radius with a 100 m accuracy limit accepts readings that cannot
  tell inside from outside.

## Troubleshooting

See [Your location is not precise enough](troubleshooting.checkin.accuracy).

## Related articles

- [Setting the office location and radius](administrator.geofence.configure)
