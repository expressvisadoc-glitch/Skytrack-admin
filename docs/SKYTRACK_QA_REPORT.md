# SkyTrack QA Report — Geofencing, Attendance Lifecycle & Push Notifications

**Scope:** Android employee app (`SkyTrack_01`), `skytrack-api` Edge Function, Supabase database
**Date:** 13 November 2026
**Environment:** STAGING only (`npwwwapbbvkvteycxaab`). Production was never written to.
**Test account:** `TST-001` (staging test employee). No real employee's records were created, altered or deleted.

---

## 1. Executive summary

The attendance lifecycle and the server-side geofence are **solid**. Of 65 backend scenarios exercised against the
deployed staging function, 63 passed. Every duplicate-action and invalid-transition case is correctly refused, the
server is the sole authority on time and position, and net-hours arithmetic is right end to end — the Android UI
showed `7h 15m` for a day the backend computed as 8 h gross minus a 45-minute break.

Four things stand out.

1. **Mock-location detection can be bypassed by omitting one field.** The server trusts a client-supplied
   `isMock` flag. A modified client, or anyone with the employee's token, can check in from anywhere by sending
   office coordinates and no flag. This is the one finding that permits unauthorised attendance.
2. **Push notifications cannot work in the production app at all.** The release build ships with an empty
   Firebase app id, so Firebase never initialises. Verified from the generated `BuildConfig`.
3. **The SkyTrack logo does not appear in push notifications.** The icon is correctly implemented for Android
   (white silhouette, right tint, no white box) but the glyph is the stock Material bell, not the SkyTrack mark.
4. **The per-employee lock that makes attendance actions race-safe exists only in the geofencing code path.**
   Production, which does not have that path, calls the raw RPCs, which read-then-write without a row lock.

Nothing found causes data corruption in the staging build as it stands today.

---

## 2. Project architecture inspected

| Layer | What was read |
| :--- | :--- |
| Android attendance | `ui/home/HomeScreen.kt`, `HomeViewModel.kt`, `GeofenceStatusCard.kt`, `GeofenceMap.kt` |
| Android location | `data/location/GeofenceEvaluator.kt`, `DeviceLocationProvider.kt`, `LocationFix`/`LocationResult` |
| Android API layer | `data/repository/AttendanceRepository.kt`, `data/remote/SkyTrackApi.kt`, `ApiModels.kt`, `data/sync/OfflineSyncManager.kt` |
| Android notifications | `data/notifications/PushManager.kt`, `PushNotifier.kt`, `SkyTrackMessagingService.kt`, `NotificationPreferences` |
| Android manifest/resources | `AndroidManifest.xml`, `app/build.gradle.kts`, `res/drawable/ic_stat_notification.xml`, `mipmap-*/ic_launcher*`, `res/drawable/skytrack_logo.png` |
| Edge Function | `skytrack-api` action router, `callAttendanceActionRpc`, `handleStartWork/EndWork/StartBreak/ResumeWork`, `handleNotificationsDispatch`, `sendFcmMessage` |
| Database | `attendance`, `attendance_breaks`, `attendance_location_events`, `attendance_late_marks`, `device_tokens`, `notifications`; functions `start_work`, `end_work`, `start_break`, `resume_work`, `attendance_action_with_location`, `geofence_distance_m` |

**Attendance flow as implemented.** App captures a fix (`DeviceLocationProvider`) → `AttendanceRepository`
POSTs `{action, location}` → Edge Function `callAttendanceActionRpc` runs the check-in-security checks, parses the
location, then calls `attendance_action_with_location(...)`, which takes a per-employee advisory transaction lock,
validates the fix, calls the plain RPC and writes an `attendance_location_events` audit row in one transaction.

**Notification flow as implemented.** DB triggers and the per-minute `pg_cron` job insert into `notifications` →
pg_cron calls `notifications_dispatch` (shared secret) → `sendFcmMessage` posts a **data-only** FCM v1 message with
`android.priority = HIGH` → `SkyTrackMessagingService.onMessageReceived` filters by signed-in employee and the
in-app preference → `PushNotifier` builds the notification with `setSmallIcon(R.drawable.ic_stat_notification)`
and `setColor(0xFFE53935)`.

**Implementation gaps found before testing**
- `attendance_breaks` exists in the schema but is written by nothing (0 rows, no function, no Edge Function
  reference). Breaks are only the aggregate `total_break_seconds` plus `break_started_at`.
