# SkyTrack Academy — Documentation Architecture

How the knowledge base is organised, how articles are written, and the rules that keep it honest.
**Date:** 14 November 2026 · **Phase:** 1 · **Depends on:** `PROJECT_AUDIT.md`, `FEATURE_MATRIX.md`, `NAVIGATION_MAP.md`

---

## 1. Hierarchy

```
docs/academy/
├── PROJECT_AUDIT.md              Phase 0 — what the application actually is
├── FEATURE_MATRIX.md             Phase 0 — what exists, and where it is deployed
├── NAVIGATION_MAP.md             Phase 0 — every screen, setting, modal, workflow
├── DOCUMENTATION_ARCHITECTURE.md this document
├── CONTENT_INVENTORY.md          every planned article, with its location and status
├── ARTICLE_METADATA_SPEC.md      the metadata contract every article must satisfy
├── ROLE_PERMISSIONS.md           who can do what, verified against the backend
├── GLOSSARY.md                   SkyTrack vocabulary, defined once
│
├── getting-started/              category 1
├── employee/                     category 2
├── manager/                      category 3 — BLOCKED, see §6
├── administrator/                category 4
├── monitoring/                   category 5
├── troubleshooting/              category 5
├── payroll/                      cross-cutting subsection, see §4
│
├── tutorials/{employee,manager,administrator}/
└── metadata/
    ├── intents.json              search phrases and error codes → article ids
    ├── roles.json                roles as they actually behave
    └── feature-status.json       deployment status per feature
```

---

## 2. The six categories

| # | Category | Directory | Audience | Purpose |
| ---: | :--- | :--- | :--- | :--- |
| 1 | Getting Started | `getting-started/` | everyone | First hour: sign in, find your way, phone vs browser |
| 2 | Employee Guide | `employee/` | employee | Everything an employee does for themselves |
| 3 | Manager Guide | `manager/` | *(blocked)* | See §6 — the role is not functional |
| 4 | Administrator Guide | `administrator/` | admin, super admin | Running the workforce day to day |
| 5 | Monitoring & Troubleshooting | `monitoring/`, `troubleshooting/` | all, by article | Watching the system; fixing what went wrong |
| 6 | Advanced Operations & Reference | `payroll/`, `GLOSSARY.md`, `ROLE_PERMISSIONS.md` | admin, super admin | Consequential operations and lookup material |

---

## 3. Two axes, one article

Every article has **one home category** (where it lives) and **a set of applicable roles** (who sees it).
They are not the same thing. `payroll.month.lock` lives under `payroll/` and applies to `admin` and
`super_admin`; `emp.salary.card` lives under `employee/` and applies to `employee` only, yet both describe
payroll. Filing by category and filtering by role keeps one article from being written twice.

**Rule: never duplicate an article to serve a second role.** Add the role to its metadata.

---

## 4. Payroll as a cross-cutting subsection

Payroll is the most consequential and least intuitive area, so it gets its own directory rather than being
split across `employee/` and `administrator/`. It must be cross-linked from:

- `employee/` — the salary card and payslips (what an employee sees)
- `administrator/` — setting salaries, month end (what an admin does)
- `troubleshooting/` — locked months, missing salary, missing shift
- `monitoring/` — payroll flags on the month view
- `GLOSSARY.md` — working day, per-day rate, LOP, late mark, per-minute deduction

---

## 5. Article structure — the nine required sections

Every article contains these, in this order. A section with nothing to say is omitted, not padded.

1. **What this feature does** — one short paragraph, plain language.
2. **Who can use it** — roles, drawn from the metadata, not asserted by hand.
3. **Prerequisites** — what must already be true (a salary set, a shift assigned, the month open).
4. **Step-by-step instructions** — numbered, each step naming the screen and the control by its real label.
5. **Expected outcome** — what the user should see when it worked.
6. **Common mistakes** — the errors people actually make, not hypothetical ones.
7. **Troubleshooting** — symptom → cause → fix, using the real server error codes where one exists.
8. **Related articles** — from metadata.
9. **Interactive tutorial link** — when `tutorial.enabled` is true.

