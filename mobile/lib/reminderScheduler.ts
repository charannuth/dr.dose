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
import {
  DOSE_REMINDER_CHANNEL_ID,
  ensureNotificationInfrastructure,
} from './notificationSetup';
import { getReminders } from './settings';
import {
  getActiveSnoozes,
  removeSnooze,
  removeSnoozesForMedication,
  setSnooze,
  type SnoozeRecord,
} from './snooze';
import type { Medication } from './types';

const REMINDER_PREFIX = 'dose-reminder';
/** Starts with REMINDER_PREFIX so cancelAllDoseReminders() clears these too. */
const FOLLOWUP_PREFIX = 'dose-reminder-followup';
/** Snooze reminder + its restarted follow-up chain (also cleared by cancelAll). */
const SNOOZE_PREFIX = 'dose-reminder-snooze';
const SNOOZE_FOLLOWUP_PREFIX = 'dose-reminder-snooze-followup';

/** iOS allows at most 64 pending local notifications per app. */
const IOS_SCHEDULE_LIMIT = 64;

/** Re-notify an untaken dose this many times after its scheduled time... */
const FOLLOWUP_COUNT = 3;
/** ...spaced this many minutes apart (so a dose nags until it is marked taken). */
const FOLLOWUP_INTERVAL_MIN = 5;

type NotificationsModule = NonNullable<Awaited<ReturnType<typeof getExpoNotifications>>>;

/** Shared notification content so every dose alert carries actions + deep-link data. */
function doseContent(
  Notifications: NotificationsModule,
  med: Pick<Medication, 'id' | 'name'>,
  time: string,
  title: string,
  body: string,
) {
  return {
    title,
    body,
    sound: 'default',
    interruptionLevel: 'timeSensitive' as const,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    data: { medicationId: med.id, scheduleTime: time, screen: 'today' },
    ...(Platform.OS === 'android' ? { channelId: DOSE_REMINDER_CHANNEL_ID } : {}),
  };
}

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

/**
 * Cancel every dose alert (daily, follow-ups, and snooze chain) for one
 * medication and forget its snoozes. Called when a medication is deleted so a
 * pending snooze can't fire for something that no longer exists.
 */
export async function cancelDoseRemindersForMedication(
  medicationId: string,
): Promise<void> {
  await removeSnoozesForMedication(medicationId);

  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        if (!n.identifier.startsWith(REMINDER_PREFIX)) return false;
        const data = n.content?.data as { medicationId?: string } | undefined;
        return data?.medicationId === medicationId;
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function collectSlots(medications: Medication[]): SlotToSchedule[] {
  const slots: SlotToSchedule[] = [];
  for (const med of medications) {
    if (isAsNeededMed(med)) continue;
    if (med.reminders_enabled === false) continue;
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
  activeMeds: Medication[];
  baseScheduled: number;
  takenKeys: Set<string>;
  /** Slots with an active snooze use the snooze chain instead of these follow-ups. */
  snoozedKeys: Set<string>;
}): Promise<number> {
  const { Notifications, activeMeds, baseScheduled, takenKeys, snoozedKeys } = args;

  const budget =
    Platform.OS === 'ios'
      ? Math.max(0, IOS_SCHEDULE_LIMIT - baseScheduled)
      : Number.POSITIVE_INFINITY;
  if (budget <= 0) return 0;

  const nowMins = currentMinutesSinceMidnight();

  type Followup = { id: string; med: Medication; time: string; fireInSeconds: number };
  const followups: Followup[] = [];

  for (const med of activeMeds) {
    if (isAsNeededMed(med)) continue;
    if (med.reminders_enabled === false) continue;
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      const slotKey = `${med.id}:${time}`;
      if (takenKeys.has(slotKey)) continue;
      if (snoozedKeys.has(slotKey)) continue;
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
      content: doseContent(
        Notifications,
        followup.med,
        followup.time,
        'Dose still due',
        `Don't forget ${followup.med.name} (${formatScheduleTime(followup.time)})`,
      ),
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

/** Cancel a single dose's pending nags (regular follow-ups + any snooze chain). */
async function cancelDoseNags(
  Notifications: NotificationsModule,
  medicationId: string,
  time: string,
): Promise<void> {
  const ids: string[] = [`${SNOOZE_PREFIX}:${medicationId}:${time}`];
  for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
    ids.push(`${FOLLOWUP_PREFIX}:${medicationId}:${time}:${k}`);
    ids.push(`${SNOOZE_FOLLOWUP_PREFIX}:${medicationId}:${time}:${k}`);
  }
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/**
 * Re-arm persisted snoozes after a full reschedule wiped them. For each active
 * snooze we schedule the snooze reminder (if still future) and its restarted
 * +5/+10/+15 chain. Taken or orphaned snoozes are pruned.
 */
async function reapplySnoozes(args: {
  Notifications: NotificationsModule;
  activeMeds: Medication[];
  activeSnoozes: SnoozeRecord[];
  takenKeys: Set<string>;
}): Promise<number> {
  const { Notifications, activeMeds, activeSnoozes, takenKeys } = args;
  const medById = new Map(activeMeds.map((m) => [m.id, m]));
  const now = Date.now();
  let scheduled = 0;

  for (const snooze of activeSnoozes) {
    const slotKey = `${snooze.medicationId}:${snooze.scheduleTime}`;
    const med = medById.get(snooze.medicationId);
    // Drop snoozes for doses already taken, or meds no longer active.
    if (!med || takenKeys.has(slotKey)) {
      await removeSnooze(snooze.medicationId, snooze.scheduleTime);
      continue;
    }

    const remindMs = Date.parse(snooze.remindAt);
    if (!Number.isFinite(remindMs)) {
      await removeSnooze(snooze.medicationId, snooze.scheduleTime);
      continue;
    }

    const reminderSec = Math.round((remindMs - now) / 1000);
    let anyFuture = false;

    if (reminderSec >= 1) {
      anyFuture = true;
      await Notifications.scheduleNotificationAsync({
        identifier: `${SNOOZE_PREFIX}:${med.id}:${snooze.scheduleTime}`,
        content: doseContent(
          Notifications,
          med,
          snooze.scheduleTime,
          'Snoozed dose',
          `Time for ${med.name} (${formatScheduleTime(snooze.scheduleTime)})`,
        ),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: reminderSec,
          repeats: false,
        },
      });
    }

    for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
      const sec = reminderSec + k * FOLLOWUP_INTERVAL_MIN * 60;
      if (sec < 1) continue;
      anyFuture = true;
      await Notifications.scheduleNotificationAsync({
        identifier: `${SNOOZE_FOLLOWUP_PREFIX}:${med.id}:${snooze.scheduleTime}:${k}`,
        content: doseContent(
          Notifications,
          med,
          snooze.scheduleTime,
          'Dose still due',
          `Don't forget ${med.name} (${formatScheduleTime(snooze.scheduleTime)})`,
        ),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: sec,
          repeats: false,
        },
      });
      scheduled += 1;
    }

    if (reminderSec >= 1) scheduled += 1;
    // Whole snooze window (reminder + all follow-ups) has elapsed; forget it.
    if (!anyFuture) await removeSnooze(snooze.medicationId, snooze.scheduleTime);
  }

  return scheduled;
}

