import type { TutorialDefinition } from '../engine/types'
import { leaveApprovalTutorial } from './administrator/leave-approval'

/**
 * Every tutorial the engine can run. Adding a walkthrough means adding a definition here — never a
 * new screen component.
 */
export const TUTORIALS: TutorialDefinition[] = [leaveApprovalTutorial]

export const TUTORIALS_BY_ID = new Map(TUTORIALS.map((t) => [t.id, t]))

export function tutorialForArticle(articleId: string): TutorialDefinition | null {
  return TUTORIALS.find((t) => t.articleId === articleId) ?? null
}
