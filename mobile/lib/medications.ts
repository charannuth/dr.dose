import { supabase } from './supabase'
import {
  addDaysToDateString,
  formatScheduleTime,
  normalizeScheduleTimes,
  scheduleTimeToMinutes,
  todayLocalDate,
  currentPrnScheduleTimeToken,
} from './dates'
import type { MedSort } from './settings'
import { normalizeDoseFields } from './dose'
import { getDoseDeductionAmount } from './inventory'
import {
  filterMedicationsActiveOn,
  getMedicationScheduleStatus,
  isMedicationActiveOn,
  validateMedicationDates,
} from './medicationDates'
import { isAsNeededMed, isSupplement, normalizeCategory } from './medicationSchedule'
import { cancelDoseRemindersForMedication } from './reminderScheduler'
import type { PrnDoseLogPayload } from './prnCheckIn'
import { formatPrnDoseSummary } from './prnCheckIn'
import { syncDoseLogToTracking, removeSyncedDoseLog } from './tracking/doseSync'
import type {
  DoseLog,
  DoseSlotStatus,
  Medication,
  MedicationInput,
  MedicationScheduleType,
  MedicationTrackingSync,
  MedicationWithStatus,
} from './types'

function normalizeScheduleType(value: string | null | undefined): MedicationScheduleType {
  return value === 'as_needed' ? 'as_needed' : 'scheduled'
}

function normalizeTrackingSync(
  value: string | null | undefined,
): MedicationTrackingSync {
  return value === 'hrt' ? 'hrt' : 'none'
}

function buildPrnSlots(logs: DoseLog[], simpleTimeOnly = false): DoseSlotStatus[] {
  return [...logs]
    .sort((a, b) => a.schedule_time.localeCompare(b.schedule_time))
    .map((log) => {
      const timeLabel = formatScheduleTime(log.schedule_time);
      const summary = formatPrnDoseSummary(log);
      return {
        time: log.schedule_time,
        label: simpleTimeOnly
          ? timeLabel
          : summary
            ? `${timeLabel} · ${summary}`
            : timeLabel,
        taken: true,
        doseLogId: log.id,
      };
    });
}

function buildSlots(
  scheduleTimes: string[],
  logs: DoseLog[],
): DoseSlotStatus[] {
  const times = normalizeScheduleTimes(scheduleTimes)
  const logByTime = new Map(logs.map((l) => [l.schedule_time, l]))
  return times.map((time) => {
    const log = logByTime.get(time)
    return {
      time,
      label: formatScheduleTime(time),
      taken: Boolean(log),
      doseLogId: log?.id ?? null,
    }
  })
}