- Firebase default notification **icon** and **color** meta-data are absent from the manifest. Harmless here
  because messages are data-only, but it would bite the moment anyone sends a `notification`-payload message.
- No `setLargeIcon(...)` anywhere, so no brand mark in the expanded notification.

---

## 3. Test environment and devices

| | |
| :--- | :--- |
| Emulator | Pixel 3 AVD, **Android 16 (API 36)**, `google_apis_playstore`, arm64-v8a, Google Play services present |
| App build | `app-staging.apk`, `com.skypass.skytrack.staging`, versionName `1.1.0-staging`, minSdk 26 / targetSdk 36 |
| Backend | Deployed staging `skytrack-api`; staging Postgres via `psql` |
| Office geofence (staging) | 25.1891063784977, 55.2694871162002 · radius **30 m** · max accuracy **50 m** · max fix age **120 s** · active |
| Push | Real FCM v1 delivery to the emulator, dispatched through `notifications_dispatch` |

A first emulator (Medium_Phone_API_36) had to be abandoned: its `/data` was 92 % full, which left the app
installed but its launcher activity unresolvable. Worth knowing if anyone else hits "Activity class does not exist".

---

## 4–8. Test totals

| | Count |
| :--- | ---: |
| **Total scenarios executed** | **136** |
| Passed | 134 |
| Failed | 2 |
| Blocked | 0 |
| Not tested (environment) | 24 |

Breakdown: 65 backend/API scenarios (63 pass, 2 fail) · 58 Android unit tests (58 pass, 6 newly written) ·
13 on-device scenarios (13 pass).

**Not tested, and why**

| Area | Reason |
| :--- | :--- |
| Android 10, 11, 12, 13, 14, 15 | Only `android-35` and `android-36` system images are installed on this machine; all device testing ran on Android 16 |
| Real GPS hardware, weak/again-acquired signal | Emulator has no radio; fixes were injected |
| Airplane mode, internet loss mid-action, `OfflineSyncManager` queue and replay | Needs a device and a controlled network; the offline queue path was read but never executed |
| Device reboot during an active session, force-stop then reopen | Not run |
| Battery saver, background restrictions, Doze | Not run |
| Dark/light mode comparison of the app UI | Only the system dark shade was captured |
| Notification sound and vibration | Headless/virtual device has no audio |
| Lock-screen notification appearance | Not captured |
| App-update (in-place upgrade) path | Not run |
| Production environment, production data, production app | Deliberately excluded — none of geofencing, payroll or notifications is deployed to production |

---

## 9. CRITICAL bugs

### C-1 — Mock-location detection is client-asserted and trivially bypassed

| | |
| :--- | :--- |
| **Test ID** | GEO-12b |
| **Severity** | **CRITICAL** — unauthorised attendance |
| **File** | `attendance_action_with_location()` (migration `20261025000000_office_geofence.sql`); `parseAttendanceLocation` in `skytrack-api` |

**Steps to reproduce**
1. Sign in as `TST-001`, obtain the session token.
2. `POST {"action":"start_work","location":{latitude: <office lat>, longitude: <office lon>, accuracy: 8, capturedAt: <now>, ageMs: 1000, isMock: true}}` → correctly refused, `422 mock_location_detected`.
3. Send the identical request with the `isMock` key **removed**.

**Expected:** the attempt is refused, or at minimum flagged.
**Actual:** `200`, attendance created. The employee is checked in.

**Root cause.** The server's decision is `WHEN COALESCE(p_is_mock, false) THEN 'mock'`. The only source of that
flag is the client. Coordinates are likewise taken at face value, so a fabricated position inside the radius is
indistinguishable from a real one. The whole geofence therefore rests on the client being honest.

**Recommended fix.** Treat a missing `isMock` as suspicious rather than clean: require the field from clients
that advertise a recent app version, and record `location_status = 'unverified'` otherwise. The real mitigation
already exists — the Check-in Security feature (device keys with Android key attestation, office network checks,
migration `20261110000000_checkin_security.sql`) — but **every one of its rules is `off` by default**. Before
relying on the geofence, turn `device_mode` to `monitor`, review the flagged events, then `enforce`.

---

## 10. HIGH-priority bugs

### H-1 — Push notifications can never work in the production app

| | |
| :--- | :--- |
| **Test ID** | PN-build |
| **Severity** | HIGH |
| **File** | `app/build.gradle.kts` (defaultConfig line 31; `release` block has no override) |

