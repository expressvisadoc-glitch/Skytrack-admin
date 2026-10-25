# Office Geofencing

Check-in (`start_work`) and check-out (`end_work`) are only accepted when the employee's device reports a
location within an admin-configured radius of the office. Break start / resume are never blocked by the
geofence, but their location is recorded.

GPS evidence is strong but not proof of physical presence. Mock-location detection, freshness and accuracy
checks raise the cost of spoofing; they cannot prevent a determined attacker with a rooted device.

## Components

| Layer | Where | What |
| :--- | :--- | :--- |
| Database | `supabase/migrations/20261025000000_office_geofence.sql` | Settings, history, location events, RPCs, RLS |
| Edge Function | `supabase/functions/skytrack-api/index.ts` (mirror of root `edge_function.ts`) | Parses location, calls RPCs, structured errors, admin actions |
| Admin Portal | `src/components/OfficeGeofence.tsx` (sidebar: **Office Geofence**) | View / edit office location, radius, policy, history |
| Employee Portal | `src/components/employee/EmployeeHome.tsx`, `src/lib/geolocation.ts` | Sends browser location with attendance actions |
| Android | `data/location/*`, `GeofenceRepository`, `HomeViewModel`, `GeofenceStatusCard` | Fresh fix per action, in-app guidance |

## Data model

- `office_geofence_settings` — single row (`id = 1`): `latitude`, `longitude`, `radius_m` (10–5000, default 100),
  `is_active`, `max_accuracy_m` (5–500, default 50), `max_location_age_s` (10–600, default 120), `office_name`,
  `updated_by` (employee id of the admin), `updated_at`. CHECK constraints enforce every range.
- `office_geofence_settings_history` — one row per save, with `changed_by` / `changed_at`.
- `attendance_location_events` — one row per attendance action (accepted, geofence-rejected, or no-op):
  submitted coordinates, accuracy, client capture time, client fix age, mock flag, platform, computed distance,
  the geofence snapshot used, outcome / reason code, and `received_at` (server time, used for audit).

Access control: RLS is enabled on all three tables. Admins (`admin`, `super_admin`) may `SELECT` settings and
history; employees may `SELECT` only their own location events; nobody but `service_role` may write.
`EXECUTE` on `start_work`, `end_work`, `start_break`, `resume_work`, `attendance_action_with_location` and
`save_office_geofence_settings` is revoked from `anon` / `authenticated`, so the geofence cannot be bypassed via
`/rest/v1/rpc/*` with an employee JWT.

## Enforcement

`attendance_action_with_location(p_employee_id, p_action, ...)` runs in one transaction:

1. Takes a per-employee advisory lock (serialises concurrent actions).
2. Reads the current settings row (no caching anywhere; a change applies to the next request).
3. Classifies the fix and, for check-in / check-out only, rejects it if invalid or outside the radius.
4. Calls the existing attendance RPC unchanged, so all state rules (no checkout while on break, duplicate
   handling, break timer accumulation) are preserved. If it raises, the location event rolls back with it.
5. Inserts the location event and returns the attendance row.

### Behaviour of the existing attendance RPCs (verified on staging)

The production `start_work`, `end_work`, `start_break` and `resume_work` are `SECURITY DEFINER` functions that
return `TABLE(attendance_date, check_in, check_out, break_started_at, total_break_seconds, status)` — no `id` —
and date rows with `current_date` (UTC). The wrapper therefore links each location event via the returned
`attendance_date`. A repeated `start_work` is idempotent (keeps the first check-in and returns success).
Checkout during a break raises "Please resume working before checking out."

### Location accuracy policy

| Check | Rule | Reason code |
| :--- | :--- | :--- |
| Present | latitude, longitude, accuracy and capture time supplied | `location_required` |
| Valid | lat −90..90, lng −180..180, not 0,0, accuracy > 0 | `invalid_location` |
| Plausible time | captured ≤ 60 s after server receipt (device clock skew allowance) | `location_timestamp_invalid` |
| Fresh | server receipt − capture time ≤ `max_location_age_s`, and client fix age ≤ the same limit | `location_stale` |
| Accurate | reported accuracy ≤ `max_accuracy_m` | `location_accuracy_too_low` |
| Genuine | device did not flag the fix as mock | `mock_location_detected` |
| Inside | great-circle distance office → reported point ≤ `radius_m` | `outside_geofence` |

Accuracy is not added as tolerance, so a poor fix can never widen the fence. Defaults (±50 m, 120 s) suit
phones with Wi-Fi assisted location indoors; desktop browsers often report ±100 m or worse and will be rejected
unless an admin relaxes the accuracy limit (observed in staging: a laptop browser reported ±140 m and was
rejected with `location_accuracy_too_low`). Radius and accuracy are independent: a fix must be precise enough
first, then close enough.

### Missing or inactive configuration

If no settings row exists (`geofence_not_configured`) or `is_active = false` (`geofence_inactive`), every
check-in and check-out fails with HTTP 409 and a clear message. Breaks continue to work.

## API

| Action | Role | Notes |
| :--- | :--- | :--- |
| `start_work`, `end_work` | Employee | Body: `location: { latitude, longitude, accuracy, capturedAt (ISO or epoch ms), ageMs?, isMock?, platform? }` |
| `start_break`, `resume_work` / `end_break` | Employee | Same optional `location`; never rejected for location reasons |
| `geofence_config` | Any active employee | Settings for in-app guidance only |
| `admin_geofence_settings` | Admin | Settings, last changed by, last 10 history entries, limits |
| `admin_save_geofence_settings` | Admin | `latitude, longitude, radiusMeters, isActive, maxAccuracyMeters, maxLocationAgeSeconds, officeName?` |

Errors follow the existing `{ success: false, error, message }` shape. Location rejections use HTTP 422 and add
`geofence: { locationStatus, distanceMeters, radiusMeters, accuracyMeters, maxAccuracyMeters, maxLocationAgeSeconds, receivedAt }`.
Configuration errors use 409. Non-admin access to admin actions returns 403 `forbidden`. 401/403 are deliberately
not used for location errors because the web client treats them as session expiry.

## Client behaviour

- **Android**: requests foreground location permission only when the employee checks in or out (no background
  location). Each check-in / check-out takes a fresh fix (max 10 s cached, 20 s timeout) and requires a live
  connection — these actions are no longer queued offline. Breaks use a best-effort fix (8 s timeout) and keep the
  offline queue; queued breaks carry their original fix. A status card on Home shows inside / outside / accuracy /
  permission / location-off / timeout / offline / configuration problems with Retry or Settings actions.
- **Employee web portal**: uses the browser Geolocation API (HTTPS only) for check-in / check-out; breaks send a
  fix when available.

## Rollout (manual steps)

Test everything on a staging project first: see the staging plan in
[PROJECT_CONTEXT.md §7](../PROJECT_CONTEXT.md#7-testing-office-geofencing-safely-staging-plan).

1. Release the Android app and web portal first. They send `location` but work against the current backend,
   which ignores it.
2. Apply the migration (`supabase db push` or SQL editor). It aborts if `public.start_work(uuid)`,
   `end_work(uuid)`, `start_break(uuid)` or `resume_work(uuid)` do not exist with that signature.
3. Deploy the `skytrack-api` Edge Function. **From this moment check-in / check-out are blocked until step 4.**
4. Immediately sign in to the Admin Portal → **Office Geofence**, enter the office coordinates (or use
   "Use my current location" while at the office and verify the pin), keep radius 100 m, ensure **Geofence
   active** is on, and Save.
5. Verify with one employee inside and one outside the radius. Older app versions will receive
   "location is required … please update the app".
