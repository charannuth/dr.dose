import { formatScheduleTime } from './dates'
import type { MedicationWithStatus } from './types'

export type NextDose = {
  /** `upcoming` is later today; `overdue` means its time already passed. */
  kind: 'upcoming' | 'overdue'
  time: string
  timeLabel: string
  names: string[]
}

function nowHhMm(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * The next scheduled dose still to take today. Earlier untaken doses win over
 * later ones, so a missed morning dose shows before the afternoon one.
 */
export function findNextDose(
  meds: MedicationWithStatus[],
  now: Date = new Date(),
): NextDose | null {
  const byTime = new Map<string, string[]>()
  for (const med of meds) {
    for (const slot of med.slots) {
      if (slot.taken) continue
      const names = byTime.get(slot.time) ?? []
      names.push(med.name)
      byTime.set(slot.time, names)
    }
  }
  if (byTime.size === 0) return null

  const [time] = [...byTime.keys()].sort()
  return {
    kind: time <= nowHhMm(now) ? 'overdue' : 'upcoming',
    time,
    timeLabel: formatScheduleTime(time),
    names: byTime.get(time)!,
  }
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
