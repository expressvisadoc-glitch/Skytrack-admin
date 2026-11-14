/**
 * SkyTrack Academy — tutorial engine types.
 *
 * Tutorials are DATA, not components. A new walkthrough is a JSON-shaped object in scenarios/,
 * never a hand-written React screen. The engine reads the definition, drives a mock SkyTrack, and
 * validates that the expected interaction actually happened before advancing.
 *
 * Nothing here touches the real application, the real API or real records.
 */

/** The interactions a step can require. */
export type TutorialAction =
  | 'click'        // select a highlighted control
  | 'inspect'      // read a field or record, then continue
  | 'input'        // type sample text into a field
  | 'select'       // choose an option
  | 'confirm'      // confirm a consequential operation
  | 'conditional'  // the path forward depends on what was chosen
  | 'explain'      // informational only, nothing to do
  | 'complete'     // demonstrates the outcome

/** Where a tooltip should sit relative to its target. */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TutorialStep {
  id: string
  /** data-tutorial-target of the element in the mock app; omitted for 'explain' steps */
  target?: string
  action: TutorialAction
  /** The instruction shown in the tooltip */
  instruction: string
  /** Optional longer explanation under the instruction */
  detail?: string
  /** Which mock screen this step takes place on; the engine navigates there if needed */
  screen?: string
  placement?: TooltipPlacement
  /** 'input' steps: what the learner should type, and what to prefill if they skip */
  sampleInput?: string
  /** 'conditional' steps: which branch each choice leads to */
  branches?: Record<string, string>
  /** 'select' steps: the option that satisfies the step. Any other choice is refused. */
  expectedValue?: string
  /** Step id to continue from; defaults to the next step in order */
  next?: string
  /** Whether this step may be skipped */
  skippable?: boolean
  /** Mock-state changes applied once the step is satisfied */
  effect?: TutorialEffect
}

/** A change to the mock data, applied when a step completes. Never leaves the browser. */
export interface TutorialEffect {
  /** e.g. 'leave.decide' */
  type: string
  payload?: Record<string, unknown>
}

export interface TutorialDefinition {
  id: string
  title: string
  description: string
  /** The audience this walkthrough is written for */
  role: 'employee' | 'admin' | 'super_admin'
  /** The article this tutorial belongs to */
  articleId: string
  /** Which simulated SkyTrack to show: the admin portal or the employee phone app */
  mock: 'admin' | 'employee'
  initialScreen: string
  /** Effects applied to fresh demo data before the first step — e.g. "already checked in" */
  setup?: TutorialEffect[]
  steps: TutorialStep[]
  completion: {
    message: string
    /** Optional summary lines shown on the completion screen */
    points?: string[]
  }
}

export interface TutorialProgress {
  stepIndex: number
  total: number
  /** Ids of steps already satisfied */
  done: string[]
  status: 'idle' | 'running' | 'complete' | 'exited'
  /** Branch chosen on a conditional step, by step id */
  choices: Record<string, string>
}
