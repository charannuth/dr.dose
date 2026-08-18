import { openRows } from './crypto/seal'
import { supabase } from './supabase'
import { lastNDays, todayLocalDate } from './dates'
import {
  countScheduledDosesTakenOnDate,
  filterMedicationsActiveOn,
} from './medicationDates'
import { isSupplement } from './medicationSchedule'
import type { DoseLog, Medication } from './types'

export type StreakDayStatus = 'perfect' | 'partial' | 'missed' | 'none'

export type StreakCalendarDay = {
  date: string
  status: StreakDayStatus
}

export type StreakStats = {
  currentStreak: number
  longestStreak: number
  todayTaken: number
  todayExpected: number
  /** Logs today that don't match the current schedule (e.g. after editing dose times). */
  todayExtraLogs: number
  todayComplete: boolean
  hasMedications: boolean
  last7Days: { date: string; perfect: boolean }[]
  consistencyCalendar: StreakCalendarDay[]
}

export const STREAK_CALENDAR_DAYS = 42

const LOOKBACK_DAYS = 365

function groupLogsByDate(logs: DoseLog[]): Map<string, DoseLog[]> {
  const map = new Map<string, DoseLog[]>()
  for (const log of logs) {
    const list = map.get(log.taken_on) ?? []
    list.push(log)
    map.set(log.taken_on, list)
  }
  return map
}

function isPerfectDay(
  medications: Medication[],
  logsForDay: DoseLog[],
  date: string,
  matchByCount = false,
): boolean {
  const { expected, taken } = countScheduledDosesTakenOnDate(
    medications,
    logsForDay,
    date,
    { matchByCount },
  )
  if (expected === 0) return false
  return taken >= expected
}

function streakDayStatus(
  medications: Medication[],
  logsForDay: DoseLog[],
  date: string,
  today: string,
): StreakDayStatus {
  const matchByCount = date !== today
  const { expected, taken } = countScheduledDosesTakenOnDate(
    medications,
    logsForDay,
    date,
    { matchByCount },
  )
  if (expected === 0) return 'none'
  if (isPerfectDay(medications, logsForDay, date, matchByCount)) return 'perfect'
  if (date === today) return 'partial'
  return taken > 0 ? 'partial' : 'missed'
}

function computeCurrentStreak(
  today: string,
  daysNewestFirst: string[],
  perfectDays: Set<string>,
): number {
  let streak = 0

  for (const date of daysNewestFirst) {
    if (date === today && !perfectDays.has(today)) {
      // Today still in progress — don't break the streak yet
      continue
    }
    if (perfectDays.has(date)) {
      streak++
    } else {
      break
    }
  }

  if (streak === 0 && perfectDays.has(today)) {
    return 1
  }

  return streak
}

function computeLongestStreak(daysOldestFirst: string[], perfectDays: Set<string>): number {
  let longest = 0
  let run = 0

  for (const date of daysOldestFirst) {
    if (perfectDays.has(date)) {
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
  }

  return longest
}

export async function fetchStreakStats(userId: string): Promise<StreakStats> {
  const empty: StreakStats = {
    currentStreak: 0,
    longestStreak: 0,
    todayTaken: 0,
    todayExpected: 0,
    todayExtraLogs: 0,
    todayComplete: false,
    hasMedications: false,
    last7Days: lastNDays(7)
      .reverse()
      .map((date) => ({ date, perfect: false })),
    consistencyCalendar: lastNDays(STREAK_CALENDAR_DAYS)
      .reverse()
      .map((date) => ({ date, status: 'none' as StreakDayStatus })),
  }

  if (!supabase) return empty

  const today = todayLocalDate()
  const daysNewestFirst = lastNDays(LOOKBACK_DAYS)
  const daysOldestFirst = [...daysNewestFirst].reverse()
  const startDate = daysOldestFirst[0]

  const [medsResult, logsResult] = await Promise.all([
    supabase.from('medications').select('*').eq('user_id', userId),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('taken_on', startDate),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error

  const allMedications = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  // Supplements are tracked separately and must not gate the medication streak.
  const medications = allMedications.filter((m) => !isSupplement(m))
  const streakMedIds = new Set(medications.map((m) => m.id))
  const logsByDate = groupLogsByDate(
    (
      openRows(
        'dose_logs',
        (logsResult.data ?? []) as Record<string, unknown>[],
      ) as DoseLog[]
    ).filter((l) => streakMedIds.has(l.medication_id)),
  )
  const todayLogs = logsByDate.get(today) ?? []
  const {
    taken: todayTaken,
    expected: todayExpected,
    extraLogs: todayExtraLogs,
  } = countScheduledDosesTakenOnDate(medications, todayLogs, today)
  const hasMedications =
    filterMedicationsActiveOn(medications, today).length > 0 && todayExpected > 0

  const todayComplete =
    hasMedications &&
    todayTaken >= todayExpected &&
    isPerfectDay(medications, todayLogs, today)

  const perfectDays = new Set<string>()
  for (const date of daysOldestFirst) {
    const logs = logsByDate.get(date) ?? []
    if (isPerfectDay(medications, logs, date, date !== today)) {
      perfectDays.add(date)
    }
  }

  const currentStreak = hasMedications
    ? computeCurrentStreak(today, daysNewestFirst, perfectDays)
    : 0
  const longestStreak = hasMedications
    ? computeLongestStreak(daysOldestFirst, perfectDays)
    : 0

  const last7 = lastNDays(7)
    .reverse()
    .map((date) => ({ date, perfect: perfectDays.has(date) }))

  const consistencyCalendar = lastNDays(STREAK_CALENDAR_DAYS)
    .reverse()
    .map((date) => ({
      date,
      status: streakDayStatus(medications, logsByDate.get(date) ?? [], date, today),
    }))

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    todayTaken,
    todayExpected,
    todayExtraLogs,
    todayComplete,
    hasMedications,
    last7Days: last7,
    consistencyCalendar,
  }
}

export function streakMessage(stats: StreakStats): string {
  if (!stats.hasMedications) {
    return 'Add medications with dose times to start earning streaks.'
  }
  if (stats.currentStreak === 0) {
    if (stats.todayComplete) {
      return 'Great job today — come back tomorrow to start a streak!'
    }
    return 'Take every scheduled dose today to start your streak.'
  }
  if (stats.todayComplete) {
    return `All doses logged today. You're on a ${stats.currentStreak} day streak!`
  }
  return `You're on a ${stats.currentStreak} day streak. Finish today's doses to keep it going.`
}
