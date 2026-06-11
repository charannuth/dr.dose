import { useEffect } from 'react';
import { getReminders } from '../lib/settings';
import { requestNotificationPermission } from '../lib/notifications';
import { rescheduleAllReminders } from '../lib/reminders';

/**
 * Arms local dose/visit/refill reminders once per app launch.
 *
 * Avoid re-scheduling on every return to foreground: cancel + recreate after a dose
 * time has passed makes iOS fire that slot immediately (“catch-up”), which feels
 * like a late reminder. Med/timezone changes still call rescheduleAllReminders explicitly.
 */
export function useReminderBootstrap(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    async function sync() {
      const { enabled } = await getReminders();
      if (!enabled) return;
      const granted = await requestNotificationPermission();
      if (!granted) return;
      try {
        await rescheduleAllReminders(userId);
      } catch {
        // ignore scheduling errors on bootstrap
      }
    }

    void sync();
  }, [userId]);
}
