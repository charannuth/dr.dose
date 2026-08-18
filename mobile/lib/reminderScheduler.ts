import { Platform } from 'react-native';
import { openRows } from './crypto/seal';
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
  DOSE_ALARM_CATEGORY_ID,
  DOSE_ALARM_CHANNEL_ID,
  DOSE_REMINDER_CHANNEL_ID,
  ensureDoseAlarmChannel,
  ensureDoseChannel,
  ensureNotificationInfrastructure,
} from './notificationSetup';
import {
  getReminders,
  getReminderSound,
  reminderSoundFile,
  type ReminderSound,
} from './settings';
import {
  getActiveSnoozes,
  removeSnooze,
  removeSnoozesForMedication,
  setSnooze,
  type SnoozeRecord,
} from './snooze';
import {
  endSnoozeLiveActivity,
  startSnoozeLiveActivity,
} from './snoozeLiveActivity';
import type { Medication } from './types';

const REMINDER_PREFIX = 'dose-reminder';
/** Starts with REMINDER_PREFIX so cancelAllDoseReminders() clears these too. */
const FOLLOWUP_PREFIX = 'dose-reminder-followup';
/** Snooze reminder + its restarted follow-up chain (also cleared by cancelAll). */
const SNOOZE_PREFIX = 'dose-reminder-snooze';
const SNOOZE_FOLLOWUP_PREFIX = 'dose-reminder-snooze-followup';

/** iOS allows at most 64 pending local notifications per app. */
const IOS_SCHEDULE_LIMIT = 64;

/** One daily alert per clock time (not per medication). */
function timeDailyId(time: string): string {
  return `${REMINDER_PREFIX}:at:${time}`;
}

/** One follow-up nag per clock time per step. */
function timeFollowupId(time: string, k: number): string {
  return `${FOLLOWUP_PREFIX}:at:${time}:${k}`;
}

