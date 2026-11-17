# SkyTrack Web Portal — Content Specification for Redesign

**Scope:** what each screen of the SkyTrack web portal must contain: information, actions, states and copy.
Colour, type, layout and components are left to the design. Where this document says "show", it means the
information must be present. How it looks is up to you.

**One build, two portals.** The same website serves:

- **Admin portal**: administrators and super administrators run the organisation.
- **Employee portal**: every employee can do from a browser what they do on the phone.

The role decides which portal opens after sign-in. Both portals include **Help & Training** (the Academy).

---

## 0. Conventions used in this document

| Term | Meaning |
| :--- | :--- |
| **Primary action** | The one thing the screen exists for. One per screen or dialog. |
| **Secondary action** | Available, but not the main purpose. |
| **Destructive action** | Deletes, rejects, locks or revokes. Needs a confirmation step. |
| **State** | A version of the screen: loading, empty, error, success, locked, no permission. |
| *Example:* | Sample data to use in mock-ups (see §9, all fictional). |

### Formats (use everywhere)

| Item | Format | Example |
| :--- | :--- | :--- |
| Date, short | d MMM | 12 Nov |
| Date, full | EEE, d MMM yyyy | Thu, 12 Nov 2026 |
| Month | MMMM yyyy | November 2026 |
| Time | 12-hour with AM/PM, in the viewer's local time | 9:52 AM |
| Duration | h + m | 8h 05m |
| Money | ₹ with Indian grouping, no decimals unless below ₹100 | ₹19,955 · ₹45 · ₹1.67/min |
| Days | Up to one decimal place, because half days exist | 1.5 days |
| Employee | Name, then ID | Ananya Kumar · SKY001 |

---

## 1. Who uses the website

| Role | Portal | What they come for |
| :--- | :--- | :--- |
| **Employee** | Employee portal | Check in/out, breaks, leave, monthly hours, holidays, salary card, payslips |
| **Administrator** | Admin portal | People, attendance, leave decisions, holidays, geofence, payroll, settings |
| **Super administrator** | Admin portal plus **Admin Management** | Everything above, plus managing administrators, resetting passwords and deleting employees |

> **Manager role:** it exists in the data, but it grants no extra permissions on the server today. Do not design
> manager-only screens such as "My team's approvals" unless that feature is built. An employee with the manager
> role sees the employee portal.

---

## 2. Site map

```
Sign in
 ├─ Forgot password (request sent to administrator)
 │
 ├─ ADMIN PORTAL
 │   ├─ Dashboard
 │   ├─ Employees ─ Employee details (Profile · Attendance · Leave · Salary · Security)
 │   ├─ Attendance
 │   ├─ Leave Management
 │   ├─ Public Holidays
 │   ├─ Organization (Departments · Work shifts)
 │   ├─ Office Geofence
 │   ├─ Payroll
 │   ├─ Payroll Settings
 │   ├─ Settings (my account)
 │   ├─ Admin Management            ← super admin only
 │   ├─ Help & Training
 │   └─ Notification panel (bell, overlay on every page)
 │
 └─ EMPLOYEE PORTAL
     ├─ Home (punch clock + salary card)
     ├─ Leave
     ├─ Monthly
     ├─ Holidays
     ├─ Payslips          ← today a section inside Monthly; a page of its own is recommended
     ├─ Profile
     └─ Help & Training
```

**Navigation labels (keep short and consistent):**
Admin: Dashboard · Employees · Attendance · Leave · Holidays · Organization · Office Geofence · Payroll ·
Payroll Settings · Settings · Admin Management · Help & Training.
Employee: Home · Leave · Monthly · Holidays · Payslips · Profile · Help & Training.

---

## 3. Global elements

### 3.1 Header (both portals)
- Product name **SkyTrack** and the organisation name (*Skypass Visa Services*).
- Current page title.
- **Notification bell** with an unread count. Admin portal only; see §6.
- Signed-in person: name, role, initials or photo, and a menu with **Profile/Settings** and **Sign out**.
- Theme switch (light/dark).
- On narrow screens: a menu button that opens the navigation.

