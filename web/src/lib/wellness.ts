import { openRow, openRows, sealRow } from './crypto/seal'
import { supabase } from './supabase'
import { localDateString, todayLocalDate } from './dates'
import type { SubstanceKey } from './medicationSafetyReview'

export const WELLNESS_SYMPTOM_OPTIONS = [
  'Fatigue',
  'Nausea',
  'Dizziness',
  'Headache',
  'Sleep trouble',
  'Mood changes',
  'Stomach upset',
] as const

export type WellnessSymptom = (typeof WELLNESS_SYMPTOM_OPTIONS)[number]

const PRESET_SYMPTOM_SET = new Set<string>(WELLNESS_SYMPTOM_OPTIONS)

export function isPresetWellnessSymptom(symptom: string): boolean {
  return PRESET_SYMPTOM_SET.has(symptom)
}

/** Unique chip labels: presets, then profile/custom entries. */
export function buildSymptomChipOptions(
  selected: string[],
  trackedFromProfile: string[] = [],
): string[] {
  return buildPresetSymptomChipOptions(selected, [
    ...WELLNESS_SYMPTOM_OPTIONS,
    ...trackedFromProfile,
  ])
}

/** Chip list from explicit presets only (e.g. PRN medication symptoms). */
export function buildPresetSymptomChipOptions(
  selected: string[],
  presets: readonly string[],
): string[] {
  const seen = new Set<string>()
  const options: string[] = []

  for (const symptom of [...presets, ...selected]) {
    const trimmed = symptom.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    options.push(trimmed)
  }

  return options
}

export function customTrackedSymptoms(symptomFocus: string[]): string[] {
  return symptomFocus.filter((s) => !isPresetWellnessSymptom(s))
}

export type AppetiteLevel = 'same' | 'better' | 'worse'

export type SubstanceUseLevel =
  | 'never'
  | 'rarely'
  | 'monthly'
  | 'weekly'
  | 'daily'

export const SUBSTANCE_USE_LEVELS: { value: SubstanceUseLevel; label: string }[] =
  [
    { value: 'never', label: 'Never' },
    { value: 'rarely', label: 'Rarely' },
    { value: 'monthly', label: 'About monthly' },
    { value: 'weekly', label: 'About weekly' },
    { value: 'daily', label: 'Daily or almost daily' },
  ]

export type WellnessProfile = {
  user_id: string
  usual_bedtime: string | null
  usual_wake_time: string | null
  eating_notes: string | null
  substance_use: Partial<Record<SubstanceKey, SubstanceUseLevel>>
  symptom_focus: string[]
  profile_notes: string | null
  created_at: string
  updated_at: string
}

export type WellnessProfileInput = {
  usual_bedtime: string
  usual_wake_time: string
  eating_notes: string
  substance_use: Partial<Record<SubstanceKey, SubstanceUseLevel>>
  symptom_focus: string[]
  profile_notes: string
}