function formatMedNames(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return 'your medications';
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean[0]}, ${clean[1]}, and ${clean.length - 2} more`;
}

function doseDueCopy(meds: Pick<Medication, 'name'>[], time: string) {
  const label = formatScheduleTime(time);
  const names = formatMedNames(meds.map((m) => m.name));
  if (meds.length <= 1) {
    return {
      title: 'Dose due',
      body: `Time for ${names} (${label}). Mark taken or Snooze — this alert will keep coming back until you act.`,
    };
  }
  return {
    title: `${meds.length} doses due`,
    body: `${names} at ${label}. Mark taken logs all remaining at this time, or open the app to choose.`,
  };
}

function doseStillDueCopy(meds: Pick<Medication, 'name'>[], time: string) {
  const label = formatScheduleTime(time);
  const names = formatMedNames(meds.map((m) => m.name));
  if (meds.length <= 1) {
    return {
      title: 'Dose still due',
      body: `Still due (${label}). Mark taken or Snooze from this alert — it will keep reminding until you do.`,
    };
  }
  return {
    title: `${meds.length} doses still due`,
    body: `${names} still due at ${label}. Mark taken logs all remaining, or open the app to choose.`,
  };
}

/** Re-notify an untaken dose this many times after its scheduled time... */
const FOLLOWUP_COUNT = 8;
/** ...spaced this many minutes apart (nag until marked taken / snoozed). */
const FOLLOWUP_INTERVAL_MIN = 3;

type NotificationsModule = NonNullable<Awaited<ReturnType<typeof getExpoNotifications>>>;

/** iOS sound value + resolved Android channel for the user's chosen chime. */
type ResolvedSound = { iosSound: string; androidChannelId: string };
async function resolveReminderSound(): Promise<ResolvedSound> {
  const file = reminderSoundFile(await getReminderSound());
  // Prefer the urgent "dose alarms" channel on Android so heads-up + sticky work.
  const androidChannelId =
    Platform.OS === 'android'
      ? await ensureDoseAlarmChannel()
      : await ensureDoseChannel(file);
  // Keep custom chime channel created too so refill/doctor visit paths still work.
  if (Platform.OS === 'android') await ensureDoseChannel(file);
  return { iosSound: file ?? 'default', androidChannelId };
}

/**
 * Shared notification content for dose due / still-due / snooze alerts.
 * Lock-screen actions (Mark taken / Snooze) come from DOSE_ALARM_CATEGORY_ID.
 * Android uses sticky + max priority so the alert behaves closer to an alarm.
 * Multiple meds at the same clock time share one notification (medicationIds).
 */
function doseContent(
  Notifications: NotificationsModule,
  meds: Pick<Medication, 'id' | 'name'>[],
  time: string,
  title: string,
  body: string,
  sound: ResolvedSound,
) {
  const medicationIds = meds.map((m) => m.id);
  return {
    title,
    body,
    sound: sound.iosSound,
    categoryIdentifier: DOSE_ALARM_CATEGORY_ID,
    interruptionLevel: 'timeSensitive' as const,
    priority: Notifications.AndroidNotificationPriority.MAX,
    sticky: Platform.OS === 'android',
    data: {
      medicationId: medicationIds[0] ?? '',
      medicationIds,
      scheduleTime: time,
      screen: 'today',
      kind: medicationIds.length > 1 ? 'dose_alarm_group' : 'dose_alarm',
    },
    ...(Platform.OS === 'android'
      ? { channelId: sound.androidChannelId || DOSE_ALARM_CHANNEL_ID }
      : {}),
  };
}

function buildDailyTrigger(
  Notifications: NotificationsModule,
  hour: number,
  minute: number,
  androidChannelId: string,
) {
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
    channelId: androidChannelId,
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
 * Same-time group alerts that also list other meds are cancelled here; a full
 * reschedule afterward rebuilds the group without this medication.
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
        const data = n.content?.data as
          | { medicationId?: string; medicationIds?: string[] }
          | undefined;
        if (data?.medicationId === medicationId) return true;
        if (Array.isArray(data?.medicationIds) && data.medicationIds.includes(medicationId)) {
          return true;
        }
        // Legacy per-med identifiers.
        return n.identifier.includes(`:${medicationId}:`);
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

type TimeSlotGroup = {
  time: string;
  hour: number;
  minute: number;
  meds: Medication[];
};

/** Group active scheduled dose slots by clock time (one alert per time). */
function collectTimeGroups(medications: Medication[]): TimeSlotGroup[] {
  const map = new Map<string, TimeSlotGroup>();
  for (const med of medications) {
    if (isAsNeededMed(med)) continue;
    if (med.reminders_enabled === false) continue;
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      const mins = scheduleTimeToMinutes(time);
      if (!Number.isFinite(mins)) continue;
      let group = map.get(time);
      if (!group) {
        group = {
          time,
          hour: Math.floor(mins / 60),
          minute: mins % 60,
          meds: [],
        };
        map.set(time, group);
      }
      group.meds.push(med);
    }
  }
  return [...map.values()].sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );
}

export type ReminderScheduleSummary = {
  scheduled: number;
  skippedOverLimit: number;
  /** One-time follow-up "still need to take it" alerts scheduled for today. */
  followups?: number;
};

/**
 * Schedules one-time "still need to take it" follow-ups for each clock time that
 * still has untaken (and unsnoozed) doses today. Multiple meds at the same time
 * share one nag — not one per medication. Respects the iOS 64-pending cap.
 */
async function scheduleDoseFollowups(args: {
  Notifications: NotificationsModule;
  activeMeds: Medication[];
  baseScheduled: number;
  takenKeys: Set<string>;
  /** Slots with an active snooze use the snooze chain instead of these follow-ups. */
  snoozedKeys: Set<string>;
  sound: ResolvedSound;
}): Promise<number> {
  const { Notifications, activeMeds, baseScheduled, takenKeys, snoozedKeys, sound } =
    args;

  const budget =
    Platform.OS === 'ios'
      ? Math.max(0, IOS_SCHEDULE_LIMIT - baseScheduled)
      : Number.POSITIVE_INFINITY;
  if (budget <= 0) return 0;

  const nowMins = currentMinutesSinceMidnight();
  const groups = collectTimeGroups(activeMeds);

  type Followup = {
    id: string;
    meds: Medication[];
    time: string;
    fireInSeconds: number;
  };
  const followups: Followup[] = [];

  for (const group of groups) {
    const pending = group.meds.filter((med) => {
      const slotKey = `${med.id}:${group.time}`;
      return !takenKeys.has(slotKey) && !snoozedKeys.has(slotKey);
    });
    if (pending.length === 0) continue;

    const slotMins = scheduleTimeToMinutes(group.time);
    if (!Number.isFinite(slotMins)) continue;

    for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
      const fireMins = slotMins + k * FOLLOWUP_INTERVAL_MIN;
      if (fireMins <= nowMins || fireMins >= 24 * 60) continue;
      followups.push({
        id: timeFollowupId(group.time, k),
        meds: pending,
        time: group.time,
        fireInSeconds: (fireMins - nowMins) * 60,
      });
    }
  }

  // Soonest first so the most imminent nags survive when the cap is tight.
  followups.sort((a, b) => a.fireInSeconds - b.fireInSeconds);

  let scheduled = 0;
  for (const followup of followups) {
    if (scheduled >= budget) break;
    const copy = doseStillDueCopy(followup.meds, followup.time);
    await Notifications.scheduleNotificationAsync({
      identifier: followup.id,
      content: doseContent(
        Notifications,
        followup.meds,
        followup.time,
        copy.title,
        copy.body,
        sound,
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

/**
 * Cancel pending alerts for one dose slot: daily reminder, follow-ups, and snooze
 * chain. Exported so marking taken can clear today's fire immediately — before the
 * slower full reschedule runs.
 *
 * Same-time doses share one daily/follow-up chain per clock time, so cancelling
 * one med clears that time's group alert; the next reschedule rebuilds it for any
 * remaining untaken meds at that time.
 */
export async function cancelDoseSlotReminders(
  medicationId: string,
  time: string,
): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;
  await cancelDoseNags(Notifications, medicationId, time);
}

/**
 * Cancel pending alerts for one dose slot: shared time-group daily/follow-ups,
 * this med's snooze chain, and legacy per-med identifiers.
 */
async function cancelDoseNags(
  Notifications: NotificationsModule,
  medicationId: string,
  time: string,
): Promise<void> {
  const ids: string[] = [
    timeDailyId(time),
    // Legacy per-med daily (pre-grouping).
    `${REMINDER_PREFIX}:${medicationId}:${time}`,
    `${SNOOZE_PREFIX}:${medicationId}:${time}`,
  ];
  for (let k = 1; k <= FOLLOWUP_COUNT; k += 1) {
    ids.push(timeFollowupId(time, k));
    ids.push(`${FOLLOWUP_PREFIX}:${medicationId}:${time}:${k}`);
    ids.push(`${SNOOZE_FOLLOWUP_PREFIX}:${medicationId}:${time}:${k}`);
  }
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/**
 * Re-arm persisted snoozes after a full reschedule wiped them. For each active
 * snooze we schedule a single future reminder (if still future). Taken or
 * orphaned snoozes are pruned.
 */
async function reapplySnoozes(args: {
  Notifications: NotificationsModule;
  activeMeds: Medication[];
  activeSnoozes: SnoozeRecord[];
  takenKeys: Set<string>;
  sound: ResolvedSound;
}): Promise<number> {
  const { Notifications, activeMeds, activeSnoozes, takenKeys, sound } = args;
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
          [med],
          snooze.scheduleTime,
          'Snoozed dose',
          `Snoozed dose is due (${formatScheduleTime(snooze.scheduleTime)}). Mark taken or Snooze again from this alert.`,
          sound,
        ),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: reminderSec,
          repeats: false,
        },
      });
      scheduled += 1;
    }

    // No +5/+10/+15 chain after a snooze — user chose a later time on purpose; the
    // Live Activity stays visible until they mark taken.
    if (!anyFuture) await removeSnooze(snooze.medicationId, snooze.scheduleTime);
  }

  return scheduled;
}

/**
 * Snooze a specific dose: cancel its remaining nags and fire one reminder at
 * `remindAt`. Persisted so it survives the reschedule triggered when other doses
 * are marked taken. No +5/+10/+15 chain — snooze means "remind me later on purpose."
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
  const sound = await resolveReminderSound();

  const { med, scheduleTime, remindAt } = args;
  const reminderSec = Math.round((remindAt.getTime() - Date.now()) / 1000);
  if (reminderSec < 1) return { ok: false, reason: 'Pick a time in the future.' };

  await cancelDoseNags(Notifications, med.id, scheduleTime);

  await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_PREFIX}:${med.id}:${scheduleTime}`,
    content: doseContent(
      Notifications,
      [med],
      scheduleTime,
      'Snoozed dose',
      `Snoozed dose is due (${formatScheduleTime(scheduleTime)}). Mark taken or Snooze again from this alert.`,
      sound,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: reminderSec,
      repeats: false,
    },
  });

  await setSnooze({
    medicationId: med.id,
    scheduleTime,
    date: todayLocalDate(),
    remindAt: remindAt.toISOString(),
  });

  await startSnoozeLiveActivity({
    medicationId: med.id,
    scheduleTime,
    medName: 'Medication',
    remindAt,
  });

  return { ok: true };
}

