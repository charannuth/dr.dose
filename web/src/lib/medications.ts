import { supabase } from './supabase'
import {
  formatScheduleTime,
  normalizeScheduleTimes,
  todayLocalDate,
  currentPrnScheduleTimeToken,
} from './dates'
import { normalizeDoseFields } from './dose'
import { getDoseDeductionAmount } from './inventory'
import {
  filterMedicationsActiveOn,
  getMedicationScheduleStatus,
  isMedicationActiveOn,
  validateMedicationDates,
} from './medicationDates'
import { isAsNeededMed } from './medicationSchedule'
import type { PrnDoseLogPayload } from './prnCheckIn'
import { formatPrnDoseSummary } from './prnCheckIn'
import { syncDoseLogToTracking, removeSyncedDoseLog } from './tracking/doseSync'
import { openRow, openRows, sealRow } from './crypto/seal'
import type {
  DoseLog,
  DoseSlotStatus,
  Medication,
  MedicationInput,
  MedicationScheduleType,
  MedicationTrackingSync,
  MedicationWithStatus,
} from './types'

function newId(): string {
  return globalThis.crypto.randomUUID()
}

function normalizeScheduleType(value: string | null | undefined): MedicationScheduleType {
  return value === 'as_needed' ? 'as_needed' : 'scheduled'
}

function normalizeTrackingSync(
  value: string | null | undefined,
): MedicationTrackingSync {
  return value === 'hrt' ? 'hrt' : 'none'
}

