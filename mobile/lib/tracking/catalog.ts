import type { TrackerCategory } from './genericTracker'
import { GENERIC_TRACKERS } from './trackerDefs'

export type TrackerId =
  | 'cycle'
  | 'hrt'
  | 'med_progress'
  | 'weight'
  | 'vitals'
  | 'pain'
  | 'migraine'
  | 'respiratory'
  | 'gut'
  | 'skin'
  | 'mood'
  | 'sleep'
  | 'pregnancy'
  | 'fertility'
  | 'feeding'
  | 'pelvic'
  | 'breastcheck'
  | 'affirming'
  | 'nourish'
  | 'movement'
  | 'custom'

export type TrackerAccent = 'red' | 'purple' | 'blue' | 'green' | 'amber'

export type TrackerCatalogEntry = {
  id: TrackerId
  label: string
  description: string
  available: boolean
  emoji: string
  accent: TrackerAccent
  category: TrackerCategory
}

const CORE_TRACKERS: TrackerCatalogEntry[] = [
  {
    id: 'cycle',
    label: 'Cycle & period',
    description:
      'Periods, symptoms, mood, pain, discharge, fertility signs and predictions, tuned to your goals',
    available: true,
    emoji: '🌸',
    accent: 'red',
    category: 'cycle',
  },
  {
    id: 'hrt',
    label: 'HRT & hormones',
    description:
      'Feminizing, masculinizing, non-binary or menopause HRT: doses, injection sites, body and mood changes, labs and milestones',
    available: true,
    emoji: '🦋',
    accent: 'purple',
    category: 'cycle',
  },
  {
    id: 'med_progress',
    label: 'Medication progress',
    description: 'Adherence, streaks, and refill status from Today',
    available: true,
    emoji: '💊',
    accent: 'green',
    category: 'everyday',
  },
  {
    id: 'weight',
    label: 'Weight over time',
    description:
      'Weight with optional calorie targets, blind weigh-ins and a no-pressure mode',
    available: true,
    emoji: '⚖️',
    accent: 'green',
    category: 'everyday',
  },
]

export const TRACKER_CATALOG: TrackerCatalogEntry[] = [
  ...CORE_TRACKERS,
  ...GENERIC_TRACKERS.map(
    (d): TrackerCatalogEntry => ({
      id: d.id as TrackerId,
      label: d.label,
      description: d.description,
      available: true,
      emoji: d.emoji,
      accent: d.accent,
      category: d.category,
    }),
  ),
]

const CATEGORY_ORDER: TrackerCategory[] = ['cycle', 'body', 'mind', 'family', 'everyday', 'custom']

/** Add-list groups in display order, empty groups dropped. */
export function trackersByCategory(
  entries: TrackerCatalogEntry[],
): { category: TrackerCategory; entries: TrackerCatalogEntry[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    entries: entries.filter((e) => e.category === category),
  })).filter((g) => g.entries.length > 0)
}

export function trackerCatalogEntry(id: TrackerId): TrackerCatalogEntry | undefined {
  return TRACKER_CATALOG.find((t) => t.id === id)
}
