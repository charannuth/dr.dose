import type { TrackerId } from './catalog'
import { trackerCatalogEntry } from './catalog'
import { getTrackerDef } from './trackerDefs'

export const CALENDAR_SOURCE_ALL = 'all' as const

export type CalendarSourceId = TrackerId | typeof CALENDAR_SOURCE_ALL

export type CalendarSupport = 'full' | 'planned' | 'none'

export type CalendarSourceMeta = {
  id: CalendarSourceId
  label: string
  support: CalendarSupport
}

const CALENDAR_SUPPORT: Partial<Record<TrackerId, CalendarSupport>> = {
  cycle: 'full',
  weight: 'full',
  med_progress: 'full',
  hrt: 'full',
}

export function calendarSupportFor(id: CalendarSourceId): CalendarSupport {
  if (id === CALENDAR_SOURCE_ALL) return 'full'
  // Every tracker on the generic engine shows its logged days.
  if (getTrackerDef(id)) return 'full'
  return CALENDAR_SUPPORT[id] ?? 'none'
}

export function calendarSourceOptions(
  enabledTrackerIds: TrackerId[],
): CalendarSourceMeta[] {
  const trackerOptions: CalendarSourceMeta[] = enabledTrackerIds
    .map((id) => {
      const entry = trackerCatalogEntry(id)
      return {
        id,
        label: entry?.label ?? id,
        support: calendarSupportFor(id),
      }
    })
    .filter((s) => s.support !== 'none')

  const fullCount = trackerOptions.filter((o) => o.support === 'full').length
  if (fullCount === 0) return trackerOptions

  return [
    {
      id: CALENDAR_SOURCE_ALL,
      label: 'All trackers (overview)',
      support: 'full',
    },
    ...trackerOptions,
  ]
}

export function defaultCalendarSource(
  enabledTrackerIds: TrackerId[],
  preferred?: CalendarSourceId | null,
): CalendarSourceId | null {
  const options = calendarSourceOptions(enabledTrackerIds)
  const full = options.filter((o) => o.support === 'full' && o.id !== CALENDAR_SOURCE_ALL)

  if (preferred === CALENDAR_SOURCE_ALL && options.some((o) => o.id === CALENDAR_SOURCE_ALL)) {
    return CALENDAR_SOURCE_ALL
  }
  if (preferred && full.some((o) => o.id === preferred)) return preferred
  return full[0]?.id ?? options[0]?.id ?? null
}