### 3.2 Navigation
- Every item listed in §2 for the role, with a clear indication of the current page.
- A **pending-leave count** next to Leave (admin).
- Help & Training always last.

### 3.3 Feedback patterns needed on every page
- **Loading**: placeholder shapes that match the content, not a bare spinner.
- **Empty**: what will appear here and how it gets there. Never just "No data".
- **Error**: what failed, in plain words, with a **Retry** action.
- **Success**: a short confirmation after every save, approval or lock.
- **Confirmation dialog** for every destructive or financial action: title, one-sentence consequence, the
  primary action named by its verb ("Lock month", not "OK"), and Cancel.
- **Locked month**: when an action is refused because payroll for that month is locked, say so and name the
  month, e.g. *"October 2026 is locked. Reopen it from Payroll to make changes."*

---

## 4. Public screens

### 4.1 Sign in
**Purpose:** get any employee or administrator into the right portal.

Content:
- Product name, organisation name, one-line purpose: *"Attendance, leave and payroll for Skypass Visa Services."*
- **Employee ID** field (for example SKY001). Hint: *"Your employee ID, not your email."*
- **Password** field with a show/hide control.
- **Remember me on this computer** (keeps the session on this browser).
- Primary: **Sign in**.
- Secondary: **Forgot password?**

States:
- Wrong ID or password: *"Employee ID or password is incorrect."* Do not say which one.
- Account suspended: *"Your account is suspended. Contact your administrator."*
- Too many attempts: tell them to wait, and for how long.
- Signing in: the button shows progress and is disabled.

### 4.2 Forgot password
**Purpose:** there is no self-service email reset. The request goes to an administrator, who issues a temporary
password.

Content:
- Explanation: *"Your administrator will set a temporary password for you."*
- Employee ID field. Primary: **Send request**.
- Sent state: *"Request sent. Your administrator will contact you with a temporary password."*

---

## 5. Admin portal

### 5.1 Dashboard
**Purpose:** see today at a glance and spot what needs attention.

Content, in priority order:
1. **Needs attention**: pending leave requests (count, plus the oldest few with name, dates, type and days),
   people not checked in after shift start, an unlocked previous month (from the 1st of the month), and
   employees missing a salary or work shift. Each item links to the page that fixes it.
2. **Today's numbers**: Registered employees · Checked in · On break · Not checked in · On approved leave.
   Each figure filters the roster below when selected.
3. **Today's roster**: name, ID, shift, status (Working / On break / Checked out / Not checked in / On leave /
   Week off), check-in time, worked so far, and a late flag in minutes.
   Filters: All · Working · On break · Not in · On leave.
4. **Live activity feed**: check-ins, check-outs, break start/end, newest first, with time and name.

States:
- Empty feed: *"No activity yet today. Check-ins, check-outs and breaks will appear here as they happen."*
- Nothing needs attention: *"All caught up."*
- Filter with no match: *"Nobody in this group today."*
- Error: *"Dashboard couldn't load."* plus Retry.

### 5.2 Employees (directory)
**Purpose:** find anyone, see today's status, and add people.

Content:
- Search (name, ID, email) and filters: Department · Status (Active / Suspended) · Today (Present / Absent /
  On leave / On break).
- Summary counts: Total · Present today · On leave · Absent.
- List columns: photo or initials, name, ID, designation, department, shift, today's status, account status,
  and a **No salary** or **No shift** flag when missing.
- Primary: **Add employee**.

**Add employee** (form):
| Field | Required | Note to show |
| :--- | :--- | :--- |
| Full name | Yes | As it should appear on payslips |
| Email | Yes | |
| Employee ID | Generated or entered | |
| Department | Yes | |
| Designation | Yes | |
| Work shift | Yes | *"Sets the expected start time. Lateness is measured against it."* |
| Reporting manager | No | |
| Joining date | Yes | *"Payroll does not count days before this date."* |
| Role | Yes, defaults to Employee | *"Administrator access shows everybody's salary."* |
| Initial password + confirm | Yes | Show the password rules (§5.11) |

