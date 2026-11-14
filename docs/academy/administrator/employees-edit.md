---
id: administrator.employees.edit
title: Editing an employee's details
description: Change a person's department, designation, shift, manager or contact details.
category: administrator
subcategory: people
feature: employee_admin
roles: [admin, super_admin]
keywords: [edit employee, change details, update employee]
synonyms: [modify employee, employee record]
related_articles: [administrator.employees.add, administrator.org.shifts, administrator.org.reporting-manager]
feature_status: live
screens: [employees]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# Editing an employee's details

## What this feature does

Changes an existing employee record.

## Who can use it

Administrators and super administrators. **A super administrator's record can only be edited by another
super administrator.**

## Step-by-step instructions

1. Open **Employees** and select the person.
2. Open the edit option.
3. Change what you need: name, designation, department, email, phone, status, photo.
4. Save.

## What you cannot change here

| Not editable here | Where instead |
| :--- | :--- |
| Role | A separate, deliberately restricted action |
| Password | Only a super administrator can reset one |
| Salary | **Employee Details → Salary** |
| Attendance | The **Attendance** screen |

## Expected outcome

The record updates immediately and the employee sees the change on their profile.

## Changing a work shift

A shift change applies to **future days only**. Past days keep the shift that applied when they happened, so
changing a shift never re-prices history.

## Common mistakes

- **Changing a shift to fix past late marks.** It will not. Correct the check-in time instead.
- **Setting someone inactive who has payroll history.** Inactive is correct for a leaver — but they cannot
  be deleted if they have payslips or attendance in a closed month. Deactivate rather than delete.

## Related articles

- [Deactivating someone who has left](administrator.employees.deactivate)
