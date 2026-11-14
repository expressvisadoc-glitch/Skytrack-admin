# SkyTrack Academy — Glossary

Every SkyTrack term defined once, in the words a user would meet them. Articles link here instead of
re-explaining. Definitions are drawn from verified behaviour, not from intent.

**Date:** 14 November 2026 · Terms marked 🟡 belong to features not yet in production.

---

## Attendance

**Check in** — Recording the start of your working day. Creates the day's attendance record with a timestamp
taken from the **server**, never from your phone.

**Check out** — Recording the end of your working day. Refused while a break is running.

**Attendance date** — The day a punch belongs to, taken as the **UTC date**. For office hours in India this is
the same as the local date; a punch between midnight and 05:30 IST is filed under the previous day.

**Working** — You have checked in and are not on a break.

**On break** — A break is running. Working hours stop accumulating and you cannot check out until you resume.

**Checked out** — Your day is closed. No further action is accepted for that day.

**Total hours / net hours** — `(check-out − check-in) − total break time`, calculated on the server.

**Missed checkout** — A day left open. It is closed automatically rather than penalised; no deduction applies.

**Manual attendance** — An administrator entering or correcting a check-in or check-out on your behalf.

**Undo checkout** — An administrator reversing an accidental check-out, restoring working status without
losing earlier timestamps.

---

## Breaks

**Break** — A pause in the working day. Start it and resume from the same button.

**Allowed break** — The break length after which you get a reminder. It is a **reminder only and does not
change your pay** (`payroll_policy.max_break_minutes`).

> **Note:** SkyTrack records the *total* break time for a day, not each individual break. There is no list of
> separate breaks.

---

## Location 🟡

**Geofence** — The circle around the office inside which check-in and check-out are accepted. Defined by the
office coordinates and a **radius** set by an administrator.

**Radius** — How far from the office pin a check-in is still accepted, in metres. Exactly on the boundary
counts as inside.

**Accuracy** — How precise your phone says its position is. A fix less precise than the configured limit is
refused — this is the policy working, not a fault.

**Fix age / stale location** — How old the position reading is. Older than the configured limit and it is
refused.

**Mock location** — A fake GPS position from a spoofing app. Refused when detected.

**Location audit trail** — The record of every attendance attempt, accepted or rejected, with coordinates,
distance, outcome and reason.

> Breaks are deliberately **not** geofence-restricted. Only check-in and check-out are.

---

## Leave

**Casual leave / Sick leave** — The two leave types with a balance.

**Loss of pay (LOP)** — Unpaid leave. It has **no balance**: any leave day beyond your balance becomes LOP.

**Leave balance** — `allocated + adjusted − used`. A type with zero balance is greyed out when you apply.

**Paid days vs LOP days** — When a request is approved it is split: days covered by your balance are paid, the
rest are LOP. Apply for two days with one day left and you get one paid day and one LOP day.

**Half day** — A leave of 0.5 days.

**Pending / approved / rejected / cancelled** — A request's states. Only a **pending** request can be
approved or cancelled.

**Balance adjustment** — An administrator adding or removing days from your balance.

---

## Holidays

**Public holiday** — A non-working day in the company calendar. Both statutory (**gazetted**) and
company-declared holidays count the same way for attendance and pay.

**Published** — A holiday that is live. Only published holidays reduce the working-day count.

---

## Payroll 🟡

**Monthly gross** — Your full monthly salary before any attendance deduction. SkyTrack applies **no statutory
deductions** — no PF, ESI, professional tax or TDS.

**Effective from** — The date a salary starts. A pay change is a new record from a date; old records are never
edited, so past months stay reproducible.

**Working days in the month** — `days in the month − week-off days − published holidays`. For example
October 2026: 31 − 4 Sundays − 3 holidays = **24 working days**.

**Week off** — A day of the week that is never a working day (Sunday by default).

**Per-day rate** — `monthly gross ÷ working days in that month`. On ₹20,000 over 24 working days: ₹833.33.

**Earned gross** — The pay for the working days you were employed for, before deductions.

**Absence** — A completed working day with no check-in and no approved leave. Costs **one day's pay**.

**LOP leave deduction** — The unpaid portion of approved leave, charged on the dates it falls.

**Late mark** — A check-in later than your shift start plus the grace period. Judged to the whole minute:
10:00:45 is on time for a 10:00 shift, 10:01 is late.

**Grace** — Minutes after shift start that are not yet late. Default zero.

**Late penalty option** — How lateness affects pay. An administrator chooses one:

- **Option 1 — Late marks.** Every *n* late marks cost a fraction of a day. Default: 2 marks = 0.5 day. Only
  **complete groups** count, so 3 marks still cost 0.5 day.
- **Option 2 — Per minute.** Every late minute is deducted. A minute is worth either its share of the day's
  pay (**pro-rata**: per-day rate ÷ the shift's working minutes) or a **fixed** amount. An optional daily cap
  limits the minutes charged, and a day is never deducted more than that day's own pay.

**Pro-rata (per-minute)** — The per-minute price derived from salary and shift length. On ₹20,000 over 24
working days and an 8-hour shift, about **₹1.74 a minute**.

**Total LOP days** — Absences + unpaid leave days + the day-equivalent of late deductions.

**Net pay** — `earned gross − deductions`, never below zero, rounded to the rupee.

**Provisional** — This month's figure is an estimate while the month is open. Remaining working days are
assumed worked; today is not counted until it is over.

**Locked month** — A closed month. Payslips are frozen and the database refuses any change that would alter
its pay — attendance edits, leave approvals, holiday changes and backdated salary changes on those dates.

**Reopen** — Unlocking a closed month to correct it. Requires a written reason and is logged.

**Payslip version** — Relocking a reopened month issues version 2, 3 and so on. Earlier versions are kept for
audit.

---

## Notifications 🟡

**Push notification** — An alert on your phone.

**In-app inbox** — The bell in the app, listing your notifications whether or not push is on.

**Punch-in alerts** — The profile switch that turns all phone notifications on or off.

> The bell in the **production** web portal is a different thing: it shows pending leave requests and a live
> punch feed, not this notification inbox.

---

## People and roles

**Employee ID** — Your sign-in identifier, for example `SKY007`. You can sign in with this or your email.

**Reporting manager** — The person a leave request is associated with.

**Work shift** — Your scheduled start and end time and working minutes. Determines whether a check-in is late.
**Shift changes apply to future days only.**

**Role** — `employee`, `admin` or `super_admin`. (`manager` exists in the database but is not functional —
see `ROLE_PERMISSIONS.md` §4.)

**Super administrator** — Can additionally manage administrator accounts and reset passwords.

---

## System

**Provisional vs frozen** — Open-month figures recalculate on every request; locked-month figures never change.

**Staging** — The separate test environment. Nothing done there affects real employees or real pay.

**Office timezone** — The timezone used to read shift start times (`Asia/Kolkata`). Times are stored in UTC
and shown in your own local time.
