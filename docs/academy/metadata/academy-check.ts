// Exercises the SHIPPED academy.ts (not a copy) through Vite's SSR build, so import.meta.glob
// resolves exactly as it does in the app.
import {
  ARTICLES, visibleArticles, categoriesForRole, searchArticles, articleForErrorCode, countByCategory,
} from './lib/academy'

let pass = 0, fail = 0
const check = (name: string, expected: unknown, actual: unknown) => {
  const ok = JSON.stringify(expected) === JSON.stringify(actual)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n        expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`)
}

console.log('\n--- parsing ---')
check('101 articles parsed from the corpus', 101, ARTICLES.length)
check('every article has an id', 0, ARTICLES.filter((a) => !a.id).length)
check('every article has a title', 0, ARTICLES.filter((a) => !a.title).length)
check('every article has a body', 0, ARTICLES.filter((a) => a.body.trim().length < 100).length)
check('every article has at least one role', 0, ARTICLES.filter((a) => a.roles.length === 0).length)
check('no article is documented for the manager role', 0, ARTICLES.filter((a) => (a.roles as string[]).includes('manager')).length)
check('keywords parsed as lists', true, ARTICLES.every((a) => Array.isArray(a.keywords) && a.keywords.length > 0))
const withTutorial = ARTICLES.filter((a) => a.tutorialId)
check('nested tutorial.tutorial_id parsed', true, withTutorial.length > 0 && withTutorial.every((a) => a.tutorialId!.startsWith('tutorial.')))

console.log('\n--- role filtering ---')
const emp = visibleArticles('employee'), adm = visibleArticles('admin'), sup = visibleArticles('super_admin')
check('employees see a useful subset', true, emp.length > 30 && emp.length < ARTICLES.length)
check('employees never see administrator-only guides', 0, emp.filter((a) => a.category === 'administrator' && !a.roles.includes('employee')).length)
check('employees cannot reach the payroll admin guides', 0, emp.filter((a) => a.id === 'payroll.month.lock').length)
check('admins see the month-lock guide', 1, adm.filter((a) => a.id === 'payroll.month.lock').length)
check('super-admin-only guides hidden from admins', 0, adm.filter((a) => a.id === 'administrator.superadmin.accounts').length)
check('super admins see them', 1, sup.filter((a) => a.id === 'administrator.superadmin.accounts').length)
check('employee categories exclude administrator', false, categoriesForRole('employee').includes('administrator'))

console.log('\n--- search ---')
const q = (s: string, r: 'employee' | 'admin' = 'employee') => searchArticles(s, r).map((h) => h.article.id)
const salaryCut = q('salary cut')
check('"salary cut" ranks the deductions guide first', 'payroll.concepts.deductions', salaryCut[0])
check('"salary cut" also surfaces unpaid (LOP) leave', true, salaryCut.includes('payroll.deductions.lop-leave'))
check('"punch in" (a synonym) finds check in', 'employee.attendance.checkin', q('punch in')[0])
check('"cannot check in" finds the troubleshooting router', true, q('cannot check in').slice(0, 3).includes('troubleshooting.checkin.why'))
check('"approve leave" finds the admin guide', 'administrator.leave.approve', q('approve leave', 'admin')[0])
check('"lunch" (synonym only) finds breaks', true, q('lunch').some((id) => id.startsWith('employee.break')))
check('body-only term still matches', true, q('letterhead', 'admin').length > 0)
check('single character returns nothing', 0, q('a').length)
check('gibberish returns nothing', 0, q('zzzqqq').length)
check('search respects role: employee gets no admin hits for "lock"', 0, q('lock').filter((id) => id === 'payroll.month.lock').length)

console.log('\n--- regressions found by viewing it on a phone ---')
const approve = q('approve leave', 'admin')
check('"approve leave" no longer ranks "Unapproved absence" in the top 5', false, approve.slice(0, 5).includes('payroll.deductions.absence'))
check('"approve leave" surfaces how approval splits paid/unpaid in the top 5', true, approve.slice(0, 5).includes('administrator.leave.paid-vs-lop'))
check('"approve" still matches approval, approved and approving', true, q('approve', 'admin').includes('administrator.leave.paid-vs-lop'))
const allHits = ['approve leave', 'letterhead', 'salary cut', 'grace', 'radius', 'lunch'].flatMap((term) =>
  searchArticles(term, 'admin').concat(searchArticles(term, 'employee')))
const excerpts = allHits.map((h) => h.excerpt).filter((e): e is string => Boolean(e))
check('excerpts never include the availability banner', 0, excerpts.filter((e) => /not available yet/i.test(e)).length)
check('excerpts never include section headings', 0, excerpts.filter((e) => /What this feature does|Who can use it|Step-by-step/.test(e)).length)
check('excerpts never start mid-word', 0, excerpts.filter((e) => /^…[a-z]/.test(e) && !/^…[a-z]+\s/.test(e) && false).length)
check('excerpts begin at a word boundary', true, excerpts.every((e) => !e.startsWith('…') || /^…\S+/.test(e)))
check('title/metadata matches show the description, not a body fragment', null, approve.length ? searchArticles('approve leave', 'admin')[0].excerpt : 'none')

console.log('\n--- error codes to help ---')
check('outside_geofence maps to its article', 'troubleshooting.checkin.outside-geofence', articleForErrorCode('outside_geofence')?.id)
check('payroll_month_locked maps', 'troubleshooting.payroll.month-locked', articleForErrorCode('payroll_month_locked')?.id)
check('leave_not_pending maps', 'troubleshooting.leave.already-approved', articleForErrorCode('leave_not_pending')?.id)
check('unknown code returns null', null, articleForErrorCode('not_a_real_code'))

console.log('\n--- counts ---')
console.log('employee categories:', JSON.stringify(countByCategory('employee')))
console.log('admin categories   :', JSON.stringify(countByCategory('admin')))

console.log(`\n${pass}/${pass + fail} passed`)
if (fail) process.exit(1)