function buildPrnSlots(logs: DoseLog[]): DoseSlotStatus[] {
  return [...logs]
    .sort((a, b) => a.schedule_time.localeCompare(b.schedule_time))
    .map((log) => {
      const summary = formatPrnDoseSummary(log)
      return {
        time: log.schedule_time,
        label: summary
          ? `${formatScheduleTime(log.schedule_time)} · ${summary}`
          : formatScheduleTime(log.schedule_time),
        taken: true,
        doseLogId: log.id,
      }
    })
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

/**
 * When schedule times change, remapping dose_logs keeps history aligned with the
 * live schedule. Must cover ALL days (not just today) — streaks and missed-dose
 * checks exact-match against current schedule_times, so leaving yesterday on the
 * old time falsely marks it missed and resets the streak.
 */
async function reconcileDoseLogsForScheduleChange(
  medicationId: string,
  oldTimes: string[],
  newTimes: string[],
): Promise<void> {
  if (!supabase) return

  const { data: logs, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('medication_id', medicationId)

  if (error) throw error
  if (!logs?.length) return

  // Both lists are clock-sorted, so pairing by position moves a retimed dose onto
  // its replacement slot. Works for uneven counts too: leftover old slots stay put
  // instead of being wiped, which is what used to reset the streak.
  const migrations = new Map<string, string>()
  for (let i = 0; i < Math.min(oldTimes.length, newTimes.length); i++) {
    if (oldTimes[i] !== newTimes[i]) migrations.set(oldTimes[i], newTimes[i])
  }

  const today = todayLocalDate()

  for (const log of openRows(
    'dose_logs',
    (logs ?? []) as Record<string, unknown>[],
  ) as DoseLog[]) {
    const migratedTo = migrations.get(log.schedule_time)
    if (migratedTo) {
      const { error: updateError } = await supabase
        .from('dose_logs')
        .update({ schedule_time: migratedTo })
        .eq('id', log.id)
      if (updateError && updateError.code !== '23505') throw updateError
      if (updateError?.code === '23505') {
        // That day already has a log on the new slot — drop the duplicate.
        await supabase.from('dose_logs').delete().eq('id', log.id)
      }
      continue
    }

    // Slot no longer exists. Clear it for today/future so the Today screen matches
    // the new schedule, but keep past logs: streaks credit finished days by dose
    // count, so deleting them would erase history the user already earned.
    if (!newTimes.includes(log.schedule_time) && log.taken_on >= today) {
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

  let meds = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  // Sort by name client-side (ciphertext can't be ordered in SQL)
  meds.sort((a, b) => a.name.localeCompare(b.name))
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
  for (const log of openRows(
    'dose_logs',
    (logsResult.data ?? []) as Record<string, unknown>[],
  ) as DoseLog[]) {
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
      const prnSlots = activeToday ? buildPrnSlots(medLogs) : []
      return {
        ...med,
        schedule_type,
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
  if (!supabase) return

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

  const id = newId()
  const sealed = sealRow('medications', {
    id,
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
    schedule_times,
    tracking_sync: input.tracking_sync ?? 'none',
    notes: input.notes.trim() || null,
    pills_remaining: input.pills_remaining,
    start_date: input.start_date,
    end_date: input.end_date,
  })

  const { error } = await supabase.from('medications').insert(sealed)

  if (error) throw error
}

export async function updateMedication(
  id: string,
  input: MedicationInput,
): Promise<void> {
  if (!supabase) return

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

  const sealed = sealRow('medications', {
    id,
    name: input.name.trim(),
    medication_route: input.medication_route,
    medication_form: input.medication_form,
    dose_pills,
    dose_mg,
    max_doses_per_day: input.max_doses_per_day,
    prn_amount_hints: input.prn_amount_hints ?? [],
    prn_symptom_hints: input.prn_symptom_hints ?? [],
    schedule_type,
    schedule_times: newTimes,
    tracking_sync: input.tracking_sync ?? 'none',
    notes: input.notes.trim() || null,
    pills_remaining: input.pills_remaining,
    start_date: input.start_date,
    end_date: input.end_date,
  })

  const { error } = await supabase.from('medications').update(sealed).eq('id', id)

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

async function fetchOpenMedication(
  medicationId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('medications')
    .select(columns)
    .eq('id', medicationId)
    .single()
  if (error) throw error
  if (!data) return null
  return openRow('medications', {
    id: medicationId,
    ...(data as unknown as Record<string, unknown>),
  })
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
  const med = await fetchOpenMedication(
    medicationId,
    'name, start_date, end_date, dose_pills, dose_mg, schedule_type, tracking_sync, max_doses_per_day',
  )

  if (!med || !isMedicationActiveOn(med as Parameters<typeof isMedicationActiveOn>[0], today)) {
    throw new Error('This medication is not active today.')
  }
  if (!isAsNeededMed(med as Parameters<typeof isAsNeededMed>[0])) {
    throw new Error('This medication uses a fixed daily schedule.')
  }

  const maxDoses = med.max_doses_per_day as number | null
  if (maxDoses != null && maxDoses > 0) {
    const { count, error: countError } = await supabase
      .from('dose_logs')
      .select('id', { count: 'exact', head: true })
      .eq('medication_id', medicationId)
      .eq('taken_on', today)
    if (countError) throw countError
    if ((count ?? 0) >= maxDoses) {
      throw new Error(`Max ${maxDoses} doses per day for this medication.`)
    }
  }

  const scheduleTime = currentPrnScheduleTimeToken()
  const amount = normalized.amount.trim() || null
  if (!amount) throw new Error('Enter how much you took.')

  const logId = newId()
  const sealedLog = sealRow('dose_logs', {
    id: logId,
    user_id: userId,
    medication_id: medicationId,
    taken_on: today,
    schedule_time: scheduleTime,
    logged_amount: amount,
    prn_symptoms: normalized.symptoms,
    prn_reason: normalized.reason.trim() || null,
    prn_notes: normalized.notes.trim() || null,
  })

  const { data: log, error } = await supabase
    .from('dose_logs')
    .insert(sealedLog)
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
    amount ?? (med.dose_pills as string | null),
    'take',
  )

  if (log?.id) {
    await syncDoseLogToTracking({
      userId,
      medicationId,
      doseLogId: log.id,
      trackingSync: normalizeTrackingSync(med.tracking_sync as string),
      takenOn: today,
      scheduleTime,
      medicationName: med.name as string,
      dosePills: amount ?? (med.dose_pills as string | null),
      doseMg: med.dose_mg as string | null,
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
  const med = await fetchOpenMedication(
    medicationId,
    'name, start_date, end_date, dose_pills, dose_mg, schedule_type, tracking_sync',
  )

  if (!med || !isMedicationActiveOn(med as Parameters<typeof isMedicationActiveOn>[0], today)) {
    throw new Error('This medication is not active today.')
  }
  if (isAsNeededMed(med as Parameters<typeof isAsNeededMed>[0])) {
    throw new Error('Use Log dose for as-needed medications.')
  }

  const logId = newId()
  const { data: log, error } = await supabase
    .from('dose_logs')
    .insert(
      sealRow('dose_logs', {
        id: logId,
        user_id: userId,
        medication_id: medicationId,
        taken_on: today,
        schedule_time: scheduleTime,
      }),
    )
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This dose is already marked as taken.')
    }
    throw error
  }

  await adjustInventoryRemaining(medicationId, med.dose_pills as string | null, 'take')

  if (log?.id) {
    await syncDoseLogToTracking({
      userId,
      medicationId,
      doseLogId: log.id,
      trackingSync: normalizeTrackingSync(med.tracking_sync as string),
      takenOn: today,
      scheduleTime,
      medicationName: med.name as string,
      dosePills: med.dose_pills as string | null,
      doseMg: med.dose_mg as string | null,
    })
  }
}

export async function undoDose(doseLogId: string, medicationId: string): Promise<void> {
  if (!supabase) return

  const med = await fetchOpenMedication(medicationId, 'dose_pills')

  const { error } = await supabase.from('dose_logs').delete().eq('id', doseLogId)
  if (error) throw error

  await removeSyncedDoseLog(doseLogId)
  await adjustInventoryRemaining(medicationId, (med?.dose_pills as string | null) ?? null, 'undo')
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
