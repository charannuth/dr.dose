export type MedicationScheduleType = 'scheduled' | 'as_needed'

export type MedicationCategory = 'medication' | 'supplement'

export function isAsNeededMed(med: {
  schedule_type?: MedicationScheduleType | string | null
}): boolean {
  return med.schedule_type === 'as_needed'
}

export function isSupplement(med: {
  category?: MedicationCategory | string | null
}): boolean {
  return med.category === 'supplement'
}

export function normalizeCategory(
  value: MedicationCategory | string | null | undefined,
): MedicationCategory {
  return value === 'supplement' ? 'supplement' : 'medication'
}

export function scheduleTypeLabel(type: MedicationScheduleType | string | null | undefined): string {
  return isAsNeededMed({ schedule_type: type }) ? 'As needed' : 'Daily schedule'
}
