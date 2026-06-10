import { supabase } from '../supabase'
import { todayLocalDate } from '../dates'
import type { MedicalRecord } from '../medicalRecords'

export type WeightGoalDirection = 'lose' | 'gain'
export type WeightGoalRate = 'mild' | 'regular' | 'extreme'
export type WeightActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'

export type WeightSettings = {
  user_id: string
  baseline_height_cm: number | null
  baseline_weight_kg: number | null
  goal_direction: WeightGoalDirection
  goal_rate: WeightGoalRate
  activity_level: WeightActivityLevel
  log_frequency_days: number
  log_frequency_anchor_date: string
  sync_weight_to_medical_records: boolean
  updated_at: string
}

export type WeightLog = {
  user_id: string
  log_date: string
  weight_kg: number | null
  breakfast_calories: number | null
  lunch_calories: number | null
  dinner_calories: number | null
  did_workout: boolean
  workout_calories_burned: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const ACTIVITY_FACTORS: Record<WeightActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

export function kcalDeltaForRate(direction: WeightGoalDirection, rate: WeightGoalRate): number {
  const lbPerWeek =
    rate === 'mild' ? 0.5 : rate === 'regular' ? 1 : 2
  const kcalPerDay = (lbPerWeek * 3500) / 7
  return direction === 'gain' ? kcalPerDay : -kcalPerDay
}

function weightGoalLabel(direction: WeightGoalDirection, rate: WeightGoalRate): string {
  const lbPerWeek =
    rate === 'mild' ? 0.5 : rate === 'regular' ? 1 : 2
  const verb = direction === 'gain' ? 'gain' : 'loss'
  return `${lbPerWeek} lb/week ${verb} (up to)`
}

export function computeMaintenanceCalories(input: {
  ageYears: number
  heightCm: number
  weightKg: number
  gender: string | null
  activityLevel: WeightActivityLevel
}): number {
  const { ageYears, heightCm, weightKg, gender, activityLevel } = input

  const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
  const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161

  let bmr: number
  if (gender === 'man') bmr = maleBmr
  else if (gender === 'woman') bmr = femaleBmr
  else bmr = (maleBmr + femaleBmr) / 2

  const maintenance = bmr * ACTIVITY_FACTORS[activityLevel]
  return Math.round(maintenance)
}

export function computeDailyTargets(input: {
  maintenanceCalories: number
  goal_direction: WeightGoalDirection
  goal_rate: WeightGoalRate
}): { targetCalories: number; kcalDelta: number; label: string } {
  const { maintenanceCalories, goal_direction, goal_rate } = input
  const kcalDelta = kcalDeltaForRate(goal_direction, goal_rate)
  const targetCalories = Math.round(maintenanceCalories + kcalDelta)
  return { targetCalories, kcalDelta, label: weightGoalLabel(goal_direction, goal_rate) }
}

function parseMaybeNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

export async function fetchWeightSettings(userId: string): Promise<WeightSettings> {
  const today = todayLocalDate()
  if (!supabase) {
    return {
      user_id: userId,
      baseline_height_cm: null,
      baseline_weight_kg: null,
      goal_direction: 'lose',
      goal_rate: 'mild',
      activity_level: 'light',
      log_frequency_days: 1,
      log_frequency_anchor_date: today,
      sync_weight_to_medical_records: false,
      updated_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('weight_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) {
    return {
      user_id: data.user_id,
      baseline_height_cm: parseMaybeNumber(data.baseline_height_cm),
      baseline_weight_kg: parseMaybeNumber(data.baseline_weight_kg),
      goal_direction: data.goal_direction,
      goal_rate: data.goal_rate,
      activity_level: data.activity_level,
      log_frequency_days: Number(data.log_frequency_days),
      log_frequency_anchor_date: data.log_frequency_anchor_date,
      sync_weight_to_medical_records: Boolean(data.sync_weight_to_medical_records),
      updated_at: data.updated_at,
    }
  }

  // Seed baseline from medical_records if they exist.
  let medical: MedicalRecord | null
  try {
    const res = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    medical = (res.data ?? null) as MedicalRecord | null
  } catch {
    medical = null
  }

  const baseline_height_cm = medical?.height_cm ?? null
  const baseline_weight_kg = medical?.weight_kg ?? null

  const insert = {
    user_id: userId,
    baseline_height_cm,
    baseline_weight_kg,
    goal_direction: 'lose' as WeightGoalDirection,
    goal_rate: 'mild' as WeightGoalRate,
    activity_level: 'light' as WeightActivityLevel,
    log_frequency_days: 1,
    log_frequency_anchor_date: today,
    sync_weight_to_medical_records: false,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('weight_settings')
    .insert(insert)
    .select('*')
    .single()

  if (insertError) throw insertError
  return {
    user_id: inserted.user_id,
    baseline_height_cm: parseMaybeNumber(inserted.baseline_height_cm),
    baseline_weight_kg: parseMaybeNumber(inserted.baseline_weight_kg),
    goal_direction: inserted.goal_direction,
    goal_rate: inserted.goal_rate,
    activity_level: inserted.activity_level,
    log_frequency_days: Number(inserted.log_frequency_days),
    log_frequency_anchor_date: inserted.log_frequency_anchor_date,
    sync_weight_to_medical_records: Boolean(inserted.sync_weight_to_medical_records),
    updated_at: inserted.updated_at,
  }
}

export async function updateWeightSettings(
  userId: string,
  patch: Partial<
    Pick<
      WeightSettings,
      | 'baseline_height_cm'
      | 'baseline_weight_kg'
      | 'goal_direction'
      | 'goal_rate'
      | 'activity_level'
      | 'log_frequency_days'
      | 'sync_weight_to_medical_records'
    >
  >,
): Promise<WeightSettings> {
  if (!supabase) return fetchWeightSettings(userId)

  const today = todayLocalDate()
  const updatePatch: Record<string, unknown> = { ...patch }
  if (patch.log_frequency_days != null) {
    updatePatch.log_frequency_anchor_date = today
  }

  const { error } = await supabase.from('weight_settings').update(updatePatch).eq('user_id', userId)

  if (error) throw error
  return fetchWeightSettings(userId)
}

export async function fetchWeightLogs(
  userId: string,
  start: string,
  end: string,
): Promise<WeightLog[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as WeightLog[]
}

export async function fetchWeightLog(
  userId: string,
  logDate: string,
): Promise<WeightLog | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as WeightLog | null
}

export async function upsertWeightLog(
  userId: string,
  logDate: string,
  patch: Partial<
    Pick<
      WeightLog,
      | 'weight_kg'
      | 'breakfast_calories'
      | 'lunch_calories'
      | 'dinner_calories'
      | 'did_workout'
      | 'workout_calories_burned'
      | 'notes'
    >
  >,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('weight_logs').upsert(
    {
      user_id: userId,
      log_date: logDate,
      weight_kg: patch.weight_kg ?? null,
      breakfast_calories: patch.breakfast_calories ?? null,
      lunch_calories: patch.lunch_calories ?? null,
      dinner_calories: patch.dinner_calories ?? null,
      did_workout: patch.did_workout ?? false,
      workout_calories_burned: patch.workout_calories_burned ?? null,
      notes: patch.notes?.trim() || null,
    },
    { onConflict: 'user_id,log_date' },
  )

  if (error) throw error
}

