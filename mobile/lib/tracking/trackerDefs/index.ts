import type { TrackerDef } from '../genericTracker'
import { gutTracker, migraineTracker, painTracker, respiratoryTracker, skinTracker, vitalsTracker } from './body'
import { customTracker, movementTracker, nourishTracker } from './everyday'
import { feedingTracker, fertilityTracker, pregnancyTracker } from './family'
import { affirmingTracker, breastcheckTracker, pelvicTracker } from './identity'
import { moodTracker, sleepTracker } from './mind'

/** Every tracker that runs on the generic engine, in add-list order. */
export const GENERIC_TRACKERS: TrackerDef[] = [
  pelvicTracker,
  breastcheckTracker,
  affirmingTracker,
  painTracker,
  migraineTracker,
  respiratoryTracker,
  vitalsTracker,
  gutTracker,
  skinTracker,
  moodTracker,
  sleepTracker,
  pregnancyTracker,
  fertilityTracker,
  feedingTracker,
  nourishTracker,
  movementTracker,
  customTracker,
]

const BY_ID = new Map(GENERIC_TRACKERS.map((d) => [d.id, d]))

export function getTrackerDef(id: string): TrackerDef | undefined {
  return BY_ID.get(id)
}
