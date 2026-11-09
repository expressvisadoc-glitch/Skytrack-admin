# Subscription Platform — Architecture Plan

Status: **planning.** Branch: `feature/subscription` (both repos), built on `feature/payroll`. Only the public
landing page is built so far (`src/components/Landing.tsx`, §11). No database or billing changes yet. Each phase
is built and tested on the **staging** Supabase project (`npwwwapbbvkvteycxaab`) first, never on production.

## 1. Goal

Turn SkyTrack from a system for one company (Skypass Visa Services) into a **subscription platform**: any
organisation can sign up, pay for a plan and use SkyTrack for its own employees.

- Each organisation sees only its own employees, attendance, leave, payroll and settings.
- What an organisation can use (features, number of employees) depends on its plan.
- Payment is recurring; a lapsed payment limits the account, it never deletes data.
- Skypass keeps working unchanged as the first organisation.

## 2. Where SkyTrack is today (single company)

| Area | Today | Problem for many organisations |
| :--- | :--- | :--- |
| Database | 24 tables in `public` with no organisation column (employees, attendance, leaves, leave balances and transactions, departments, work shifts, holidays, geofence and payroll settings and history, salaries, payroll runs, payslips, late marks, location events, notifications, device tokens…) | Everyone's rows would be mixed together |
| Settings | `office_geofence_settings` and `payroll_policy` are single rows (`id = 1`) | One office and one payroll policy for everybody |
| Identifiers | Employee IDs (`SKY001`), department names and shift names are unique across the whole database | Two companies cannot both have `EMP001` |
| Server | `skytrack-api` (57 actions) uses the service key, which bypasses database rules | Every action must add an organisation filter by hand |
| Login | Employee ID or email + password | Employee IDs will repeat across companies |
| Scheduled jobs | `notifications_tick` uses one timezone and one policy | Needs to run per organisation |
| Android | One app, one server URL, updates via GitHub releases | Outside customers need the Play Store |

## 3. Tenancy model

| Option | How | Cost / effort | Verdict |
| :--- | :--- | :--- | :--- |
| **A. Shared database, `organization_id` on every row** | One Supabase project; every row tagged with its organisation; Row Level Security (RLS) enforces separation | Cheapest; one deployment; one migration path | **Recommended** |
| B. Schema per organisation | One database, a copy of all tables per customer | Complex migrations; Supabase tooling works against it | No |
| C. Supabase project per organisation | Full physical isolation | ~$25+/month per customer; every release deployed N times | Only for a future enterprise tier |

```
                    ┌────────────── SkyTrack platform ──────────────┐
 Company A users ─┐ │  Web (Cloudflare)       Android app (Play)    │
 Company B users ─┼─┤          │                     │              │
 Company C users ─┘ │          ▼                     ▼              │
                    │   skytrack-api (Edge Function)                │
                    │   caller → organisation + role + plan         │
                    │          │                                    │
                    │          ▼                                    │
                    │   Postgres: every row has organization_id     │
                    │   RLS: organization_id = caller's org         │
                    │                                               │
                    │   billing-webhook ◄── Razorpay / Stripe       │
                    │   Platform console (SkyTrack team only)       │
                    └───────────────────────────────────────────────┘
```

## 4. Data model

### 4.1. New tables

| Table | Purpose / key columns |
| :--- | :--- |
| `organizations` | `id`, `name`, `company_code` (login code), `slug` (web subdomain), `status` (`trial` / `active` / `past_due` / `suspended` / `cancelled`), `timezone`, `country`, `gstin`, `logo_url`, `created_at` |
| `plans` | `code`, `name`, `price`, `currency`, `billing_interval` (monthly / yearly), `max_employees`, `features` (jsonb flags: `geofencing`, `payroll`, `payslips`, `notifications`, `multi_office`, `export`…), `is_public` |
| `subscriptions` | `organization_id`, `plan_id`, `status`, `trial_ends_at`, `current_period_start/end`, `seats`, `provider` (razorpay / stripe), `provider_customer_id`, `provider_subscription_id`, `cancel_at_period_end` |
| `invoices` | Written by the billing webhook only: amount, tax (GST), status, provider invoice ID, PDF link, period |
| `billing_events` | Raw webhook events (provider event ID unique) so every event is processed exactly once |
| `platform_admins` | The SkyTrack team; separate from customer admins |
| `audit_log` | Who did what, in which organisation, including every support ("view as") session |