The `debug` and `staging` build types override `FIREBASE_APP_ID` with `firebaseStagingAppId`. The `release` build
type does not, and `firebaseAppId` is not set in `~/.gradle/gradle.properties` (the file says it "is added once the
production app is registered").

**Evidence** — generated `BuildConfig.java`:

```
app/generated/source/buildConfig/release/.../BuildConfig.java
  public static final String FIREBASE_APP_ID = "";            <-- production
app/generated/source/buildConfig/staging/.../BuildConfig.java
  public static final String FIREBASE_APP_ID = "1:411940…";   <-- staging
```

`PushManager.initialize()` returns early when any Firebase field is blank, so `FirebaseApp` is never created,
`isConfigured` is false, and `registerCurrentDevice` is a no-op. No token is ever registered and no push can
arrive. The in-app bell still works.

**Recommended fix.** Register the production app (`com.skypass.skytrack`) in the Firebase project and set
`firebaseAppId` in `~/.gradle/gradle.properties` and in the release build environment. Add a release-build
assertion that fails the build when the value is blank, so this cannot ship silently again.

### H-2 — Attendance race protection exists only on the geofencing path

| | |
| :--- | :--- |
| **Test ID** | code analysis (not reproducible on staging) |
| **Severity** | HIGH for production, none for the staging build |
| **File** | production `skytrack-api` `handleStartWork` etc.; `public.resume_work()` / `start_work()` |

`attendance_action_with_location` begins with
`PERFORM pg_advisory_xact_lock(hashtextextended('skytrack_attendance:' || p_employee_id, 0))`, which serialises
concurrent actions per employee. That is why every concurrency test here passed: five simultaneous check-ins
produced one record, five simultaneous `resume_work` calls added the break once (1200 s, not 6000 s).

The **production** Edge Function has no such wrapper — it calls `start_work(uuid)` and `resume_work(uuid)`
directly. Those functions read then write with no `FOR UPDATE`:

- `resume_work` reads `break_started_at`, computes elapsed seconds, then does
  `total_break_seconds = total_break_seconds + elapsed`. Two concurrent calls can both read the same
  `break_started_at` and both add the elapsed time, **double-counting the break** and understating net hours.
- `start_work` does `SELECT EXISTS` then `INSERT`; the unique constraint stops a duplicate row, but the loser
  gets a 23505 error surfaced as a 500 instead of a clean "already checked in".

**I did not test this against production and did not attempt to.** It is a reading of the deployed production
function plus the RPC bodies. It matters now because the payroll-only build discussed separately would revert to
exactly this path.

**Recommended fix.** Take the advisory lock (or `SELECT … FOR UPDATE` on today's row) inside the four RPCs
themselves, so the protection does not depend on which wrapper calls them.

---

## 11. MEDIUM-priority bugs

### M-1 — Check-in after checkout reports success but does nothing

| | |
| :--- | :--- |
| **Test ID** | CI-08 · **Severity** MEDIUM · **File** `public.start_work()` |

**Steps:** check in, check out, check in again.
**Expected:** refused with a clear message, or the day is reopened.
**Actual:** `200 {"success": true}`. `start_work` sets `check_in = COALESCE(a.check_in, now())` and never clears
`check_out`, so the row is untouched and the employee remains checked out while the app reports success.
Contrast `end_work`, `start_break` and `resume_work`, which all refuse explicitly.

**Fix:** refuse with "You have already checked out today." (consistent with the other three), or implement a
deliberate reopen rule.

### M-2 — No per-break records; `attendance_breaks` is dead schema

`attendance_breaks` has 0 rows and is referenced by no function and no Edge Function code. Only the running
`break_started_at` and the accumulated `total_break_seconds` exist. Consequences: nobody can see how many breaks
were taken or when, a mis-recorded break cannot be corrected without editing a total, and the brief's
"break record linked to the correct attendance record" cannot be satisfied. **Fix:** write one row per break, or
drop the table so it stops implying an audit trail that does not exist.

### M-3 — A push that arrives while notification permission is denied is lost from the shade

| | |
| :--- | :--- |
| **Test ID** | PN-09 · **Severity** MEDIUM |

With `POST_NOTIFICATIONS` revoked, the push was delivered (`"sent":1`), `PushNotifier.show` returned early at the
`canShow()` guard, nothing was posted and nothing crashed — correct as far as it goes. But the notification is
never re-posted once permission is granted; it survives only in the in-app bell. For a shift reminder, that is the
whole value lost. **Fix:** on permission grant, re-post unread notifications from the last few hours.

### M-4 — Stale device tokens accumulate

`device_tokens` holds three rows for `TST-001` from successive emulator instances. The dispatcher marks tokens
`invalid_token` on an `UNREGISTERED` reply, but nothing deletes them. Harmless at this scale, wasteful later.

---

## 12. LOW-priority bugs

### L-1 — The notification icon is a generic bell, not the SkyTrack logo *(see §18)*
### L-2 — No large icon, so no brand mark in the expanded notification
### L-3 — The adaptive icon's `monochrome` layer reuses the full-colour foreground PNG
`mipmap-anydpi/ic_launcher.xml` points `<monochrome>` at `@mipmap/ic_launcher_foreground`, a colour bitmap. Themed
icons use its alpha, so the themed launcher icon is a faded ring rather than a clean silhouette.
### L-4 — The in-app indicator can say "Inside" when the server will refuse
`GeofenceEvaluator.evaluate` rounds the distance to whole metres before comparing with the radius; the server
compares exact values. Between *radius* and *radius + 0.5 m* the card reads INSIDE and the check-in is rejected.
Now covered by a regression test (`roundingMakesTheCardOptimisticWithinHalfAMetre`) so the tolerance is deliberate.
### L-5 — The Check-In button reads "Ready" when location permission is missing
The permission card is shown correctly above it, but the button's own state still says Ready.

---

## 13. Geofencing findings

All passed except GEO-12b (C-1 above).

| Test | Scenario | Result |
| :--- | :--- | :--- |
| GEO-01 | Inside the geofence | **PASS** — allowed |
| GEO-02 | 1 km outside | **PASS** — `422 outside_geofence`, no attendance row created |
| GEO-03 | 29.5 m from a 30 m boundary | **PASS** — allowed (boundary is inclusive) |
| GEO-04 | 32 m from a 30 m boundary | **PASS** — refused |
| GEO-05 | Coordinates missing (GPS off) | **PASS** — `422 invalid_location` |
| GEO-05b | Null-island (0,0) | **PASS** — `422 invalid_location` |
| GEO-06 | Location permission denied | **PASS** — server `422 location_required`; app shows a "Location permission needed" card with a privacy note and *Allow location* / *App settings* ([home_no_location.png](home_no_location.png)) |
| GEO-10 | Accuracy 60 m against a 50 m policy | **PASS** — `422 location_accuracy_too_low` |
| GEO-10b | Accuracy exactly 50 m | **PASS** — allowed |
| GEO-stale | Fix 180 s old against a 120 s policy | **PASS** — `422 location_stale` |
| GEO-12 | `isMock: true` | **PASS** — `422 mock_location_detected` |
| GEO-12b | `isMock` omitted | **FAIL** — allowed (C-1) |
| GEO-13 | Moved outside after check-in | **PASS** — break start/end allowed (not enforced, by design), checkout refused |
| GEO-15 | Device clock 30 min ahead | **PASS** — `422 location_timestamp_invalid`; `check_in` is the server's `now()`, within 60 s of real time |
| GEO-bypass | Client sends `distanceMeters: 1`, `insideGeofence: true` | **PASS** — ignored, still `outside_geofence` |

**Also verified**
- Coordinates and distance are stored exactly: the audit row for a point 1 000 m east held `25.1891064,55.2794142`
  and `999` m, matching an independent haversine calculation.
- Client and server use the identical formula and Earth radius (6 371 008.8 m) — `GeofenceEvaluator.kt:62` and
  `public.geofence_distance_m`. Radius and accuracy limits come from the same settings row via `geofence_config`.
- Every attempt, accepted or rejected, writes an `attendance_location_events` row with action, outcome, reason
  code, location status, distance and the geofence settings in force.
- No stale fix is reusable: freshness is enforced from both `capturedAt` and `ageMs`.
- Location is not logged to logcat and is not persisted on the device.

---

## 14. Check-in findings

CI-01 to CI-12 all pass except CI-08 (M-1). Highlights: the timestamp is the server's and dated with the UTC day;
**five simultaneous check-ins produced exactly one attendance row and all five returned 200**; checking in twice
keeps the original time; an invalid token gives 401; a malformed location payload gives 422.
CI-04 (no internet) was **not executed** — the offline queue was read, not run.

## 15. Break management findings

TB-01 to TB-10 and EB-01 to EB-10 all pass.
- Break before check-in, during an existing break, and after checkout are each refused with a specific message.
- Five simultaneous break starts → one succeeds. Five simultaneous break ends → one succeeds and the 20-minute
  break is counted **once** (1 200 s), not five times.
- `break_started_at` is cleared on resume; no negative durations anywhere in the table.
- **The `end_break` / `resume_work` contract is correct.** The brief flagged this as suspect; it is not. Android
  sends `resume_work` (`AttendanceRepository.kt:90`); the Edge Function routes
  `action === "resume_work" || action === "end_break"` to `handleResumeWork`, in both the current and the
  production builds. The alias was exercised directly and succeeded. There is no `handleEndBreak` function.

## 16. Checkout findings

CO-01 to CO-12 pass.
- Checkout while on break is refused and **leaves the break running rather than orphaning it**.
- Five simultaneous checkouts → one succeeds; double checkout refused.
- **Net hours confirmed end to end.** A day with 8 h between check-in and check-out and a 45-minute break gave
  `gross 8.00 h − break 45.0 min = net 7.25 h`; the API returned `"hours": "7h 15m"` and the Android Home screen
  displayed `Check-In 07:37 AM · Break 45:01 · Total Hours 7h 15m`.
- Formula matches policy: `net = (check_out − check_in) − total_break_seconds`.

## 17. Notification delivery findings

Real FCM delivery to the emulator was exercised; the dispatcher reported `{"success":true,"sent":1}`.

| Test | Result |
| :--- | :--- |
| PN-02 app in background | **PASS** — posted on channel `skytrack_alerts`, importance 4 |
| PN-D tap opens the right screen | **PASS** — opened `MainActivity`; the push carries `screen` and `PushNotifier` puts it in `EXTRA_OPEN_SCREEN` |
| PN-D dismissal | **PASS** — `AUTO_CANCEL`; notification gone after the tap |
| PN-09 permission denied | **PASS** (with M-3) — nothing posted, no crash |
| PN-11/PN-12 wrong employee | **PASS by design** — the token is unregistered before sign-out and `onMessageReceived` discards any message whose `employee` field is not the signed-in employee |
| PN-07 duplicates | **PASS** — the notification id is the dedupe key (`notify(id.hashCode(), …)`), so a resend replaces rather than stacks |

Content is correct and leaks nothing: title, body, `screen` only. No UUIDs, no salary figures, no other
employee's data. Messages are **data-only** with `android.priority = HIGH`, so the app always builds the
notification itself and Doze delivery is correct. `BigTextStyle` is applied; the collapsed row truncates and the
expanded row shows the full text.

**23 notification types** are live in staging (`shift_reminder`, `not_checked_in`, `absent`, `late_check_in`,
`missing_checkout`, `break_exceeded`, `leave_approved`, `payslip_ready`, `salary_updated`, admin digests, …).
Note the catalogue is **reminder- and exception-based**: there is deliberately no check-in, break-start,
break-end or checkout *confirmation* push. That is a design choice, not a defect, but it is the opposite of what
the brief's example list assumes.

---

## 18. SkyTrack logo and branding findings

**Does the SkyTrack logo appear in Android push notifications? No.**

Evidence — `dumpsys notification`:
```
icon=Icon(typ=RESOURCE pkg=com.skypass.skytrack.staging id=0x7f080084)   -> drawable/ic_stat_notification
color=0xffe53935   channel=skytrack_alerts   importance=4   template=BigTextStyle
```
Captured renderings: [shade.png](shade.png) (collapsed) and [shade_expanded.png](shade_expanded.png) (expanded)
— the notification shows a **white bell inside a red circle**, with "SkyTrack Staging" as the app name.

What is **right**, and should not be changed:
- A dedicated small icon exists (`ic_stat_notification`), separate from the launcher icon — the common mistake of
  passing `@mipmap/ic_launcher` has been avoided.
- It is a 24 dp vector, pure white `#FFFFFFFF` on transparent. It renders as a crisp silhouette: **no blank
  square, no white box, no incorrect tint, no cropping**, and it reads correctly on the dark shade.
- `setColor(0xFFE53935)` applies SkyTrack red, which Android uses as the icon's circular background.

What is **wrong**:
- The glyph is the **stock Material "notifications" bell** — the source comment says so outright
  (`<!-- Status bar icon for push notifications (white bell, Material "notifications") -->`). No part of the
  SkyTrack identity is present except the red tint. Side by side with any other app's alert it is unidentifiable.
- No `setLargeIcon(...)`, so the expanded notification has no brand mark either.

**The existing logo cannot be dropped in as-is.** `drawable/skytrack_logo.png` (512×436 RGBA) is the full
wordmark — unreadable at 24 dp. `mipmap-*/ic_launcher_foreground.png` is the clock mark, but Android flattens a
small icon to its **alpha channel** and tints it one colour, so the mark's red-to-transparent tick gradient would
survive as a partially faded ring and the thin clock hands would turn to mush at 24 dp.

**Required asset (recommendation only — nothing was changed):**

| Property | Value |
| :--- | :--- |
| File | `app/src/main/res/drawable/ic_stat_notification.xml` (replace) |
| Format | `VectorDrawable`, `24dp × 24dp`, `viewportWidth/Height = 24` |
| Colour | every path `android:fillColor="#FFFFFFFF"` — fully opaque white, no gradients, no partial alpha |
| Background | transparent; the shape must be the mark itself, not a filled square |
| Content | the SkyTrack clock mark simplified for 24 dp: ~8–12 ticks instead of ~36, uniform stroke ≥ 2 dp, hands thickened; keep roughly 2 dp of padding inside the 24 dp box |
| Keep | `setColor(0xFFE53935)` so the mark is tinted SkyTrack red |

Optionally add `setLargeIcon(BitmapFactory.decodeResource(res, R.drawable.skytrack_logo))` for the expanded view,
where full colour is allowed. I can produce the vector for approval on request.

---

## 19. Backend and database findings

- Attendance records are created and updated correctly; `UNIQUE(employee_id, attendance_date)` holds under
  concurrency (verified, not assumed).
- Server-side `now()` is used throughout; client clocks never reach a stored timestamp.
- API responses match the Android DTOs — the app parsed every response in this run without error.
- Integrity sweeps over the whole table: **0** rows with negative break seconds, **0** with `check_out < check_in`,
  **0** checked-out rows with a break still running.
- Edge Function errors map to sensible HTTP codes (401 bad token, 403 wrong role, 422 location, 409 business rule).
- Device tokens are keyed by token and linked to the employee; logout unregisters (see M-4 for the stale rows).
- Open items: M-2 (dead `attendance_breaks`) and H-2 (locking only on one path).

## 20. Security findings

| Check | Result |
| :--- | :--- |
| Employee reads another employee's attendance by passing `employeeId` | **PASS** — ignored, own record returned |
| Employee calls an admin action (`admin_payroll_month`) | **PASS** — 403 |
| Employee checks in on someone else's behalf via `employeeId` | **PASS** — no row created for the other employee |
| Client claims `insideGeofence` / `distanceMeters` | **PASS** — server ignores them |
| Invalid/expired session | **PASS** — 401 |
| Location data in logs or on-device storage | **PASS** — none found |
| **Mock location / fabricated coordinates** | **FAIL — C-1** |

## 21. Recommended fixes, in priority order

1. **C-1** Close the mock-location bypass: treat an absent `isMock` as unverified, and roll out Check-in Security
   (`device_mode: monitor` → review → `enforce`). *Until this is done, the geofence is a deterrent, not a control.*
2. **H-1** Register the production Firebase app, set `firebaseAppId`, and fail the release build if it is blank.
3. **H-2** Move the advisory lock into `start_work`/`end_work`/`start_break`/`resume_work` so every caller is safe.
4. **M-1** Make check-in after checkout refuse explicitly.
5. **M-2** Decide on per-break records: write them, or drop the table.
6. **M-3** Re-post recent unread notifications when permission is granted.
7. **L-1/L-2** Commission the 24 dp monochrome SkyTrack mark and add a large icon.
8. **M-4, L-3, L-4, L-5** Housekeeping.

## 22. Regression testing recommendations

- **Keep the three suites and run them on every backend change.** They live in the QA scratchpad: the backend
  scenario suite (65 checks), the payroll calculation suite, and the end-to-end API suite. They are self-resetting
  and use `TST-001` only.
- **58 Android unit tests** now run in CI via `./gradlew test`, including 6 new geofence boundary tests
  (exact boundary, one metre beyond, the rounding tolerance, inclusive accuracy/age limits, mock precedence, and
  parity with the server's distance formula).
- Add to CI: a release-variant assertion that `FIREBASE_APP_ID` is non-blank, and a resource check that
  `ic_stat_notification` is a vector with only `#FFFFFFFF` fills.
- Re-run the concurrency block (5 parallel calls per action) after any change to the attendance RPCs or to which
  wrapper calls them — that is the only way H-2 would have been caught.
- Before the next release, cover what this round could not: Android 10–14, offline queue replay, device reboot
  mid-session, and the lock-screen notification.
