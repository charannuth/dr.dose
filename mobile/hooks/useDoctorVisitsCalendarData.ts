import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDoctorVisitsCalendarData } from '../lib/doctorVisitsCalendar';
import { getCalendarWindow, type CalendarViewRange } from '../lib/tracking/calendarRange';
import type { TrackingCalendarData } from '../lib/tracking/calendarTypes';

const EMPTY: TrackingCalendarData = {
  cells: new Map(),
  legend: [],
};

export function useDoctorVisitsCalendarData(
  userId: string | undefined,
  range: CalendarViewRange,
  anchor: string,
  refreshKey = 0,
) {
  const [data, setData] = useState<TrackingCalendarData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    if (!userId) {
      setData(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    const window = getCalendarWindow(anchor, range);
    setLoading(true);
    setError(null);
    try {
      const next = await loadDoctorVisitsCalendarData(userId, window.start, window.end);
      if (request === requestId.current) setData(next);
    } catch (err) {
      if (request !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load doctor visits calendar');
      setData(EMPTY);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [userId, range, anchor]);

  useEffect(() => {
    void reload();
    return () => { requestId.current += 1; };
  }, [reload, refreshKey]);

  return { data, loading, error, reload };
}