### 4.2. Changes to existing tables

- Add `organization_id uuid not null references organizations(id)` to every business table, with an index.
- Uniqueness becomes **per organisation**: `(organization_id, employee_id)`, `(organization_id, department_name)`,
  `(organization_id, shift_name)`, `(organization_id, holiday_date, region)`, `(organization_id, month)` for
  payroll runs.
- Single-row settings become one row per organisation: `office_geofence_settings` and `payroll_policy` keyed by
  `organization_id` (later: several offices per organisation for the multi-office feature).
- Database functions (`compute_payroll`, `lock_payroll_month`, `attendance_action_with_location`,
  `notifications_tick`, the late-mark and lock-guard triggers…) read the organisation from the row or the
  caller and never mix organisations. `notifications_tick` loops over active organisations with each one's own
  timezone and policy.

### 4.3. Existing data

One migration creates organisation #1, **Skypass Visa Services**, and sets `organization_id` on every existing
row. Skypass stays on a free, grandfathered plan; nothing changes for its employees except entering the company
code once when login starts asking for it (Phase 2).

## 5. Identity, login and roles

### 5.1. Finding the organisation at login

Employee IDs can repeat across organisations, so login needs to know the company.

| Option | Web | Android | Verdict |
| :--- | :--- | :--- | :--- |
| **Company code + Employee ID** | `company.skytrack.app` subdomain fills the code, or a code field | Code entered once on first launch, then remembered | **Recommended** |
| Work email only | Email + password | Same | Simpler, but staff without work email cannot log in |

### 5.2. Organisation in the session

After login, the user's `organization_id` and role are added to the session token using Supabase's **custom
access-token hook**. Every RLS policy and server action then reads the organisation from the token instead of
looking it up each time.

### 5.3. Roles

| Role | Scope |
| :--- | :--- |
| Owner | One or more per organisation; billing, plan changes and everything an admin can do |
| Admin / Super admin | Organisation administration (as today) |
| Employee | Own attendance, leave, salary and payslips (as today) |
| Platform admin | SkyTrack team; the platform console across all organisations |

## 6. Plans, features and limits

- **Server-side gates.** Each server action checks the organisation's plan before running. Example: `start_work`
  enforces the geofence only on plans with `geofencing`; payroll actions require `payroll`. The web and the app
  hide features the plan does not include, but **the server is the gate**.
- **Seat limit.** Active employees ≤ plan seats. At the limit, "Add employee" is blocked; nobody is removed
  automatically. A downgrade below the current count blocks new employees until the count fits.
- **Example tiers** (names and prices to be decided):

| Plan | Includes |
| :--- | :--- |
| Starter | Attendance, breaks, leave, holidays, up to N employees |
| Growth | + office geofencing, payroll, payslips, notifications |
| Business | + multiple offices, data export, priority support |

## 7. Subscription lifecycle

```
Sign up ──► Trial (e.g. 14 days) ──► Active ──► payment fails ──► Past due (7-day grace, banner)
                  │                    ▲                                │
                  └── no plan chosen ──┴──────────► Suspended ◄─────────┘
                                                       │   read-only: admins can view and export,
                                                       │   check-in and edits are off
                                                       ▼
                                                   Cancelled ──► data kept 90 days ──► export, then delete
```

- **Payment provider:** **Razorpay Subscriptions** for India (INR, UPI AutoPay, cards, GST invoices), or
  **Stripe** for international sales.
- **Webhook:** a new Edge Function `billing-webhook` verifies the provider's signature, stores the event in
  `billing_events` (once only) and updates `subscriptions`, `invoices` and the organisation `status`. The apps
  never decide payment state themselves.
- **Reminders:** trial ending, payment failed, suspended, and renewal emails or in-app banners for owners
  (reuses the notifications system for admins).

## 8. Onboarding a new organisation

1. **Sign up** (public page): company name, owner name, email, password → creates the organisation, the owner
   account and a trial subscription.
