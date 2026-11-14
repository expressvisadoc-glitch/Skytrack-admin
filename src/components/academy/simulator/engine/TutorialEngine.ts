import type { TutorialDefinition, TutorialProgress, TutorialStep } from './types'
import { freshDemoState, type DemoState } from '../data/demo-data'
import { EFFECTS } from './effects'

interface Snapshot {
  progress: TutorialProgress
  state: DemoState
  inputs: Record<string, string>
  screen: string
}

/**
 * The tutorial state machine. Pure logic, no React and no DOM, so it can be driven from a test.
 *
 * It owns where the learner is, what the mock data looks like, what they have typed, and whether the
 * expected interaction has happened. A step only advances once it validates — pressing "Next" is not
 * enough for an action step.
 *
 * Every advance records a snapshot, and Back restores it exactly. Stepping back one position in the
 * list was wrong in two ways: it left a step's effects in place (back from "the request was
 * approved" to "confirm the approval" showed no confirm button, because the request was already
 * approved), and it ignored branches (back from the first reject step landed on the last approve step).
 */
export class TutorialEngine {
  readonly definition: TutorialDefinition
  private progress: TutorialProgress
  private state: DemoState
  private screen: string
  private inputs: Record<string, string> = {}
  private history: Snapshot[] = []
  private rejected: { target: string; value?: string } | null = null
  private listeners = new Set<() => void>()

  constructor(definition: TutorialDefinition) {
    this.definition = definition
    this.state = freshDemoState()
    this.screen = definition.initialScreen
    this.progress = { stepIndex: 0, total: definition.steps.length, done: [], status: 'idle', choices: {} }
  }

  // --- subscription (React binds to this) ------------------------------------------------------
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private emit() { for (const fn of this.listeners) fn() }

  // --- reading ---------------------------------------------------------------------------------
  getProgress(): TutorialProgress { return this.progress }
  getState(): DemoState { return this.state }
  getScreen(): string { return this.screen }
  getStep(): TutorialStep | null { return this.definition.steps[this.progress.stepIndex] ?? null }
  /** What the learner typed or chose for a field earlier in this run */
  getInput(target: string): string | undefined { return this.inputs[target] }
  /** The last refused attempt, so a control can say why (e.g. the wrong option was chosen) */
  getRejected(): { target: string; value?: string } | null { return this.rejected }
  canGoBack(): boolean { return this.history.length > 0 && this.progress.status === 'running' }

  /** True when this element is the one the learner must interact with now. */
  isTarget(target: string): boolean {
    const step = this.getStep()
    return this.progress.status === 'running' && step?.target === target
  }

  /** Everything that is not the current target is inert, so a learner cannot wander off. */
  isInteractive(target: string): boolean {
    return this.isTarget(target)
  }

  // --- controls --------------------------------------------------------------------------------
  start() {
    let state = freshDemoState()
    for (const effect of this.definition.setup ?? []) {
      const fn = EFFECTS[effect.type]
      if (fn) state = fn(state, effect.payload ?? {}, { inputs: {} })
    }
    this.state = state
    this.inputs = {}
    this.history = []
    this.rejected = null
    this.screen = this.definition.initialScreen
    this.progress = { stepIndex: 0, total: this.definition.steps.length, done: [], status: 'running', choices: {} }
    this.syncScreen()
    this.emit()
  }

  /** Restart from the beginning with the demo data restored. */
  restart() { this.start() }

  exit() {
    this.progress = { ...this.progress, status: 'exited' }
    this.emit()
  }

  /** Restores exactly the state the previous step started from — data, typed values and branch. */
  previous() {
    const snap = this.history.pop()
    if (!snap) return
    this.progress = { ...snap.progress, status: 'running' }
    this.state = snap.state
    this.inputs = snap.inputs
    this.screen = snap.screen
    this.rejected = null
    this.emit()
  }

  /** Skip is offered only where the definition allows it. */
  skip() {
    const step = this.getStep()
    if (!step?.skippable || this.progress.status !== 'running') return
    this.commit(step, step.sampleInput ?? step.expectedValue, false)
  }

  /** 'explain', 'inspect' and 'complete' steps are satisfied by reading, so Next completes them. */
  next() {
    const step = this.getStep()
    if (!step || this.progress.status !== 'running') return
    if (step.action === 'explain' || step.action === 'inspect' || step.action === 'complete') {
      this.commit(step, undefined, true)
    }
  }

  // --- validation ------------------------------------------------------------------------------
  /**
   * Called by the mock UI when the learner interacts with something. The step advances only if the
   * interaction matches what it asked for: the right element, the right kind of action, and — for a
   * 'select' step with an expected value — the right option.
   */
  attempt(target: string, action: TutorialStep['action'], value?: string): boolean {
    const step = this.getStep()
    if (!step || this.progress.status !== 'running') return false
    if (step.target !== target || step.action !== action) return false

    if (step.action === 'input' && !value?.trim()) return this.refuse(target, value)
    if (step.action === 'select' && step.expectedValue !== undefined && value !== step.expectedValue) {
      return this.refuse(target, value)
    }
    this.commit(step, value, true)
    return true
  }

  private refuse(target: string, value?: string): false {
    this.rejected = { target, value }
    this.emit()
    return false
  }

  /** Records a snapshot, applies the step's effect, then moves on. */
  private commit(step: TutorialStep, value: string | undefined, withEffect: boolean) {
    this.history.push({
      progress: this.progress,
      state: this.state,
      inputs: { ...this.inputs },
      screen: this.screen,
    })
    this.rejected = null

    if ((step.action === 'input' || step.action === 'select') && step.target && value !== undefined) {
      this.inputs = { ...this.inputs, [step.target]: value }
    }
    if (step.action === 'conditional' && value) {
      this.progress = { ...this.progress, choices: { ...this.progress.choices, [step.id]: value } }
    }
    if (withEffect && step.effect) {
      const fn = EFFECTS[step.effect.type]
      if (fn) this.state = fn(this.state, step.effect.payload ?? {}, { value, inputs: this.inputs })
    }
    this.advance(step, value)
  }

  private advance(step: TutorialStep, value?: string) {
    const done = this.progress.done.includes(step.id) ? this.progress.done : [...this.progress.done, step.id]

    // A conditional step routes by the choice made; otherwise follow `next`, else fall through.
    let nextId: string | undefined
    if (step.action === 'conditional' && value && step.branches) nextId = step.branches[value]
    else nextId = step.next

    let stepIndex: number
    if (nextId) {
      const found = this.definition.steps.findIndex((s) => s.id === nextId)
      stepIndex = found >= 0 ? found : this.progress.stepIndex + 1
    } else {
      stepIndex = this.progress.stepIndex + 1
    }

    // Running off the end finishes the tutorial — and so does arriving at a 'complete' step, which
    // IS the ending. Requiring another Next there would show two "you are done" screens.
    const ranOff = stepIndex >= this.definition.steps.length
    const landedOnEnding = !ranOff && this.definition.steps[stepIndex]?.action === 'complete'
    this.progress = {
      ...this.progress,
      stepIndex: ranOff ? this.definition.steps.length - 1 : stepIndex,
      done,
      status: ranOff || landedOnEnding ? 'complete' : 'running',
    }
    this.syncScreen()
    this.emit()
  }

  /** Steps may declare a screen; the mock follows the walkthrough rather than the learner. */
  private syncScreen() {
    const step = this.getStep()
    if (step?.screen) this.screen = step.screen
  }
}
