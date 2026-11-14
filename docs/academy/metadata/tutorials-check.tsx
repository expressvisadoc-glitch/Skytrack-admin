/**
 * Every tutorial, every branch, walked end to end — with the mock rendered at each step.
 *
 * Build and run (from skytrack-admin/):
 *   cp docs/academy/metadata/tutorials-check.tsx src/__tutorials_check.tsx
 *   npx vite build --ssr src/__tutorials_check.tsx --outDir node_modules/.academy-check --emptyOutDir
 *   node node_modules/.academy-check/__tutorials_check.js; rm src/__tutorials_check.tsx
 *
 * For each step it checks that the highlighted target is actually on the rendered screen and live,
 * that it is the only live control, and that the step's action is accepted. Selects with an expected
 * answer must refuse a wrong one. Back must unwind every effect. Articles and tutorials must agree.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { TutorialEngine } from './components/academy/simulator/engine/TutorialEngine'
import { MockApp } from './components/academy/simulator/components/MockApp'
import { TUTORIALS, tutorialById } from './components/academy/simulator/scenarios'
import type { TutorialDefinition } from './components/academy/simulator/engine/types'
import { ARTICLES, ARTICLES_BY_ID } from './lib/academy'

let pass = 0, fail = 0
const record = (name: string, ok: boolean, info = '') => {
  ok ? pass++ : fail++
  if (!ok) console.log(`FAIL  ${name}${info ? `\n        ${info}` : ''}`)
}

/** The opening tag of the element carrying a target attribute, or null if it is not rendered. */
function tagFor(html: string, target: string): { tag: string; at: number } | null {
  const at = html.indexOf(`data-tutorial-target="${target}"`)
  if (at < 0) return null
  const start = html.lastIndexOf('<', at)
  return { tag: html.slice(start, html.indexOf('>', at) + 1), at }
}
const liveTargets = (html: string) =>
  [...html.matchAll(/<[^>]*data-tutorial-target="([^"]+)"[^>]*>/g)].filter((m) => /\bz-30\b/.test(m[0])).map((m) => m[1])

/** Walks one run. `route` picks the branch at each conditional step (default: the first). */
function walk(def: TutorialDefinition, route: Record<string, string>, label: string, limit = Infinity) {
  const quiet = limit !== Infinity
  const check = (name: string, ok: boolean, info = '') => { if (!quiet || !ok) record(name, ok, info) }
  const e = new TutorialEngine(def)
  e.start()
  const visited: string[] = []
  for (let guard = 0; guard < 60 && visited.length < limit; guard++) {
    const step = e.getStep()
    const p = e.getProgress()
    if (p.status === 'complete') break
    if (!step) { check(`${label}: has a current step`, false); break }
    visited.push(step.id)
    const where = `${label} › ${step.id}`

    let html = ''
    try { html = renderToStaticMarkup(<MockApp engine={e} />) } catch (err) {
      check(`${where}: mock renders`, false, String(err)); break
    }
    if (step.target) {
      const found = tagFor(html, step.target)
      check(`${where}: target "${step.target}" is on screen "${e.getScreen()}"`, Boolean(found))
      if (!found) break
      check(`${where}: target is live`, /\bz-30\b/.test(found.tag), found.tag.slice(0, 160))
      if (step.action !== 'explain' && step.action !== 'complete') {
        const live = liveTargets(html)
        check(`${where}: it is the only live control`, live.length === 1 && live[0] === step.target, JSON.stringify(live))
        if (/^<button/.test(found.tag)) check(`${where}: button is enabled`, !/\sdisabled=""/.test(found.tag), found.tag.slice(0, 160))
      }
    }

    let ok = true
    switch (step.action) {
      case 'explain': case 'inspect': case 'complete':
        e.next(); break
      case 'click': case 'confirm':
        ok = e.attempt(step.target!, step.action); break
      case 'input':
        check(`${where}: input step offers an example`, Boolean(step.sampleInput))
        check(`${where}: empty input is refused`, !e.attempt(step.target!, 'input', '   '))
        ok = e.attempt(step.target!, 'input', step.sampleInput); break
      case 'select': {
        const after = html.slice(tagFor(html, step.target!)!.at)
        const values = [...after.matchAll(/data-value="([^"]+)"/g)].map((m) => m[1])
        if (step.expectedValue) {
          check(`${where}: expected answer is one of the options`, values.includes(step.expectedValue), JSON.stringify(values.slice(0, 4)))
          const wrong = values.find((v) => v !== step.expectedValue)
          if (wrong) {
            check(`${where}: a wrong answer is refused`, !e.attempt(step.target!, 'select', wrong))
            check(`${where}: the refusal is explained on screen`,
              renderToStaticMarkup(<MockApp engine={e} />).includes('Not quite'))
          }
        }
        ok = e.attempt(step.target!, 'select', step.expectedValue ?? values[0]); break
      }
      case 'conditional': {
        const choice = route[step.id] ?? Object.keys(step.branches ?? {})[0]
        ok = e.attempt(step.target!, 'conditional', choice); break
      }
    }
    check(`${where}: ${step.action} accepted`, ok)
    if (!ok) break
  }
  if (quiet) return { e, visited }
  check(`${label}: reaches the end`, e.getProgress().status === 'complete', `stopped at ${e.getStep()?.id}`)

  // Back must unwind everything. The completion screen offers Restart rather than Back, so replay
  // up to the last step before it, then step all the way back: the demo data must be as it started.
  const replay = walk(def, route, label, visited.length - 1).e
  const startState = (() => { const f = new TutorialEngine(def); f.start(); return JSON.stringify(f.getState()) })()
  const before = replay.getStep()?.id
  check(`${label}: Back is offered before the end`, replay.canGoBack())
  let backs = 0
  while (replay.canGoBack() && backs < 80) { replay.previous(); backs++ }
  check(`${label}: Back returns to the first step`, replay.getProgress().stepIndex === 0, `from ${before}, now ${replay.getStep()?.id}`)
  check(`${label}: Back unwinds every effect`, JSON.stringify(replay.getState()) === startState)
  return { e, visited }
}
const check = record

