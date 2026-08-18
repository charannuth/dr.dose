import { addDaysToDateString, todayLocalDate } from '../dates'
import {
  buildCycleCalendarDays,
  fetchCycleDayLogs,
  fetchCyclePeriodsForCalendar,
  fetchCycleSettings,
  type CycleCalendarDay,
} from './cycle'
import type {
  TrackingCalendarCell,
  TrackingCalendarData,
  TrackingCalendarEvent,
} from './calendarTypes'

function phaseLabel(phase: NonNullable<CycleCalendarDay['phase']>): string {
  if (phase === 'ovulation') return 'Ovulation'
  if (phase === 'follicular') return 'Follicular'
  if (phase === 'luteal') return 'Luteal'
  return 'Menstrual'
}

function cellFromCycleDay(day: CycleCalendarDay): TrackingCalendarCell {
  const classNames: string[] = []
  // Logged / predicted period styling wins the cell; don't also paint a phase tint
  // underneath (that made "Period" labels appear on follicular-green days).
  if (day.isLoggedPeriod) {
    classNames.push('logged-period')
  } else if (day.isPredictedPeriod) {
    classNames.push('predicted-period')
  } else if (day.phase) {
    classNames.push(`phase-${day.phase}`)
  }
  if (day.isFuture) classNames.push('is-future')
  if (day.hasSymptoms) classNames.push('has-symptoms')

  const markers: TrackingCalendarCell['markers'] = []
  if (day.hasIntercourse) markers.push('heart')
  if (day.hasSymptoms) markers.push('dot')

  const events: TrackingCalendarEvent[] = []
  if (day.isLoggedPeriod) {
    events.push({ id: 'period', label: 'Period', tone: 'cycle-period' })
  } else if (day.isPredictedPeriod) {
    events.push({ id: 'predicted', label: 'Predicted period', tone: 'cycle-period' })
  } else if (day.phase) {
    events.push({
      id: `phase-${day.phase}`,
      label: phaseLabel(day.phase),
      tone: 'cycle-phase',
    })
  }
  if (day.hasSymptoms) {
    events.push({ id: 'symptoms', label: 'Symptoms', tone: 'cycle-symptom' })
  }
  if (day.hasIntercourse) {
    events.push({ id: 'intercourse', label: 'Intercourse', tone: 'cycle-symptom' })
  }

  return { date: day.date, classNames, markers, events }
}

/** Matches day-cell fills and event pills shown on the cycle calendar. */
const CYCLE_LEGEND = [
  { id: 'logged', label: 'Logged period', swatchClass: 'logged-period' },
  { id: 'predicted', label: 'Predicted period', swatchClass: 'predicted-period' },
  { id: 'follicular', label: 'Follicular', swatchClass: 'phase-follicular' },
  { id: 'ovulation', label: 'Ovulation', swatchClass: 'phase-ovulation' },
  { id: 'luteal', label: 'Luteal', swatchClass: 'phase-luteal' },
  { id: 'symptom', label: 'Symptoms', swatchClass: 'cycle-symptom' },
  { id: 'heart', label: 'Intercourse', icon: 'heart' as const },
]

export async function loadCycleCalendarData(
  userId: string,
  start: string,
  end: string,
): Promise<TrackingCalendarData> {
  const today = todayLocalDate()
  const [settings, periods, logs] = await Promise.all([
    fetchCycleSettings(userId),
    fetchCyclePeriodsForCalendar(userId, start, end),
    fetchCycleDayLogs(userId, start, end),
  ])

  const dateList = datesInRange(start, end)
  const cycleDays = buildCycleCalendarDays(
    dateList,
    periods,
    logs,
    settings,
    today,
  )

  const cells = new Map<string, TrackingCalendarCell>()
  for (const day of cycleDays) {
    cells.set(day.date, cellFromCycleDay(day))
  }

  return { cells, legend: CYCLE_LEGEND }
}

function daysBetweenInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`).getTime()
  const e = new Date(`${end}T12:00:00`).getTime()
  return Math.max(0, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1)
}

function datesInRange(start: string, end: string): string[] {
  const n = daysBetweenInclusive(start, end)
  return Array.from({ length: n }, (_, i) => addDaysToDateString(start, i))
}
