import { openRows } from './crypto/seal'
import { supabase } from './supabase'
import { formatDisplayDate, formatScheduleTime, lastNDays } from './dates'
import { formatDoseDisplay } from './dose'
import type { DoseLog, Medication } from './types'

export type HistoryEntry = {
  medicationId: string
  medicationName: string
  doseLabel: string
  scheduleLabel: string
  takenAt: string
}

export type HistoryDay = {
  date: string
  label: string
  entries: HistoryEntry[]
}

export const HISTORY_LIST_DAYS = 14
export const HISTORY_CALENDAR_DAYS = 42

export async function fetchDoseHistory(
  userId: string,
  dayCount = HISTORY_LIST_DAYS,
): Promise<HistoryDay[]> {
  if (!supabase) return []

  const days = lastNDays(dayCount)
  const startDate = days[days.length - 1]

  const [logsResult, medsResult] = await Promise.all([
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_on', startDate)
      .order('taken_on', { ascending: false })
      .order('taken_at', { ascending: false }),
    supabase
      .from('medications')
      .select('id, name, dose_pills, dose_mg')
      .eq('user_id', userId),
  ])

  if (logsResult.error) throw logsResult.error
  if (medsResult.error) throw medsResult.error

  const medMap = new Map<string, Pick<Medication, 'id' | 'name' | 'dose_pills' | 'dose_mg'>>()
  for (const med of openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Pick<Medication, 'id' | 'name' | 'dose_pills' | 'dose_mg'>[]) {
    medMap.set(med.id, med)
  }

  const logsByDate = new Map<string, HistoryEntry[]>()
  for (const log of openRows(
    'dose_logs',
    (logsResult.data ?? []) as Record<string, unknown>[],
  ) as DoseLog[]) {
    const med = medMap.get(log.medication_id)
    const entry: HistoryEntry = {
      medicationId: log.medication_id,
      medicationName: med?.name ?? 'Unknown medication',
      doseLabel: med ? formatDoseDisplay(med) : '',
      scheduleLabel: formatScheduleTime(log.schedule_time ?? '00:00'),
      takenAt: log.taken_at,
    }
    const list = logsByDate.get(log.taken_on) ?? []
    list.push(entry)
    logsByDate.set(log.taken_on, list)
  }

  return days.map((date) => ({
    date,
    label: formatDisplayDate(date),
    entries: logsByDate.get(date) ?? [],
  }))
}

export function historyStats(days: HistoryDay[]) {
  const withDoses = days.filter((d) => d.entries.length > 0).length
  const totalDoses = days.reduce((sum, d) => sum + d.entries.length, 0)
  return { daysWithDoses: withDoses, totalDoses, dayCount: days.length }
}
