import { openRows } from './crypto/seal'
import { supabase } from './supabase'
import {
  addDaysToDateString,
  formatDisplayDate,
  formatScheduleTime,
  normalizeScheduleTimes,
  scheduleTimeToMinutes,
  todayLocalDate,
  currentMinutesSinceMidnight,
} from './dates'
import { formatDoseDisplay } from './dose'
import { filterMedicationsActiveOn } from './medicationDates'
import { isAsNeededMed } from './medicationSchedule'
import type { DoseLog, Medication } from './types'

export type MissedDoseItem = {
  medicationId: string
  medicationName: string
  doseLabel: string
  scheduleTime: string
  scheduleLabel: string
  periodLabel: string
}

function logsToSet(logs: DoseLog[]): Set<string> {
  return new Set(logs.map((l) => `${l.medication_id}|${l.schedule_time}`))
}

export function findMissedForDate(
  medications: Medication[],
  logs: DoseLog[],
  date: string,
  options: { onlyPastTimesToday?: boolean },
): MissedDoseItem[] {
  const logged = logsToSet(logs)
  const missed: MissedDoseItem[] = []
  const today = todayLocalDate()
  const nowMins = currentMinutesSinceMidnight()

  for (const med of filterMedicationsActiveOn(medications, date)) {
    if (isAsNeededMed(med)) continue
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      if (logged.has(`${med.id}|${time}`)) continue

      if (options.onlyPastTimesToday && date === today) {
        const slotMins = scheduleTimeToMinutes(time)
        if (!Number.isFinite(slotMins) || slotMins > nowMins) continue
      }

      missed.push({
        medicationId: med.id,
        medicationName: med.name,
        doseLabel: formatDoseDisplay(med),
        scheduleTime: time,
        scheduleLabel: formatScheduleTime(time),
        periodLabel: formatDisplayDate(date),
      })
    }
  }

  return missed
}

export async function fetchMissedDoses(userId: string): Promise<MissedDoseItem[]> {
  if (!supabase) return []

  const today = todayLocalDate()
  const yesterday = addDaysToDateString(today, -1)

  const [medsResult, logsResult] = await Promise.all([
    supabase.from('medications').select('*').eq('user_id', userId),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .in('taken_on', [today, yesterday]),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error

  const medications = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  const logsByDate = new Map<string, DoseLog[]>()
  for (const log of openRows(
    'dose_logs',
    (logsResult.data ?? []) as Record<string, unknown>[],
  ) as DoseLog[]) {
    const list = logsByDate.get(log.taken_on) ?? []
    list.push(log)
    logsByDate.set(log.taken_on, list)
  }

  const yesterdayMissed = findMissedForDate(
    medications,
    logsByDate.get(yesterday) ?? [],
    yesterday,
    {},
  )
  const todayMissed = findMissedForDate(
    medications,
    logsByDate.get(today) ?? [],
    today,
    { onlyPastTimesToday: true },
  )

  return [...yesterdayMissed, ...todayMissed]
}