### Writing rules

- **Use the labels the UI uses.** "Payroll Settings", not "payroll configuration". Labels are recorded in
  `NAVIGATION_MAP.md`; if a label changes, the article changes.
- **Name the screen before the action.** "On **Payroll**, choose the month, then select **Lock**."
- **State consequences before the step, not after.** Reopening a month, changing the late-penalty option and
  editing the geofence radius all have effects that a user cannot easily undo.
- **No screenshots in version 1.** The UI is still changing; stale screenshots are worse than none. Revisit
  after production rollout.
- **Never document a feature that is not live** without the availability banner (§7).
- **Write for the person doing the task**, not for the engineer who built it. The existing docs
  (`PAYROLL_PLAN.md`, `OFFICE_GEOFENCING.md`, `NOTIFICATIONS.md`) are design records and are **source
  material**, not a style model.

---

## 6. The Manager Guide is blocked

The brief specifies a Manager Guide. Phase 0 established that **the manager role does not function**: the web
frontend treats `manager` as an administrator (`AuthContext.tsx:116`) while the backend grants it nothing
(`isAdminRole`, `index.ts:1746`). A manager would see every admin screen and receive 403 on every action.
No account currently holds the role.

**Decision taken for Phase 1:** `manager/` and `tutorials/manager/` are created and left empty, each holding
only a `README.md` stating the blocker. No manager content is authored, and no article lists `manager` in its
roles, because any such instruction would be false.

**To unblock**, the product decision is one of:
- **(a)** give `manager` a real scoped permission set in the backend (for example: approve leave and view
  attendance for direct reports only), then author the guide against it; or
- **(b)** remove `manager` from `adminRoles` so managers simply use the employee portal, and delete the
  category.

Until then, leave approval and attendance correction are documented under **Administrator**.

---

## 7. Feature availability is part of the content

Four of the eight headline features — geofencing, payroll, payslips, notifications — are **not in
production** (`FEATURE_MATRIX.md`). Every article declares `feature_status` from
`metadata/feature-status.json`.

| `feature_status` | Behaviour |
| :--- | :--- |
| `live` | Published normally |
| `branch_only` | **Withheld from production users.** Written and reviewed, but not surfaced until the feature ships |
| `built_disabled` | Written only when the feature is switched on |
| `planned` | Not written |

**Rule: the Academy never describes a screen the reader cannot open.** An Academy that teaches software a user
does not have destroys confidence in every other article. Availability is read from the metadata at render
time so the gate cannot be forgotten.

---

## 8. Tutorials

Interactive walkthroughs are a separate artefact from articles, linked by `tutorial.tutorial_id`. An article
must stand alone without its tutorial; a tutorial never carries information the article lacks. Tutorials are
specified in Phase 2 — Phase 1 only reserves their ids in `CONTENT_INVENTORY.md`.

---

## 9. Versioning and freshness

- `last_updated` and `doc_version` on every article (`ARTICLE_METADATA_SPEC.md`).
- `doc_version` is the Academy content version, independent of application releases.
- **An article is stale when the screen it describes changes.** `NAVIGATION_MAP.md` is the reference for
  labels and tab ids; a change there triggers a review of every article referencing that screen.
- When the `production` branch is deployed, every `branch_only` article is re-checked against the live build
  before being published.

---

## 10. Source material

| Need | Source |
| :--- | :--- |
| Payroll rules, worked examples, decision log | `docs/PAYROLL_PLAN.md` |
| Geofence policy and error codes | `docs/OFFICE_GEOFENCING.md` |
| Notification catalogue | `docs/NOTIFICATIONS.md` |
| Real error codes and their behaviour | `docs/SKYTRACK_QA_REPORT.md` |
| Screens, labels, tab ids, modals | `NAVIGATION_MAP.md` |
| Product framing | `docs/SKYTRACK_PRODUCT_OVERVIEW.md` |

There is **no existing end-user documentation** in either repository. Everything in the Academy is new writing.
