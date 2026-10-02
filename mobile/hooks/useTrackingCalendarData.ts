import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarViewRange } from '../lib/tracking/calendarRange'
import { getCalendarWindow } from '../lib/tracking/calendarRange'
import {
  CALENDAR_SOURCE_ALL,
  calendarSupportFor,
  type CalendarSourceId,
} from '../lib/tracking/calendarSources'
import { loadAllTrackersCalendarData } from '../lib/tracking/allTrackersCalendarData'
import { loadCycleCalendarData } from '../lib/tracking/cycleCalendarData'
import { loadWeightCalendarData } from '../lib/tracking/weightCalendarData'
import { loadHrtCalendarData } from '../lib/tracking/hrtCalendarData'
import { loadMedProgressCalendarData } from '../lib/tracking/medProgressCalendarData'
import type { TrackingCalendarData } from '../lib/tracking/calendarTypes'
import type { TrackerId } from '../lib/tracking/catalog'

const EMPTY: TrackingCalendarData = {
  cells: new Map(),
  legend: [],
  emptyMessage: 'No data for this tracker on the calendar yet.',
}

export function useTrackingCalendarData(
  userId: string | undefined,
  source: CalendarSourceId | null,
  enabledTrackers: TrackerId[],
  range: CalendarViewRange,
  anchor: string,
  refreshKey = 0,
) {
  const [data, setData] = useState<TrackingCalendarData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId = useRef(0)
  const reload = useCallback(async () => {
    const request = ++requestId.current
    setLoading(false)
    setError(null)
    if (!userId || !source) {
      setData(EMPTY)
      return
    }

    const support = calendarSupportFor(source)
    if (support === 'planned') {
      setData({
        cells: new Map(),
        legend: [],
        emptyMessage:
          'Calendar view for this tracker is coming soon. Logs will appear here once it is enabled.',
      })
      return
    }
    if (support !== 'full') {
      setData(EMPTY)
      return
    }

    const window = getCalendarWindow(anchor, range)
    setLoading(true)
    setError(null)
    try {
      let next: TrackingCalendarData = EMPTY
      if (source === CALENDAR_SOURCE_ALL) {
        const allData = await loadAllTrackersCalendarData(
          userId,
          enabledTrackers,
          window.start,
          window.end,
        )
        next = allData
      } else if (source === 'cycle') {
        next = await loadCycleCalendarData(userId, window.start, window.end)
      } else if (source === 'weight') {
        next = await loadWeightCalendarData(userId, window.start, window.end)
      } else if (source === 'hrt') {
        next = await loadHrtCalendarData(userId, window.start, window.end)
      } else if (source === 'med_progress') {
        next = await loadMedProgressCalendarData(userId, window.start, window.end)
      }
      if (request === requestId.current) setData(next)
    } catch (err) {
      if (request !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Could not load calendar')
      setData(EMPTY)
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [userId, source, enabledTrackers, range, anchor])

  useEffect(() => {
    void reload()
    return () => { requestId.current += 1 }
  }, [reload, refreshKey])

  return { data, loading, error, reload }
}
