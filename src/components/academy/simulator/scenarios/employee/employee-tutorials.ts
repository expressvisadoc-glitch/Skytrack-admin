import type { TutorialDefinition, TutorialStep } from '../../engine/types'

/**
 * Employee walkthroughs, all run in the simulated phone app as Ananya Kumar (DEMO-001).
 * The phone has no location, network or account behind it: every tap goes to the tutorial engine.
 */

const intro = (detail: string, screen = 'home'): TutorialStep => ({
  id: 'intro',
  action: 'explain',
  instruction: 'This is a simulated SkyTrack phone',
  detail: `Everything here is made up — a demo company and an invented employee, Ananya Kumar. Nothing you tap touches your real attendance. ${detail}`,
  screen,
  placement: 'center',
})

const done = (screen: string, detail: string): TutorialStep => ({
  id: 'done', action: 'complete', instruction: 'That is all there is to it', detail, screen, placement: 'center',
})

// --- First check-in -----------------------------------------------------------------------------
export const firstCheckinTutorial: TutorialDefinition = {
  id: 'tutorial.employee.first-checkin',
  title: 'Your first check-in and check-out',
  description: 'Check in at the office, see what the app tells you, and check out at the end of the day.',
  role: 'employee',
  articleId: 'employee.attendance.checkin',
  mock: 'employee',
  initialScreen: 'home',
  steps: [
    intro('It is 9:52 on a Friday and you have just walked into the office.'),
    { id: 'location', target: 'location_card', action: 'inspect', screen: 'home', placement: 'bottom',
      instruction: 'The app checks where you are', detail: 'You must be inside the office zone. If this card is red, move nearer the office or step outside for a clearer signal.' },
    { id: 'checkin', target: 'punch_button', action: 'click', screen: 'home', placement: 'bottom',
      instruction: 'Tap Check-In', detail: 'Your position is read and checked. It takes a moment.',
      effect: { type: 'punch.checkin', payload: { at: '09:52' } } },
    { id: 'status', target: 'punch_status', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'You are checked in', detail: 'The time is recorded by the server, not your phone. Your shift starts at 10:00, so this is on time.' },
    { id: 'checkout', target: 'checkout_button', action: 'click', screen: 'home', placement: 'bottom',
      instruction: 'At the end of the day, tap Check-Out', detail: 'Imagine it is now 18:41. You must still be inside the office zone.',
      effect: { type: 'punch.checkout', payload: { at: '18:41' } } },
    { id: 'summary', target: 'day_summary', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'Your day is complete', detail: 'Check-in, check-out, breaks and hours worked. Forget to check out and the day has no total.' },
    done('home', 'Check in when you arrive, check out when you leave — both from inside the office.'),
  ],
  completion: {
    message: 'Checked in and out in demo mode — your real attendance is untouched.',
    points: [
      'Check in from inside the office zone.',
      'Arriving after your shift start counts as late, by the minute.',
      'Always check out before you leave.',
      'No check-in and no approved leave means an absence.',
    ],
  },
}

