import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
  formatScheduleTime,
  normalizeScheduleTimes,
  scheduleTimeToMinutes,
  todayLocalDate,
  currentMinutesSinceMidnight,
} from './dates';
import { filterMedicationsActiveOn } from './medicationDates';
import { isAsNeededMed } from './medicationSchedule';
import { getExpoNotifications } from './expoNotifications';
import { DOSE_REMINDER_CHANNEL_ID, ensureNotificationInfrastructure } from './notificationSetup';
import { getReminders } from './settings';
import type { Medication } from './types';

const REMINDER_PREFIX = 'dose-reminder';
/** Starts with REMINDER_PREFIX so cancelAllDoseReminders() clears these too. */
const FOLLOWUP_PREFIX = 'dose-reminder-followup';

/** iOS allows at most 64 pending local notifications per app. */
const IOS_SCHEDULE_LIMIT = 64;

/** Re-notify an untaken dose this many times after its scheduled time... */
const FOLLOWUP_COUNT = 3;
/** ...spaced this many minutes apart (so a dose nags until it is marked taken). */
const FOLLOWUP_INTERVAL_MIN = 5;

type NotificationsModule = NonNullable<Awaited<ReturnType<typeof getExpoNotifications>>>;

type SlotToSchedule = {
  med: Medication;
  time: string;
  hour: number;
  minute: number;
};

function buildDailyTrigger(Notifications: NotificationsModule, hour: number, minute: number) {
  // Calendar + repeats is the reliable iOS pattern for “every day at this time”.
  if (Platform.OS === 'ios') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    } as const;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: DOSE_REMINDER_CHANNEL_ID,
  } as const;
}

export async function cancelAllDoseReminders(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function collectSlots(medications: Medication[]): SlotToSchedule[] {
  const slots: SlotToSchedule[] = [];
  for (const med of medications) {
    if (isAsNeededMed(med)) continue;
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      const mins = scheduleTimeToMinutes(time);
      if (!Number.isFinite(mins)) continue;
      slots.push({
        med,
        time,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
      });
    }
  }
  return slots;
}

export type ReminderScheduleSummary = {
  scheduled: number;
  skippedOverLimit: number;
  /** One-time follow-up "still need to take it" alerts scheduled for today. */
  followups?: number;
};

/**
 * Schedules one-time "still need to take it" follow-ups for each of today's
 * untaken dose slots, at +5/+10/+15 min after the dose time. iOS cannot keep a
 * banner pinned until acknowledged, so repeated alerts approximate that until the
 * user marks the dose taken (which triggers a reschedule that drops them).
 * Only future fire times are scheduled, and we respect the iOS 64-pending cap.
 */
async function scheduleDoseFollowups(args: {
  Notifications: NotificationsModule;
  userId: string;
  today: string;
  activeMeds: Medication[];
  baseScheduled: number;
}): Promise<number> {
  const { Notifications, userId, today, activeMeds, baseScheduled } = args;
  if (!supabase) return 0;

  const budget =
    Platform.OS === 'ios'
      ? Math.max(0, IOS_SCHEDULE_LIMIT - baseScheduled)
      : Number.POSITIVE_INFINITY;
  if (budget <= 0) return 0;

  const { data: logs } = await supabase
    .from('dose_logs')
    .select('medication_id, schedule_time')
    .eq('user_id', userId)
    .eq('taken_on', today);

  const takenKeys = new Set(
    (logs ?? []).map((l) => `${l.medication_id}:${l.schedule_time}`),
  );

  const nowMins = currentMinutesSinceMidnight();

  type Followup = { id: string; med: Medication; time: string; fireInSeconds: number };
  const followups: Followup[] = [];

  for (const med of activeMeds) {
    if (isAsNeededMed(med)) continue;
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      if (takenKeys.has(`${med.id}:${time}`)) continue;
      const slotMins = scheduleTimeToMinutes(time);
      if (!Number.isFinite(slotMins)) continue;
      for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
        const fireMins = slotMins + k * FOLLOWUP_INTERVAL_MIN;
        if (fireMins <= nowMins || fireMins >= 24 * 60) continue;
        followups.push({
          id: `${FOLLOWUP_PREFIX}:${med.id}:${time}:${k}`,
          med,
          time,
          fireInSeconds: (fireMins - nowMins) * 60,
        });
      }
    }
  }

  // Soonest first so the most imminent nags survive when the cap is tight.
  followups.sort((a, b) => a.fireInSeconds - b.fireInSeconds);

  let scheduled = 0;
  for (const followup of followups) {
    if (scheduled >= budget) break;
    await Notifications.scheduleNotificationAsync({
      identifier: followup.id,
      content: {
        title: 'Dose still due',
        body: `Don't forget ${followup.med.name} (${formatScheduleTime(followup.time)})`,
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { medicationId: followup.med.id, scheduleTime: followup.time, screen: 'today' },
        ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(followup.fireInSeconds)),
        repeats: false,
      },
    });
    scheduled += 1;
  }

  return scheduled;
}

