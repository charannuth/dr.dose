import { Platform } from 'react-native';
import { getExpoNotifications } from './expoNotifications';

export const DOSE_REMINDER_CHANNEL_ID = 'dose-reminders';

const createdChannels = new Set<string>();

/**
 * Android channel + handler (safe to call repeatedly). Dose notifications are
 * intentionally tap-to-open only: snooze and mark-as-taken happen inside the app,
 * not via lock-screen action buttons.
 */
export async function ensureNotificationInfrastructure(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  await ensureDoseChannel(null);
  return true;
}

/**
 * Ensure the Android notification channel for a given reminder sound exists.
 * Android sets the sound per channel (not per notification), so each bundled
 * chime gets its own channel. Returns the channel id to schedule against.
 * No-op returning the default id on iOS (sound is set on the notification there).
 */
export async function ensureDoseChannel(file: string | null): Promise<string> {
  if (Platform.OS !== 'android') return DOSE_REMINDER_CHANNEL_ID;

  const Notifications = await getExpoNotifications();
  if (!Notifications) return DOSE_REMINDER_CHANNEL_ID;

  const channelId = file
    ? `${DOSE_REMINDER_CHANNEL_ID}-${file.replace(/\.[^.]+$/, '')}`
    : DOSE_REMINDER_CHANNEL_ID;

  if (!createdChannels.has(channelId)) {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: file ? `Dose reminders (${file.replace(/\.[^.]+$/, '')})` : 'Dose reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ab82c5',
      sound: file ?? 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    createdChannels.add(channelId);
  }

  return channelId;
}
