import type { TutorialEngine } from '../engine/TutorialEngine'
import { MockAdminApp } from './admin/MockAdminApp'
import { MockEmployeeApp } from './employee/MockEmployeeApp'

/**
 * Picks the simulated SkyTrack a tutorial runs in: the admin portal or the employee phone app.
 * Neither shares code with the real app, so no tutorial can reach a real action.
 */
export function MockApp({ engine }: { engine: TutorialEngine }) {
  return engine.definition.mock === 'employee' ? <MockEmployeeApp engine={engine} /> : <MockAdminApp engine={engine} />
}