2. **Setup wizard:** office location and radius, shifts, holidays, payroll settings (existing screens, now per
   organisation).
3. **Invite staff:** admins and employees, as "Add employee" works today, scoped to the organisation and the
   seat limit.
4. **Choose a plan → checkout** (Razorpay / Stripe) → subscription active.
5. **Branding:** organisation name and logo in the web portal, the app and payslips (payslips already use a
   letterhead; it becomes per organisation).

## 9. Platform console (SkyTrack team)

- Organisations: status, plan, seats used, MRR, trials ending, failed payments.
- Change a plan, extend a trial, suspend or reactivate an organisation.
- Support "view as" with a time limit and an `audit_log` entry.
- Health: notification delivery, cron jobs, error rates.

## 10. Security, infrastructure and compliance

| Topic | Plan |
| :--- | :--- |
| Isolation | RLS on every table by `organization_id`; one shared tenant helper in `skytrack-api` that every action uses; per-action review |
| Isolation tests | Automated SQL + HTTP suite proving organisation A can never read or change organisation B's data; run before every release (same style as the payroll staging tests) |
| Biggest risk | `skytrack-api` uses the service key; a missed filter in any of the 57 actions would leak data. The helper and the isolation tests exist to catch this |
| Supabase plan | **Pro** (~$25/month) for paying customers: daily backups, point-in-time recovery, no pausing |
| Backups | Provider backups plus a scheduled export; per-organisation export on request |
| Legal (India) | **DPDP Act 2023**: privacy policy, terms of service, data processing agreement, export and deletion on request |
| Android | **Google Play** listing; the GitHub-release update check does not scale to outside customers. Still one app for all organisations |
| Web | Cloudflare Pages with a wildcard subdomain (`*.skytrack.app`) if subdomains are chosen |
| Monitoring | Error tracking for the web, the app and the Edge Functions; alerts on webhook failures |

## 11. Phases

| Phase | Scope | Visible change for Skypass |
| :--- | :--- | :--- |
| **0. Landing page** ✅ | Public landing page at `/`, Log in → `/login` (`Landing.tsx`); signing out ends on the login screen | Landing page before login |
| **1. Tenancy foundation** | `organizations`; `organization_id` on all tables; Skypass as organisation #1; per-organisation uniqueness and settings; organisation in the session token; RLS; tenant helper in `skytrack-api`; isolation tests | None |
| **2. Login and onboarding** | Company code or subdomain; sign-up page; owner role; invites; branding; Android company code | Company code asked once at login |
| **3. Plans and entitlements** | `plans`, feature gates, seat limits, trial | None (grandfathered) |
| **4. Billing** | Razorpay or Stripe subscriptions, `billing-webhook`, GST invoices, past-due and suspension | None |
| **5. Platform console** | Team tools, metrics, support access | None |
| **6. Launch hardening** | Security review, load test, legal pages, Play Store, backups, monitoring | None |

## 12. Decisions needed

| # | Question | Options | Decision |
| :-- | :--- | :--- | :--- |
| 1 | Market and payment provider | India with Razorpay / international with Stripe | Pending |
| 2 | Pricing unit | Per employee per month / flat plans with seat limits | Pending |
| 3 | Login | Company code + Employee ID (subdomains on web) / work email only | Pending |
| 4 | Trial length and lapse behaviour | e.g. 14 days; read-only vs fully blocked | Pending |
| 5 | Features per plan | Tiers in §6 as a starting point | Pending |
| 6 | Branding | Name and logo / also colours and custom domains | Pending |
| 7 | Skypass | Free forever as organisation #1 / moves to a paid plan | Pending |
| 8 | Android distribution | Ready to publish on Google Play? | Pending |

## 13. Decision log

| # | Date | Decision |
| :-- | :--- | :--- |
| 1 | 2026-11-04 | Build the subscription platform on branch `feature/subscription` (both repos), based on `feature/payroll` |
| 2 | 2026-11-04 | Recommended tenancy model: shared database with `organization_id` and RLS (§3, option A) — to confirm |
| 3 | 2026-11-04 | Phase 0: public landing page at `/` with Log in → `/login` (built, pushed to `origin/feature/subscription`) |