/** When schedule times change, move or remove today's dose logs so slots stay in sync. */
async function reconcileDoseLogsForScheduleChange(
  medicationId: string,
  oldTimes: string[],
  newTimes: string[],
): Promise<void> {
  if (!supabase) return

  const today = todayLocalDate()
  const { data: logs, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .eq('taken_on', today)

  if (error) throw error
  if (!logs?.length) return

  const migrations = new Map<string, string>()
  if (oldTimes.length === newTimes.length) {
    oldTimes.forEach((old, i) => {
      if (old !== newTimes[i]) migrations.set(old, newTimes[i])
    })
  } else if (oldTimes.length === 1 && newTimes.length === 1) {
    migrations.set(oldTimes[0], newTimes[0])
  }

  for (const log of logs as DoseLog[]) {
    const migratedTo = migrations.get(log.schedule_time)
    if (migratedTo) {
      const { error: updateError } = await supabase
        .from('dose_logs')
        .update({ schedule_time: migratedTo })
        .eq('id', log.id)
      if (updateError && updateError.code !== '23505') throw updateError
      if (updateError?.code === '23505') {
        await supabase.from('dose_logs').delete().eq('id', log.id)
      }
      continue
    }

    if (!newTimes.includes(log.schedule_time)) {
      await supabase.from('dose_logs').delete().eq('id', log.id)
    }
  }
}

export type FetchMedicationsOptions = {
  /** Defaults to today in the user's timezone. */
  forDate?: string
  /** When false (default), only meds active on forDate are returned. */
  includeInactive?: boolean
}

export async function userHasMedications(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { count, error } = await supabase
    .from('medications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function fetchMedicationsWithStatus(
  userId: string,
  options: FetchMedicationsOptions = {},
): Promise<MedicationWithStatus[]> {
  if (!supabase) return []

  const forDate = options.forDate ?? todayLocalDate()
  const includeInactive = options.includeInactive ?? false

  const [medsResult, logsResult] = await Promise.all([
    supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .order('name'),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('taken_on', forDate),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error

  let meds = (medsResult.data ?? []) as Medication[]
  if (!includeInactive) {
    meds = filterMedicationsActiveOn(meds, forDate)
  }
  for (const med of meds) {
    const cleaned = normalizeScheduleTimes(med.schedule_times ?? [])
    if (cleaned.length !== (med.schedule_times ?? []).length) {
      med.schedule_times = cleaned
      void supabase
        .from('medications')
        .update({ schedule_times: cleaned })
        .eq('id', med.id)
    }
  }

  const logsByMed = new Map<string, DoseLog[]>()
  for (const log of (logsResult.data ?? []) as DoseLog[]) {
    const list = logsByMed.get(log.medication_id) ?? []
    list.push(log)
    logsByMed.set(log.medication_id, list)
  }

  return meds.map((med) => {
    const schedule_type = normalizeScheduleType(med.schedule_type)
    const schedule_times = normalizeScheduleTimes(med.schedule_times ?? [])
    const activeToday = getMedicationScheduleStatus(med, forDate) === 'active'
    const medLogs = logsByMed.get(med.id) ?? []

    if (isAsNeededMed({ schedule_type })) {
      const prnSlots = activeToday ? buildPrnSlots(medLogs, isSupplement(med)) : []
      return {
        ...med,
        schedule_type,
        category: normalizeCategory(med.category),
        tracking_sync: normalizeTrackingSync(med.tracking_sync),
        schedule_times: [],
        slots: prnSlots,
        dosesTakenToday: prnSlots.length,
        dosesTotalToday: 0,
        allDosesTakenToday: false,
        scheduleStatus: getMedicationScheduleStatus(med, forDate),
      }
    }

    const slots = activeToday ? buildSlots(schedule_times, medLogs) : []
    const dosesTakenToday = slots.filter((s) => s.taken).length
    return {
      ...med,
      schedule_type,
      category: normalizeCategory(med.category),
      tracking_sync: normalizeTrackingSync(med.tracking_sync),
      schedule_times,
      slots,
      dosesTakenToday,
      dosesTotalToday: slots.length,
      allDosesTakenToday:
        slots.length > 0 && dosesTakenToday === slots.length,
      scheduleStatus: getMedicationScheduleStatus(med, forDate),
    }
  })
}

/**
 * For time sorting: the minutes of the earliest still-untaken dose slot. When
 * every slot is taken (or there are none), falls back to the earliest slot so
 * order stays stable. Meds with no dose times sort to the end of the timed group.
 */
function earliestRelevantMinutes(med: MedicationWithStatus): number {
  const untaken = med.slots.filter((s) => !s.taken)
  const source = untaken.length > 0 ? untaken : med.slots
  if (source.length === 0) return Number.MAX_SAFE_INTEGER
  return source.reduce((min, slot) => {
    const mins = scheduleTimeToMinutes(slot.time)
    return Number.isFinite(mins) && mins < min ? mins : min
  }, Number.MAX_SAFE_INTEGER)
}

/**
 * Sort scheduled meds for the Today list. Fully-completed meds always sink to the
 * bottom; the rest are ordered by the chosen preference (earliest upcoming dose
 * time, or alphabetically).
 */
export function sortScheduledMedications(
  medications: MedicationWithStatus[],
  sort: MedSort,
): MedicationWithStatus[] {
  return [...medications].sort((a, b) => {
    const aDone = a.allDosesTakenToday ? 1 : 0
    const bDone = b.allDosesTakenToday ? 1 : 0
    if (aDone !== bDone) return aDone - bDone

    if (sort === 'time') {
      const at = earliestRelevantMinutes(a)
      const bt = earliestRelevantMinutes(b)
      if (at !== bt) return at - bt
    }

    return a.name.localeCompare(b.name)
  })
}

/**
 * Order medications by a saved custom drag order (list of medication IDs).
 * Anything not present in the saved order (e.g. newly added meds) is appended
 * at the end, sorted by name so it stays deterministic.
 */
export function applyCustomOrder(
  medications: MedicationWithStatus[],
  orderedIds: string[],
): MedicationWithStatus[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]))
  return [...medications].sort((a, b) => {
    const ar = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER
    const br = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER
    if (ar !== br) return ar - br
    return a.name.localeCompare(b.name)
  })
}

export function todayDoseTotals(medications: MedicationWithStatus[]) {
  const scheduled = medications.filter((m) => !isAsNeededMed(m))
  const taken = scheduled.reduce((sum, m) => sum + m.dosesTakenToday, 0)
  const total = scheduled.reduce((sum, m) => sum + m.dosesTotalToday, 0)
  return { taken, total }
}

export async function createMedication(
  userId: string,
  input: MedicationInput,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { dose_pills, dose_mg } = normalizeDoseFields(
    input.dose_pills,
    input.dose_mg,
    {
      schedule_type: input.schedule_type,
      max_doses_per_day: input.max_doses_per_day,
    },
  )

  const schedule_type = input.schedule_type ?? 'scheduled'
  const schedule_times =
    schedule_type === 'as_needed'
      ? []
      : normalizeScheduleTimes(input.schedule_times)
  validateMedicationDates(input.start_date, input.end_date)

  const { error } = await supabase.from('medications').insert({
    user_id: userId,
    name: input.name.trim(),
    medication_route: input.medication_route,
    medication_form: input.medication_form,
    dose_pills,
    dose_mg,
    max_doses_per_day: input.max_doses_per_day,
    prn_amount_hints: input.prn_amount_hints ?? [],
    prn_symptom_hints: input.prn_symptom_hints ?? [],
    schedule_type,
    category: normalizeCategory(input.category),
    schedule_times,
    tracking_sync: input.tracking_sync ?? 'none',
    reminders_enabled: input.reminders_enabled ?? true,
    tile_color: input.tile_color ?? null,
    notes: input.notes.trim() || null,
    pills_remaining: input.pills_remaining,
    start_date: input.start_date,
    end_date: input.end_date,
  })

  if (error) throw error
}

export async function updateMedication(
  id: string,
  input: MedicationInput,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { dose_pills, dose_mg } = normalizeDoseFields(
    input.dose_pills,
    input.dose_mg,
    {
      schedule_type: input.schedule_type,
      max_doses_per_day: input.max_doses_per_day,
    },
  )

  const schedule_type = input.schedule_type ?? 'scheduled'
  const newTimes =
    schedule_type === 'as_needed'
      ? []
      : normalizeScheduleTimes(input.schedule_times)
  validateMedicationDates(input.start_date, input.end_date)

  const { data: existing, error: fetchError } = await supabase
    .from('medications')
    .select('schedule_times, schedule_type')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const oldTimes = normalizeScheduleTimes(existing?.schedule_times ?? [])

  const { error } = await supabase
    .from('medications')
    .update({
      name: input.name.trim(),
      medication_route: input.medication_route,
      medication_form: input.medication_form,
      dose_pills,
      dose_mg,
      max_doses_per_day: input.max_doses_per_day,
      prn_amount_hints: input.prn_amount_hints ?? [],
      prn_symptom_hints: input.prn_symptom_hints ?? [],
      schedule_type,
      category: normalizeCategory(input.category),
      schedule_times: newTimes,
      tracking_sync: input.tracking_sync ?? 'none',
      reminders_enabled: input.reminders_enabled ?? true,
      tile_color: input.tile_color ?? null,
      notes: input.notes.trim() || null,
      pills_remaining: input.pills_remaining,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .eq('id', id)

  if (error) throw error

  const scheduleChanged =
    schedule_type !== normalizeScheduleType(existing?.schedule_type) ||
    oldTimes.length !== newTimes.length ||
    oldTimes.some((t, i) => t !== newTimes[i])

  if (scheduleChanged) {
    await reconcileDoseLogsForScheduleChange(id, oldTimes, newTimes)
  }
}

/** Switch a daily-scheduled medication to as-needed (PRN) without re-entering details. */
export async function migrateMedicationToAsNeeded(medicationId: string): Promise<void> {
  if (!supabase) return

  const { data: existing, error: fetchError } = await supabase
    .from('medications')
    .select('schedule_type')
    .eq('id', medicationId)
    .single()

  if (fetchError) throw fetchError
  if (!existing || normalizeScheduleType(existing.schedule_type) === 'as_needed') {
    return
  }

  const { error } = await supabase
    .from('medications')
    .update({
      schedule_type: 'as_needed',
      schedule_times: [],
    })
    .eq('id', medicationId)

  if (error) throw error
  // Keep today's dose logs so they still show under the As needed tab.
}

const DEFAULT_DAILY_SCHEDULE_TIMES = ['08:00:00']

/** Switch an as-needed (PRN) medication to a daily schedule without re-entering details. */
export async function migrateMedicationToScheduled(
  medicationId: string,
  scheduleTimes: string[] = DEFAULT_DAILY_SCHEDULE_TIMES,
): Promise<void> {
  if (!supabase) return

  const { data: existing, error: fetchError } = await supabase
    .from('medications')
    .select('schedule_type')
    .eq('id', medicationId)
    .single()

  if (fetchError) throw fetchError
  if (!existing || normalizeScheduleType(existing.schedule_type) !== 'as_needed') {
    return
  }

  const times = normalizeScheduleTimes(scheduleTimes)
  if (times.length === 0) {
    throw new Error('Add at least one dose time.')
  }

  const { error } = await supabase
    .from('medications')
    .update({
      schedule_type: 'scheduled',
      schedule_times: times,
    })
    .eq('id', medicationId)

  if (error) throw error
  // PRN dose logs from today remain in history; edit dose times to match your routine.
}

export async function deleteMedication(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('medications').delete().eq('id', id)
  if (error) throw error
  // Stop any pending reminders/snoozes so a deleted med can't still notify.
  await cancelDoseRemindersForMedication(id)
}

async function adjustInventoryRemaining(
  medicationId: string,
  dosePills: string | null,
  direction: 'take' | 'undo',
): Promise<void> {
  if (!supabase) return

  const { data: med } = await supabase
    .from('medications')
    .select('pills_remaining')
    .eq('id', medicationId)
    .single()

  if (med?.pills_remaining == null) return

  const amount = getDoseDeductionAmount(dosePills)
  const delta = direction === 'take' ? -amount : amount
  const next = Math.max(0, Math.round(med.pills_remaining + delta))
  await supabase
    .from('medications')
    .update({ pills_remaining: next })
    .eq('id', medicationId)
}

export async function markPrnDoseTaken(
  userId: string,
  medicationId: string,
  payload: PrnDoseLogPayload | string,
): Promise<void> {
  const normalized: PrnDoseLogPayload =
    typeof payload === 'string'
      ? { amount: payload, symptoms: [], reason: '', notes: '' }
      : payload
  if (!supabase) return

  const today = todayLocalDate()
  const { data: med, error: medError } = await supabase
    .from('medications')
    .select(
      'name, start_date, end_date, dose_pills, dose_mg, schedule_type, tracking_sync, max_doses_per_day',
    )
    .eq('id', medicationId)
    .single()

  if (medError) throw medError
  if (!med || !isMedicationActiveOn(med, today)) {
    throw new Error('This medication is not active today.')
  }
  if (!isAsNeededMed(med)) {
    throw new Error('This medication uses a fixed daily schedule.')
  }

  if (med.max_doses_per_day != null && med.max_doses_per_day > 0) {
    const { count, error: countError } = await supabase
      .from('dose_logs')
      .select('id', { count: 'exact', head: true })
      .eq('medication_id', medicationId)
      .eq('taken_on', today)
    if (countError) throw countError
    if ((count ?? 0) >= med.max_doses_per_day) {
      throw new Error(`Max ${med.max_doses_per_day} doses per day for this medication.`)
    }
  }

  const scheduleTime = currentPrnScheduleTimeToken()
  const amount = normalized.amount.trim() || null
  if (!amount) throw new Error('Enter how much you took.')

  const { data: log, error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: userId,
      medication_id: medicationId,
      taken_on: today,
      schedule_time: scheduleTime,
      logged_amount: amount,
      prn_symptoms: normalized.symptoms,
      prn_reason: normalized.reason.trim() || null,
      prn_notes: normalized.notes.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Try again in a second — dose already logged.')
    }
    throw error
  }

  await adjustInventoryRemaining(
    medicationId,
    amount ?? med.dose_pills,
    'take',
  )

  if (log?.id) {
    await syncDoseLogToTracking({
      userId,
      medicationId,
      doseLogId: log.id,
      trackingSync: normalizeTrackingSync(med.tracking_sync),
      takenOn: today,
      scheduleTime,
      medicationName: med.name,
      dosePills: amount ?? med.dose_pills,
      doseMg: med.dose_mg,
    })
  }
}

export async function markDoseTaken(
  userId: string,
  medicationId: string,
  scheduleTime: string,
): Promise<void> {
  if (!supabase) return

  const today = todayLocalDate()
  const { data: med, error: medError } = await supabase
    .from('medications')
    .select(
      'name, start_date, end_date, dose_pills, dose_mg, schedule_type, tracking_sync',
    )
    .eq('id', medicationId)
    .single()

  if (medError) throw medError
  if (!med || !isMedicationActiveOn(med, today)) {
    throw new Error('This medication is not active today.')
  }
  if (isAsNeededMed(med)) {
    throw new Error('Use Log dose for as-needed medications.')
  }

  const { data: log, error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: userId,
      medication_id: medicationId,
      taken_on: today,
      schedule_time: scheduleTime,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This dose is already marked as taken.')
    }
    throw error
  }

  await adjustInventoryRemaining(medicationId, med.dose_pills, 'take')

  if (log?.id) {
    await syncDoseLogToTracking({
      userId,
      medicationId,
      doseLogId: log.id,
      trackingSync: normalizeTrackingSync(med.tracking_sync),
      takenOn: today,
      scheduleTime,
      medicationName: med.name,
      dosePills: med.dose_pills,
      doseMg: med.dose_mg,
    })
  }
}

/**
 * "Redeem your streak": mark a scheduled dose from the PREVIOUS calendar day as
 * taken after the fact. Only yesterday is allowed. The log is flagged
 * `logged_late` so the UI can permanently show it was caught up late, and the
 * streak recomputes automatically because a real dose_log now exists for that day.
 */
export async function redeemDose(
  userId: string,
  medicationId: string,
  scheduleTime: string,
  date: string,
): Promise<void> {
  if (!supabase) return

  const yesterday = addDaysToDateString(todayLocalDate(), -1)
  if (date !== yesterday) {
    throw new Error('You can only redeem doses from yesterday.')
  }

  const { data: med, error: medError } = await supabase
    .from('medications')
    .select('name, start_date, end_date, dose_pills, dose_mg, schedule_type, tracking_sync')
    .eq('id', medicationId)
    .single()

  if (medError) throw medError
  if (!med || !isMedicationActiveOn(med, date)) {
    throw new Error('This medication was not active on that day.')
  }
  if (isAsNeededMed(med)) {
    throw new Error('As-needed doses cannot be redeemed.')
  }

  const { data: log, error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: userId,
      medication_id: medicationId,
      taken_on: date,
      schedule_time: scheduleTime,
      logged_late: true,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This dose is already marked as taken.')
    }
    throw error
  }

  await adjustInventoryRemaining(medicationId, med.dose_pills, 'take')

  if (log?.id) {
    await syncDoseLogToTracking({
      userId,
      medicationId,
      doseLogId: log.id,
      trackingSync: normalizeTrackingSync(med.tracking_sync),
      takenOn: date,
      scheduleTime,
      medicationName: med.name,
      dosePills: med.dose_pills,
      doseMg: med.dose_mg,
    })
  }
}

export async function undoDose(doseLogId: string, medicationId: string): Promise<void> {
  if (!supabase) return

  const { data: med, error: medError } = await supabase
    .from('medications')
    .select('dose_pills')
    .eq('id', medicationId)
    .single()

  if (medError) throw medError

  const { error } = await supabase.from('dose_logs').delete().eq('id', doseLogId)
  if (error) throw error

  await removeSyncedDoseLog(doseLogId)
  await adjustInventoryRemaining(medicationId, med?.dose_pills ?? null, 'undo')
}

/** One-time cleanup: dedupe schedule_times in DB for a medication. */
export async function repairMedicationSchedule(medicationId: string): Promise<void> {
  if (!supabase) return

  const { data: med, error } = await supabase
    .from('medications')
    .select('schedule_times')
    .eq('id', medicationId)
    .single()

  if (error) throw error

  const cleaned = normalizeScheduleTimes(med?.schedule_times ?? [])
  if (cleaned.length === (med?.schedule_times ?? []).length) return

  await supabase
    .from('medications')
    .update({ schedule_times: cleaned })
    .eq('id', medicationId)
}
