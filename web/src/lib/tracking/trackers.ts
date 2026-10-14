import { supabase } from '../supabase'
import { trackerCatalogEntry, type TrackerId } from './catalog'

export async function fetchEnabledTrackers(userId: string): Promise<TrackerId[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('user_trackers')
    .select('tracker_id')
    .eq('user_id', userId)
    .order('enabled_at', { ascending: true })
  if (error) throw error
  // Trackers enabled in the mobile app that the web app can't show yet are skipped.
  return (data ?? [])
    .map((row) => row.tracker_id as TrackerId)
    .filter((id) => trackerCatalogEntry(id)?.available)
}

export async function enableTracker(userId: string, trackerId: TrackerId): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('user_trackers').upsert(
    { user_id: userId, tracker_id: trackerId },
    { onConflict: 'user_id,tracker_id' },
  )
  if (error) throw error
}

export async function disableTracker(userId: string, trackerId: TrackerId): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('user_trackers')
    .delete()
    .eq('user_id', userId)
    .eq('tracker_id', trackerId)
  if (error) throw error
}
