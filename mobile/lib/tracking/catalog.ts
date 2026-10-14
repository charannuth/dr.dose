export type TrackerId =
  | 'cycle'
  | 'hrt'
  | 'med_progress'
  | 'vitals'
  | 'weight'
  | 'pain'
  | 'migraine'
  | 'respiratory'
  | 'mood'
  | 'sleep'
  | 'pregnancy'
  | 'custom'

export type TrackerAccent = 'red' | 'purple' | 'blue' | 'green' | 'amber'

export type TrackerCatalogEntry = {
  id: TrackerId
  label: string
  description: string
  available: boolean
  emoji: string
  accent: TrackerAccent
}

export const TRACKER_CATALOG: TrackerCatalogEntry[] = [
  {
    id: 'cycle',
    label: 'Cycle & period',
    description:
      'Periods, symptoms, mood, pain, discharge, fertility signs and predictions, tuned to your goals',
    available: true,
    emoji: '🌸',
    accent: 'red',
  },
  {
    id: 'hrt',
    label: 'HRT & hormones',
    description:
      'Feminizing, masculinizing, non-binary or menopause HRT: doses, injection sites, body and mood changes, labs and milestones',
    available: true,
    emoji: '🦋',
    accent: 'purple',
  },
  {
    id: 'med_progress',
    label: 'Medication progress',
    description: 'Adherence, streaks, and refill status from Today',
    available: true,
    emoji: '💊',
    accent: 'green',
  },
  {
    id: 'vitals',
    label: 'Vitals',
    description: 'Blood pressure, glucose, pulse, and more',
    available: false,
    emoji: '❤️',
    accent: 'red',
  },
  {
    id: 'weight',
    label: 'Weight over time',
    description:
      'Weight with optional calorie targets, blind weigh-ins and a no-pressure mode',
    available: true,
    emoji: '⚖️',
    accent: 'green',
  },
  {
    id: 'pain',
    label: 'Pain diary',
    description: 'Pain scale and flare logging',
    available: false,
    emoji: '🔥',
    accent: 'amber',
  },
  {
    id: 'migraine',
    label: 'Migraine',
    description: 'Headache attacks, triggers, and relief meds',
    available: false,
    emoji: '🤕',
    accent: 'purple',
  },
  {
    id: 'respiratory',
    label: 'Respiratory',
    description: 'Peak flow and rescue inhaler use',
    available: false,
    emoji: '🫁',
    accent: 'blue',
  },
  {
    id: 'mood',
    label: 'Mood & mental health',
    description: 'Daily mood, anxiety, energy and what helped',
    available: false,
    emoji: '🌈',
    accent: 'blue',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Bedtime, wake time, quality and naps',
    available: false,
    emoji: '😴',
    accent: 'purple',
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy',
    description: 'Week-by-week, symptoms, kicks and appointments',
    available: false,
    emoji: '🤰',
    accent: 'amber',
  },
  {
    id: 'custom',
    label: 'Custom metric',
    description: 'Name your own number or yes/no tracker',
    available: false,
    emoji: '✏️',
    accent: 'blue',
  },
]

export function trackerCatalogEntry(id: TrackerId): TrackerCatalogEntry | undefined {
  return TRACKER_CATALOG.find((t) => t.id === id)
}
