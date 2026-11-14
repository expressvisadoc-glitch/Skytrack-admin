---
id: monitoring.privacy
title: Monitoring limits and employee privacy
description: What SkyTrack can and cannot see about your staff, and what to tell them.
category: monitoring
feature: geofencing
roles: [admin, super_admin, employee]
keywords: [privacy, tracking, monitoring, what can admin see, surveillance]
synonyms: [is it tracking, data protection]
related_articles: [monitoring.location.audit, employee.attendance.location, getting-started.roles]
feature_status: branch_only
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Monitoring limits and employee privacy

> **Partly not available yet.** The location detail below applies once geofenced check-in is released.
> Everything about what SkyTrack *cannot* see is true today.

## What this feature does

Sets out plainly what SkyTrack observes. Staff ask, and the honest answer is reassuring.

## Who can use it

Everyone. Administrators should be able to answer these questions; employees deserve to know.

## What SkyTrack can see

| Can see | Detail |
| :--- | :--- |
| When somebody punches | Check-in, check-out, break, resume, with server timestamps |
| Where they were **at a punch** | Position, accuracy and distance from the office |
| Refused attempts | Including the reason |
| Attendance, leave, salary | Administrators see this for everyone |

## What SkyTrack cannot see

| Cannot see | Why |
| :--- | :--- |
| Where anyone is **between** punches | Location is read only at a punch |
| Movement during the day | Nothing runs in the background |
| Where someone is on a break | Breaks are not location-checked |
| Anything when the app is closed | No background location is requested |
| Anyone's password | Stored so it cannot be read back |

The app requests **foreground location only**. It is not technically capable of background tracking.

## What employees should be told

1. Your location is read **only** when you check in or out.
2. It is kept with that attempt, so a disputed day can be settled.
3. Breaks are not location-checked.
4. Administrators can see your attendance and pay. Other employees cannot see anything of yours.

## Common mistakes

- **Letting staff assume they are tracked all day.** They are not, and the misunderstanding causes real
  resentment. Say so explicitly.
- **Promising the geofence cannot be fooled.** It can, by a determined user with a modified app. It is a
  strong deterrent and an evidence trail, not an absolute control.

## Related articles

- [The location audit trail](monitoring.location.audit)
