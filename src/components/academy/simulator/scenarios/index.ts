import type { TutorialDefinition } from '../engine/types'
import { leaveApprovalTutorial } from './administrator/leave-approval'

/**
 * Every tutorial the engine can run. Adding a walkthrough means adding a definition here — never a
 * new screen component.
 */
export const TUTORIALS: TutorialDefinition[] = [leaveApprovalTutorial]

export const TUTORIALS_BY_ID = new Map(TUTORIALS.map((t) => [t.id, t]))

/** The walkthrough an article declares in its metadata (`tutorial.tutorial_id`), if it has been built. */
export function tutorialById(tutorialId: string | null | undefined): TutorialDefinition | null {
  return tutorialId ? (TUTORIALS_BY_ID.get(tutorialId) ?? null) : null
}
