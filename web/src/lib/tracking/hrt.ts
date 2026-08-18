import { openRow, openRows, sealRow } from '../crypto/seal'
import { supabase } from '../supabase'

export type HrtDayLog = {
  user_id: string
  log_date: string
  bodily_changes: string[]
  mood_changes: string[]
  other_changes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type HrtBodilyChange =
  | 'Skin changes'
  | 'Fat distribution changes'
  | 'Body hair / hair growth changes'
  | 'Voice changes'
  | 'Muscle / strength changes'
  | 'Libido changes'
  | 'Sleep changes'
  | 'Other'

export type HrtMoodChange =
  | 'More calm'
  | 'More confident'
  | 'More anxious'
  | 'Irritable / mood swings'
  | 'Lower energy'
  | 'Higher energy'
  | 'More emotional'
  | 'Other'

export const HRT_BODILY_CHANGE_OPTIONS: readonly HrtBodilyChange[] = [
  'Skin changes',
  'Fat distribution changes',
  'Body hair / hair growth changes',
  'Voice changes',
  'Muscle / strength changes',
  'Libido changes',
  'Sleep changes',
  'Other',
] as const

export const HRT_MOOD_CHANGE_OPTIONS: readonly HrtMoodChange[] = [
  'More calm',
  'More confident',
  'More emotional',
  'More anxious',
  'Irritable / mood swings',
  'Lower energy',
  'Higher energy',
  'Other',
] as const

function normalizeHrtDayLog(row: Record<string, unknown>): HrtDayLog {
  const other = row.other_changes
  return {
    ...(row as unknown as HrtDayLog),
    bodily_changes: Array.isArray(row.bodily_changes)
      ? (row.bodily_changes as string[])
      : [],
    mood_changes: Array.isArray(row.mood_changes)
      ? (row.mood_changes as string[])
      : [],
    other_changes:
      typeof other === 'string'
        ? other
        : Array.isArray(other)
          ? (other as string[]).join('\n')
          : null,
  }
}

export async function fetchHrtDayLog(
  userId: string,
  logDate: string,
): Promise<HrtDayLog | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('hrt_day_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return normalizeHrtDayLog(
    openRow('hrt_day_logs', data as Record<string, unknown>),
  )
}

export async function upsertHrtDayLog(
  userId: string,
  logDate: string,
  patch: Partial<
    Pick<HrtDayLog, 'bodily_changes' | 'mood_changes' | 'other_changes' | 'notes'>
  >,
): Promise<void> {
  if (!supabase) return

  const sealed = sealRow('hrt_day_logs', {
    user_id: userId,
    log_date: logDate,
    bodily_changes: patch.bodily_changes ?? [],
    mood_changes: patch.mood_changes ?? [],
    other_changes: patch.other_changes?.trim() || null,
    notes: patch.notes?.trim() || null,
  })

  const { error } = await supabase.from('hrt_day_logs').upsert(sealed, {
    onConflict: 'user_id,log_date',
  })

  if (error) throw error
}

export async function fetchHrtDayLogsInRange(
  userId: string,
  start: string,
  end: string,
): Promise<HrtDayLog[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('hrt_day_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true })

  if (error) throw error
  return openRows(
    'hrt_day_logs',
    (data ?? []) as Record<string, unknown>[],
  ).map(normalizeHrtDayLog)
}

