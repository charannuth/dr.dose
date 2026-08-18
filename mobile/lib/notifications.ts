import { Linking, Platform } from 'react-native';
import { getExpoNotifications } from './expoNotifications';
import {
  DOSE_REMINDER_CHANNEL_ID,
  ensureNotificationInfrastructure,
} from './notificationSetup';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  await ensureNotificationInfrastructure();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: true,
    },
  });
  return status === 'granted';
}

export async function canUseNotifications(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function notificationsAvailable(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  return Notifications != null;
}

export function openNotificationSettings(): void {
  void Linking.openSettings();
}

export function notificationPermissionHint(status: NotificationPermissionStatus): string {
  if (status === 'granted') {
    return 'Dose alarms can wake the lock screen (Time Sensitive). Use Mark taken or Snooze on the alert — they keep nagging until you act.';
  }
  if (status === 'denied') {
    return 'Notifications are off in iPhone Settings. Tap “Open Settings” to allow alerts.';
  }
  return 'Turn on reminders below — iOS will ask for permission to show alerts.';
}

export function simulatorReminderNote(): string | null {
  return Platform.OS === 'ios' && __DEV__
    ? 'In the iOS Simulator, alerts usually appear in Notification Center rather than on the lock screen.'
    : null;
}

const TEST_REMINDER_ID = 'drdose-test-reminder';

/** Fire a one-off local notification to verify permissions and delivery. */
export async function scheduleTestReminder(
  secondsFromNow = 15,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return { ok: false, reason: 'Notifications module unavailable in this build.' };
  }

  const permitted = await requestNotificationPermission();
  if (!permitted) {
    return { ok: false, reason: 'Notification permission was not granted.' };
  }

  await ensureNotificationInfrastructure();
  await Notifications.cancelScheduledNotificationAsync(TEST_REMINDER_ID);

  const seconds = Math.max(5, Math.round(secondsFromNow));
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_REMINDER_ID,
    content: {
      title: 'Dr. Dose test reminder',
      body: 'If you see this alert, local notifications are working.',
      sound: 'default',
      interruptionLevel: 'timeSensitive',
      data: { screen: 'today' },
      ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });

  return { ok: true };
}

export { scheduleTestNextDoseReminder, previewReminderSound } from './reminderScheduler';
export { scheduleTestRefillReminder } from './refillReminders';
