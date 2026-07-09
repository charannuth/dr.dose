import type { MedicationScheduleStatus } from './medicationDates'
import type { MedicationCategory, MedicationScheduleType } from './medicationSchedule'

export type { MedicationCategory, MedicationScheduleType } from './medicationSchedule'

export type MedicationTrackingSync = 'none' | 'hrt'

export type Medication = {
  id: string
  user_id: string
  name: string
  medication_route: string | null
  medication_form: string | null
  dose_pills: string | null
  dose_mg: string | null
  max_doses_per_day: number | null
  prn_amount_hints: string[]
  prn_symptom_hints: string[]
  schedule_type: MedicationScheduleType
  category: MedicationCategory
  schedule_times: string[]
  tracking_sync: MedicationTrackingSync
  reminders_enabled: boolean
  /** Palette key for Today tile accent (e.g. routeOral). Null = derive from route. */
  tile_color: string | null
  notes: string | null
  pills_remaining: number | null
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

export type DoseLog = {
  id: string
  medication_id: string
  user_id: string
  taken_on: string
  schedule_time: string
  taken_at: string
  logged_amount: string | null
  logged_late: boolean
  prn_symptoms: string[]
  prn_reason: string | null
  prn_notes: string | null
}

export type MedicationInput = {
  name: string
  medication_route: string
  medication_form: string
  dose_pills: string
  dose_mg: string
  max_doses_per_day: number | null
  prn_amount_hints: string[]
  prn_symptom_hints: string[]
  schedule_type: MedicationScheduleType
  category: MedicationCategory
  schedule_times: string[]
  tracking_sync: MedicationTrackingSync
  /** Per-item reminder opt-out. Defaults to true when omitted. */
  reminders_enabled?: boolean
  /** Today tile accent palette key. */
  tile_color?: string | null
  notes: string
  pills_remaining: number | null
  start_date: string
  end_date: string | null
}

export type DoseSlotStatus = {
  time: string
  label: string
  taken: boolean
  doseLogId: string | null
}

export type MedicationWithStatus = Medication & {
  slots: DoseSlotStatus[]
  dosesTakenToday: number
  dosesTotalToday: number
  allDosesTakenToday: boolean
  scheduleStatus: MedicationScheduleStatus
}
