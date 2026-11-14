---
id: employee.monthly.hours
title: How your working hours are calculated
description: The formula behind your daily and monthly hours, with a worked example.
category: employee
subcategory: monthly
feature: attendance
roles: [employee]
keywords: [hours, total hours, net hours, working time, calculation]
synonyms: [how are hours counted, time calculation]
related_articles: [employee.monthly.overview, employee.break.limit, employee.attendance.checkout]
feature_status: live
screens: [monthly, home]
last_updated: 2026-11-14
doc_version: 1.0.0
---

# How your working hours are calculated

## What this feature does

Works out how long you worked, from the times recorded.

## Who can use it

Employees.

## The formula

```
total hours = (check-out − check-in) − total break time
```

Nothing is rounded up or down, and nothing is estimated.

### Worked example

| | |
| :--- | :--- |
| Checked in | 09:50 |
| Checked out | 17:50 |
| Time between | 8 hours |
| Break taken | 45 minutes |
| **Total hours** | **7 h 15 m** |

## Expected outcome

Your hours match the times you can see for that day.

## Common mistakes

- **Expecting hours to match your pay.** They do not drive it. SkyTrack pays by **days**, not hours — a
  short day is still a full day's pay. Only absence, unpaid leave and lateness reduce pay.
- **Forgetting breaks are excluded.** An eight-hour presence with an hour of breaks is seven hours.
- **Expecting a forgotten check-out to be accurate.** It is closed automatically, not at the time you left.

## Troubleshooting

If a day's hours look wrong, check its punches on **Monthly Overview** first. If a time is wrong, an
administrator can correct it.

## Related articles

- [Reading your monthly attendance](employee.monthly.overview)
- [What can reduce your pay](payroll.concepts.deductions)
