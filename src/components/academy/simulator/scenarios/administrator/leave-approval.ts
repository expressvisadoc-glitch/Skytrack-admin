import type { TutorialDefinition } from '../../engine/types'

/**
 * Approving or rejecting a leave request — the reference walkthrough.
 *
 * Written for the ADMINISTRATOR, not the manager the brief named: in SkyTrack the manager role
 * grants nothing on the server, so a manager walkthrough would teach an action that returns 403.
 * See docs/academy/ROLE_PERMISSIONS.md §4.
 *
 * Both outcomes are simulated. The approve branch shows the paid/LOP split that catches people out:
 * Ananya has one casual day left and has asked for two, so approval must produce one paid day and
 * one unpaid day — and one day's pay is deducted.
 */
export const leaveApprovalTutorial: TutorialDefinition = {
  id: 'tutorial.administrator.leave-approval',
  title: 'Approve or reject a leave request',
  description:
    'Decide a pending request and see how approval splits it into paid and unpaid days. Nothing you do here affects real records.',
  role: 'admin',
  articleId: 'administrator.leave.approve',
  initialScreen: 'dashboard',

  steps: [
    {
      id: 'intro',
      action: 'explain',
      instruction: 'This is a simulated SkyTrack',
      detail:
        'Everything here is made up — a demo organisation with invented people. Nothing you select changes a real record. You are signed in as Priya Nair, an administrator.',
      screen: 'dashboard',
      placement: 'center',
    },
    {
      id: 'open_leave',
      target: 'nav_leave_management',
      action: 'click',
      instruction: 'Open Leave Management',
      detail: 'Requests waiting for a decision live here. The badge shows how many are pending.',
      screen: 'dashboard',
      placement: 'right',
    },
    {
      id: 'select_request',
      target: 'leave_row_l1',
      action: 'click',
      instruction: "Select Ananya Kumar's request",
      detail: 'She has asked for two days of casual leave on 19 and 20 November.',
      screen: 'leave_management',
      placement: 'bottom',
    },
    {
      id: 'review_balance',
      target: 'leave_detail_balance',
      action: 'inspect',
      instruction: 'Check her balance before you decide',
      detail:
        'She has 1 casual day left but has asked for 2. That difference decides how much of this leave is paid — so read it before approving, not after.',
      screen: 'leave_detail',
      placement: 'left',
    },
    {
      id: 'choose',
      target: 'leave_decision',
      action: 'conditional',
      instruction: 'Approve or reject the request',
      detail: 'Try either — you can restart afterwards and take the other path.',
      screen: 'leave_detail',
      placement: 'top',
      branches: { approve: 'approve_confirm', reject: 'reject_comment' },
    },

    // --- approve branch ---------------------------------------------------------------------
    {
      id: 'approve_confirm',
      target: 'confirm_approve',
      action: 'confirm',
      instruction: 'Confirm the approval',
      detail:
        'Approving is a financial action: it fixes how many days are paid, and payroll deducts the rest. It cannot be approved twice.',
      screen: 'leave_detail',
      placement: 'top',
      effect: { type: 'leave.decide', payload: { leaveId: 'l1', decision: 'approve', comment: 'Approved — enjoy the function.' } },
      next: 'approve_result',
    },
    {
      id: 'approve_result',
      target: 'leave_split_result',
      action: 'inspect',
      instruction: 'See how the request was split',
      detail:
        'One day was covered by her balance and is paid. The second day became loss of pay, so about one day of salary will be deducted. This split is fixed now — adjusting her balance later will not change it.',
      screen: 'leave_detail',
      placement: 'left',
      next: 'done',
    },

    // --- reject branch ----------------------------------------------------------------------
    {
      id: 'reject_comment',
      target: 'reject_comment_box',
      action: 'input',
      instruction: 'Write why you are rejecting it',
      detail:
        'Always leave a comment. A rejection with no reason only creates the conversation you were trying to avoid.',
      screen: 'leave_detail',
      placement: 'top',
      sampleInput: 'Two people are already on leave that week — could you move it to the following week?',
      effect: { type: 'leave.comment', payload: { leaveId: 'l1' } },
      next: 'reject_confirm',
    },
    {
      id: 'reject_confirm',
      target: 'confirm_reject',
      action: 'confirm',
      instruction: 'Confirm the rejection',
      detail: 'No balance is used and no deduction is made. She can apply again for different dates.',
      screen: 'leave_detail',
      placement: 'top',
      effect: { type: 'leave.decide', payload: { leaveId: 'l1', decision: 'reject' } },
      next: 'reject_result',
    },
    {
      id: 'reject_result',
      target: 'leave_split_result',
      action: 'inspect',
      instruction: 'See the outcome',
      detail:
        'The request is rejected and your comment is shown to Ananya. Note that rejecting does not create an absence — but if she stays away anyway, a working day with no check-in and no approved leave is recorded as an absence, which costs a day of pay.',
      screen: 'leave_detail',
      placement: 'left',
      next: 'done',
    },

    {
      id: 'done',
      action: 'complete',
      instruction: 'That is the whole decision',
      detail: 'Restart to take the other path and compare the outcomes.',
      screen: 'leave_detail',
      placement: 'center',
    },
  ],

  completion: {
    message: 'Leave decided in demo mode — no real record was touched.',
    points: [
      'Check the balance before approving: it fixes the paid and unpaid split.',
      'Approval is a financial action — unpaid days are deducted from that month.',
      'A request can only be decided once; approving twice is refused.',
      'Always leave a comment when rejecting.',
    ],
  },
}
