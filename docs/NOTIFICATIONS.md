# Notifications — Employee Push and Admin Alerts

Status: **built on `feature/payroll`, tested on staging only, including real pushes.** Not deployed to production.
Firebase project: `skytrack-2fd67` (personal Gmail). Without Firebase settings, pushes are skipped and the in-app
inbox still works.

| Repo | What changed |
| :--- | :--- |
| `skytrack-admin` | Migration `20261028000000_notifications.sql`; Edge Function actions; Payroll Settings "Allowed break"; bell panel alerts from the server |
| `SkyTrack_01` | Firebase Cloud Messaging; notification inbox (bell on Home); working Profile switch; deep links |

## 1. What is sent

Employees get these on their phone (push) and in the in-app inbox. Admin notifications appear only in the web bell
panel (no push), as decided.

### Attendance (employee)
| Code | When | Message |
| :--- | :--- | :--- |
| A1 | 5 min before shift start, not checked in | "Your shift starts at 10:00 AM. Remember to check in." |
| A2 | 1 min after shift start, still not checked in | "You have not checked in today." |
| A3 | Right after a late check-in (+ the deduction when a pair of late marks completes) | "You checked in late today (12 min). Late marks this month: 2. This adds 0.5 day LOP…" |
| A4 | Late check-in that leaves one mark before the next deduction | "One more late mark this month will add 0.5 day LOP." |
| A5 | Break longer than **Allowed break** (Payroll Settings, default 60 min) | "Your break has gone over 60 minutes." |
| A6 | 10 min after shift end, still checked in | "Your shift ended at 7:00 PM. Remember to check out." |
| A7 | Next morning (8–12), yesterday had no checkout | "Your checkout on 27 Oct was missing; 6:00 PM has been used as your checkout time." |
| A8 | Next morning (8–12), absent on a working day without approved leave | "You were marked absent on 27 Oct (1 day LOP)…" |
| A9 | Admin entered or changed the employee's attendance | "Your attendance for 27 Oct was updated by an admin." |

A1/A2/A6 are skipped on week-offs, published holidays, approved leave, before the joining date and for employees
without a work shift.