/**
 * Schedules repeating local notifications for each active scheduled dose time.
 * Works when the app is backgrounded or the phone is locked (no server push required).
 */
export async function rescheduleDoseReminders(
  userId: string,
): Promise<ReminderScheduleSummary> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    throw new Error('Notifications are not available in this build.');
  }

  const { enabled } = await getReminders();
  await cancelAllDoseReminders();

  if (!enabled) {
    return { scheduled: 0, skippedOverLimit: 0 };
  }

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  await ensureNotificationInfrastructure();

  const today = todayLocalDate();
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;

  const active = filterMedicationsActiveOn((data ?? []) as Medication[], today);
  const slots = collectSlots(active).sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );

  let toSchedule = slots;
  let skippedOverLimit = 0;
  if (Platform.OS === 'ios' && slots.length > IOS_SCHEDULE_LIMIT) {
    skippedOverLimit = slots.length - IOS_SCHEDULE_LIMIT;
    toSchedule = slots.slice(0, IOS_SCHEDULE_LIMIT);
  }

  for (const { med, time, hour, minute } of toSchedule) {
    const id = `${REMINDER_PREFIX}:${med.id}:${time}`;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: 'Dose due',
        body: `Time for ${med.name} (${formatScheduleTime(time)})`,
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { medicationId: med.id, scheduleTime: time, screen: 'today' },
        ...(Platform.OS === 'android'
          ? { channelId: DOSE_REMINDER_CHANNEL_ID }
          : {}),
      },
      trigger: buildDailyTrigger(Notifications, hour, minute),
    });
  }

  const followups = await scheduleDoseFollowups({
    Notifications,
    userId,
    today,
    activeMeds: active,
    baseScheduled: toSchedule.length,
  });

  return { scheduled: toSchedule.length, skippedOverLimit, followups };
}

const TEST_NEXT_DOSE_ID = 'drdose-test-next-dose';

/** Fire a one-off dose-style alert for the next untaken slot today (simulator-friendly). */
export async function scheduleTestNextDoseReminder(
  userId: string,
  secondsFromNow = 60,
): Promise<{ ok: true; label: string } | { ok: false; reason: string }> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return { ok: false, reason: 'Notifications module unavailable.' };
  }

  const { enabled } = await getReminders();
  if (!enabled) {
    return { ok: false, reason: 'Turn on dose reminders first.' };
  }

  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' };
  }

  await ensureNotificationInfrastructure();

  const today = todayLocalDate();
  const { data, error } = await supabase.from('medications').select('*').eq('user_id', userId);
  if (error) return { ok: false, reason: error.message };

  const active = filterMedicationsActiveOn((data ?? []) as Medication[], today);
  const nowMins = currentMinutesSinceMidnight();

  type Candidate = { med: Medication; time: string; mins: number };
  const candidates: Candidate[] = [];
  for (const med of active) {
    if (isAsNeededMed(med)) continue;
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      const mins = scheduleTimeToMinutes(time);
      if (!Number.isFinite(mins)) continue;
      candidates.push({ med, time, mins });
    }
  }

  candidates.sort((a, b) => a.mins - b.mins);
  const next =
    candidates.find((c) => c.mins >= nowMins) ?? candidates[0];

  if (!next) {
    return { ok: false, reason: 'Add a daily medication with dose times first.' };
  }

  await Notifications.cancelScheduledNotificationAsync(TEST_NEXT_DOSE_ID);

  const seconds = Math.max(10, Math.round(secondsFromNow));
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_NEXT_DOSE_ID,
    content: {
      title: 'Dose due',
      body: `Time for ${next.med.name} (${formatScheduleTime(next.time)})`,
      sound: 'default',
      interruptionLevel: 'timeSensitive',
      data: { medicationId: next.med.id, scheduleTime: next.time, screen: 'today' },
      ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });

  return {
    ok: true,
    label: `${next.med.name} at ${formatScheduleTime(next.time)}`,
  };
}

/** For debugging in Account — next fire time for a sample identifier. */
export async function getNextReminderFireDate(
  hour: number,
  minute: number,
): Promise<Date | null> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return null;
  await ensureNotificationInfrastructure();
  const next = await Notifications.getNextTriggerDateAsync(
    buildDailyTrigger(Notifications, hour, minute),
  );
  return next ? new Date(next) : null;
}
