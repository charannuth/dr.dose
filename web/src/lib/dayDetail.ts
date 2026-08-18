import { openRows } from './crypto/seal'
import { supabase } from './supabase'
import {
  formatScheduleTime,
  normalizeScheduleTimes,
} from './dates'
import { formatDoseDisplay } from './dose'
import { filterMedicationsActiveOn } from './medicationDates'
import { isAsNeededMed } from './medicationSchedule'
import {
  fetchWellnessLog,
  isWellnessLogFilled,
  logFromRow,
  type WellnessLogInput,
} from './wellness'
import type { DoseLog, Medication } from './types'

export type DayDoseSlot = {
  medicationId: string
  medicationName: string
  doseLabel: string
  scheduleTime: string
  scheduleLabel: string
  taken: boolean
  takenAt: string | null
  medicationNotes: string | null
}

export type DayDetail = {
  date: string
  slots: DayDoseSlot[]
  wellnessLog: WellnessLogInput | null
  wellnessFilled: boolean
  hasScheduledMeds: boolean
}

export async function fetchDayDetail(
  userId: string,
  date: string,
): Promise<DayDetail> {
  const empty: DayDetail = {
    date,
    slots: [],
    wellnessLog: null,
    wellnessFilled: false,
    hasScheduledMeds: false,
  }

  if (!supabase) return empty

  const [medsResult, logsResult, wellnessRow] = await Promise.all([
    supabase.from('medications').select('*').eq('user_id', userId),
    supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('taken_on', date),
    fetchWellnessLog(userId, date),
  ])

  if (medsResult.error) throw medsResult.error
  if (logsResult.error) throw logsResult.error

  const allMeds = openRows(
    'medications',
    (medsResult.data ?? []) as Record<string, unknown>[],
  ) as Medication[]
  const allLogs = openRows(
    'dose_logs',
    (logsResult.data ?? []) as Record<string, unknown>[],
  ) as DoseLog[]
  const medications = filterMedicationsActiveOn(allMeds, date)
  const logBySlot = new Map<string, DoseLog>()
  for (const log of allLogs) {
    logBySlot.set(`${log.medication_id}|${log.schedule_time}`, log)
  }

  const slots: DayDoseSlot[] = []
  for (const med of medications) {
    if (isAsNeededMed(med)) {
      const prnLogs = allLogs
        .filter((log) => log.medication_id === med.id)
        .sort((a, b) => a.schedule_time.localeCompare(b.schedule_time))
      for (const log of prnLogs) {
        slots.push({
          medicationId: med.id,
          medicationName: med.name,
          doseLabel: formatDoseDisplay(med),
          scheduleTime: log.schedule_time,
          scheduleLabel: formatScheduleTime(log.schedule_time),
          taken: true,
          takenAt: log.taken_at,
          medicationNotes: med.notes?.trim() || null,
        })
      }
      continue
    }
    for (const time of normalizeScheduleTimes(med.schedule_times ?? [])) {
      const log = logBySlot.get(`${med.id}|${time}`)
      slots.push({
        medicationId: med.id,
        medicationName: med.name,
        doseLabel: formatDoseDisplay(med),
        scheduleTime: time,
        scheduleLabel: formatScheduleTime(time),
        taken: Boolean(log),
        takenAt: log?.taken_at ?? null,
        medicationNotes: med.notes?.trim() || null,
      })
    }
  }

  const wellnessLog = wellnessRow ? logFromRow(wellnessRow) : null

  return {
    date,
    slots,
    wellnessLog,
    wellnessFilled: wellnessLog ? isWellnessLogFilled(wellnessLog) : false,
    hasScheduledMeds: slots.length > 0,
  }
}

/** Group slots by medication for display. */
export function groupDaySlotsByMedication(
  slots: DayDoseSlot[],
): { medicationId: string; medicationName: string; doseLabel: string; medicationNotes: string | null; slots: DayDoseSlot[] }[] {
  const groups = new Map<
    string,
    {
      medicationId: string
      medicationName: string
      doseLabel: string
      medicationNotes: string | null
      slots: DayDoseSlot[]
    }
  >()

  for (const slot of slots) {
    let group = groups.get(slot.medicationId)
    if (!group) {
      group = {
        medicationId: slot.medicationId,
        medicationName: slot.medicationName,
        doseLabel: slot.doseLabel,
        medicationNotes: slot.medicationNotes,
        slots: [],
      }
      groups.set(slot.medicationId, group)
    }
    group.slots.push(slot)
  }

  return [...groups.values()]
}