### Leave and holidays (employee)
| Code | When | Message |
| :--- | :--- | :--- |
| L1 | Leave approved (mentions unpaid days, which covers P2 for leave) | "Your leave request for 18 Nov was approved. 1 day(s) are unpaid…" |
| L2 | Leave rejected (with the admin's comment) | "…was rejected. Comment: …" |
| L3 | Approved leave cancelled | "Your approved leave for 18 Nov was cancelled." |
| L4 | Leave balance credited (allocation or adjustment) | "Your leave balance was updated: +1 casual leave." |
| L5 | Evening (from 6 PM) before approved leave starts | "Reminder: your leave starts tomorrow." |
| H1 | Holiday published within the next 60 days | "New holiday: Diwali on 8 Nov." |
| H2 | Evening (from 6 PM) before a holiday | "Tomorrow is a holiday (Diwali)." |

### Payroll and account (employee)
| Code | When | Message |
| :--- | :--- | :--- |
| P1 | Once a day (from 8 PM) if this month's estimated net pay changed | "Your estimated salary has been updated." |
| P2 | Deductions are mentioned inside A3 (late marks), A8 (absence) and L1 (unpaid leave) | — |
| P3 | Month locked, payslip created | "Your payslip for October 2026 is ready." |
| P4 | Month reopened and locked again (new payslip version) | "Your payslip for October 2026 was revised." |
| P5 | Salary added or changed | "Your salary details were updated." |
| S1 | Super admin changed the employee's password | "Your password was changed by an administrator…" |

### Admin (web bell panel only)
| Code | When |
| :--- | :--- |
| D1 | New leave request (shown in the existing pending-leave section, not as an alert) |
| D2 | 30 min after shift start: one summary per shift of employees not checked in |
| D3 | 1st of the month, from 9 AM: previous month not locked |
| D4 | From 9 AM: employees missing a salary or work shift (again only when the list changes) |
| D5 | 3rd check-in/out attempt from outside the office in a day, or any mock-location attempt |
| D6 | Office geofence switched off (and each morning while it stays off) |

Times use the office timezone from Payroll Settings (Asia/Kolkata). Every notification is sent at most once
(unique `dedupe_key` per recipient).

## 2. How it works

```
triggers (leave, payslip, salary, holiday, …) ─┐
pg_cron every minute → notifications_tick() ───┼─► public.notifications ─► Android inbox / web bell panel
Edge Function hooks (late check-in, A9, S1) ───┘          │ employee rows: push_status = pending
                                                          ▼
pg_cron → notifications_request_dispatch() ─ pg_net ─► skytrack-api "notifications_dispatch"
                                                          │ (x-skytrack-dispatch-secret)
                                                          ▼
                                     Firebase Cloud Messaging (data message) ─► SkyTrack app
```

- **Database** (`20261028000000_notifications.sql`): tables `notifications`, `device_tokens`,
  `salary_estimate_snapshots`; new `payroll_policy` columns (`max_break_minutes` shown in Payroll Settings; the
  reminder offsets 5 / 1 / 10 / 30 min are stored there too but not shown); `save_payroll_policy` gains
  `p_max_break_minutes`; cron job `skytrack-notifications` (`* * * * *`). All functions are server-only.
- **Edge Function**: `notifications_dispatch` (no user session; checks the shared secret), `device_register`,
  `device_unregister`, `notifications_list`, `notifications_mark_read`. Push messages are data-only and carry the
  recipient's employee ID. Failed sends are retried (3 attempts); pushes still unsent after 6 h expire; rows older
  than 120 days are deleted.
- **Android**: Firebase is initialised from Gradle properties (no `google-services.json`). The phone registers its
  token after login and on token refresh, and unregisters on sign-out. A push is shown only if:
  1. someone is signed in and the push is for that employee;
  2. the Profile switch is on;
  3. Android allows SkyTrack notifications.

  Tapping a push opens the related screen (Home, Leave, Monthly or Profile).
- **Profile switch** ("Punch-in Alerts", unchanged look): on by default. Off means no notifications on the phone.
  Turning it on asks for the Android 13+ permission or opens the system settings. Android 13+ also asks once,
  automatically, after the first login. The inbox still lists everything.
- **Web**: Payroll Settings has "Allowed break (minutes)"; it only drives the reminder, pay is unchanged. The bell
  panel's Alerts section shows unread admin notifications. **Acknowledge** marks one as read; **Mark alerts as
  handled** marks all. The panel checks every 60 s, also while it is closed.

## 3. Secrets and settings per Supabase project

| Where | Name | Value |
| :--- | :--- | :--- |
| Edge Function secret | `NOTIFICATIONS_DISPATCH_SECRET` | Random, 32+ characters (`openssl rand -hex 32`) |
| Edge Function secret | `FCM_SERVICE_ACCOUNT_JSON` | The Firebase service-account JSON (§5 step 5) |
| Vault (SQL) | `skytrack_dispatch_url` | `https://<project-ref>.supabase.co/functions/v1/skytrack-api` |
| Vault (SQL) | `skytrack_dispatch_secret` | Same value as `NOTIFICATIONS_DISPATCH_SECRET` |

Vault secrets (SQL editor, once per project):
```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/skytrack-api', 'skytrack_dispatch_url');
select vault.create_secret('<the dispatch secret>', 'skytrack_dispatch_secret');
```
Without the Vault secrets nothing is pushed (the inbox still fills). Problems with the Firebase key show in
`notifications.push_error` (the key itself is never logged): `fcm_not_configured` (secret missing),
`fcm_secret_invalid_json` (wrong or partial paste), `fcm_secret_missing_…` (not a service-account key).

To set the secret from the key file without pasting (the value must be the whole JSON file):
```bash
python3 -c "import json,os; d=json.load(open(os.path.expanduser('~/skytrack-secrets/firebase-sa.json'))); print('FCM_SERVICE_ACCOUNT_JSON='+json.dumps(json.dumps(d,separators=(',',':'))))" > /tmp/fcm.env
npx supabase@2.54.11 secrets set --env-file /tmp/fcm.env --project-ref <project-ref>; rm /tmp/fcm.env
```

**Staging (done):** migration applied, dispatch secret set (also saved as `STAGING_DISPATCH_SECRET` in
`/Volumes/Excelsior/SkyTrack/skytrack-staging.env`), Vault secrets created, function deployed, `FCM_SERVICE_ACCOUNT_JSON`
set from `~/skytrack-secrets/firebase-sa.json`. Staging app values are in `~/.gradle/gradle.properties`
(`firebaseStagingAppId`); the production app (`com.skypass.skytrack`) is not registered in Firebase yet.

## 4. Testing done (staging)

| Check | Result |
| :--- | :--- |
| SQL, rolled-back transaction (`notifications_tick` at chosen times, all triggers, privileges) | 68/68 |
| HTTP against the staging Edge Function (dispatch secret, devices, inbox, mark read, policy, A3, A9) | 37/37 |
| pg_cron runs every minute; dispatch reaches the function (HTTP 200) | OK |
| Android unit tests (40 existing + 7 new) | 47/47 |
| Emulator (staging APK): permission prompt, bell badge, inbox, tap → Leave screen, unread cleared, switch on/off survives restart | OK |
| Web: type check, build, lint unchanged on edited files | OK |
| Real push (staging app on emulator): delivered and shown; tap opens the right screen; nothing shown with the switch off | OK |

## 5. Firebase setup (personal Gmail, free)

Firebase Cloud Messaging is free on the Spark plan; no billing account is needed.

1. Open <https://console.firebase.google.com> with your personal Gmail → **Create a project** → name `SkyTrack` →
   Google Analytics **off** → Create.
2. **Add app → Android**, package name `com.skypass.skytrack`, nickname `SkyTrack` → Register app → **Download
   google-services.json** → skip the remaining steps (the app does not use the Gradle plugin).
3. Add a second Android app with package `com.skypass.skytrack.staging` (nickname `SkyTrack Staging`) and download
   its `google-services.json` too.
4. From those files, add these lines to `~/.gradle/gradle.properties` (never commit them):
   ```properties
   firebaseProjectId=<project_info.project_id>
   firebaseSenderId=<project_info.project_number>
   firebaseApiKey=<client[0].api_key[0].current_key>
   firebaseAppId=<client[0].client_info.mobilesdk_app_id of com.skypass.skytrack>
   firebaseStagingAppId=<client[0].client_info.mobilesdk_app_id of com.skypass.skytrack.staging>
   ```
   Then delete the two JSON files or keep them outside every repository.
5. Firebase console → ⚙ **Project settings → Service accounts → Generate new private key** → save the JSON file
   outside every repository (e.g. `~/skytrack-secrets/firebase-sa.json`). This key can send pushes to your app.
   Keep it private. It is a JSON file containing `"type": "service_account"`. The key pair under **Cloud Messaging →
   Web push certificates** is a different thing (for browsers) and is not used here.
6. Supabase dashboard (staging project first) → **Edge Functions → Secrets** → add `FCM_SERVICE_ACCOUNT_JSON` and
   paste the whole JSON file content.
7. Rebuild and install the staging app:
   ```bash
   ./gradlew :app:assembleStaging -PskytrackStagingApiUrl=https://npwwwapbbvkvteycxaab.supabase.co/functions/v1/skytrack-api
   ```
   Log in on the phone and allow notifications.
8. Send a test push (staging SQL editor); it should arrive within a minute:
   ```sql
   select notify(id, 'employee', 'test', 'Test', 'Push works.', '{"screen":"home"}', 'TEST:' || now())
   from employees where employee_id = 'TST-001';
   -- then: select push_status, push_error from notifications order by created_at desc limit 1;
   ```
   `sent` = delivered to Firebase; `skipped/no_device` = the phone has not registered (log in again);
   `failed` = see `push_error`.

## 6. Production go-live

Included in [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md). In short:
1. Firebase steps 1–5.
2. A release APK built with the Firebase properties goes to employees first.
3. Apply migration 6.
4. Set both Edge Function secrets.
5. Create both Vault secrets.
6. Deploy the function.
7. Run step 8 with a real employee.

`pg_cron` is already installed in production; the migration adds `pg_net`.

## 7. Notes

- The Profile switch label still says "Notify 15m before shift begins", but the reminder comes 5 minutes before,
  and the switch now covers all notifications. The label was left unchanged as requested; worth updating with the
  next UI pass.
- "Allowed break" only drives the A5 reminder; it does not deduct pay.
- Staging free-tier load: the tick runs every minute (a few small queries); the function is called at most once a
  minute and only when pushes are waiting.
