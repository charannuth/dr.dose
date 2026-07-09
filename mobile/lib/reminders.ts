import { Platform } from 'react-native';
import {
  cancelAllDoctorVisitReminders,
  rescheduleDoctorVisitReminders,
  type DoctorVisitReminderSummary,
} from './doctorVisitReminders';
import {
  cancelAllRefillReminders,
  rescheduleRefillReminders,
  type RefillReminderSummary,
} from './refillReminders';
import {
  cancelAllDoseReminders,
  rescheduleDoseReminders,
  type ReminderScheduleSummary,
} from './reminderScheduler';
import { getExpoNotifications } from './expoNotifications';

const IOS_TOTAL_LIMIT = 64;

export type AllRemindersSummary = {
  dose: ReminderScheduleSummary;
  doctorVisits: DoctorVisitReminderSummary;
  refills: RefillReminderSummary;
};

async function pendingNotificationCount(): Promise<number> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return 0;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.length;
}

/** Reschedule every local notification type when reminders are enabled. */
export async function rescheduleAllReminders(userId: string): Promise<AllRemindersSummary> {
  const dose = await rescheduleDoseReminders(userId);

  let doctorMax: number | undefined;
  let refillMax: number | undefined;
  if (Platform.OS === 'ios') {
    doctorMax = Math.max(0, IOS_TOTAL_LIMIT - (await pendingNotificationCount()));
    const doctorVisits = await rescheduleDoctorVisitReminders(userId, doctorMax);
    refillMax = Math.max(0, IOS_TOTAL_LIMIT - (await pendingNotificationCount()));
    const refills = await rescheduleRefillReminders(userId, refillMax);
    return { dose, doctorVisits, refills };
  }

  const doctorVisits = await rescheduleDoctorVisitReminders(userId);
  const refills = await rescheduleRefillReminders(userId);
  return { dose, doctorVisits, refills };
}

export {
  cancelAllDoseReminders,
  cancelDoseSnooze,
  scheduleDoseSnooze,
} from './reminderScheduler';
export { cancelAllDoctorVisitReminders } from './doctorVisitReminders';
export { cancelAllRefillReminders } from './refillReminders';

/** Cancel every local notification this app schedules. */
export async function cancelAllLocalReminders(): Promise<void> {
  await Promise.all([
    cancelAllDoseReminders(),
    cancelAllDoctorVisitReminders(),
    cancelAllRefillReminders(),
  ]);
}
