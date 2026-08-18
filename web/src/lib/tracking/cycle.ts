import { supabase } from '../supabase'
import { openRows, sealRow, openRow } from '../crypto/seal'
import { todayLocalDate } from '../dates'
import {
  addDaysToDate,
  anchorPeriodStart,
  computePeriodPrediction,
  cycleDayNumber,
  daysBetween,
  effectiveCycleLengthForPrediction,
  estimatedPhaseForDate,
  phaseForCycleDay,
  type CycleLengthSource,
  type CyclePhase,
  type PeriodPrediction,
} from './cyclePhases'

export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy'

export type SymptomTiming = 'pre' | 'during' | 'post'

export type CycleSettings = {
  user_id: string
  avg_cycle_length: number
  avg_period_length: number
  expected_next_cycle_days: number | null
  period_late: boolean
  late_marked_on: string | null
  prediction_push_days: number
  /** User-added labels shown with defaults until the user removes them. */
  custom_symptoms_pre: string[]
  custom_symptoms_during: string[]
  updated_at: string
}

export type CyclePeriod = {
  id: string
  user_id: string
  started_on: string
  ended_on: string | null
  cycle_length_days: number | null
  created_at: string
}

export type CycleDayLog = {
  user_id: string
  log_date: string
  flow_level: FlowLevel | null
  symptoms: string[]
  symptoms_pre: string[]
  symptoms_post: string[]
  intercourse: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export const CYCLE_SYMPTOMS_PRE = [
  'Cramps',
  'Bloating',
  'Mood changes',
  'Fatigue',
  'Breast tenderness',
  'Food cravings',
  'Irritability',
  'Headache',
  'Acne',
] as const

export const CYCLE_SYMPTOMS_DURING = [
  'Cramps',
  'Heavy flow',
  'Clots',
  'Fatigue',
  'Headache',
  'Back pain',
  'Nausea',
] as const

export const CYCLE_SYMPTOMS_POST = [
  'Spotting',
  'Bloating',
  'Mood changes',
  'Fatigue',
  'Breast tenderness',
  'Cramping',
] as const

const DEFAULT_SETTINGS: Omit<CycleSettings, 'user_id' | 'updated_at'> = {
  avg_cycle_length: 28,
  avg_period_length: 5,
  expected_next_cycle_days: null,
  period_late: false,
  late_marked_on: null,
  prediction_push_days: 0,
  custom_symptoms_pre: [],
  custom_symptoms_during: [],
}

/** Trim, dedupe, and drop labels that match built-in defaults. */
export function normalizeCustomSymptoms(
  list: unknown,
  defaults: readonly string[],
): string[] {
  const defaultKeys = new Set(defaults.map((s) => s.toLowerCase()))
  const out: string[] = []
  const seen = new Set<string>()
  if (!Array.isArray(list)) return out
  for (const raw of list) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (defaultKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function mergeSymptomOptions(
  defaults: readonly string[],
  custom: readonly string[],
): string[] {
  return [...defaults, ...normalizeCustomSymptoms(custom, defaults)]
}

export type CycleCalendarDay = {
  date: string
  phase: CyclePhase | null
  isLoggedPeriod: boolean
  isPredictedPeriod: boolean
  isFuture: boolean
  hasSymptoms: boolean
  hasIntercourse: boolean
}

export async function fetchCycleSettings(userId: string): Promise<CycleSettings> {
  if (!supabase) {
    return {
      user_id: userId,
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('cycle_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) {
    return normalizeSettings(
      openRow('cycle_settings', data as Record<string, unknown>) as unknown as CycleSettings,
    )
  }

  const { data: inserted, error: insertError } = await supabase
    .from('cycle_settings')
    .insert({ user_id: userId, ...DEFAULT_SETTINGS })
    .select('*')
    .single()

  if (insertError) throw insertError
  return normalizeSettings(
    openRow('cycle_settings', inserted as Record<string, unknown>) as unknown as CycleSettings,
  )
}

function normalizeSettings(row: CycleSettings): CycleSettings {
  return {
    ...row,
    expected_next_cycle_days: row.expected_next_cycle_days ?? null,
    period_late: row.period_late ?? false,
    late_marked_on: row.late_marked_on ?? null,
    prediction_push_days: row.prediction_push_days ?? 0,
    custom_symptoms_pre: normalizeCustomSymptoms(
      row.custom_symptoms_pre,
      CYCLE_SYMPTOMS_PRE,
    ),
    custom_symptoms_during: normalizeCustomSymptoms(
      row.custom_symptoms_during,
      CYCLE_SYMPTOMS_DURING,
    ),
  }
}

export async function updateCycleSettings(
  userId: string,
  patch: Partial<
    Pick<
      CycleSettings,
      | 'avg_cycle_length'
      | 'avg_period_length'
      | 'expected_next_cycle_days'
      | 'period_late'
      | 'late_marked_on'
      | 'prediction_push_days'
      | 'custom_symptoms_pre'
      | 'custom_symptoms_during'
    >
  >,
): Promise<void> {
  if (!supabase) return
  await fetchCycleSettings(userId)
  const cleaned: typeof patch = { ...patch }
  if (cleaned.custom_symptoms_pre) {
    cleaned.custom_symptoms_pre = normalizeCustomSymptoms(
      cleaned.custom_symptoms_pre,
      CYCLE_SYMPTOMS_PRE,
    )
  }
  if (cleaned.custom_symptoms_during) {
    cleaned.custom_symptoms_during = normalizeCustomSymptoms(
      cleaned.custom_symptoms_during,
      CYCLE_SYMPTOMS_DURING,
    )
  }
  const sealed = sealRow('cycle_settings', {
    ...cleaned,
  } as Record<string, unknown>)
  const { error } = await supabase
    .from('cycle_settings')
    .update(sealed)
    .eq('user_id', userId)
  if (error) throw error
}

export async function fetchCyclePeriods(userId: string, limit = 60): Promise<CyclePeriod[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cycle_periods')
    .select('*')
    .eq('user_id', userId)
    .order('started_on', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as CyclePeriod[]
}

/** Periods that overlap a calendar window (including still-open periods). */
export async function fetchCyclePeriodsInRange(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<CyclePeriod[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cycle_periods')
    .select('*')
    .eq('user_id', userId)
    .lte('started_on', rangeEnd)
    .or(`ended_on.is.null,ended_on.gte.${rangeStart}`)
    .order('started_on', { ascending: false })
    .limit(120)
  if (error) throw error
  return (data ?? []) as CyclePeriod[]
}

/** Periods for calendar paint + prediction (range overlap ∪ recent history). */
export async function fetchCyclePeriodsForCalendar(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<CyclePeriod[]> {
  const [recent, inRange] = await Promise.all([
    fetchCyclePeriods(userId, 36),
    fetchCyclePeriodsInRange(userId, rangeStart, rangeEnd),
  ])
  const byId = new Map<string, CyclePeriod>()
  for (const p of [...recent, ...inRange]) byId.set(p.id, p)
  return [...byId.values()].sort((a, b) =>
    a.started_on < b.started_on ? 1 : a.started_on > b.started_on ? -1 : 0,
  )
}

export async function fetchOpenPeriod(userId: string): Promise<CyclePeriod | null> {
  const periods = await fetchCyclePeriods(userId, 3)
  const open = periods.find((p) => !p.ended_on)
  return open ?? null
}

export async function startPeriod(userId: string, startedOn = todayLocalDate()): Promise<void> {
  if (!supabase) return
  const open = await fetchOpenPeriod(userId)
  if (open) {
    throw new Error('A period is already open. End it before starting a new one.')
  }

  const previous = await fetchCyclePeriods(userId, 1)
  const prevStart = previous[0]?.started_on
  let cycle_length_days: number | null = null
  if (prevStart) {
    const days = daysBetween(prevStart, startedOn)
    if (days >= 15 && days <= 90) cycle_length_days = days
  }

  const { error } = await supabase.from('cycle_periods').insert({
    user_id: userId,
    started_on: startedOn,
    cycle_length_days,
  })
  if (error) throw error

  await updateCycleSettings(userId, {
    period_late: false,
    late_marked_on: null,
    prediction_push_days: 0,
    expected_next_cycle_days: null,
  })
}

export async function endPeriod(
  userId: string,
  endedOn = todayLocalDate(),
): Promise<void> {
  if (!supabase) return
  const open = await fetchOpenPeriod(userId)
  if (!open) throw new Error('No open period to end.')

  if (endedOn < open.started_on) {
    throw new Error('End date cannot be before period start.')
  }

  const { error } = await supabase
    .from('cycle_periods')
    .update({ ended_on: endedOn })
    .eq('id', open.id)
  if (error) throw error
}

export async function deletePeriod(userId: string, periodId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('cycle_periods')
    .delete()
    .eq('id', periodId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Remove the current in-progress period (undo “Period started”). */
export async function cancelOpenPeriod(userId: string): Promise<void> {
  const open = await fetchOpenPeriod(userId)
  if (!open) throw new Error('No period in progress to undo.')
  await deletePeriod(userId, open.id)
}

/** Reopen the most recently ended period (undo “Period ended”). */
export async function undoLastPeriodEnd(userId: string): Promise<void> {
  if (!supabase) return
  const open = await fetchOpenPeriod(userId)
  if (open) throw new Error('End the current period before undoing a previous end.')

  const periods = await fetchCyclePeriods(userId, 5)
  const lastClosed = periods.find((p) => p.ended_on)
  if (!lastClosed) throw new Error('No completed period to reopen.')

  const { error } = await supabase
    .from('cycle_periods')
    .update({ ended_on: null })
    .eq('id', lastClosed.id)
    .eq('user_id', userId)
  if (error) throw error
}

/** Delete the latest period record (wrong start logged). */
export async function deleteMostRecentPeriod(userId: string): Promise<void> {
  const periods = await fetchCyclePeriods(userId, 1)
  const latest = periods[0]
  if (!latest) throw new Error('No period records to remove.')
  await deletePeriod(userId, latest.id)
}

export async function updatePeriodStart(
  userId: string,
  periodId: string,
  startedOn: string,
): Promise<void> {
  if (!supabase) return
  const open = await fetchOpenPeriod(userId)
  if (!open || open.id !== periodId) {
    throw new Error('Only the current open period can be edited.')
  }

  const periods = await fetchCyclePeriods(userId, 24)
  const previous = periods
    .filter((p) => p.id !== periodId && p.started_on < startedOn)
    .sort((a, b) => b.started_on.localeCompare(a.started_on))[0]
  let cycle_length_days: number | null = null
  if (previous) {
    const days = daysBetween(previous.started_on, startedOn)
    if (days >= 15 && days <= 90) cycle_length_days = days
  }

  const { error } = await supabase
    .from('cycle_periods')
    .update({ started_on: startedOn, cycle_length_days })
    .eq('id', periodId)
    .eq('user_id', userId)
  if (error) throw error

  await updateCycleSettings(userId, {
    period_late: false,
    late_marked_on: null,
    prediction_push_days: 0,
    expected_next_cycle_days: null,
  })
}

export async function updatePeriodEnd(
  userId: string,
  periodId: string,
  endedOn: string,
): Promise<void> {
  if (!supabase) return
  const periods = await fetchCyclePeriods(userId, 24)
  const period = periods.find((p) => p.id === periodId)
  if (!period?.ended_on) {
    throw new Error('Only a completed period end date can be edited.')
  }
  if (endedOn < period.started_on) {
    throw new Error('End date cannot be before period start.')
  }

  const { error } = await supabase
    .from('cycle_periods')
    .update({ ended_on: endedOn })
    .eq('id', periodId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteCycleDayLog(userId: string, logDate: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('cycle_day_logs')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', logDate)
  if (error) throw error
}

/**
 * Soft clear: remove symptoms, intercourse, and notes but keep flow for this day.
 * Period calendar bleeding from a period record is unchanged.
 */
export async function softClearCycleDayLog(
  userId: string,
  logDate: string,
  keepFlow: FlowLevel | null,
): Promise<void> {
  await upsertCycleDayLog(userId, logDate, {
    flow_level: keepFlow,
    symptoms: [],
    symptoms_pre: [],
    symptoms_post: [],
    intercourse: false,
    notes: null,
  })
}

export function cycleDayHasOptionalData(log: CycleDayLog | undefined): boolean {
  if (!log) return false
  return Boolean(
    log.intercourse ||
      log.notes?.trim() ||
      log.symptoms.length > 0 ||
      log.symptoms_pre.length > 0 ||
      log.symptoms_post.length > 0,
  )
}

export function cycleDayHasAnyData(log: CycleDayLog | undefined): boolean {
  if (!log) return false
  return Boolean(log.flow_level || cycleDayHasOptionalData(log))
}

export async function clearPeriodLate(userId: string): Promise<void> {
  await updateCycleSettings(userId, {
    period_late: false,
    late_marked_on: null,
    prediction_push_days: 0,
  })
}

export async function fetchCycleDayLogs(
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<CycleDayLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cycle_day_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', fromDate)
    .lte('log_date', toDate)
    .order('log_date', { ascending: true })
  if (error) throw error
  return openRows(
    'cycle_day_logs',
    (data ?? []) as Record<string, unknown>[],
  ).map(normalizeDayLog)
}

function normalizeDayLog(row: Record<string, unknown>): CycleDayLog {
  return {
    ...(row as unknown as CycleDayLog),
    symptoms: Array.isArray(row.symptoms) ? (row.symptoms as string[]) : [],
    symptoms_pre: Array.isArray(row.symptoms_pre)
      ? (row.symptoms_pre as string[])
      : [],
    symptoms_post: Array.isArray(row.symptoms_post)
      ? (row.symptoms_post as string[])
      : [],
    intercourse: Boolean(row.intercourse),
  }
}

export async function upsertCycleDayLog(
  userId: string,
  logDate: string,
  patch: {
    flow_level?: FlowLevel | null
    symptoms?: string[]
    symptoms_pre?: string[]
    symptoms_post?: string[]
    intercourse?: boolean
    notes?: string | null
  },
): Promise<void> {
  if (!supabase) return
  const sealed = sealRow('cycle_day_logs', {
    user_id: userId,
    log_date: logDate,
    flow_level: patch.flow_level ?? null,
    symptoms: patch.symptoms ?? [],
    symptoms_pre: patch.symptoms_pre ?? [],
    symptoms_post: patch.symptoms_post ?? [],
    intercourse: patch.intercourse ?? false,
    notes: patch.notes?.trim() || null,
  })
  const { error } = await supabase.from('cycle_day_logs').upsert(sealed, {
    onConflict: 'user_id,log_date',
  })
  if (error) throw error
}

export function bleedingDatesFromPeriods(
  periods: CyclePeriod[],
  throughDate: string,
): Set<string> {
  const set = new Set<string>()
  for (const period of periods) {
    // Closed periods paint their full span; open ones paint through today (or
    // throughDate) so history stays accurate without inventing future bleeding.
    const end = period.ended_on ?? throughDate
    if (end < period.started_on) continue
    const paintUntil = period.ended_on != null ? end : throughDate
    let cursor = period.started_on
    while (cursor <= paintUntil) {
      set.add(cursor)
      cursor = addDaysToDate(cursor, 1)
    }
  }
  return set
}

export function loggedFlowDates(logs: CycleDayLog[]): Set<string> {
  const set = new Set<string>()
  for (const log of logs) {
    if (log.flow_level) set.add(log.log_date)
  }
  return set
}

export function loggedPeriodDates(
  periods: CyclePeriod[],
  logs: CycleDayLog[],
  throughDate: string,
): Set<string> {
  const set = bleedingDatesFromPeriods(periods, throughDate)
  for (const d of loggedFlowDates(logs)) set.add(d)
  return set
}

export function predictedPeriodDateSet(
  prediction: PeriodPrediction,
): Set<string> {
  const set = new Set<string>()
  if (!prediction.nextStart || !prediction.nextEnd) return set
  let cursor = prediction.nextStart
  while (cursor <= prediction.nextEnd) {
    set.add(cursor)
    cursor = addDaysToDate(cursor, 1)
  }
  return set
}

/** Predicted period bleeding days for every cycle that overlaps a calendar range. */
export function predictedPeriodDatesInRange(
  rangeStart: string,
  rangeEnd: string,
  prediction: PeriodPrediction,
  cycleLengthDays: number,
  periodLengthDays: number,
  /** Past predicted days before this date are dropped (stale forecasts). */
  todayFloor: string,
): Set<string> {
  const set = new Set<string>()
  if (!prediction.nextStart || cycleLengthDays < 1) return set

  let cycleStart = prediction.nextStart
  const periodSpan = Math.max(1, periodLengthDays)

  while (cycleStart <= rangeEnd) {
    const cycleEnd = addDaysToDate(cycleStart, periodSpan - 1)
    let cursor = cycleStart
    while (cursor <= cycleEnd) {
      if (
        cursor >= rangeStart &&
        cursor <= rangeEnd &&
        cursor >= todayFloor
      ) {
        set.add(cursor)
      }
      cursor = addDaysToDate(cursor, 1)
    }
    cycleStart = addDaysToDate(cycleStart, cycleLengthDays)
  }

  return set
}

export function buildCycleCalendarDays(
  dates: string[],
  periods: CyclePeriod[],
  logs: CycleDayLog[],
  settings: CycleSettings,
  today: string,
): CycleCalendarDay[] {
  const anchor = anchorPeriodStart(periods)
  const prediction = computePeriodPrediction(periods, settings, today)
  const effectiveLen = effectiveCycleLengthForPrediction(settings, periods)
  const loggedPeriod = loggedPeriodDates(periods, logs, today)
  const rangeStart = dates[0] ?? today
  const rangeEnd = dates[dates.length - 1] ?? today
  const predicted = predictedPeriodDatesInRange(
    rangeStart,
    rangeEnd,
    prediction,
    effectiveLen.days,
    settings.avg_period_length,
    today,
  )
  const open = periods.some((p) => !p.ended_on)
  const logByDate = new Map(logs.map((l) => [l.log_date, l]))

  return dates.map((date) => {
    const log = logByDate.get(date)
    const isFuture = date > today
    const isLoggedPeriod = loggedPeriod.has(date)
    const isPredictedPeriod = predicted.has(date) && !isLoggedPeriod

    let phase: CyclePhase | null = null
    if (open && anchor) {
      const day = cycleDayNumber(anchor, date)
      if (day >= 1 && day <= effectiveLen.days + 21) {
        phase = phaseForCycleDay(day, settings, effectiveLen.days)
      }
    } else if (anchor && !open) {
      phase = estimatedPhaseForDate(date, anchor, settings, effectiveLen.days)
    }

    const hasSymptoms = Boolean(
      log &&
        (log.symptoms.length > 0 ||
          log.symptoms_pre.length > 0 ||
          log.symptoms_post.length > 0),
    )

    return {
      date,
      phase,
      isLoggedPeriod,
      isPredictedPeriod,
      isFuture,
      hasSymptoms,
      hasIntercourse: log?.intercourse ?? false,
    }
  })
}

export function getCyclePrediction(
  periods: CyclePeriod[],
  settings: CycleSettings,
  today = todayLocalDate(),
): PeriodPrediction {
  return computePeriodPrediction(periods, settings, today)
}

export {
  computePeriodPrediction,
  effectiveCycleLengthForPrediction,
  recentCycleLengths,
  type CycleLengthSource,
  type CyclePhase,
  type EffectiveCycleLength,
  type PeriodPrediction,
} from './cyclePhases'
export {
  PHASE_HINTS,
  PHASE_LABELS,
} from './cyclePhases'

export function cycleLengthSourceLabel(source: CycleLengthSource): string {
  switch (source) {
    case 'override':
      return 'your expected length for this cycle'
    case 'recent':
      return 'your recent cycles'
    case 'average':
      return 'your average cycle length'
  }
}

/** Apply optional extra days when marking late (updates prediction push). */
export async function markPeriodLate(
  userId: string,
  extraDays?: number,
): Promise<PeriodPrediction> {
  const today = todayLocalDate()
  const [settings, periods] = await Promise.all([
    fetchCycleSettings(userId),
    fetchCyclePeriods(userId),
  ])
  const prediction = computePeriodPrediction(periods, settings, today)
  if (!prediction.nextStart) {
    throw new Error('Log at least one period start before marking late.')
  }

  const bump = extraDays ?? Math.max(3, prediction.daysLate || 3)
  const newPush = settings.prediction_push_days + bump

  await updateCycleSettings(userId, {
    period_late: true,
    late_marked_on: today,
    prediction_push_days: newPush,
  })

  const updated = await fetchCycleSettings(userId)
  return computePeriodPrediction(periods, updated, today)
}

export function cycleDayInPeriod(
  dateStr: string,
  periods: CyclePeriod[],
): CyclePeriod | null {
  for (const period of periods) {
    const end = period.ended_on ?? dateStr
    if (dateStr >= period.started_on && dateStr <= end) return period
  }
  return null
}

/** @deprecated Use getCyclePrediction */
export function predictNextPeriodStart(
  periods: CyclePeriod[],
  settings: CycleSettings,
): string | null {
  return computePeriodPrediction(periods, settings, todayLocalDate()).nextStart
}
