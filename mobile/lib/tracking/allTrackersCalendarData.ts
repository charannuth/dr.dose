import type { TrackerId } from './catalog'
import { calendarSupportFor } from './calendarSources'
import { loadCycleCalendarData } from './cycleCalendarData'
import { loadHrtCalendarData } from './hrtCalendarData'
import { loadMedProgressCalendarData } from './medProgressCalendarData'
import { loadWeightCalendarData } from './weightCalendarData'
import { mergeCalendarData } from './mergeCalendarData'
import { loadGenericCalendarData } from './genericCalendarData'
import { getTrackerDef } from './trackerDefs'
import type { TrackingCalendarData } from './calendarTypes'

async function loadTrackerCalendar(
  userId: string,
  trackerId: TrackerId,
  start: string,
  end: string,
): Promise<TrackingCalendarData | null> {
  if (calendarSupportFor(trackerId) !== 'full') return null
  switch (trackerId) {
    case 'cycle':
      return loadCycleCalendarData(userId, start, end)
    case 'weight':
      return loadWeightCalendarData(userId, start, end)
    case 'hrt':
      return loadHrtCalendarData(userId, start, end)
    case 'med_progress':
      return loadMedProgressCalendarData(userId, start, end)
    default: {
      const def = getTrackerDef(trackerId)
      return def ? loadGenericCalendarData(userId, def, start, end) : null
    }
  }
}

export async function loadAllTrackersCalendarData(
  userId: string,
  enabledTrackerIds: TrackerId[],
  start: string,
  end: string,
): Promise<TrackingCalendarData> {
  const loaders = enabledTrackerIds.map((id) =>
    loadTrackerCalendar(userId, id, start, end),
  )
  const results = await Promise.all(loaders)
  const datasets = results.filter((d): d is TrackingCalendarData => d != null)
  if (datasets.length === 0) {
    return {
      cells: new Map(),
      legend: [],
      emptyMessage: 'Enable a tracker to see your overview here.',
    }
  }
  return mergeCalendarData(datasets)
}