/**
 * Snooze a specific dose: cancel its remaining nags, fire a fresh reminder at
 * `remindAt`, and restart the +5/+10/+15 chain from there. Persisted so it
 * survives the reschedule triggered when other doses are marked taken.
 */
export async function scheduleDoseSnooze(args: {
  med: Pick<Medication, 'id' | 'name'>;
  scheduleTime: string;
  remindAt: Date;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return { ok: false, reason: 'Notifications are unavailable.' };

  const { enabled } = await getReminders();
  if (!enabled) return { ok: false, reason: 'Turn on dose reminders first.' };

  await ensureNotificationInfrastructure();

  const { med, scheduleTime, remindAt } = args;
  const reminderSec = Math.round((remindAt.getTime() - Date.now()) / 1000);
  if (reminderSec < 1) return { ok: false, reason: 'Pick a time in the future.' };

  await cancelDoseNags(Notifications, med.id, scheduleTime);

  await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_PREFIX}:${med.id}:${scheduleTime}`,
    content: doseContent(
      Notifications,
      med,
      scheduleTime,
      'Snoozed dose',
      `Time for ${med.name} (${formatScheduleTime(scheduleTime)})`,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: reminderSec,
      repeats: false,
    },
  });

  for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${SNOOZE_FOLLOWUP_PREFIX}:${med.id}:${scheduleTime}:${k}`,
      content: doseContent(
        Notifications,
        med,
        scheduleTime,
        'Dose still due',
        `Don't forget ${med.name} (${formatScheduleTime(scheduleTime)})`,
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: reminderSec + k * FOLLOWUP_INTERVAL_MIN * 60,
        repeats: false,
      },
    });
  }

  await setSnooze({
    medicationId: med.id,
    scheduleTime,
    date: todayLocalDate(),
    remindAt: remindAt.toISOString(),
  });

  return { ok: true };
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

  const { data: logs } = await supabase
    .from('dose_logs')
    .select('medication_id, schedule_time')
    .eq('user_id', userId)
    .eq('taken_on', today);
  const takenKeys = new Set(
    (logs ?? []).map((l) => `${l.medication_id}:${l.schedule_time}`),
  );

  const activeSnoozes = await getActiveSnoozes();
  const snoozedKeys = new Set(
    activeSnoozes.map((s) => `${s.medicationId}:${s.scheduleTime}`),
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
      content: doseContent(
        Notifications,
        med,
        time,
        'Dose due',
        `Time for ${med.name} (${formatScheduleTime(time)})`,
      ),
      trigger: buildDailyTrigger(Notifications, hour, minute),
    });
  }

  const followups = await scheduleDoseFollowups({
    Notifications,
    activeMeds: active,
    baseScheduled: toSchedule.length,
    takenKeys,
    snoozedKeys,
  });

  await reapplySnoozes({
    Notifications,
    activeMeds: active,
    activeSnoozes,
    takenKeys,
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
    content: doseContent(
      Notifications,
      next.med,
      next.time,
      'Dose due',
      `Time for ${next.med.name} (${formatScheduleTime(next.time)})`,
    ),
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
