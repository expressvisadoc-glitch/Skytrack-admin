# Monthly Export to Google Sheets

Status: **planned — set up after geofencing and payroll are live in production**
(see [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md)). Not implemented yet.

## 1. What it is (and is not)

- When an admin **locks a payroll month**, SkyTrack copies that month's final figures into a Google Sheet in your
  personal Google Drive. Relocking a reopened month replaces that month's rows with the new version.
- It is a **readable archive**, not a database backup: it cannot restore logins, settings or history. Keep the monthly
  database dump from [PRODUCTION_ROLLOUT.md §5](PRODUCTION_ROLLOUT.md#5-after-go-live) as the restorable backup.
- Cost: free. The Google Sheets API has request quotas but no charges and needs no billing account; each export uses a
  few requests and one Supabase Edge Function call.

## 2. Decisions (defaults — change before implementation if needed)

| Item | Default |
| :--- | :--- |
| Method | **Option C**: the Edge Function writes to the Sheet using a Google **service account** (personal Gmail, so no Workspace policy blocks key creation) |
| Spreadsheet | One spreadsheet per year: `SkyTrack Payroll <year>`, owned by you |
| Tabs | **Payroll**, **Attendance**, **Leaves**, plus an **Export log** tab |
| Location data | **Not exported** (GPS distances stay in the database) |
| Sharing | Private to you; shared only with the service account (Editor) |
| On failure | The lock always succeeds; the Payroll page shows "Export failed" with a **Retry export** button |

### Columns
- **Payroll** (one row per employee): month, employee ID, name, designation, department, payslip number, version,
  monthly gross, working days, paid days, absence days/amount, LOP leave days/amount, late marks, late LOP days/amount,
  total deductions, net pay.
- **Attendance** (one row per employee per day): month, date, employee ID, name, status, check-in and check-out (India
  time), worked hours, break minutes, late (yes/no, minutes late).
- **Leaves** (approved leave overlapping the month): month, request ID, employee ID, name, type, from, to, days, paid
  days, LOP days.
- **Export log**: when, month, version, rows written, result.

## 3. One-time setup (personal Gmail) — do this after go-live

Do steps 1–7 for **staging first** (separate spreadsheet), test, then repeat for production.

1. **Create the spreadsheet.** In Google Drive create a blank Google Sheet named `SkyTrack Payroll 2026`. Copy its ID
   from the address bar: `https://docs.google.com/spreadsheets/d/`**`<THIS PART>`**`/edit`.
2. **Create a Google Cloud project.** Open <https://console.cloud.google.com/> with the same Gmail account →
   project picker → **New project** → name `skytrack-exports` → Create. No billing account is needed.
3. **Enable the Sheets API.** APIs & Services → Library → search **Google Sheets API** → Enable.
4. **Create the service account.** IAM & Admin → Service Accounts → **Create service account** → name
   `skytrack-sheets-export` → Create and continue → skip the optional role and user steps → Done.
5. **Create its key.** Open the service account → Keys → Add key → Create new key → **JSON** → Create. A `.json` file
   downloads. Treat it like a password: it can edit any Sheet shared with this account.
6. **Share the spreadsheet** with the service account's email (shown on its page, ending in
   `@skytrack-exports.iam.gserviceaccount.com`) as **Editor**. Untick "Notify people".
7. **Store the secrets in Supabase** (staging project first): Dashboard → Project Settings → Edge Functions →
   Secrets → add
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = the entire contents of the `.json` file
   - `GOOGLE_SHEETS_SPREADSHEET_ID` = the ID from step 1

   Then delete the downloaded `.json` file (or move it into a password manager). Never commit it to git.
8. **Test**: on staging, lock a past test month → the Sheet gets the Payroll, Attendance and Leaves tabs and an
   Export log row. Reopen and relock → that month's rows are replaced and the version increases.
9. **New year:** create `SkyTrack Payroll <year>`, share it with the service account, and update
   `GOOGLE_SHEETS_SPREADSHEET_ID`.

**If the key ever leaks:** Service Accounts → Keys → delete the key, create a new one, update the Supabase secret.

## 4. Implementation outline (for when it is built)

- Migration: `payroll_runs` gains `export_status` (`pending` / `done` / `failed`), `exported_at`, `export_error`.
- Edge Function:
  - `exportMonthToSheets(month)`: signs a short-lived Google access token from the service account key (RS256 via Web
    Crypto, no extra library), reads the locked month's payslips, attendance and approved leave, replaces that month's
    rows in each tab and appends to the Export log.
  - Called after `admin_payroll_lock` succeeds; failures are recorded, never undo the lock.
  - `admin_payroll_export_retry` (admin only) for the Retry button.
- Web: export status and Retry button on the Payroll page.
- Tests on staging: lock → export; relock → rows replaced; Google unavailable → lock still succeeds and Retry works.
