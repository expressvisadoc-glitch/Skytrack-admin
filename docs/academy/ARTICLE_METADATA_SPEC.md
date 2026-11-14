# SkyTrack Academy — Article Metadata Specification

Every article is a Markdown file whose YAML front matter satisfies this contract.
Metadata is machine-read by the help drawer, the search index and the availability gate, so it is a
contract, not decoration. **Date:** 14 November 2026 · **Spec version:** 1.0

---

## 1. Fields

| Field | Type | Required | Rule |
| :--- | :--- | :---: | :--- |
| `id` | string | **yes** | Unique. Dot notation `<category>.<feature>.<action>`, lower case, hyphens inside a segment. Never reused or renamed once published — it is the deep-link key. |
| `title` | string | **yes** | Imperative and specific: "How to approve a leave request". Not "Leave approval". ≤ 70 characters. |
| `description` | string | **yes** | One sentence, ≤ 160 characters. Shown in search results and the drawer header. |
| `category` | enum | **yes** | `getting-started` \| `employee` \| `manager` \| `administrator` \| `monitoring` \| `troubleshooting` \| `payroll` |
| `subcategory` | string | no | Free text within a category, e.g. `attendance`, `leave`, `month-end`. |
| `feature` | enum | **yes** | A key from `metadata/feature-status.json`. |
| `roles` | string[] | **yes** | From `metadata/roles.json`. **`manager` is not permitted** while the role is non-functional. |
| `keywords` | string[] | **yes** | Terms a user would type. Minimum 3. |
| `synonyms` | string[] | no | Wrong-but-common words: "punch in" for check in, "salary slip" for payslip. |
| `related_articles` | string[] (ids) | no | Must resolve to real ids. Reciprocal where it makes sense. |
| `related_tutorials` | string[] (ids) | no | Must resolve to a tutorial id reserved in `CONTENT_INVENTORY.md`. |
| `feature_status` | enum | **yes** | `live` \| `branch_only` \| `built_disabled` \| `planned`. **Must match `feature-status.json`** — it is copied for render speed and validated in CI. |
| `screens` | string[] | no | Tab ids from `NAVIGATION_MAP.md` (`payroll`, `payroll-settings`, `home`). Drives contextual help: the drawer opens this article on that screen. |
| `error_codes` | string[] | no | Server error codes this article resolves. Lets a failed request open the right help. |
| `last_updated` | date | **yes** | ISO `YYYY-MM-DD`. |
| `doc_version` | string | **yes** | Semver of the Academy content, not the app. |
| `tutorial.enabled` | boolean | no | Default `false`. |
| `tutorial.tutorial_id` | string | if enabled | Reserved in `CONTENT_INVENTORY.md`. |

---

## 2. Example — a live article

```yaml
---
id: administrator.leave.approve
title: How to approve a leave request
description: Approve or reject a pending leave request and understand how it splits into paid and unpaid days.
category: administrator
subcategory: leave
feature: leave_management
roles:
  - admin
  - super_admin
keywords:
  - approve leave
  - accept leave
  - leave approval
  - reject leave
synonyms:
  - sanction leave
  - grant leave
related_articles:
  - employee.leave.apply
  - administrator.leave.balance-adjust
  - payroll.deductions.lop-leave
related_tutorials:
  - tutorial.administrator.leave-approval
feature_status: live
screens:
  - leave-management
error_codes:
  - leave_not_pending
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.leave-approval
---
```

## 3. Example — an article withheld from production

```yaml
---
id: payroll.month.lock
title: How to close and lock a payroll month
description: Review the month, lock it to issue payslips, and understand what locking prevents.
category: payroll
subcategory: month-end
feature: payroll
roles:
  - admin
  - super_admin
keywords:
  - lock payroll
  - close the month
  - month end
  - issue payslips
synonyms:
  - finalise salary
  - finish payroll
related_articles:
  - payroll.month.review
  - payroll.month.reopen
  - payroll.payslip.pdf
feature_status: branch_only     # withheld until the production branch ships
screens:
  - payroll
error_codes:
  - payroll_month_locked
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.month-end
---
```

---

## 4. Validation rules (enforce in CI before publishing)

1. `id` is unique across the corpus and matches `^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$`.
2. `category` matches the directory the file sits in.
3. `feature` exists in `feature-status.json`, and `feature_status` **equals** that file's value.
4. Every role in `roles` exists in `roles.json` and is `functional: true` — this is what keeps `manager`
   out until it is fixed.
5. Every id in `related_articles` and `related_tutorials` resolves.
6. Every tab id in `screens` exists in `NAVIGATION_MAP.md`.
7. Every code in `error_codes` appears in `intents.json → error_code_map`.
8. `tutorial.tutorial_id` is present whenever `tutorial.enabled` is true.
9. The body contains the required sections from `DOCUMENTATION_ARCHITECTURE.md` §5.
10. `last_updated` is not in the future.

Rules 3 and 4 are the ones that matter: they are the mechanical guarantee that the Academy never teaches a
feature that is not deployed, or a role that does not work.

---

## 5. File naming

`docs/academy/<category>/<last-id-segment>.md` — `administrator.leave.approve` → `administrator/approve.md`
when unambiguous within its subcategory, otherwise `administrator/leave-approve.md`. The `id` is canonical;
the filename is convenience.
