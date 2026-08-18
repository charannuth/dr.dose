import { normalizeBodyMetricUnit, type BodyMetricUnit } from './bodyMetrics'
import { openRow, sealRow } from './crypto/seal'
import { supabase } from './supabase'

export type BloodType =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'unknown'
  | null

export type MedicalRecord = {
  user_id: string
  blood_type: BloodType
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  height_unit: BodyMetricUnit
  weight_unit: BodyMetricUnit
  known_allergies: string[]
  known_conditions: string[]
  past_surgeries: string | null
  family_history: string | null
  emergency_notes: string | null
  other_notes: string | null
  created_at: string
  updated_at: string
}

export type MedicalRecordInput = {
  blood_type: string
  date_of_birth: string
  gender: string
  height_cm: string
  weight_kg: string
  height_unit: BodyMetricUnit
  weight_unit: BodyMetricUnit
  known_allergies: string[]
  known_conditions: string[]
  past_surgeries: string
  family_history: string
  emergency_notes: string
  other_notes: string
}

export const emptyMedicalRecordInput = (): MedicalRecordInput => ({
  blood_type: '',
  date_of_birth: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  height_unit: 'metric',
  weight_unit: 'metric',
  known_allergies: [],
  known_conditions: [],
  past_surgeries: '',
  family_history: '',
  emergency_notes: '',
  other_notes: '',
})

export function recordToInput(record: MedicalRecord | null): MedicalRecordInput {
  if (!record) return emptyMedicalRecordInput()
  return {
    blood_type: record.blood_type ?? '',
    date_of_birth: record.date_of_birth ?? '',
    gender: record.gender ?? '',
    height_cm: record.height_cm != null ? String(record.height_cm) : '',
    weight_kg: record.weight_kg != null ? String(record.weight_kg) : '',
    height_unit: normalizeBodyMetricUnit(record.height_unit),
    weight_unit: normalizeBodyMetricUnit(record.weight_unit),
    known_allergies: [...record.known_allergies],
    known_conditions: [...record.known_conditions],
    past_surgeries: record.past_surgeries ?? '',
    family_history: record.family_history ?? '',
    emergency_notes: record.emergency_notes ?? '',
    other_notes: record.other_notes ?? '',
  }
}

export function isMedicalRecordFilled(input: MedicalRecordInput): boolean {
  return (
    Boolean(input.blood_type) ||
    Boolean(input.date_of_birth) ||
    Boolean(input.gender) ||
    Boolean(input.height_cm.trim()) ||
    Boolean(input.weight_kg.trim()) ||
    input.known_allergies.length > 0 ||
    input.known_conditions.length > 0 ||
    input.past_surgeries.trim().length > 0 ||
    input.family_history.trim().length > 0 ||
    input.emergency_notes.trim().length > 0 ||
    input.other_notes.trim().length > 0
  )
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
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

function normalizeMedicalRecord(row: Record<string, unknown>): MedicalRecord {
  const opened = openRow('medical_records', row)
  return {
    ...(opened as unknown as MedicalRecord),
    height_cm: parseMaybeNumber(opened.height_cm),
    weight_kg: parseMaybeNumber(opened.weight_kg),
    height_unit: normalizeBodyMetricUnit(opened.height_unit as BodyMetricUnit),
    weight_unit: normalizeBodyMetricUnit(opened.weight_unit as BodyMetricUnit),
    known_allergies: Array.isArray(opened.known_allergies)
      ? (opened.known_allergies as string[])
      : [],
    known_conditions: Array.isArray(opened.known_conditions)
      ? (opened.known_conditions as string[])
      : [],
    past_surgeries:
      typeof opened.past_surgeries === 'string'
        ? opened.past_surgeries
        : Array.isArray(opened.past_surgeries)
          ? (opened.past_surgeries as string[]).join('\n')
          : null,
    family_history:
      typeof opened.family_history === 'string'
        ? opened.family_history
        : Array.isArray(opened.family_history)
          ? (opened.family_history as string[]).join('\n')
          : null,
  }
}

export async function fetchMedicalRecord(
  userId: string,
): Promise<MedicalRecord | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return normalizeMedicalRecord(data as Record<string, unknown>)
}

export async function upsertMedicalRecord(
  userId: string,
  input: MedicalRecordInput,
): Promise<MedicalRecord> {
  if (!supabase) throw new Error('Supabase is not configured')

  const height = parseOptionalNumber(input.height_cm)
  const weight = parseOptionalNumber(input.weight_kg)
  const sealed = sealRow('medical_records', {
    user_id: userId,
    blood_type: input.blood_type || null,
    date_of_birth: input.date_of_birth.trim() || null,
    gender: input.gender.trim() || null,
    height_cm: height != null ? String(height) : null,
    weight_kg: weight != null ? String(weight) : null,
    height_unit: input.height_unit,
    weight_unit: input.weight_unit,
    known_allergies: input.known_allergies,
    known_conditions: input.known_conditions,
    past_surgeries: input.past_surgeries.trim() || null,
    family_history: input.family_history.trim() || null,
    emergency_notes: input.emergency_notes.trim() || null,
    other_notes: input.other_notes.trim() || null,
  })

  const { data, error } = await supabase
    .from('medical_records')
    .upsert(sealed, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) throw error
  return normalizeMedicalRecord(data as Record<string, unknown>)
}

/** Persist unit preference immediately (creates a row if needed). */
export async function updateBodyMetricUnits(
  userId: string,
  units: { height_unit?: BodyMetricUnit; weight_unit?: BodyMetricUnit },
): Promise<MedicalRecord> {
  if (!supabase) throw new Error('Supabase is not configured')

  const existing = await fetchMedicalRecord(userId)
  if (!existing) {
    const sealed = sealRow('medical_records', {
      user_id: userId,
      height_unit: units.height_unit ?? 'metric',
      weight_unit: units.weight_unit ?? 'metric',
      known_allergies: [],
      known_conditions: [],
    })
    const { data, error } = await supabase
      .from('medical_records')
      .insert(sealed)
      .select('*')
      .single()
    if (error) throw error
    return normalizeMedicalRecord(data as Record<string, unknown>)
  }

  const patch: { height_unit?: BodyMetricUnit; weight_unit?: BodyMetricUnit } = {}
  if (units.height_unit != null) patch.height_unit = units.height_unit
  if (units.weight_unit != null) patch.weight_unit = units.weight_unit

  const { data, error } = await supabase
    .from('medical_records')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeMedicalRecord(data as Record<string, unknown>)
}
