---
id: administrator.employees.add
title: Adding an employee
description: Create a new employee record and the settings that must be right from day one.
category: administrator
subcategory: people
feature: employee_admin
roles: [admin, super_admin]
keywords: [add employee, new joiner, create employee, onboard]
synonyms: [register staff, new staff member]
related_articles: [administrator.employees.edit, administrator.org.shifts, administrator.employees.joining-date, payroll.salary.set]
related_tutorials: [tutorial.administrator.add-employee]
feature_status: live
screens: [employees]
last_updated: 2026-11-14
doc_version: 1.0.0
tutorial:
  enabled: true
  tutorial_id: tutorial.administrator.add-employee
---

# Adding an employee

## What this feature does

Creates an employee record and a sign-in account.

## Who can use it

Administrators and super administrators.

## Prerequisites

Have ready: full name, email, department, designation, work shift, reporting manager and joining date.

## Step-by-step instructions

1. Open **Employees**.
2. Choose to add an employee.
3. Enter their name and email.
4. Set **department** and **designation**.
5. Assign a **work shift** — this sets their expected start time.
6. Assign a **reporting manager**.
7. Set the **joining date**.
8. Save, and give them their employee ID and first password.

## Expected outcome

The employee appears in the directory as **active** and can sign in.

## Four things to get right immediately

| Setting | Why it matters |
| :--- | :--- |
| **Work shift** | Decides whether a check-in is late. No shift means no late marks at all. |
| **Joining date** | Without it the **whole month** is counted for pay, including days before they joined. |
| **Reporting manager** | Shown to the employee; leave is associated with them. |
| **Role** | Leave as *employee* unless they genuinely administer the system. |

## Common mistakes

- **Leaving the joining date blank for a mid-month joiner.** They will be counted — and charged absences —
  for days before they started.
- **Forgetting the work shift.** They can never be marked late, and payroll flags them.
- **Setting the role to administrator by habit.** That grants access to everybody's data and to payroll.
- **Forgetting to set a salary.** A new employee has none until one is added. See
  [Setting an employee's salary](payroll.salary.set).

## Troubleshooting

If the employee cannot sign in, check the record is **active** and confirm the employee ID.

## Interactive tutorial

**Adding a new joiner.**

## Related articles

- [Why the joining date matters](administrator.employees.joining-date)