After saving: confirmation showing the new ID and a reminder: *"Next: set a salary, or payroll can't pay
this person."* with a link to the Salary tab.

Empty search: *"No employees match your search."*

### 5.3 Employee details
**Purpose:** everything about one person, plus the actions an administrator takes on them.

Header: photo, name, ID, designation, department, status (Active / Suspended), joining date, and a back link to
Employees.

Tabs or sections:

**Profile**
- Department, designation, work shift (with times), reporting manager, email, joining date, role.
- **Edit details** (the same fields as Add).

**Attendance**
- This month: days present, late days, absences, total hours.
- Daily list: date, check-in, check-out, breaks, worked, status, and a note if an admin entered it.
- Link: **View full month** (opens Attendance filtered to this person).
- Empty: *"No attendance this month."*

**Leave**
- Balances per type: Allocated · Used · Available (Casual, Sick). Loss of Pay has no balance.
- **Adjust balance**: type, days (+ or −, half days allowed), reason (required).
  Help: *"Use positive numbers to add days, negative to subtract."*
- History: dates, type, days, paid days, unpaid days, status, decided by, comment.

**Salary**
- Current monthly gross and effective-from date, or a **No salary set** warning.
- This month (provisional): gross, working days, deductions, expected net. Same breakdown as §5.7.
- **Set / change salary**: monthly gross (₹), effective from, note (optional).
  Help: *"Effective from decides which days are paid. For a new joiner, use the joining date."*
- **Salary history**: amount, effective from, changed by, changed on, note. Read-only, never edited.

