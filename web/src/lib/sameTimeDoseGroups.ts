import { formatScheduleTime, scheduleTimeToMinutes } from './dates'
import { isAsNeededMed } from './medicationSchedule'
import type { MedicationWithStatus } from './types'

export type SameTimePendingItem = { med: MedicationWithStatus; time: string }

export type SameTimeDoseGroup = {
  time: string
  label: string
  pending: SameTimePendingItem[]
}

export type ScheduleTimeSection = SameTimeDoseGroup & {
  meds: MedicationWithStatus[]
}

function pendingKey(item: SameTimePendingItem): string {
  return `${item.med.id}-${item.time}`
}

export function sameTimePendingKey(medId: string, scheduleTime: string): string {
  return `${medId}-${scheduleTime}`
}
export function buildSameTimePendingGroups(
  meds: MedicationWithStatus[],
): SameTimeDoseGroup[] {
  const byTime = new Map<string, SameTimeDoseGroup>()

  for (const med of meds) {
    if (isAsNeededMed(med)) continue
    for (const slot of med.slots ?? []) {
      if (slot.taken) continue
      const existing = byTime.get(slot.time)
      const item: SameTimePendingItem = { med, time: slot.time }
      if (existing) {
        existing.pending.push(item)
      } else {
        byTime.set(slot.time, {
          time: slot.time,
          label: slot.label || formatScheduleTime(slot.time),
          pending: [item],
        })
      }
    }
  }

  return [...byTime.values()]
    .filter((g) => g.pending.length >= 2)
    .sort((a, b) => scheduleTimeToMinutes(a.time) - scheduleTimeToMinutes(b.time))
}

/** All scheduled dose times for Today list sections (time sort). */
export function buildScheduleTimeSections(
  meds: MedicationWithStatus[],
): ScheduleTimeSection[] {
  const byTime = new Map<
    string,
    { label: string; medIds: Set<string>; meds: MedicationWithStatus[]; pending: SameTimePendingItem[] }
  >()

  for (const med of meds) {
    if (isAsNeededMed(med)) continue
    for (const slot of med.slots ?? []) {
      let bucket = byTime.get(slot.time)
      if (!bucket) {
        bucket = {
          label: slot.label || formatScheduleTime(slot.time),
          medIds: new Set(),
          meds: [],
          pending: [],
        }
        byTime.set(slot.time, bucket)
      }
      if (!bucket.medIds.has(med.id)) {
        bucket.medIds.add(med.id)
        bucket.meds.push(med)
      }
      if (!slot.taken) {
        bucket.pending.push({ med, time: slot.time })
      }
    }
  }

  return [...byTime.entries()]
    .map(([time, bucket]) => ({
      time,
      label: bucket.label,
      meds: bucket.meds,
      pending: bucket.pending,
    }))
    .sort((a, b) => scheduleTimeToMinutes(a.time) - scheduleTimeToMinutes(b.time))
}

export function sameTimePendingItemKey(medId: string, scheduleTime: string): string {
  return sameTimePendingKey(medId, scheduleTime)
}
