import { Platform } from 'react-native';
import { getExpoNotifications } from './expoNotifications';

export const DOSE_REMINDER_CHANNEL_ID = 'dose-reminders';

let channelReady = false;

/**
 * Android channel + handler (safe to call repeatedly). Dose notifications are
 * intentionally tap-to-open only: snooze and mark-as-taken happen inside the app,
 * not via lock-screen action buttons.
 */
export async function ensureNotificationInfrastructure(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android' && !channelReady) {
    await Notifications.setNotificationChannelAsync(DOSE_REMINDER_CHANNEL_ID, {
      name: 'Dose reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ab82c5',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    channelReady = true;
  }

  return true;
}