/**
 * Clear an active snooze for a single dose: cancels the snoozed reminder, its
 * follow-up chain, and the daily reminder for that slot, then forgets the
 * stored snooze. Callers should reschedule reminders afterward so tomorrow's
 * (or the normal daily) alert is re-armed.
 */
export async function cancelDoseSnooze(
  med: Pick<Medication, 'id'>,
  scheduleTime: string,
): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (Notifications) await cancelDoseNags(Notifications, med.id, scheduleTime);
  await removeSnooze(med.id, scheduleTime);
  try {
    await endSnoozeLiveActivity(med.id, scheduleTime);
  } catch {
    // Dose logging must succeed even if Live Activity cleanup fails.
  }
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
  const sound = await resolveReminderSound();

  const today = todayLocalDate();
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;

  const medications = openRows(
    'medications',
    (data ?? []) as Record<string, unknown>[],
  ) as Medication[];
  const active = filterMedicationsActiveOn(medications, today);
  const groups = collectTimeGroups(active);

  const { data: logs } = await supabase
    .from('dose_logs')
    .select('medication_id, schedule_time')
    .eq('user_id', userId)
    .eq('taken_on', today);
  const openedLogs = openRows(
    'dose_logs',
    (logs ?? []) as Record<string, unknown>[],
  ) as { medication_id: string; schedule_time: string }[];
  const takenKeys = new Set(
    openedLogs.map((l) => `${l.medication_id}:${l.schedule_time}`),
  );

  const activeSnoozes = await getActiveSnoozes();
  const snoozedKeys = new Set(
    activeSnoozes.map((s) => `${s.medicationId}:${s.scheduleTime}`),
  );

  let toSchedule = groups;
  let skippedOverLimit = 0;
  if (Platform.OS === 'ios' && groups.length > IOS_SCHEDULE_LIMIT) {
    skippedOverLimit = groups.length - IOS_SCHEDULE_LIMIT;
    toSchedule = groups.slice(0, IOS_SCHEDULE_LIMIT);
  }

  for (const group of toSchedule) {
    const pending = group.meds.filter(
      (med) => !takenKeys.has(`${med.id}:${group.time}`),
    );
    const contentMeds = pending.length > 0 ? pending : group.meds;
    const copy = doseDueCopy(contentMeds, group.time);
    const content = doseContent(
      Notifications,
      contentMeds,
      group.time,
      copy.title,
      copy.body,
      sound,
    );
    const id = timeDailyId(group.time);

    // All doses at this time already logged → never arm a same-day fire.
    // One-shot tomorrow only; the next full reschedule restores the daily after midnight.
    if (pending.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(group.hour, group.minute, 0, 0);
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrow,
          ...(Platform.OS === 'android'
            ? { channelId: sound.androidChannelId }
            : {}),
        },
      });
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content,
      trigger: buildDailyTrigger(
        Notifications,
        group.hour,
        group.minute,
        sound.androidChannelId,
      ),
    });
  }

  const followups = await scheduleDoseFollowups({
    Notifications,
    activeMeds: active,
    baseScheduled: toSchedule.length,
    takenKeys,
    snoozedKeys,
    sound,
  });

  await reapplySnoozes({
    Notifications,
    activeMeds: active,
    activeSnoozes,
    takenKeys,
    sound,
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
  const sound = await resolveReminderSound();

  const today = todayLocalDate();
  const { data, error } = await supabase.from('medications').select('*').eq('user_id', userId);
  if (error) return { ok: false, reason: error.message };

  const medications = openRows(
    'medications',
    (data ?? []) as Record<string, unknown>[],
  ) as Medication[];
  const active = filterMedicationsActiveOn(medications, today);
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
  // Prefer every med due at the next clock time so the test matches production grouping.
  const atSameTime = candidates.filter((c) => c.time === next.time).map((c) => c.med);
  const copy = doseDueCopy(atSameTime, next.time);
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_NEXT_DOSE_ID,
    content: doseContent(
      Notifications,
      atSameTime,
      next.time,
      copy.title,
      copy.body,
      sound,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });

  return {
    ok: true,
    label:
      atSameTime.length > 1
        ? `${atSameTime.length} doses at ${formatScheduleTime(next.time)}`
        : `${next.med.name} at ${formatScheduleTime(next.time)}`,
  };
}

const PREVIEW_ID = 'drdose-sound-preview';

/** Play a chosen reminder chime right now so the user can hear it before saving. */
export async function previewReminderSound(
  soundId: ReminderSound,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return { ok: false, reason: 'Notifications are unavailable.' };

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    return { ok: false, reason: 'Allow notifications first to preview sounds.' };
  }

  await ensureNotificationInfrastructure();
  const file = reminderSoundFile(soundId);
  const androidChannelId = await ensureDoseChannel(file);

  await Notifications.cancelScheduledNotificationAsync(PREVIEW_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: PREVIEW_ID,
    content: {
      title: 'Reminder sound',
      body: 'This is how your dose reminders will sound.',
      sound: file ?? 'default',
      interruptionLevel: 'active' as const,
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });

  return { ok: true };
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
    buildDailyTrigger(Notifications, hour, minute, DOSE_REMINDER_CHANNEL_ID),
  );
  return next ? new Date(next) : null;
}