export type WellnessLog = {
  id: string
  user_id: string
  log_date: string
  sleep_hours: number | null
  sleep_quality: number | null
  energy_level: number | null
  appetite: AppetiteLevel | null
  exercised: boolean
  exercise_minutes: number | null
  symptoms: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export type WellnessLogInput = {
  log_date: string
  sleep_hours: number | null
  sleep_quality: number | null
  energy_level: number | null
  appetite: AppetiteLevel | null
  exercised: boolean
  exercise_minutes: number | null
  symptoms: string[]
  notes: string
}

export const emptyWellnessProfileInput = (): WellnessProfileInput => ({
  usual_bedtime: '',
  usual_wake_time: '',
  eating_notes: '',
  substance_use: {},
  symptom_focus: [],
  profile_notes: '',
})

export function profileToInput(profile: WellnessProfile | null): WellnessProfileInput {
  if (!profile) return emptyWellnessProfileInput()
  return {
    usual_bedtime: profile.usual_bedtime ?? '',
    usual_wake_time: profile.usual_wake_time ?? '',
    eating_notes: profile.eating_notes ?? '',
    substance_use: { ...profile.substance_use },
    symptom_focus: [...profile.symptom_focus],
    profile_notes: profile.profile_notes ?? '',
  }
}

export const emptyWellnessLogInput = (logDate: string): WellnessLogInput => ({
  log_date: logDate,
  sleep_hours: null,
  sleep_quality: null,
  energy_level: null,
  appetite: null,
  exercised: false,
  exercise_minutes: null,
  symptoms: [],
  notes: '',
})

export function logFromRow(row: WellnessLog): WellnessLogInput {
  return {
    log_date: row.log_date,
    sleep_hours: row.sleep_hours,
    sleep_quality: row.sleep_quality,
    energy_level: row.energy_level,
    appetite: row.appetite,
    exercised: row.exercised,
    exercise_minutes: row.exercise_minutes,
    symptoms: row.symptoms ?? [],
    notes: row.notes ?? '',
  }
}

export function isWellnessLogFilled(input: WellnessLogInput): boolean {
  return (
    input.sleep_hours != null ||
    input.sleep_quality != null ||
    input.energy_level != null ||
    input.appetite != null ||
    input.exercised ||
    input.exercise_minutes != null ||
    input.symptoms.length > 0 ||
    input.notes.trim().length > 0
  )
}

export function formatWellnessLogSummary(input: WellnessLogInput): string {
  const parts: string[] = []
  if (input.sleep_hours != null) {
    parts.push(`${input.sleep_hours}h sleep`)
  }
  if (input.sleep_quality != null) {
    parts.push(`sleep ${input.sleep_quality}/5`)
  }
  if (input.energy_level != null) {
    parts.push(`energy ${input.energy_level}/5`)
  }
  if (input.appetite) {
    parts.push(`appetite ${input.appetite}`)
  }
  if (input.exercised) {
    parts.push(
      input.exercise_minutes
        ? `${input.exercise_minutes} min exercise`
        : 'exercise yes',
    )
  }
  if (input.symptoms.length > 0) {
    parts.push(input.symptoms.join(', '))
  }
  return parts.length > 0 ? parts.join(' · ') : 'Logged'
}

export function offsetLocalDate(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T12:00:00`)
  base.setDate(base.getDate() + days)
  return localDateString(base)
}

export function lastNDates(n: number, endDate?: string): string[] {
  const end = endDate ?? todayLocalDate()
  const dates: string[] = []
  for (let i = 0; i < n; i++) {
    dates.push(offsetLocalDate(end, -i))
  }
  return dates
}

function profileFromRow(row: Record<string, unknown>): WellnessProfile {
  const opened = openRow('wellness_profiles', row)
  return {
    ...(opened as unknown as WellnessProfile),
    substance_use: (opened.substance_use ?? {}) as WellnessProfile['substance_use'],
    symptom_focus: Array.isArray(opened.symptom_focus)
      ? (opened.symptom_focus as string[])
      : [],
  }
}

function logFromDbRow(row: Record<string, unknown>): WellnessLog {
  const opened = openRow('wellness_logs', row)
  return {
    ...(opened as unknown as WellnessLog),
    symptoms: Array.isArray(opened.symptoms) ? (opened.symptoms as string[]) : [],
  }
}

export async function fetchWellnessProfile(
  userId: string,
): Promise<WellnessProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('wellness_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? profileFromRow(data as Record<string, unknown>) : null
}

export async function upsertWellnessProfile(
  userId: string,
  input: WellnessProfileInput,
): Promise<WellnessProfile> {
  if (!supabase) throw new Error('Supabase is not configured')
  const sealed = sealRow('wellness_profiles', {
    user_id: userId,
    usual_bedtime: input.usual_bedtime.trim() || null,
    usual_wake_time: input.usual_wake_time.trim() || null,
    eating_notes: input.eating_notes.trim() || null,
    substance_use: input.substance_use,
    symptom_focus: input.symptom_focus,
    profile_notes: input.profile_notes.trim() || null,
  })
  const { data, error } = await supabase
    .from('wellness_profiles')
    .upsert(sealed, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return profileFromRow(data as Record<string, unknown>)
}

export async function fetchWellnessLog(
  userId: string,
  logDate: string,
): Promise<WellnessLog | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('wellness_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return logFromDbRow(data as Record<string, unknown>)
}

export async function fetchWellnessLogsForDates(
  userId: string,
  dates: string[],
): Promise<WellnessLog[]> {
  if (!supabase || dates.length === 0) return []
  const { data, error } = await supabase
    .from('wellness_logs')
    .select('*')
    .eq('user_id', userId)
    .in('log_date', dates)
    .order('log_date', { ascending: false })
  if (error) throw error
  return openRows(
    'wellness_logs',
    (data ?? []) as Record<string, unknown>[],
  ).map((row) => ({
    ...(row as unknown as WellnessLog),
    symptoms: Array.isArray(row.symptoms) ? (row.symptoms as string[]) : [],
  }))
}

export async function upsertWellnessLog(
  userId: string,
  input: WellnessLogInput,
): Promise<WellnessLog> {
  if (!supabase) throw new Error('Supabase is not configured')
  const sealed = sealRow('wellness_logs', {
    user_id: userId,
    log_date: input.log_date,
    sleep_hours: input.sleep_hours,
    sleep_quality: input.sleep_quality,
    energy_level: input.energy_level,
    appetite: input.appetite,
    exercised: input.exercised,
    exercise_minutes: input.exercised ? input.exercise_minutes : null,
    symptoms: input.symptoms,
    notes: input.notes.trim() || null,
  })
  const { data, error } = await supabase
    .from('wellness_logs')
    .upsert(sealed, { onConflict: 'user_id,log_date' })
    .select('*')
    .single()
  if (error) throw error
  return logFromDbRow(data as Record<string, unknown>)
}
