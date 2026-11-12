import { Platform } from 'react-native';
import {
  fetchDoctorVisits,
  formatAppointmentTypeLabel,
  visitProviderLabel,
  type DoctorVisit,
} from './doctorVisits';
import { getExpoNotifications } from './expoNotifications';
import { DOSE_REMINDER_CHANNEL_ID, ensureNotificationInfrastructure } from './notificationSetup';
import { todayLocalDate } from './dates';
import { DEFAULT_REMINDER_SOUND_FILE, getReminders } from './settings';

const VISIT_PREFIX = 'doctor-visit-reminder';
const FOLLOWUP_PREFIX = 'doctor-followup-reminder';

/** Morning nudge on the day of an appointment or follow-up. */
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

const IOS_LIMIT = 64;

type NotificationsModule = NonNullable<Awaited<ReturnType<typeof getExpoNotifications>>>;

function reminderInstant(dateStr: string, hour = REMINDER_HOUR, minute = REMINDER_MINUTE): Date {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function isFutureReminder(dateStr: string, today: string): boolean {
  if (dateStr < today) return false;
  if (dateStr > today) return true;
  const fireAt = reminderInstant(dateStr);
  return fireAt.getTime() > Date.now();
}

function visitLabel(visit: DoctorVisit): string {
  const provider = visitProviderLabel(visit);
  const type = formatAppointmentTypeLabel(visit.appointment_type);
  if (type && visit.provider_name?.trim()) return `${type} · ${provider}`;
  return provider;
}

function buildDateTrigger(Notifications: NotificationsModule, fireAt: Date) {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: fireAt,
  } as const;
}

export async function cancelAllDoctorVisitReminders(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (n) =>
          n.identifier.startsWith(VISIT_PREFIX) || n.identifier.startsWith(FOLLOWUP_PREFIX),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type DoctorVisitReminderSummary = {
  scheduled: number;
  skippedOverLimit: number;
};

export async function rescheduleDoctorVisitReminders(
  userId: string,
  maxSchedule?: number,
): Promise<DoctorVisitReminderSummary> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    throw new Error('Notifications are not available in this build.');
  }

  const { enabled } = await getReminders();
  await cancelAllDoctorVisitReminders();

  if (!enabled) {
    return { scheduled: 0, skippedOverLimit: 0 };
  }

  await ensureNotificationInfrastructure();

  const today = todayLocalDate();
  const visits = await fetchDoctorVisits(userId, 120);

  type Pending = {
    id: string;
    fireAt: Date;
    title: string;
    body: string;
  };

  const pending: Pending[] = [];

  for (const visit of visits) {
    if (isFutureReminder(visit.visit_date, today)) {
      const when = visit.visit_time?.trim();
      pending.push({
        id: `${VISIT_PREFIX}:${visit.id}`,
        fireAt: reminderInstant(visit.visit_date),
        title: 'Doctor visit today',
        body: when
          ? `${visitLabel(visit)} at ${when}`
          : `${visitLabel(visit)} — check appointment details in the app`,
      });
    }

    if (visit.follow_up_date && isFutureReminder(visit.follow_up_date, today)) {
      pending.push({
        id: `${FOLLOWUP_PREFIX}:${visit.id}`,
        fireAt: reminderInstant(visit.follow_up_date),
        title: 'Follow-up today',
        body: `Follow-up for ${visitLabel(visit)}`,
      });
    }
  }

  pending.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  let toSchedule = pending;
  let skippedOverLimit = 0;
  const cap = Platform.OS === 'ios' ? (maxSchedule ?? IOS_LIMIT) : pending.length;
  if (Platform.OS === 'ios' && pending.length > cap) {
    skippedOverLimit = pending.length - cap;
    toSchedule = pending.slice(0, cap);
  }

  for (const item of toSchedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: {
        title: item.title,
        body: item.body,
        sound: DEFAULT_REMINDER_SOUND_FILE,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { screen: 'doctor-visits', visitId: item.id.split(':')[1] },
        ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
      },
      trigger: buildDateTrigger(Notifications, item.fireAt),
    });
  }

  return { scheduled: toSchedule.length, skippedOverLimit };
}
