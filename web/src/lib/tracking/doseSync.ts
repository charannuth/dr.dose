import { supabase } from '../supabase'
import type { MedicationTrackingSync } from '../types'
import { openRows, sealRow } from '../crypto/seal'

const SYNC_TO_TRACKER: Record<Exclude<MedicationTrackingSync, 'none'>, string> = {
  hrt: 'hrt',
}

export async function syncDoseLogToTracking(input: {
  userId: string
  medicationId: string
  doseLogId: string
  trackingSync: MedicationTrackingSync
  takenOn: string
  scheduleTime: string
  medicationName: string
  dosePills: string | null
  doseMg: string | null
}): Promise<void> {
  if (!supabase || input.trackingSync === 'none') return

  const trackerId = SYNC_TO_TRACKER[input.trackingSync]
  if (!trackerId) return

  const sealed = sealRow('tracker_dose_events', {
    user_id: input.userId,
    medication_id: input.medicationId,
    dose_log_id: input.doseLogId,
    tracker_id: trackerId,
    taken_on: input.takenOn,
    schedule_time: input.scheduleTime,
    medication_name: input.medicationName,
    dose_pills: input.dosePills,
    dose_mg: input.doseMg,
  })

  const { error } = await supabase.from('tracker_dose_events').upsert(sealed, {
    onConflict: 'dose_log_id,tracker_id',
  })

  if (error) throw error
}

export async function removeSyncedDoseLog(doseLogId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('tracker_dose_events')
    .delete()
    .eq('dose_log_id', doseLogId)
  if (error) throw error
}

export type TrackerDoseEvent = {
  id: string
  user_id: string
  medication_id: string
  dose_log_id: string
  tracker_id: string
  taken_on: string
  schedule_time: string
  medication_name: string
  dose_pills: string | null
  dose_mg: string | null
  created_at: string
}

export async function fetchTrackerDoseEvents(
  userId: string,
  trackerId: string,
  limit = 60,
): Promise<TrackerDoseEvent[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tracker_dose_events')
    .select('*')
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
    .order('taken_on', { ascending: false })
    .order('schedule_time', { ascending: false })
    .limit(limit)
  if (error) throw error
  return openRows(
    'tracker_dose_events',
    (data ?? []) as Record<string, unknown>[],
  ) as TrackerDoseEvent[]
}

export async function fetchTrackerDoseEventsInRange(
  userId: string,
  trackerId: string,
  start: string,
  end: string,
  limit = 500,
): Promise<TrackerDoseEvent[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('tracker_dose_events')
    .select('*')
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
    .gte('taken_on', start)
    .lte('taken_on', end)
    .order('taken_on', { ascending: true })
    .order('schedule_time', { ascending: true })
    .limit(limit)

  if (error) throw error
  return openRows(
    'tracker_dose_events',
    (data ?? []) as Record<string, unknown>[],
  ) as TrackerDoseEvent[]
}
