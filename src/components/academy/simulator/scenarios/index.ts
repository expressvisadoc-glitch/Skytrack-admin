import type { TutorialDefinition } from '../engine/types'
import { leaveApprovalTutorial } from './administrator/leave-approval'
import {
  fixAttendanceTutorial, addEmployeeTutorial, geofenceTutorial, setSalaryTutorial, monthEndTutorial,
} from './administrator/admin-tutorials'
import {
  firstCheckinTutorial, takeBreakTutorial, applyLeaveTutorial, readMonthlyTutorial, salaryCardTutorial,
} from './employee/employee-tutorials'

/** Every tutorial the Academy can run. Tutorials are data — adding one is adding an entry here. */
export const TUTORIALS: TutorialDefinition[] = [
  // Employee
  firstCheckinTutorial, takeBreakTutorial, applyLeaveTutorial, readMonthlyTutorial, salaryCardTutorial,
  // Administrator
  leaveApprovalTutorial, fixAttendanceTutorial, addEmployeeTutorial, setSalaryTutorial, geofenceTutorial, monthEndTutorial,
]

export const TUTORIALS_BY_ID = new Map(TUTORIALS.map((t) => [t.id, t]))

/** The walkthrough an article declares in its metadata (`tutorial.tutorial_id`), if it has been built. */
export function tutorialById(tutorialId: string | null | undefined): TutorialDefinition | null {
  return tutorialId ? (TUTORIALS_BY_ID.get(tutorialId) ?? null) : null
}
