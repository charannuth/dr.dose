import { supabase } from '../supabase'
import { openRow, openRows, sealRow } from '../crypto/seal'

/**
 * Universal storage for every tracker (cycle, HRT, weight, and future ones):
 *  - tracker_preferences: how the user wants a tracker to work (goals, visible
 *    sections, wording, discreet mode, regimen…)
 *  - tracker_day_entries: extra per-day details beyond the tracker's core table
 *
 * Both columns are JSON encrypted client-side when the vault is unlocked.
 * If migration 030 has not been applied yet, reads fall back to defaults and
 * writes report `TrackerStoreUnavailableError`, so the core trackers keep working.
 */

export type JsonObject = Record<string, unknown>

export class TrackerStoreUnavailableError extends Error {
  constructor() {
    super(
      'Personalization and the new log fields need a quick database update (migration 030) before they can save.',
    )
    this.name = 'TrackerStoreUnavailableError'
  }
}

type PgError = { code?: string; message?: string } | null

/** Missing table / column (migration not applied). */
export function isMissingRelationError(error: PgError): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') {
    return true
  }
  const msg = (error.message ?? '').toLowerCase()
  return (
    msg.includes('tracker_preferences') ||
    msg.includes('tracker_day_entries') ||
    msg.includes('schema cache')
  )
}

function parseObject(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonObject
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as JsonObject
      }
    } catch {
      return {}
    }
  }
  return {}
}

/** Sealed objects become ciphertext strings; unsealed ones must still be text. */
function toColumnText(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? {})
}

export type PrefsResult<T> = { prefs: T; available: boolean }

export async function fetchTrackerPrefs<T extends JsonObject>(
  userId: string,
  trackerId: string,
  normalize: (raw: JsonObject) => T,
): Promise<PrefsResult<T>> {
  if (!supabase) return { prefs: normalize({}), available: false }
  const { data, error } = await supabase
    .from('tracker_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
    .maybeSingle()
  if (error) {
    if (isMissingRelationError(error)) return { prefs: normalize({}), available: false }
    throw error
  }
  if (!data) return { prefs: normalize({}), available: true }
  const row = openRow('tracker_preferences', data as JsonObject)
  return { prefs: normalize(parseObject(row.prefs)), available: true }
}

export async function saveTrackerPrefs(
  userId: string,
  trackerId: string,
  prefs: JsonObject,
): Promise<void> {
  if (!supabase) return
  const sealed = sealRow('tracker_preferences', {
    user_id: userId,
    tracker_id: trackerId,
    prefs,
  } as JsonObject)
  const { error } = await supabase
    .from('tracker_preferences')
    .upsert({ ...sealed, prefs: toColumnText(sealed.prefs) }, {
      onConflict: 'user_id,tracker_id',
    })
  if (error) {
    if (isMissingRelationError(error)) throw new TrackerStoreUnavailableError()
    throw error
  }
}

export type TrackerDayEntry<T> = { log_date: string; data: T }

export type EntriesResult<T> = { entries: TrackerDayEntry<T>[]; available: boolean }

export async function fetchTrackerDayEntries<T extends JsonObject>(
  userId: string,
  trackerId: string,
  fromDate: string,
  toDate: string,
  normalize: (raw: JsonObject) => T,
): Promise<EntriesResult<T>> {
  if (!supabase) return { entries: [], available: false }
  const { data, error } = await supabase
    .from('tracker_day_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
    .gte('log_date', fromDate)
    .lte('log_date', toDate)
    .order('log_date', { ascending: true })
  if (error) {
    if (isMissingRelationError(error)) return { entries: [], available: false }
    throw error
  }
  const rows = openRows('tracker_day_entries', (data ?? []) as JsonObject[])
  return {
    available: true,
    entries: rows.map((row) => ({
      log_date: String(row.log_date),
      data: normalize(parseObject(row.data)),
    })),
  }
}

/** Upsert a day entry; an empty object deletes the row so no blank rows linger. */
export async function saveTrackerDayEntry(
  userId: string,
  trackerId: string,
  logDate: string,
  data: JsonObject,
): Promise<void> {
  if (!supabase) return
  if (Object.keys(data).length === 0) {
    await deleteTrackerDayEntry(userId, trackerId, logDate)
    return
  }
  const sealed = sealRow('tracker_day_entries', {
    user_id: userId,
    tracker_id: trackerId,
    log_date: logDate,
    data,
  } as JsonObject)
  const { error } = await supabase
    .from('tracker_day_entries')
    .upsert({ ...sealed, data: toColumnText(sealed.data) }, {
      onConflict: 'user_id,tracker_id,log_date',
    })
  if (error) {
    if (isMissingRelationError(error)) throw new TrackerStoreUnavailableError()
    throw error
  }
}

export async function deleteTrackerDayEntry(
  userId: string,
  trackerId: string,
  logDate: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('tracker_day_entries')
    .delete()
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
    .eq('log_date', logDate)
  if (error && !isMissingRelationError(error)) throw error
}

/** Drop empty strings, empty arrays, nulls, and empty nested objects. */
export function compactEntry(data: JsonObject): JsonObject {
  const out: JsonObject = {}
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue
    if (typeof value === 'string' && !value.trim()) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = compactEntry(value as JsonObject)
      if (Object.keys(nested).length === 0) continue
      out[key] = nested
      continue
    }
    out[key] = value
  }
  return out
}