**Security** (super admin for other people's passwords)
- **Reset password**: new password + confirm, with the rules shown.
- **Suspend / reactivate account**.
- **Delete employee** (super admin only): a two-step confirmation that re-enters the super admin's own
  password. If the person has payslips or attendance in a locked month, deletion is refused. Offer **Suspend**
  instead and explain why.

### 5.4 Attendance
**Purpose:** see and correct who worked when.

Content:
- Date picker with Previous day · Today · Next day, and a **Monthly view** switch.
- Filters: Status (Present / Late / Absent / On leave / On break / Half day), Department, Search.
- Daily table: employee, shift, check-in, check-out, breaks (count and total), worked, late minutes, status,
  and an **Entered by admin** marker.
- Row actions:
  - **Set check-in / Set check-out**, with quick fills *"Shift start"*, *"Shift end"* and *"Now"*. Times are
    entered in the admin's local time.
  - **Undo check-out**: puts the person back to Working without losing earlier times. Needs confirmation.
  - **Mark present** for a day recorded as absent.
- Location audit for a person and day: every check-in or check-out attempt, accepted or refused, with time,
  distance from the office, accuracy and reason. This is what settles disputes.
- Export: **Download attendance sheet (PDF)** for the selected day or month.

States:
- Empty: *"No attendance for this date and filter."*
- Locked month: editing is unavailable. Explain why and link to Payroll.

### 5.5 Leave Management
**Purpose:** decide leave requests correctly, knowing what each decision costs.

List:
- Filters: Pending (default) · Approved · Rejected · Cancelled · All. Search by name.
- Each request: employee, type, from–to, days (including half-day session), submitted on, status.

Request detail (side panel or page):
- Employee, type, dates, days, half-day session if any, reason, submitted on.
- **Balance check**, the most important block: balance available for this type vs days requested, and the
  resulting split. *Example:* "1 day available · 2 requested → 1 paid, 1 unpaid (loss of pay)."
- Overlaps: other people from the same department already on leave on those dates.
- Comment field (required to reject, optional to approve).
- Actions: **Approve** (primary), **Reject** (destructive). After approval, **Cancel approved leave** is
  available while the month is open.
- After a decision: status, paid days, unpaid days, decided by, decided on, comment.

States:
- No pending: *"No leave requests are waiting for review."*
- Already decided by someone else: *"This request was already approved by Priya Nair."*
- Locked month: deciding is refused, with the month named.

### 5.6 Public Holidays
**Purpose:** the holiday calendar. Published holidays are non-working days for attendance and payroll.

Content:
- Year selector, filters by type, search, sort by date.
- Types: **Gazetted** (statutory), **Company holiday**, **Restricted / optional**.
- List or calendar: date, day, name, type, notes, status (Upcoming / Past).
- Primary: **Add holiday** (date, name, type, notes). Edit and delete per holiday.
- Secondary: **Export (CSV)**.
- Show the consequence on save: *"Saving makes this a non-working day for everyone. Payroll for that month
  will change."*

States: locked month (cannot add or remove a holiday in a locked month); empty year.

### 5.7 Payroll
**Purpose:** turn the month's attendance into pay, review it, and close the month.

Header:
- Month selector.
- Month status: **Open** (figures recalculate live), **Locked** (version n, locked by, locked on) or
  **Reopened**.
- Working days for the month, with how they were derived: *"30 days − 5 Sundays − 0 holidays = 25 working days."*

Warnings before the table:
- Employees with **no salary set**: they will be skipped and get no payslip.
- Employees with **no work shift**: late minutes can't be measured.
- Pending leave requests in this month: approving them later changes pay.

Table, one row per employee:
| Column | Content |
| :--- | :--- |
| Employee | Name, ID |
| Gross | Monthly gross |
| Working days | For this person (joining date counted) |
| Absences | Days, ₹ |
| LOP leave | Days, ₹ |
| Late | Days late, minutes, ₹ |
| Deductions | Total ₹ |
| Net pay | ₹ |
| Payslip | View / Download (when locked) |

Row detail: the per-day list behind each deduction, e.g. *"Thu 12 Nov · late 27 min · ₹45"*.

Totals row: employees, total gross, total deductions, total net.

Actions:
- **Export CSV** (for the accountant).
- **Lock month** (primary, destructive). The confirmation must say: payslips are issued and frozen; attendance,
  leave, holiday and salary changes for the month will be refused; anyone without a salary is skipped
  (name them).
- When locked: **Reopen month**, which requires a written reason. Relocking creates payslip version n+1 and
  keeps the old one.
- **Lock history**: action, by, when, reason, version.

### 5.8 Payroll Settings
**Purpose:** the rules payroll uses. Changes apply to future days and open months, never to locked months.

Show the **current settings** first (read view), then **Edit settings**:

| Setting | Content and help text |
| :--- | :--- |
| Week-off days | Day checkboxes. *"Unticked days are working days. Published holidays are also non-working."* |
| Late grace | Minutes after shift start before someone counts as late |
| Late penalty | Choice of two policies (below) |
| Allowed break | Minutes. A longer break triggers a reminder to the employee |
| Office timezone | Used to judge dates and lateness |

**Late penalty: two options. The design must make the difference clear.**
- **Late marks:** every *n* late arrivals cost a fraction of a day. Fields: late marks per deduction, LOP days
  per deduction. *Example:* "2 late marks = 0.5 day's pay."
- **Per minute:** every minute late is deducted. Fields: what a minute costs (its share of the day's pay, or a
  fixed ₹ amount), and an optional daily cap in minutes. *Example:* "27 minutes late at ₹1.67 = ₹45."
  Show a worked example that updates as the values change.

Confirmation before saving: *"Apply new payroll settings? Changes affect future check-ins and open months.
Locked months keep their payslips."*

**Change history**: last 10 changes, showing what changed, from → to, by, when.

### 5.9 Office Geofence
**Purpose:** the office location that check-in and check-out must happen inside.

Content:
- Status: **Active**, **Inactive** or **Not configured**. When inactive, state the consequence clearly:
  *"Check-in and check-out are blocked for everyone."*
- Map preview: office pin, radius circle, and the admin's own position if allowed.
- Saved configuration: office name, coordinates, radius (m), maximum accuracy (m), maximum location age (s).
- **Edit office location**:
  - Office name (optional).
  - Location: paste a Google/Apple Maps link **or** enter coordinates **or** move the pin.
  - Radius in metres. Help: *"Large enough to cover the whole building. 30–60 m suits most offices."*
  - Maximum accuracy. Help: *"Readings less precise than this are refused. ±50 m is a sensible default."*
  - Maximum location age in seconds.
  - Active on/off.
- Confirmation: *"Apply new attendance location rules? This applies to the next check-in for every
  employee. A wrong pin locks the whole office out."*
- **Change history**: last 10, showing values, by, when.
- Note for the design: breaks are **not** location-checked. Only check-in and check-out are.

### 5.10 Organization
**Purpose:** the reference lists other screens depend on.

- **Departments**: name, number of employees. Add, rename, remove (blocked while employees are assigned).
- **Work shifts**: name, start time, end time, working minutes, number of employees.
  Add and edit. Warn: *"Changing a shift affects lateness from the next working day. Past days keep the shift
  they were judged against."*
- Empty: *"No departments yet."* / *"No work shifts yet. Employees need a shift before lateness can be
  measured."*

### 5.11 Settings (my account)
**Purpose:** the signed-in administrator's own account.
- Name, email, role, department (read-only).
- **Change password**: current, new, confirm, with the live rules: at least 8 characters, upper- and lower-case
  letters, at least one number. Saving signs out all other sessions. Say so.
- **Sign out** (with confirmation).

### 5.12 Admin Management (super admin only)
**Purpose:** decide who has administrator access.
- List: name, ID, role (Employee / Admin / Super admin), department, status.
- Change role (with confirmation that explains the access change). Super admins cannot be changed by admins.
- Other roles see: *"Only super admins can access this section."*

### 5.13 Notification panel (bell)
**Purpose:** items an administrator must act on. Each item: what, who, when, and the action that resolves it.

| Item | Content | Action |
| :--- | :--- | :--- |
| Leave request | Name, type, dates, days | Open request |
| Not checked in (per shift, 30 min after start) | Shift, list of names | Open roster |
| Previous month not locked (1st of month) | Month | Open Payroll |
| Missing salary or shift | Names | Open employee |
| Suspicious location | Name, repeated attempts from outside or a mock location | View attendance log |
| Geofence switched off | Since when | Open Office Geofence |
| Password reset request | Name, ID, email, when | Issue temporary password · Mark handled |

Group by type with counts. Empty: *"All caught up."*

### 5.14 Help & Training (Academy)
See §8. Shared with the employee portal.

---

## 6. Employee portal

### 6.1 Home: punch clock
**Purpose:** record today's attendance. This is the most-used screen.

Content:
- Greeting with first name, today's date, current time.
- **Location status** (web uses the browser's location):
  - At the office: *"You appear to be at the office. 12 m from Skypass Office."*
  - Outside: *"You're 140 m from the office. Check-in works within 30 m."*
  - Plus the problem states listed in the app spec (permission off, low accuracy, offline).
- **The punch clock**: one main control whose label follows the state.

| State | Main control | Also shown |
| :--- | :--- | :--- |
| Not checked in | **Check in** | Shift start time (*"Your shift starts at 10:00 AM"*) |
| Working | **Check out** | Checked in at, worked so far (live), **Start break** |
| On break | (Check out unavailable) | Break started at, break elapsed (live), allowed break, **End break**, note *"End your break before checking out."* |
| Checked out | (none) | Check-in, check-out, breaks, total worked: *"Done for today."* |

- **Today's timecard**: check-in, check-out, number of breaks, total break time, net work hours.
- After a late check-in: *"You checked in 27 minutes late. The cost is shown in your salary breakdown."*
  Pay amounts appear only inside the salary card once it is shown.
- **This month's salary** card (below).
- Short guidance: *"Start a break before stepping away. Check out before you leave."*

### 6.2 This month's salary (card, on Home)
- Hidden by default (*"₹ • • • • •"*), with a **Show** control. Never shown automatically.
- When shown: month, **expected net pay**, monthly gross, working days.
- **View breakdown**: absences (days, ₹), unpaid leave (days, ₹), late check-ins (days or minutes, ₹), and
  **days affecting pay** as a dated list, e.g. *"Thu, 12 Nov · late 27 min · −₹45"*.
- Label it **provisional** until the month is locked.
- States: *"Salary not set yet. Please contact your administrator."* · *"You were not employed during this
  month."* · *"Calculating…"* · *"Salary could not be calculated."* plus Retry.

### 6.3 Leave
- **Balances**: Casual, Sick (allocated · used · available) and Loss of Pay (no limit, unpaid).
- **Apply for leave** form:
  1. Type. A type with no balance is disabled, with the reason shown.
  2. From and to dates. Show the holiday on a chosen date if there is one, and warn on past dates:
     *"You're applying for a past date. Continue?"*
  3. Half day: first half (morning) or second half (afternoon).
  4. Reason, with examples *"Family event · Medical appointment · Personal matter"*.
  5. **Preview before submitting**: days requested, paid if approved, unpaid if approved.
     *Example:* "2 days · 1 paid · 1 unpaid. Sundays and holidays are not counted."
  6. Primary: **Submit request**. Show the approver: *"Goes to Rahul Menon (reporting manager)"* or, when none
     is assigned, *"Goes to your administrator."*
- **My requests**: type, dates, days, paid/unpaid split once decided, status (Pending / Approved / Rejected /
  Cancelled), the manager's comment, and **Cancel request** while pending.
- Upcoming holiday strip: next and previous holiday.
- Empty: *"No leave requests yet."*

### 6.4 Monthly
- Month selector.
- Summary: days present, late days, absences, leaves, total hours, daily average, attendance rate.
- Calendar: each day marked as Worked / Late / Absent / Leave (paid or unpaid) / Holiday / Week off / Today /
  Future, with a legend.
- Day detail: check-in, check-out, each break, worked, late minutes and their cost, and whether an
  administrator edited the day.
- Daily list (alternative to the calendar): date, in, out, breaks, worked, status.
- **Download timesheet (PDF)**.
- Prompt: *"Something wrong? Tell your administrator before the month is locked."*

### 6.5 Holidays
- Next upcoming holiday, prominent.
- List by type: Gazetted, Company, Restricted/optional, with date, day, name, and status (Upcoming / Past).
- Search by name or date.
- End of year: *"All holidays for this year have passed."*

### 6.6 Payslips
- One row per locked month: month, net pay (hidden until shown), version (*"Revised: v2"*), **View** and
  **Download PDF**.
- Explain: *"Payslips are issued when payroll for a month is locked."*
- Empty: *"No payslips yet. They appear here after payroll for a month is locked."*
- Payslip content (also the PDF): company letterhead, employee name, ID, designation, department, month,
  working days, paid days, gross, each deduction with days and amount, net pay, version and issue date.

### 6.7 Profile
- Photo or initials, name, ID, designation, department, work shift (times), reporting manager, joining date,
  work email, account status.
- Leave summary (link to Leave).
- **Change password** (same rules as §5.11).
- **Sign out**.
- Note: *"To change your details, contact your administrator."*

---

## 7. Notifications the employee receives (content reference)

The website does not show employee push notifications, but the inbox content should match the app. See the app
spec §7 for the full list.

---

## 8. Help & Training (Academy)

**Purpose:** self-service help. 101 guides, and interactive tutorials where you practise in a safe simulated
SkyTrack.

Home:
- Search box: *"What do you need help with?"*, with suggestions as you type.
- **Interactive tutorials** for the viewer's role:
  - Employees: First check-in and check-out · Start and end a break · Apply for leave · Read your monthly
    overview · Reveal your salary card.
  - Administrators: Approve or reject a leave request · Correct a missed check-in · Add a new employee · Set an
    employee's salary · Set up the office geofence · Close the month and issue payslips.
  - Each card: title, one-line description, number of steps, approximate minutes, and where it runs (phone app
    or admin portal). Actions: **Start tutorial**, **Read the guide**.
- **All guides**, grouped by topic: Getting started · Employee · Administrator · Payroll · Monitoring ·
  Troubleshooting.

Guide page: breadcrumb, title, last updated, body (steps, notes, common mistakes), **Interactive tutorial**
block when one exists, related guides, and *"Was this helpful?"*.

Tutorial player: progress (step x of y), the simulated screen with one highlighted element, an instruction card
(what to do and why), Back / Next / Skip / Exit / Restart, and a completion screen with key take-aways. Always
visible: *"Simulated SkyTrack. No real records are changed."*

---

## 9. Example data for mock-ups (fictional)

| Person | ID | Role | Department · Designation | Shift | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Ananya Kumar | SKY001 | Employee | Operations · Visa Consultant | General 10:00–19:00 | ₹20,000; 1 casual day left; late 27 min on 12 Nov |
| Rahul Menon | SKY002 | Manager | Operations · Team Lead | General | Ananya's reporting manager |
| Priya Nair | SKY003 | Admin | Administration · HR Manager | General | The signed-in admin |
| Arjun Thomas | SKY004 | Super admin | Administration · Director | General | |
| Imran Shaikh | SKY005 | Employee | Sales · Sales Executive | Morning 09:00–18:00 | **No salary set**; check-in refused on 11 Nov (outside geofence) |
| Fatima Noor | SKY006 | Employee | Operations · Visa Consultant | General | **Suspended** |

Office: *Skypass Office*, radius 30 m, accuracy ±50 m.
November 2026: 25 working days, ₹800/day, ₹1.67/min. Ananya's expected net is ₹19,955.

Test the layout with: a long name (*"Muhammed Abdul Rahman Kunjumon"*), zero values, ₹1,25,000 salaries,
a 0.5-day leave, 40+ employees in a table, and a month with three holidays.

---

## 10. Copy to fix in the current website

These strings describe features that don't exist or values that are hard-coded. Replace them in the redesign.

| Current text | Where | Problem | Use instead |
| :--- | :--- | :--- | :--- |
| "MFA Enforced • High Trust Zone" | Settings | There is no MFA | Remove |
| "Continue to 2FA" | Employee details → Delete | It is a password re-check, not 2FA | "Confirm with your password" |
| "Max 2 selectable per employee roster" | Public Holidays | No such rule is enforced | Remove, or build the rule |
| "Standard Shift: 8.0 hrs" · "Compliance OK" | Employee Home | Hard-coded, not the person's shift | The real shift name and times |
| "Break (1h Max)" | Employee Home | The allowed break is a setting | "Break · {allowed} min allowed" |
| "Enterprise v2.4" · "Security Clearance" · "Workstation Organization" | Employee Profile | Placeholder copy | Remove; use "Organisation" |
| "Live Sync" · "Live Gateway Sync" · "Live Backend Stream" · "Recorded via SkyTrack Engine" | Dashboard, Attendance, Leave, Home | Technical jargon | Remove, or "Updated just now" |
| "Remember this workstation (12h)" | Sign in | Duration not guaranteed | "Remember me on this computer" |
| "Workforce & Mobility Fleet" | Sign in | Unclear | "Attendance, leave and payroll" |
| Fixed date on the sign-in screen ("Monday, Sep 21, 2026") | Sign in | Static | Today's date, or remove |
