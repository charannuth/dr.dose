import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getReminders, syncTimezoneWithDevice } from '../lib/settings';
import { requestNotificationPermission } from '../lib/notifications';
import { rescheduleAllReminders } from '../lib/reminders';

/**
 * Arms local dose/visit/refill reminders once per app launch, and again when the
 * phone's timezone changes.
 *
 * Avoid re-scheduling on every return to foreground: cancel + recreate after a dose
 * time has passed makes iOS fire that slot immediately (“catch-up”), which feels
 * like a late reminder. iOS also freezes a daily alert to the timezone it was
 * created in, so a trip from Central back to Eastern leaves 10:00 PM firing at
 * 11:00 PM until we rebuild the alerts in the new zone.
 */
export function useReminderBootstrap(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const uid = userId;

    async function sync(onlyIfTimezoneChanged: boolean) {
      const { changed } = await syncTimezoneWithDevice();
      if (onlyIfTimezoneChanged && !changed) return;
      const { enabled } = await getReminders();
      if (!enabled) return;
      const granted = await requestNotificationPermission();
      if (!granted) return;
      try {
        await rescheduleAllReminders(uid);
      } catch {
        // ignore scheduling errors on bootstrap
      }
    }

    void sync(false);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync(true);
    });
    return () => sub.remove();
  }, [userId]);
}
