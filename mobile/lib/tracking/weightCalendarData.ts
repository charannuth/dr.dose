import { formatWeightForUnit, normalizeBodyMetricUnit, type BodyMetricUnit } from '../bodyMetrics'
import { fetchMedicalRecord } from '../medicalRecords'
import { todayLocalDate } from '../dates'
import type { TrackingCalendarData, TrackingCalendarCell } from './calendarTypes'
import {
  type WeightLog,
  type WeightSettings,
  fetchWeightLogs,
  fetchWeightSettings,
} from './weight'
import { addDaysToDateString } from '../dates'
import { fetchTrackerPrefs } from './trackerStore'
import { normalizeWeightPrefs } from './weightPrefs'

function cellFromWeightDay(input: {
  date: string
  today: string
  settings: WeightSettings
  log: WeightLog | null
  weightUnit: BodyMetricUnit
  hideWeightNumber?: boolean
}): TrackingCalendarCell {
  const { date, today, settings, log, weightUnit, hideWeightNumber } = input

  const classNames: string[] = []
  const isFuture = date > today
  if (isFuture) classNames.push('is-future')

  const hasWeight = log?.weight_kg != null
  const hasMeals =
    (log?.breakfast_calories ?? null) != null ||
    (log?.lunch_calories ?? null) != null ||
    (log?.dinner_calories ?? null) != null
  const hasWorkout = (log?.workout_calories_burned ?? null) != null

  if (hasWeight) classNames.push('weight-logged')
  if (!hasWeight && hasMeals) classNames.push('weight-meals')
  if (hasWorkout) classNames.push('weight-workout')

  // Optional dimming: off-schedule weight days (based on frequency anchor).
  if (!isFuture) {
    const anchor = settings.log_frequency_anchor_date
    const freq = settings.log_frequency_days
    if (anchor && freq > 0 && date >= anchor && date <= today) {
      const [y1, m1, d1] = anchor.split('-').map(Number)
      const [y2, m2, d2] = date.split('-').map(Number)
      const t1 = new Date(y1, m1 - 1, d1, 12).getTime()
      const t2 = new Date(y2, m2 - 1, d2, 12).getTime()
      const days = Math.round((t2 - t1) / (24 * 60 * 60 * 1000))
      if (days % freq !== 0) classNames.push('weight-off-schedule')
    }
  }

  const markers: TrackingCalendarCell['markers'] = []
  if (hasWorkout) markers.push('heart')
  if (hasWeight || hasMeals) markers.push('dot')

  const events: TrackingCalendarCell['events'] = []
  if (hasWeight && log?.weight_kg != null) {
    const label = hideWeightNumber
      ? 'Weight logged'
      : formatWeightForUnit(log.weight_kg, weightUnit) ?? 'Weight'
    events.push({ id: 'weight', label, tone: 'weight' })
  } else if (hasMeals) {
    events.push({ id: 'meals', label: 'Meals logged', tone: 'weight' })
  }
  if (hasWorkout) {
    events.push({ id: 'workout', label: 'Workout / cardio', tone: 'weight' })
  }

  return { date, classNames, markers, events }
}

const WEIGHT_LEGEND: TrackingCalendarData['legend'] = [
  { id: 'weight', label: 'Weight logged', swatchClass: 'weight-logged' },
  { id: 'meals', label: 'Meals logged', swatchClass: 'weight-meals' },
  { id: 'workout', label: 'Workout/cardio', icon: 'heart' },
]

const EMPTY: TrackingCalendarData = {
  cells: new Map(),
  legend: WEIGHT_LEGEND,
  emptyMessage: 'No weight logs yet.',
}

function datesInRange(start: string, end: string): string[] {
  const startMs = new Date(`${start}T12:00:00`).getTime()
  const endMs = new Date(`${end}T12:00:00`).getTime()
  const n = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000))) + 1
  return Array.from({ length: n }, (_, i) => {
    const d = addDaysToDateString(start, i)
    return d
  })
}

export async function loadWeightCalendarData(
  userId: string,
  start: string,
  end: string,
): Promise<TrackingCalendarData> {
  const today = todayLocalDate()
  const [settings, logs, medical, prefs] = await Promise.all([
    fetchWeightSettings(userId),
    fetchWeightLogs(userId, start, end),
    fetchMedicalRecord(userId),
    fetchTrackerPrefs(userId, 'weight', normalizeWeightPrefs).catch(() => null),
  ])
  const weightUnit = normalizeBodyMetricUnit(medical?.weight_unit)

  const byDate = new Map<string, WeightLog>()
  for (const log of logs) byDate.set(log.log_date, log)

  const dates = datesInRange(start, end)

  const cells = new Map<string, TrackingCalendarCell>()
  for (const date of dates) {
    const cell = cellFromWeightDay({
      date,
      today,
      settings,
      log: byDate.get(date) ?? null,
      weightUnit,
      hideWeightNumber: prefs?.prefs.hideWeightNumber,
    })
    cells.set(date, cell)
  }

  return { cells, legend: WEIGHT_LEGEND, emptyMessage: EMPTY.emptyMessage }
}

