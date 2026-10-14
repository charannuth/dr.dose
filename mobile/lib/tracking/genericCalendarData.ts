import { todayLocalDate } from '../dates'
import type { TrackingCalendarCell, TrackingCalendarData } from './calendarTypes'
import { entryHasData, normalizeGenericPrefs, type Entry, type TrackerDef } from './genericTracker'
import { fetchTrackerDayEntries, fetchTrackerPrefs } from './trackerStore'

/** Calendar for any tracker on the generic engine: one tinted pill per logged day. */
export async function loadGenericCalendarData(
  userId: string,
  def: TrackerDef,
  start: string,
  end: string,
): Promise<TrackingCalendarData> {
  const today = todayLocalDate()
  const [{ prefs }, { entries }] = await Promise.all([
    fetchTrackerPrefs(userId, def.id, (raw) => normalizeGenericPrefs(def, raw)),
    fetchTrackerDayEntries<Entry>(userId, def.id, start, end, (raw) => raw),
  ])
  const swatch = `tracker-logged-${def.accent}`
  const name = def.id === 'custom' && typeof prefs.setup.name === 'string' && prefs.setup.name.trim()
    ? prefs.setup.name.trim()
    : def.label
  const cells = new Map<string, TrackingCalendarCell>()
  for (const e of entries) {
    if (!entryHasData(e.data)) continue
    const label = def.dayLabel?.(e.data, prefs) ?? def.emoji
    cells.set(e.log_date, {
      date: e.log_date,
      classNames: [...(e.log_date > today ? ['is-future'] : []), swatch],
      markers: ['dot'],
      events: [{ id: `${def.id}-${e.log_date}`, label: `${label} ${name}`.trim(), tone: `tracker-${def.accent}` }],
    })
  }
  return {
    cells,
    legend: [{ id: def.id, label: `${def.emoji} ${name} logged`, swatchClass: swatch }],
    emptyMessage: `No ${name.toLowerCase()} logs in this range yet.`,
  }
}
