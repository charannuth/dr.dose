import { useCallback, useEffect, useState } from 'react';
import { fetchDayDetail, type DayDetail } from '../lib/dayDetail';

export function useDayDetail(userId: string | undefined, date: string | null) {
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId || !date) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchDayDetail(userId, date)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load day');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, date, reloadKey]);

  return { detail, loading, error, reload };
}
