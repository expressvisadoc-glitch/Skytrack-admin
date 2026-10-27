# Production Rollout — Geofencing, Security Fix and Payroll

Status: **prepared, not started.** Everything below has been tested on the staging project only.
Nothing in this guide is done automatically; each production step needs your go-ahead.

| Repo | Branch to release | Contains |
| :--- | :--- | :--- |
| `skytrack-admin` | `feature/payroll` (includes `feature/office-geofencing` and `main`) | Web app, Edge Function, 5 migrations |
| `SkyTrack_01` | `feature/payroll` (includes `feature/office-geofencing`) | Android app |

## 1. Why the order matters

| If this is live… | …with this | Result |
| :--- | :--- | :--- |
| New Edge Function | Old Android app | Check-in / check-out refused ("update the app"): old apps send no location |
| New Edge Function | Database without the migrations | Every attendance action fails |
| Security migration (`rls_hardening`) | Old web app | Editing employee details and shift times fails |
| New Android app | Old backend | Works; salary card and payslips show "unavailable" until go-live |

So: **release the Android app first**, then in one short session **back up → migrations → Edge Function → web app → configure**.

## 2. Before go-live day

1. **Finish staging sign-off** — `PROJECT_CONTEXT.md` §7.5 checklist plus payroll: set a salary, check the salary card,
   lock/reopen a past month, download payslips (web and phone), CSV export.
2. **Choose the go-live date.** Recommended: the **last working day of a month, after everyone has checked out**, so the
   first payroll month starts with late marks and geofencing from day 1. (Attendance recorded before go-live has no
   late marks; absences and leave are still counted.)
3. **Check production data** (read-only, in the Supabase dashboard → Table editor):
   - every active employee has a **work shift** (needed for late marks) and a **joining date** (otherwise the payroll
     page flags them and pays the whole month);
   - the office address you will use for the geofence — get exact coordinates from Google Maps (long-press the office).
4. **Release the Android app** (it works with the current backend):
   1. Merge `feature/payroll` → `development` → `main` (Android repo), resolving the stashed "reporting manager" WIP
      separately.
   2. Bump `versionCode` to **3** and `versionName` to **1.1.0** in `app/build.gradle.kts`.
   3. Build the release APK (`./gradlew assembleRelease`). Note: release builds are currently signed with the
      **debug key** (`signingConfig = signingConfigs.getByName("debug")`); keep it the same so the update installs
      over the existing app.
   4. Publish a GitHub Release (the in-app update checker reads `expressvisadoc-glitch/Skytrack` releases).
   5. Ask all employees to update and confirm. **Do not continue until everyone is on 1.1.0.**

## 3. Go-live session (about 45 minutes, after office hours)

Prerequisite: `PROD_DB_URL` in `/Volumes/Excelsior/SkyTrack/skytrack-staging.env` (password URL-encoded), libpq tools
installed (`/opt/homebrew/opt/libpq/bin`).

| # | Step | Command / action | Check |
| :-- | :--- | :--- | :--- |
| 1 | **Full backup** (data + schema) | `pg_dump "$PROD_DB_URL" -Fc --schema=public -f ~/skytrack-backups/prod_$(date +%Y%m%d_%H%M).dump` and copy it to Google Drive | File size > 0; `pg_restore -l` lists tables |
| 2 | Save the current Edge Function | `git -C skytrack-admin show 24fb01b:supabase/functions/skytrack-api/index.ts > ~/skytrack-backups/edge_function_before_rollout.ts` | File saved (needed for rollback) |
| 3 | **Migrations**, in this order, each in one transaction | `psql "$PROD_DB_URL" -X -1 -v ON_ERROR_STOP=1 -f <file>` for: `20261025000000_office_geofence.sql`, `20261027000000_payroll_foundations.sql`, `20261027010000_payroll_salaries.sql`, `20261027020000_rls_hardening.sql`, `20261027030000_payroll_runs.sql` | Each prints no `ERROR`; `NOTICE … does not exist, skipping` is normal. The first migration stops safely if the attendance functions differ from what it expects. |
| 4 | **Edge Function** | Dashboard → Edge Functions → `skytrack-api` → paste `supabase/functions/skytrack-api/index.ts` from `feature/payroll` → Deploy (the CLI token was refused for production; a token with production access can use `npx supabase functions deploy skytrack-api --project-ref cwtrrtbodqctntkpnjlv --no-verify-jwt --use-api`). **JWT verification must stay off.** | Login still works on web and phone |
| 5 | **Web app** | Merge `feature/payroll` → `main` in `skytrack-admin` and deploy as usual (Cloudflare) | Admin sidebar shows Office Geofence, Payroll, Payroll Settings |
| 6 | **Configure the office** (check-in is blocked until this is done) | Admin → Office Geofence: real coordinates, radius 100 m, max accuracy 50 m, Active | Saved, ACTIVE badge |
| 7 | Review **Payroll Settings** | Defaults: Sunday off, grace 0, 2 late marks = 0.5 day, Asia/Kolkata | Saved |
| 8 | **Salaries** (can be done the next day) | Employees → each employee → Salary → Change Salary (effective from the 1st of the first payroll month) | Payroll page shows no "Salary not set" flags |
| 9 | **Smoke test** | One employee checks in/out at the office (phone); one attempt from outside is refused; admin opens Payroll and Employee Details; an employee opens the salary card | All as expected |

## 4. Rollback

| Problem | Action |
| :--- | :--- |
| Check-in / attendance broken | Redeploy `~/skytrack-backups/edge_function_before_rollout.ts` (step 2). The old function works with the new tables in place. |
| Web app broken | Roll back the Cloudflare deployment / revert the merge on `main`. With `rls_hardening` applied, the old web app cannot edit employee details or shift times until the new one is back. |
| Data damaged | Restore from the step 1 dump (`pg_restore`) — last resort; ask for help first. |

The migrations are additive (new tables, functions, triggers and stricter policies); they do not change or delete
existing attendance, leave or employee data.

## 5. After go-live

1. **Monthly routine:** on the 1st of each month, check the Payroll page for the previous month, fix flags, then
   **Lock Month** — payslips become available to employees.
2. **Backups:** the free Supabase plan has no automatic backups — repeat the step 1 dump at least monthly (after
   locking) until an automated backup or a paid plan is in place.
3. **Google Sheets export:** set up with [GOOGLE_SHEETS_EXPORT.md](GOOGLE_SHEETS_EXPORT.md).
4. **Clean up secrets:** revoke the personal access token used for staging deploys; keep `skytrack-staging.env`
   outside every repository (or delete it when staging is no longer needed).
