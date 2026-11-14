---
id: troubleshooting.checkin.accuracy
title: Your location is not precise enough
description: The signal is weak or the reading is stale — how to get a better fix.
category: troubleshooting
feature: geofencing
roles: [employee]
keywords: [accuracy, not precise, weak gps, stale location, expired]
synonyms: [poor signal, bad gps]
related_articles: [troubleshooting.checkin.why, administrator.geofence.accuracy, troubleshooting.checkin.outside-geofence]
feature_status: branch_only
screens: [home]
error_codes: [location_accuracy_too_low, location_stale]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Your location is not precise enough

> **Not available yet.** This refusal applies once geofenced check-in is released.

## Symptom

Check-in is refused because the reading is **not precise enough**, or because it has **expired**.

## Cause

Two separate checks, both about the quality of the reading rather than where you are:

| Refusal | Means |
| :--- | :--- |
| Not precise enough | Your phone is unsure of its position — typically indoors, deep in a building, or with a weak signal |
| Expired / stale | The reading is too old. SkyTrack will not accept a position from a while ago |

Your organisation sets both limits, commonly 50 metres and about two minutes.

## Fix

1. Move near a **window**, a doorway or outside.
2. Wait **10–20 seconds** — the first reading is often poor and improves.
3. Make sure **Precise** location is on. Approximate location is almost never accurate enough.
4. Turn **Wi-Fi on**, even without connecting. It genuinely improves accuracy indoors.
5. Try again.

## If it keeps happening

- **On a laptop** — expected. A laptop estimates position from the network, often hundreds of metres out.
  Use your phone.
- **In a basement or a steel-framed building** — GPS may never be good enough in one spot. Tell your
  administrator; the accuracy limit can be reviewed.

## Expected outcome

A fresh, precise reading is accepted.

## Common mistakes

- **Pressing repeatedly in the same spot.** Move first, then wait.
- **Thinking it means you are too far away.** It does not — it means the reading cannot be trusted either
  way.

## Related articles

- [Accuracy and fix-age limits](administrator.geofence.accuracy)
