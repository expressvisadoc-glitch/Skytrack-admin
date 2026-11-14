---
id: administrator.geofence.maplink
title: Using a Google or Apple Maps link
description: Set the office position by pasting a map link instead of typing coordinates.
category: administrator
subcategory: geofence
feature: geofencing
roles: [admin, super_admin]
keywords: [map link, google maps, apple maps, coordinates, paste link]
synonyms: [share location link, map url]
related_articles: [administrator.geofence.configure]
feature_status: branch_only
screens: [office-geofence]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Using a Google or Apple Maps link

> **Not available yet.** This feature is built and tested but is not in the version you are using today.

## What this feature does

Reads the coordinates out of a Google Maps or Apple Maps link, so you can paste a share link instead of
typing latitude and longitude.

## Who can use it

Administrators and super administrators.

## Step-by-step instructions

1. In Google Maps, find your office, press and hold on the exact building, and share or copy the link.
2. Open **Office Geofence**.
3. Paste the link into the location field.
4. Check the pin lands on your building.
5. Set the radius and save.

## Expected outcome

The pin moves to the coordinates in the link.

## Only the link is used

The coordinates are taken from the link itself, never from the map page. This matters: a map page can show a
view guessed from whoever opened it, which would quietly give you the wrong office.

Only Google and Apple map links are accepted.

## Common mistakes

- **Sharing a link to a search result rather than a dropped pin.** Press and hold on the exact building to
  get a coordinate link.
- **Using a link to a business listing.** It may resolve to the street rather than your floor.
- **Not checking the pin afterwards.** Always confirm it is on your building before saving.

## Troubleshooting

If a link is not recognised, open it, press and hold on the building, and copy the new link. Or read the
coordinates from the link and type them in.

## Related articles

- [Setting the office location and radius](administrator.geofence.configure)
