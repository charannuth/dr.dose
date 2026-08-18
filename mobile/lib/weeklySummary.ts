import { openRows } from './crypto/seal'
import { supabase } from './supabase'
import { addDaysToDateString, todayLocalDate } from './dates'
import {
  countScheduledDosesTakenOnDate,
  isMedicationActiveOn,
} from './medicationDates'
import { isAsNeededMed } from './medicationSchedule'
import type { DoseLog, Medication } from './types'

export type WeeklySummary = {
  /** Scheduled slots filled vs expected across the last 7 days. */
  scheduledTaken: number
  scheduledExpected: number
  scheduledPercent: number
  /** As-needed dose logs in the last 7 days (and optional daily cap total). */
  prnTaken: number
  prnCap: number
}

function last7Days(): string[] {
  const today = todayLocalDate()
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(addDaysToDateString(today, -i))
  }
  return days
}

function groupLogsByDate(logs: DoseLog[]): Map<string, DoseLog[]> {
  const byDate = new Map<string, DoseLog[]>()
  for (const log of logs) {
    const list = byDate.get(log.taken_on) ?? []
    list.push(log)
    byDate.set(log.taken_on, list)
  }
  return byDate
}

function countPrnForDay(
  medications: Medication[],
  logsForDay: DoseLog[],
  dateStr: string,
): { taken: number; cap: number } {
  let taken = 0
  let cap = 0
  for (const med of medications) {
    if (!isMedicationActiveOn(med, dateStr) || !isAsNeededMed(med)) continue
    const dayLogs = logsForDay.filter((l) => l.medication_id === med.id)
    taken += dayLogs.length
    if (med.max_doses_per_day != null && med.max_doses_per_day > 0) {
      cap += med.max_doses_per_day
    }
  }
  return { taken, cap }
}

export async function fetchWeeklySummary(userId: string): Promise<WeeklySummary> {
  const empty: WeeklySummary = {
    scheduledTaken: 0,
    scheduledExpected: 0,
    scheduledPercent: 0,
    prnTaken: 0,
    prnCap: 0,
  }

  if (!supabase) return empty

  const days = last7Days()
  const start = days[0]
  const end = days[days.length - 1]

  const [medsResult, logsResult] = await Promise.all([
    supabase.from('medications').select('*').eq('user_id', userId),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_on', start)
      .lte('taken_on', end),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error

  const medications = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  const logsByDate = groupLogsByDate(
    openRows(
      'dose_logs',
      (logsResult.data ?? []) as Record<string, unknown>[],
    ) as DoseLog[],
  )

  let scheduledTaken = 0
  let scheduledExpected = 0
  let prnTaken = 0
  let prnCap = 0

  for (const date of days) {
    const dayLogs = logsByDate.get(date) ?? []
    const scheduled = countScheduledDosesTakenOnDate(medications, dayLogs, date)
    scheduledTaken += scheduled.taken
    scheduledExpected += scheduled.expected

    const prn = countPrnForDay(medications, dayLogs, date)
    prnTaken += prn.taken
    prnCap += prn.cap
  }

  const scheduledPercent =
    scheduledExpected > 0
      ? Math.min(100, Math.round((scheduledTaken / scheduledExpected) * 100))
      : 0

  return {
    scheduledTaken,
    scheduledExpected,
    scheduledPercent,
    prnTaken,
    prnCap,
  }
}