for (const def of TUTORIALS) {
  console.log(`--- ${def.id}`)
  const ids = def.steps.map((s) => s.id)
  check(`${def.id}: step ids are unique`, new Set(ids).size === ids.length)
  for (const s of def.steps) {
    for (const to of [s.next, ...Object.values(s.branches ?? {})].filter(Boolean) as string[]) {
      check(`${def.id} › ${s.id}: jump to "${to}" exists`, ids.includes(to))
    }
    if (s.action === 'select' || s.action === 'conditional' || s.action === 'click' || s.action === 'confirm' || s.action === 'input' || s.action === 'inspect') {
      check(`${def.id} › ${s.id}: has a target`, Boolean(s.target))
    }
  }
  check(`${def.id}: ends with a complete step`, def.steps.some((s) => s.action === 'complete'))

  // Article link, both ways.
  const article = ARTICLES_BY_ID.get(def.articleId)
  check(`${def.id}: its article "${def.articleId}" exists`, Boolean(article))
  check(`${def.id}: its article declares it`, article?.tutorialId === def.id, `article declares ${article?.tutorialId}`)
  check(`${def.id}: audience matches the article`, Boolean(article && article.roles.includes(def.role)), `${def.role} vs ${article?.roles}`)

  // One run per branch of every conditional, so no path goes untested.
  const routes: Record<string, string>[] = [{}]
  for (const s of def.steps) for (const b of Object.keys(s.branches ?? {})) routes.push({ [s.id]: b })
  const seen = new Set<string>()
  for (const route of routes) {
    const label = Object.keys(route).length ? `${def.id} [${Object.entries(route).map(([k, v]) => `${k}=${v}`)}]` : def.id
    walk(def, route, label).visited.forEach((id) => seen.add(id))
  }
  const unreached = ids.filter((id) => !seen.has(id) && def.steps.find((s) => s.id === id)?.action !== 'complete')
  check(`${def.id}: every step is reachable`, unreached.length === 0, JSON.stringify(unreached))
}

console.log('--- articles')
for (const a of ARTICLES.filter((x) => x.tutorialId)) {
  check(`${a.id}: declared tutorial "${a.tutorialId}" is built`, Boolean(tutorialById(a.tutorialId)))
}

console.log(`\n${pass} passed, ${fail} failed across ${TUTORIALS.length} tutorials`)
if (fail) process.exit(1)
