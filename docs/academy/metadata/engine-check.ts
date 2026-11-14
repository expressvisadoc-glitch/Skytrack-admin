import { TutorialEngine } from './components/academy/simulator/engine/TutorialEngine'
import { leaveApprovalTutorial } from './components/academy/simulator/scenarios/administrator/leave-approval'
import { freshDemoState } from './components/academy/simulator/data/demo-data'

let pass = 0, fail = 0
const check = (name: string, expected: unknown, actual: unknown) => {
  const ok = JSON.stringify(expected) === JSON.stringify(actual)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`        expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`)
}

console.log('\n--- engine basics ---')
let e = new TutorialEngine(leaveApprovalTutorial)
check('starts idle', 'idle', e.getProgress().status)
e.start()
check('running after start', 'running', e.getProgress().status)
check('opens on the initial screen', 'dashboard', e.getScreen())
check('first step is the intro', 'intro', e.getStep()?.id)

console.log('\n--- validation: the learner cannot wander ---')
check('wrong element is refused', false, e.attempt('nav_payroll', 'click'))
check('still on the intro', 'intro', e.getStep()?.id)
e.next()
check('explain step advances on Next', 'open_leave', e.getStep()?.id)
check('wrong action on the right element is refused', false, e.attempt('nav_leave_management', 'input'))
check('only the current target is interactive', true, e.isInteractive('nav_leave_management'))
check('everything else is inert', false, e.isInteractive('nav_payroll'))
check('correct interaction advances', true, e.attempt('nav_leave_management', 'click'))
check('engine followed the walkthrough to the next screen', 'leave_management', e.getScreen())

console.log('\n--- approve branch ---')
e.attempt('leave_row_l1', 'click')
check('on the request detail', 'leave_detail', e.getScreen())
check('inspect step reached', 'review_balance', e.getStep()?.id)
e.next()
check('reached the decision', 'choose', e.getStep()?.id)
check('conditional routes on the choice', true, e.attempt('leave_decision', 'conditional', 'approve'))
check('took the approve branch', 'approve_confirm', e.getStep()?.id)
e.attempt('confirm_approve', 'confirm')
const approved = e.getState().leaves.find((l) => l.id === 'l1')!
check('request is approved', 'approved', approved.status)
check('1 day paid (balance was 1)', 1, approved.paidDays)
check('1 day loss of pay (2 requested)', 1, approved.lopDays)
e.next()
check('completes', 'complete', e.getProgress().status)

console.log('\n--- reject branch ---')
e = new TutorialEngine(leaveApprovalTutorial)
e.start(); e.next(); e.attempt('nav_leave_management', 'click')
e.attempt('leave_row_l1', 'click'); e.next()
check('conditional routes the other way', true, e.attempt('leave_decision', 'conditional', 'reject'))
check('took the reject branch', 'reject_comment', e.getStep()?.id)
check('empty input is refused', false, e.attempt('reject_comment_box', 'input', '   '))
check('typed input is accepted', true, e.attempt('reject_comment_box', 'input', 'Two people already on leave.'))
check('comment stored on the mock record', 'Two people already on leave.', e.getState().leaves.find((l) => l.id === 'l1')!.managerComment)
e.attempt('confirm_reject', 'confirm')
const rejected = e.getState().leaves.find((l) => l.id === 'l1')!
check('request is rejected', 'rejected', rejected.status)
check('no balance consumed on rejection', 0, rejected.paidDays)
check('no LOP created on rejection', 0, rejected.lopDays)
e.next()
check('completes via the reject path', 'complete', e.getProgress().status)

console.log('\n--- isolation and reset ---')
e.restart()
check('restart returns to the first step', 'intro', e.getStep()?.id)
check('restart restores the pending request', 'pending', e.getState().leaves.find((l) => l.id === 'l1')!.status)
const a = new TutorialEngine(leaveApprovalTutorial); a.start()
const b = new TutorialEngine(leaveApprovalTutorial); b.start()
a.next(); a.attempt('nav_leave_management', 'click'); a.attempt('leave_row_l1', 'click'); a.next()
a.attempt('leave_decision', 'conditional', 'approve'); a.attempt('confirm_approve', 'confirm')
check('learner A approved their copy', 'approved', a.getState().leaves.find((l) => l.id === 'l1')!.status)
check('learner B is unaffected', 'pending', b.getState().leaves.find((l) => l.id === 'l1')!.status)
check('the snapshot itself is untouched', 'pending', freshDemoState().leaves.find((l) => l.id === 'l1')!.status)

console.log('\n--- back, skip, exit ---')
e = new TutorialEngine(leaveApprovalTutorial); e.start(); e.next()
check('previous returns to the intro', 'intro', (e.previous(), e.getStep()?.id))
check('previous at step 0 is a no-op', 'intro', (e.previous(), e.getStep()?.id))
check('skip does nothing on a non-skippable step', 'intro', (e.skip(), e.getStep()?.id))
e.exit()
check('exit stops the run', 'exited', e.getProgress().status)
check('nothing is interactive after exit', false, e.isInteractive('nav_leave_management'))

console.log(`\n${pass}/${pass + fail} passed`)
if (fail) process.exit(1)
