/**
 * Field-level encrypt/decrypt maps for PHI columns.
 * Structural columns (ids, dates, schedule_type, etc.) stay plaintext.
 */
import { decryptString, encryptString, isCiphertext } from './primitives'

export const SENSITIVE_FIELDS = {
  medications: [
    'name',
    'medication_form',
    'dose_pills',
    'dose_mg',
    'notes',
    'prn_amount_hints',
    'prn_symptom_hints',
  ] as const,
  dose_logs: ['logged_amount', 'prn_symptoms', 'prn_reason', 'prn_notes'] as const,
  tracker_dose_events: ['medication_name', 'dose_pills', 'dose_mg'] as const,
  medical_records: [
    'blood_type',
    'known_allergies',
    'known_conditions',
    'past_surgeries',
    'family_history',
    'emergency_notes',
    'other_notes',
    'gender',
    // date_of_birth / height_cm / weight_kg stay plaintext while DB columns
    // are still date/numeric (post-028). Re-add after re-running 027.
  ] as const,
  wellness_profiles: [
    'eating_notes',
    'substance_use',
    'symptom_focus',
    'profile_notes',
    'usual_bedtime',
    'usual_wake_time',
  ] as const,
  wellness_logs: [
    'symptoms',
    'notes',
  ] as const,
  cycle_day_logs: [
    'flow_level',
    'symptoms',
    'symptoms_pre',
    'symptoms_post',
    'notes',
  ] as const,
  hrt_day_logs: [
    'bodily_changes',
    'mood_changes',
    'other_changes',
    'notes',
  ] as const,
  weight_logs: ['notes'] as const,
  // baseline height/weight stay plaintext while columns are numeric (post-028)
  weight_settings: [] as const,
  doctor_visits: [
    'provider_name',
    'specialty',
    'location',
    'reason',
    'notes',
  ] as const,
  cycle_settings: ['custom_symptoms_pre', 'custom_symptoms_during'] as const,
} as const

export type EncryptedTable = keyof typeof SENSITIVE_FIELDS

function aadFor(table: string, column: string): string {
  // Bind ciphertext to table+column only. Row ids differ between insert (client
  // UUID) and legacy rows, and some tables upsert without a stable client id.
  return `${table}|${column}`
}

function encryptScalar(
  dek: Uint8Array,
  table: string,
  column: string,
  value: unknown,
): unknown {
  if (value == null) return value
  if (typeof value === 'string') {
    if (value === '' || isCiphertext(value)) return value
    return encryptString(dek, value, aadFor(table, column))
  }
  if (Array.isArray(value)) {
    // Encrypt array as one JSON ciphertext. Wrap in a single-element array so
    // it still fits Postgres text[] columns (live DB after 028 rollback).
    const json = JSON.stringify(value)
    if (value.length === 1 && typeof value[0] === 'string' && isCiphertext(value[0])) {
      return value
    }
    const ct = encryptString(dek, json, aadFor(table, column))
    return [ct]
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value)
    return encryptString(dek, json, aadFor(table, column))
  }
  // numbers / booleans left plaintext (not ideal for weight — handled separately)
  return value
}

function decryptScalar(
  dek: Uint8Array,
  table: string,
  column: string,
  value: unknown,
  asJsonArray = false,
  asJsonObject = false,
): unknown {
  if (value == null) return value
  // text[] after encrypt: single-element [ciphertext]
  if (Array.isArray(value)) {
    if (
      value.length === 1 &&
      typeof value[0] === 'string' &&
      isCiphertext(value[0])
    ) {
      const plain = decryptString(dek, value[0], aadFor(table, column))
      try {
        return JSON.parse(plain)
      } catch {
        return plain
      }
    }
    return value
  }
  if (typeof value !== 'string') return value
  if (!isCiphertext(value)) {
    // Legacy plaintext during migration
    if (asJsonArray && value.startsWith('[')) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  }
  const plain = decryptString(dek, value, aadFor(table, column))
  if (asJsonArray || asJsonObject || plain.startsWith('[') || plain.startsWith('{')) {
    try {
      return JSON.parse(plain)
    } catch {
      return plain
    }
  }
  return plain
}

const ARRAY_FIELDS = new Set([
  'prn_amount_hints',
  'prn_symptom_hints',
  'prn_symptoms',
  'known_allergies',
  'known_conditions',
  'symptoms',
  'symptoms_pre',
  'symptoms_post',
  'bodily_changes',
  'mood_changes',
  'symptom_focus',
  'custom_symptoms_pre',
  'custom_symptoms_during',
])

const OBJECT_FIELDS = new Set(['substance_use'])

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    if (value === '' || value === '[]') return []
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string') {
    if (value === '' || value === '{}') return {}
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  return {}
}

export function encryptRow<T extends Record<string, unknown>>(
  dek: Uint8Array,
  table: EncryptedTable,
  row: T,
): T {
  const fields = SENSITIVE_FIELDS[table] as readonly string[]
  const out: Record<string, unknown> = { ...row }
  for (const field of fields) {
    if (!(field in out)) continue
    let value = out[field]
    // Normalize PG text-json arrays before encrypting
    if (ARRAY_FIELDS.has(field) && typeof value === 'string' && !isCiphertext(value)) {
      value = ensureStringArray(value)
    }
    if (OBJECT_FIELDS.has(field) && typeof value === 'string' && !isCiphertext(value)) {
      value = ensureObject(value)
    }
    out[field] = encryptScalar(dek, table, field, value)
  }
  return out as T
}

export function decryptRow<T extends Record<string, unknown>>(
  dek: Uint8Array,
  table: EncryptedTable,
  row: T,
): T {
  const fields = SENSITIVE_FIELDS[table] as readonly string[]
  const out: Record<string, unknown> = { ...row }
  for (const field of fields) {
    if (!(field in out)) continue
    let value = decryptScalar(
      dek,
      table,
      field,
      out[field],
      ARRAY_FIELDS.has(field),
      OBJECT_FIELDS.has(field),
    )
    if (ARRAY_FIELDS.has(field)) {
      value = ensureStringArray(value)
    } else if (OBJECT_FIELDS.has(field)) {
      value = ensureObject(value)
    }
    out[field] = value
  }
  return out as T
}

export function decryptRows<T extends Record<string, unknown>>(
  dek: Uint8Array,
  table: EncryptedTable,
  rows: T[],
): T[] {
  return rows.map((row) => decryptRow(dek, table, row))
}

/** text[] / jsonb array already stored as a single ciphertext element. */
export function isEncryptedArrayValue(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === 'string' &&
    isCiphertext(value[0])
  )
}

/** True if any sensitive field still looks like legacy plaintext. */
export function rowNeedsMigration(
  table: EncryptedTable,
  row: Record<string, unknown>,
): boolean {
  const fields = SENSITIVE_FIELDS[table] as readonly string[]
  for (const field of fields) {
    const v = row[field]
    if (v == null || v === '' || v === '[]' || v === '{}') continue
    if (typeof v === 'string') {
      if (!isCiphertext(v)) return true
      continue
    }
    if (Array.isArray(v)) {
      if (v.length === 0 || isEncryptedArrayValue(v)) continue
      return true
    }
    if (typeof v === 'object') return true
  }
  return false
}
