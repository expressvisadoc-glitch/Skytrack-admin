import type { TutorialDefinition, TutorialProgress, TutorialStep } from './types'
import { freshDemoState, type DemoState } from '../data/demo-data'

/**
 * The tutorial state machine. Pure logic, no React and no DOM, so it can be driven from a test.
 *
 * It owns three things: where the learner is, what the mock data looks like, and whether the
 * expected interaction has actually happened. A step only advances once it validates — pressing
 * "Next" is not enough for an action step.
 */
export class TutorialEngine {
  readonly definition: TutorialDefinition
  private progress: TutorialProgress
  private state: DemoState
  private screen: string
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

  /** True when this element is the one the learner must interact with now. */
  isTarget(target: string): boolean {
    const step = this.getStep()
    return this.progress.status === 'running' && step?.target === target
  }

  /**
   * Everything that is not the current target is inert. This is what stops a learner wandering off
   * and getting lost in a mock that cannot answer them.
   */
  isInteractive(target: string): boolean {
    return this.isTarget(target)
  }

  // --- controls --------------------------------------------------------------------------------
  start() {
    this.progress = { stepIndex: 0, total: this.definition.steps.length, done: [], status: 'running', choices: {} }
    this.state = freshDemoState()
    this.screen = this.definition.initialScreen
    this.syncScreen()
    this.emit()
  }

  /** Restart from the beginning with the demo data restored. */
  restart() { this.start() }

  exit() {
    this.progress = { ...this.progress, status: 'exited' }
    this.emit()
  }

  previous() {
    if (this.progress.stepIndex === 0) return
    const stepIndex = this.progress.stepIndex - 1
    const removed = this.definition.steps[stepIndex]?.id
    this.progress = {
      ...this.progress,
      stepIndex,
      status: 'running',
      done: this.progress.done.filter((id) => id !== removed),
    }
    this.syncScreen()
    this.emit()
  }

  /** Skip is offered only where the definition allows it. */
  skip() {
    const step = this.getStep()
    if (!step?.skippable) return
    this.advance(step)
  }

  /** 'explain' and 'inspect' steps are satisfied by reading, so Next completes them. */
  next() {
    const step = this.getStep()
    if (!step) return
    if (step.action === 'explain' || step.action === 'inspect' || step.action === 'complete') {
      this.advance(step)
    }
  }

  // --- validation ------------------------------------------------------------------------------
  /**
   * Called by the mock UI when the learner interacts with something. The step advances only if the
   * interaction matches what it asked for — the right element, and the right kind of action.
   */
  attempt(target: string, action: TutorialStep['action'], value?: string): boolean {
    const step = this.getStep()
    if (!step || this.progress.status !== 'running') return false
    if (step.target !== target) return false
    if (step.action !== action) return false

    if (step.action === 'input' && !value?.trim()) return false

    if (step.action === 'conditional' && value) {
      this.progress = { ...this.progress, choices: { ...this.progress.choices, [step.id]: value } }
    }

    this.applyEffect(step, value)
    this.advance(step, value)
    return true
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
    // IS the ending. Requiring another Next there would show the learner two "you are done" screens.
    const ranOff = stepIndex >= this.definition.steps.length
    const landedOnEnding = !ranOff && this.definition.steps[stepIndex]?.action === 'complete'
    const finished = ranOff || landedOnEnding
    this.progress = {
      ...this.progress,
      stepIndex: ranOff ? this.definition.steps.length - 1 : stepIndex,
      done,
      status: finished ? 'complete' : 'running',
    }
    this.syncScreen()
    this.emit()
  }

  /** Steps may declare a screen; the mock follows the walkthrough rather than the learner. */
  private syncScreen() {
    const step = this.getStep()
    if (step?.screen) this.screen = step.screen
  }

  // --- mock mutations --------------------------------------------------------------------------
  /**
   * Applies a step's effect to the in-memory demo data. These are the only writes in the whole
   * simulator, and they never leave the browser.
   */
  private applyEffect(step: TutorialStep, value?: string) {
    const effect = step.effect
    if (!effect) return

    if (effect.type === 'leave.decide') {
      const leaveId = String(effect.payload?.leaveId ?? '')
      const decision = String(effect.payload?.decision ?? value ?? '')
      const comment = typeof effect.payload?.comment === 'string' ? effect.payload.comment : null
      this.state = {
        ...this.state,
        leaves: this.state.leaves.map((l) => {
          if (l.id !== leaveId) return l
          if (decision === 'approve') {
            // The real rule: paid days are capped at the balance, the rest become loss of pay.
            const paid = Math.min(l.days, l.balanceAtRequest)
            return { ...l, status: 'approved' as const, paidDays: paid,
                     lopDays: Math.round((l.days - paid) * 100) / 100,
                     managerComment: comment ?? l.managerComment }
          }
          return { ...l, status: 'rejected' as const, paidDays: 0, lopDays: 0,
                   managerComment: comment ?? l.managerComment }
        }),
      }
    }

    if (effect.type === 'leave.comment') {
      const leaveId = String(effect.payload?.leaveId ?? '')
      this.state = {
        ...this.state,
        leaves: this.state.leaves.map((l) => (l.id === leaveId ? { ...l, managerComment: value ?? '' } : l)),
      }
    }
  }
}