// --- Breaks -------------------------------------------------------------------------------------
export const takeBreakTutorial: TutorialDefinition = {
  id: 'tutorial.employee.take-break',
  title: 'Start and end a break',
  description: 'Pause your working time for lunch, then resume — and see why you cannot check out mid-break.',
  role: 'employee',
  articleId: 'employee.break.start',
  mock: 'employee',
  initialScreen: 'home',
  // Breaks only exist after a check-in, so the walkthrough starts already working.
  setup: [{ type: 'punch.checkin', payload: { at: '09:52' } }],
  steps: [
    intro('You checked in at 09:52. It is now 13:05 and you are going for lunch.'),
    { id: 'working', target: 'punch_status', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'You are working', detail: 'Breaks can only start while you are checked in.' },
    { id: 'break', target: 'break_button', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Tap Break', effect: { type: 'punch.break', payload: { at: '13:05' } } },
    { id: 'timer', target: 'break_timer', action: 'inspect', screen: 'home', placement: 'bottom',
      instruction: 'Your break has started', detail: 'Break time is not counted as working time.' },
    { id: 'no_checkout', target: 'checkout_disabled', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'You cannot check out on a break', detail: 'End the break first. This stops a day ending with the clock still paused.' },
    { id: 'resume', target: 'resume_button', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Back from lunch — tap End break', detail: 'Imagine 32 minutes have passed.',
      effect: { type: 'punch.resume', payload: { minutes: 32 } } },
    { id: 'total', target: 'break_total', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'Your break is recorded', detail: 'Each break adds to the day’s total, shown in your monthly overview.' },
    done('home', 'Tap Break when you step away, End break when you are back.'),
  ],
  completion: {
    message: 'Break taken in demo mode — your real attendance is untouched.',
    points: [
      'Breaks start only while you are checked in.',
      'Break time is not working time.',
      'End your break before checking out.',
    ],
  },
}

// --- Applying for leave -------------------------------------------------------------------------
export const applyLeaveTutorial: TutorialDefinition = {
  id: 'tutorial.employee.apply-leave',
  title: 'Apply for leave',
  description: 'Request two days off, and see in advance how much of it would be paid.',
  role: 'employee',
  articleId: 'employee.leave.apply',
  mock: 'employee',
  initialScreen: 'home',
  steps: [
    intro('You need Friday and Saturday off for a family wedding.'),
    { id: 'open', target: 'nav_leave', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Open Leave' },
    { id: 'balances', target: 'leave_balances', action: 'inspect', screen: 'leave', placement: 'bottom',
      instruction: 'Check your balance first', detail: 'You have one casual day left. Days beyond your balance are unpaid.' },
    { id: 'new', target: 'apply_leave_button', action: 'click', screen: 'leave', placement: 'bottom',
      instruction: 'Tap Apply for leave' },
    { id: 'type', target: 'leave_type', action: 'select', screen: 'leave_new', placement: 'bottom', expectedValue: 'casual',
      instruction: 'Choose Casual leave', detail: 'Sick leave is for illness; loss of pay is for when you have no balance.' },
    { id: 'from', target: 'leave_from', action: 'input', screen: 'leave_new', placement: 'bottom', sampleInput: '2026-11-27',
      instruction: 'Choose the first day', detail: 'For a single day, use the same date for From and To.' },
    { id: 'to', target: 'leave_to', action: 'input', screen: 'leave_new', placement: 'bottom', sampleInput: '2026-11-28',
      instruction: 'Choose the last day' },
    { id: 'preview', target: 'leave_split_preview', action: 'inspect', screen: 'leave_new', placement: 'top',
      instruction: 'See how it would be paid', detail: 'Two days requested, one casual day left: one paid, one unpaid. Nothing is deducted unless it is approved.' },
    { id: 'reason', target: 'leave_reason', action: 'input', screen: 'leave_new', placement: 'top', sampleInput: 'Cousin’s wedding in Thrissur',
      instruction: 'Give a short reason', detail: 'Your manager sees it when deciding.' },
    { id: 'submit', target: 'submit_leave', action: 'confirm', screen: 'leave_new', placement: 'top',
      instruction: 'Submit the request', effect: { type: 'leave.apply' } },
    { id: 'pending', target: 'leave_pending_row', action: 'inspect', screen: 'leave', placement: 'top',
      instruction: 'Your request is pending', detail: 'You will be notified when it is approved or rejected. Your balance only changes on approval.' },
    done('leave', 'Apply early — and check your balance so the unpaid part is not a surprise.'),
  ],
  completion: {
    message: 'Leave requested in demo mode — no real request was sent.',
    points: [
      'Check your balance before you apply.',
      'Days beyond your balance become loss of pay.',
      'Sundays are not counted.',
      'Nothing changes until the request is approved.',
    ],
  },
}

// --- Monthly overview ---------------------------------------------------------------------------
export const readMonthlyTutorial: TutorialDefinition = {
  id: 'tutorial.employee.read-monthly',
  title: 'Read your monthly overview',
  description: 'Find a late day on the calendar and see exactly what was recorded.',
  role: 'employee',
  articleId: 'employee.monthly.overview',
  mock: 'employee',
  initialScreen: 'home',
  steps: [
    intro('You want to check how your November is going.'),
    { id: 'open', target: 'nav_monthly', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Open Monthly' },
    { id: 'summary', target: 'month_summary', action: 'inspect', screen: 'monthly', placement: 'bottom',
      instruction: 'Your month at a glance', detail: 'Days worked, late days and absences so far.' },
    { id: 'legend', target: 'calendar_legend', action: 'inspect', screen: 'monthly', placement: 'top',
      instruction: 'What the colours mean', detail: 'Green is a normal day, amber is late, grey is your week off.' },
    { id: 'day', target: 'calendar_day_12', action: 'click', screen: 'monthly', placement: 'top',
      instruction: 'Tap the 12th — the amber day', effect: { type: 'ui.set', payload: { key: 'selectedDay', value: 12 } } },
    { id: 'detail', target: 'day_detail', action: 'inspect', screen: 'monthly', placement: 'top',
      instruction: 'Exactly what was recorded', detail: 'Your punches, breaks and hours. 27 minutes late, and what that costs. If something here is wrong, tell your administrator — they can correct it until the month is locked.' },
    done('monthly', 'Check your month every week or so — mistakes are easy to fix before month end.'),
  ],
  completion: {
    message: 'Monthly overview explored in demo mode.',
    points: [
      'Amber days are late days.',
      'Tap any day to see its punches.',
      'Report mistakes before the month is locked.',
    ],
  },
}

// --- Salary card --------------------------------------------------------------------------------
export const salaryCardTutorial: TutorialDefinition = {
  id: 'tutorial.employee.salary-card',
  title: 'Reveal your salary card',
  description: 'See this month’s provisional pay and the deductions behind it.',
  role: 'employee',
  articleId: 'employee.salary.card',
  mock: 'employee',
  initialScreen: 'home',
  steps: [
    intro('Midway through November, you want to know where your pay stands.'),
    { id: 'hidden', target: 'salary_card_hidden', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'Your salary is hidden', detail: 'On purpose — so it is not on show when someone glances at your phone.' },
    { id: 'reveal', target: 'reveal_salary', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Tap the eye to reveal it', effect: { type: 'ui.set', payload: { key: 'salaryRevealed', value: true } } },
    { id: 'net', target: 'salary_net', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'This month so far', detail: 'Provisional: it changes as the month goes on, and is final only when the month is locked.' },
    { id: 'toggle', target: 'salary_breakdown_toggle', action: 'click', screen: 'home', placement: 'top',
      instruction: 'Open the breakdown', effect: { type: 'ui.set', payload: { key: 'breakdownOpen', value: true } } },
    { id: 'days', target: 'salary_days', action: 'inspect', screen: 'home', placement: 'top',
      instruction: 'Every deduction, with its date', detail: '27 late minutes on the 12th at ₹1.67 a minute: ₹45. If a date looks wrong, raise it now.' },
    done('home', 'Your payslip at month end will match this — unless something changes before then.'),
  ],
  completion: {
    message: 'Salary card explored in demo mode.',
    points: [
      'The figure is provisional until the month is locked.',
      'Every deduction is listed with its date.',
      'Late minutes are charged by the minute.',
    ],
  },
}
