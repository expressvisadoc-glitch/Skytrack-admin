---
id: troubleshooting.signin.failed
title: You cannot sign in
description: Work through the reasons a sign-in is refused.
category: troubleshooting
feature: employee_admin
roles: [employee, admin, super_admin]
keywords: [cannot sign in, login failed, wrong password, locked out]
synonyms: [can't log in, access denied]
related_articles: [getting-started.signin, administrator.superadmin.password-reset, troubleshooting.session.expired]
feature_status: live
last_updated: 2026-11-14
doc_version: 1.0.0
---

# You cannot sign in

## Symptom

Sign-in is refused, or nothing happens when you submit.

## Work through these in order

| Check | What to do |
| :--- | :--- |
| **Employee ID** | Exactly as issued, for example `SKY007` — no spaces. Your email also works. |
| **Password case** | Passwords are case-sensitive. Use the eye icon to check what you typed. |
| **Internet** | Sign-in needs a connection. |
| **Account active** | A deactivated account cannot sign in. Ask an administrator. |
| **Password changed recently** | Changing a password signs you out everywhere. Use the new one. |

## If you have forgotten your password

Use **Forgot Password?**, or ask a **super administrator** to reset it. Nobody can read your existing
password — it can only be replaced.

## Expected outcome

You sign in and land on your attendance screen, or the dashboard if you are an administrator.

## Common mistakes

- **Typing the employee ID in lower case with a space.** `SKY007`, not `sky 007`.
- **Using an old password on the phone after changing it on the web.** The change applies everywhere.
- **Assuming a deactivated account is a fault.** It is deliberate for leavers.

## For administrators

If an employee cannot sign in: confirm their record is **active**, confirm the employee ID, then ask a super
administrator to reset the password. See
[Resetting an employee's password](administrator.superadmin.password-reset).

## Related articles

- [How to sign in with your employee ID](getting-started.signin)
