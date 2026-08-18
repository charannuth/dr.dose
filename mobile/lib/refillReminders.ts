import { Platform } from 'react-native';
import { fetchMedicationsWithStatus } from './medications';
import { getRefillAlerts } from './refills';
import { getExpoNotifications } from './expoNotifications';
import { DOSE_REMINDER_CHANNEL_ID, ensureNotificationInfrastructure } from './notificationSetup';
import { getReminders } from './settings';

const REFILL_PREFIX = 'refill-reminder';

/** Daily nudge while supply is at or below the refill threshold. */
const REFILL_HOUR = 10;
const REFILL_MINUTE = 0;

const IOS_LIMIT = 64;

type NotificationsModule = NonNullable<Awaited<ReturnType<typeof getExpoNotifications>>>;

function buildDailyTrigger(Notifications: NotificationsModule) {
  if (Platform.OS === 'ios') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: REFILL_HOUR,
      minute: REFILL_MINUTE,
      repeats: true,
    } as const;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: REFILL_HOUR,
    minute: REFILL_MINUTE,
    channelId: DOSE_REMINDER_CHANNEL_ID,
  } as const;
}

export async function cancelAllRefillReminders(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REFILL_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type RefillReminderSummary = {
  scheduled: number;
  skippedOverLimit: number;
};

export async function rescheduleRefillReminders(
  userId: string,
  maxSchedule?: number,
): Promise<RefillReminderSummary> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    throw new Error('Notifications are not available in this build.');
  }

  const { enabled } = await getReminders();
  await cancelAllRefillReminders();

  if (!enabled) {
    return { scheduled: 0, skippedOverLimit: 0 };
  }

  await ensureNotificationInfrastructure();

  const medications = await fetchMedicationsWithStatus(userId);
  const alerts = getRefillAlerts(medications);

  let toSchedule = alerts;
  let skippedOverLimit = 0;
  const cap = Platform.OS === 'ios' ? (maxSchedule ?? IOS_LIMIT) : alerts.length;
  if (Platform.OS === 'ios' && alerts.length > cap) {
    skippedOverLimit = alerts.length - cap;
    toSchedule = alerts.slice(0, cap);
  }

  for (const alert of toSchedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REFILL_PREFIX}:${alert.medicationId}`,
      content: {
        title: 'Refill soon',
        body: `A medication is running low (${alert.remainingLabel} left). Open Dr. Dose to update supply.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { screen: 'today', medicationId: alert.medicationId, kind: 'refill' },
        ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
      },
      trigger: buildDailyTrigger(Notifications),
    });
  }

  return { scheduled: toSchedule.length, skippedOverLimit };
}

const TEST_REFILL_ID = 'drdose-test-refill';

/** Fire a one-off refill-style alert for the first low-supply medication (simulator-friendly). */
export async function scheduleTestRefillReminder(
  userId: string,
  secondsFromNow = 30,
): Promise<{ ok: true; label: string } | { ok: false; reason: string }> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return { ok: false, reason: 'Notifications module unavailable.' };
  }

  const { enabled } = await getReminders();
  if (!enabled) {
    return { ok: false, reason: 'Turn on reminders first.' };
  }

  await ensureNotificationInfrastructure();

  const medications = await fetchMedicationsWithStatus(userId);
  const alerts = getRefillAlerts(medications);
  const alert = alerts[0];
  if (!alert) {
    return {
      ok: false,
      reason: 'No low-supply medications. Track pills remaining (≤7) on a medication first.',
    };
  }

  await Notifications.cancelScheduledNotificationAsync(TEST_REFILL_ID);

  const seconds = Math.max(10, Math.round(secondsFromNow));
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_REFILL_ID,
    content: {
      title: 'Refill soon',
      body: `A medication is running low (${alert.remainingLabel} left). Open Dr. Dose to update supply.`,
      sound: 'default',
      data: { screen: 'today', medicationId: alert.medicationId, kind: 'refill' },
      ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });

  return { ok: true, label: `Low supply (${alert.remainingLabel} left)` };
}
