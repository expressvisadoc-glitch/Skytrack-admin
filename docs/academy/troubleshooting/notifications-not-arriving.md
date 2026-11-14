---
id: troubleshooting.notifications.not-arriving
title: You are not getting alerts
description: Work through the reasons SkyTrack notifications do not reach your phone.
category: troubleshooting
feature: notifications
roles: [employee]
keywords: [no notifications, alerts not working, push not arriving]
synonyms: [not getting reminders, notifications off]
related_articles: [employee.notifications.settings, employee.notifications.inbox, getting-started.notifications]
feature_status: branch_only
screens: [profile]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# You are not getting alerts

> **Not available yet.** This applies once notifications are released.

## Symptom

Notifications appear in the app's bell inbox but never on your phone, or nothing arrives at all.

## Work through these in order

| Check | Where | What you want |
| :--- | :--- | :--- |
| **Punch-in Alerts** | SkyTrack → My Account | On |
| **Android permission** | Settings → Apps → SkyTrack → Notifications | Allowed |
| **Channel** | Same screen, the SkyTrack alerts channel | Not blocked |
| **Battery optimisation** | Settings → Apps → SkyTrack → Battery | Unrestricted, if you want timely reminders |
| **Signed in** | SkyTrack | Notifications only reach the employee signed in on that phone |
| **Do Not Disturb** | Phone quick settings | Off, or SkyTrack allowed |

**Both** the SkyTrack switch and the Android permission must be on. Turning on one is not enough.

## A notification missed while permission was denied does not come back

If a notification arrives while notifications are blocked, it is dropped from the phone and **not re-shown**
once you allow them. It will still be in the **bell inbox**, so check there.

## If you changed phones

Your new phone registers itself when you sign in. Sign out and back in on the new device if nothing arrives.

## Expected outcome

Reminders and decisions reach your phone.

## Common mistakes

- **Expecting a notification for every check-in.** SkyTrack notifies about exceptions, not routine success.
- **Assuming an empty inbox means it is broken.** It usually means nothing needed your attention.

## For administrators

If **no employee** is receiving notifications, this is not a per-phone problem — raise it. Push delivery
depends on configuration that is set per release.

## Related articles

- [Turning phone alerts on or off](employee.notifications.settings)
