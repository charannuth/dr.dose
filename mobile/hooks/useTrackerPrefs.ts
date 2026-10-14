import { useCallback, useEffect, useState } from 'react';
import {
  fetchTrackerPrefs,
  saveTrackerPrefs,
  type JsonObject,
} from '../lib/tracking/trackerStore';

/**
 * Load and save one tracker's personalization. `available` is false until
 * migration 030 exists, in which case defaults are used and saves throw
 * TrackerStoreUnavailableError.
 */
export function useTrackerPrefs<T extends JsonObject>(
  userId: string | undefined,
  trackerId: string,
  normalize: (raw: JsonObject) => T,
) {
  const [prefs, setPrefs] = useState<T>(() => normalize({}));
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchTrackerPrefs(userId, trackerId, normalize)
      .then((res) => {
        if (!active) return;
        setPrefs(res.prefs);
        setAvailable(res.available);
      })
      .catch(() => {
        // Personalization is optional; the tracker still works on defaults.
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
    // normalize is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, trackerId]);

  const save = useCallback(
    async (next: T) => {
      if (!userId) return;
      setPrefs(next);
      await saveTrackerPrefs(userId, trackerId, next);
    },
    [userId, trackerId],
  );

  return { prefs, available, loaded, save, setAvailable };
}
