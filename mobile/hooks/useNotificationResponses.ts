import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getExpoNotifications } from '../lib/expoNotifications';
import { routes } from '../lib/routes';

type NotificationData = {
  screen?: string;
  medicationId?: string;
  scheduleTime?: string;
  visitId?: string;
};

function routeForNotificationData(data: NotificationData | undefined): string | null {
  if (!data) return null;
  if (data.screen === 'doctor-visits') return routes.doctorVisits;
  if (data.screen === 'today' || data.medicationId) return routes.today;
  return null;
}

/**
 * Open the right screen when the user taps a local notification. Dose alerts are
 * tap-to-open only; snooze and mark-as-taken are handled inside the app.
 */
export function useNotificationResponses() {
  const router = useRouter();

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const Notifications = await getExpoNotifications();
      if (!Notifications || cancelled) return;

      function handleResponse(data: NotificationData | undefined) {
        const path = routeForNotificationData(data);
        if (path) router.push(path as '/');
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleResponse(response.notification.request.content.data as NotificationData);
      });

      const last = await Notifications.getLastNotificationResponseAsync();
      if (last && !cancelled) {
        handleResponse(last.notification.request.content.data as NotificationData);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);
}
