import { openRows } from '../crypto/seal'
import { supabase } from '../supabase'
import { todayLocalDate, normalizeScheduleTimes } from '../dates'
import type { DoseLog, Medication } from '../types'
import { isAsNeededMed } from '../medicationSchedule'
import {
  countScheduledDosesTakenOnDate,
  filterMedicationsActiveOn,
} from '../medicationDates'
import { findMissedForDate } from '../missedDoses'
import type { TrackingCalendarCell, TrackingCalendarData } from './calendarTypes'

function groupLogsByDate(logs: DoseLog[]): Map<string, DoseLog[]> {
  const map = new Map<string, DoseLog[]>()
  for (const log of logs) {
    const list = map.get(log.taken_on) ?? []
    list.push(log)
    map.set(log.taken_on, list)
  }
  return map
}

function isPerfectDay(medications: Medication[], logsForDay: DoseLog[], date: string): boolean {
  const active = filterMedicationsActiveOn(medications, date)
  const expected = countScheduledDosesTakenOnDate(medications, logsForDay, date).expected
  if (expected === 0) return false

  const logged = new Set(logsForDay.map((l) => `${l.medication_id}|${l.schedule_time}`))
  for (const med of active) {
    if (isAsNeededMed(med)) continue
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      if (!logged.has(`${med.id}|${time}`)) return false
    }
  }
  return true
}


function buildMedProgressCell(
  date: string,
  today: string,
  medications: Medication[],
  logsForDay: DoseLog[],
): TrackingCalendarCell {
  const isFuture = date > today
  const { expected, taken } = countScheduledDosesTakenOnDate(
    medications,
    logsForDay,
    date,
  )

  if (expected === 0) {
    return {
      date,
      classNames: isFuture ? ['is-future'] : [],
      markers: [],
      events: [],
    }
  }

  const missed = isFuture
    ? 0
    : findMissedForDate(medications, logsForDay, date, {
        onlyPastTimesToday: date === today,
      }).length

  const classNames: string[] = []
  if (isFuture) classNames.push('is-future')

  const events: TrackingCalendarCell['events'] = []
  const markers: TrackingCalendarCell['markers'] = []

  if (isPerfectDay(medications, logsForDay, date)) {
    classNames.push('med-perfect')
    markers.push('dot')
    events.push({ id: 'perfect', label: 'All doses taken', tone: 'med-perfect' })
  } else if (isFuture) {
    events.push({
      id: 'future-empty',
      label: 'No doses logged yet',
      tone: 'med-partial',
    })
  } else if (missed > 0 && taken === 0) {
    classNames.push('med-missed')
    markers.push('heart')
    events.push({
      id: 'missed',
      label: 'Missed doses',
      tone: 'med-missed',
    })
  } else if (missed > 0) {
    classNames.push('med-partial')
    markers.push('dot')
    if (taken > 0) {
      events.push({
        id: 'progress',
        label: `${taken}/${expected} doses`,
        tone: 'med-partial',
      })
    }
    events.push({
      id: 'missed-partial',
      label: missed === 1 ? '1 missed' : `${missed} missed`,
      tone: 'med-missed',
    })
  } else if (date === today) {
    classNames.push('med-partial')
    markers.push('dot')
    events.push({
      id: 'progress',
      label: `${taken}/${expected} doses`,
      tone: 'med-partial',
    })
  }

  return { date, classNames, markers, events }
}

function datesInRange(start: string, end: string): string[] {
  const startMs = new Date(`${start}T12:00:00`).getTime()
  const endMs = new Date(`${end}T12:00:00`).getTime()
  const n = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000))) + 1
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

const LEGEND: TrackingCalendarData['legend'] = [
  { id: 'perfect', label: 'All doses taken', swatchClass: 'med-perfect' },
  { id: 'partial', label: 'Some doses taken', swatchClass: 'med-partial' },
  { id: 'missed', label: 'Missed doses', swatchClass: 'med-missed' },
]

export async function loadMedProgressCalendarData(
  userId: string,
  start: string,
  end: string,
): Promise<TrackingCalendarData> {
  const today = todayLocalDate()
  if (!supabase) {
    return { cells: new Map(), legend: LEGEND, emptyMessage: 'No medication data.' }
  }

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

  const cells = new Map<string, TrackingCalendarCell>()
  for (const date of datesInRange(start, end)) {
    const logsForDay = logsByDate.get(date) ?? []
    cells.set(
      date,
      buildMedProgressCell(date, today, medications, logsForDay),
    )
  }

  return {
    cells,
    legend: LEGEND,
    emptyMessage: 'No medication progress data for this range yet.',
  }
}
