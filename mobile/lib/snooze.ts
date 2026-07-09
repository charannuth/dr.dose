import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayLocalDate } from './dates';

/**
 * A snoozed dose. Snoozes are per-device and only meaningful for the day they
 * were created, so they live in local storage (not Supabase). Each reschedule
 * re-applies active snoozes so they survive the cancel-and-reschedule that
 * happens when any dose is marked taken.
 */
export type SnoozeRecord = {
  medicationId: string;
  /** Original scheduled slot this snooze belongs to ("HH:mm"). */
  scheduleTime: string;
  /** Local date (YYYY-MM-DD) the snooze applies to. */
  date: string;
  /** When the snoozed reminder should fire (ISO timestamp). */
  remindAt: string;
};

const KEY = 'mt-dose-snoozes';

type SnoozeMap = Record<string, SnoozeRecord>;

function keyOf(medicationId: string, scheduleTime: string): string {
  return `${medicationId}:${scheduleTime}`;
}

async function readMap(): Promise<SnoozeMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SnoozeMap;
  } catch {
    return {};
  }
}

async function writeMap(map: SnoozeMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // best-effort; a lost snooze just falls back to the normal follow-up chain
  }
}

/** Active snoozes for today. Prunes any stale-day entries as a side effect. */
export async function getActiveSnoozes(): Promise<SnoozeRecord[]> {
  const today = todayLocalDate();
  const map = await readMap();
  const kept: SnoozeMap = {};
  let changed = false;
  for (const [k, rec] of Object.entries(map)) {
    if (rec.date === today) kept[k] = rec;
    else changed = true;
  }
  if (changed) await writeMap(kept);
  return Object.values(kept);
}

export async function setSnooze(rec: SnoozeRecord): Promise<void> {
  const map = await readMap();
  map[keyOf(rec.medicationId, rec.scheduleTime)] = rec;
  await writeMap(map);
}

export async function removeSnooze(
  medicationId: string,
  scheduleTime: string,
): Promise<void> {
  const map = await readMap();
  const k = keyOf(medicationId, scheduleTime);
  if (k in map) {
    delete map[k];
    await writeMap(map);
  }
}

/** Remove every snooze belonging to a medication (e.g. when it is deleted). */
export async function removeSnoozesForMedication(medicationId: string): Promise<void> {
  const map = await readMap();
  const prefix = `${medicationId}:`;
  let changed = false;
  for (const k of Object.keys(map)) {
    if (k.startsWith(prefix)) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) await writeMap(map);
}

export async function clearAllSnoozes(): Promise<void> {
  await writeMap({});
}
