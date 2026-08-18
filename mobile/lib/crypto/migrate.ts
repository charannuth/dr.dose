import { supabase } from '../supabase'
import {
  decryptRow,
  encryptRow,
  isEncryptedArrayValue,
  rowNeedsMigration,
  type EncryptedTable,
  SENSITIVE_FIELDS,
} from './fields'
import { isCiphertext } from './primitives'
import { getActiveDek } from './session'
import { fetchUserCrypto, markVaultMigrated } from './vault'

const TABLES: EncryptedTable[] = [
  'medications',
  'dose_logs',
  'tracker_dose_events',
  'medical_records',
  'wellness_profiles',
  'wellness_logs',
  'cycle_day_logs',
  'hrt_day_logs',
  'weight_logs',
  'weight_settings',
  'doctor_visits',
  'cycle_settings',
]

function needsEncrypt(table: EncryptedTable, row: Record<string, unknown>): boolean {
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

async function migrateTable(userId: string, table: EncryptedTable): Promise<number> {
  if (!supabase) return 0
  const dek = getActiveDek()
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
  if (error) throw error
  let updated = 0
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>
    if (!needsEncrypt(table, row) && !rowNeedsMigration(table, row)) continue
    // Decrypt first if already encrypted mixed, then re-encrypt all sensitive fields
    const plain = decryptRow(dek, table, row)
    const encrypted = encryptRow(dek, table, plain)
    const id = row.id
    if (typeof id === 'string') {
      const { error: upErr } = await supabase.from(table).update(encrypted).eq('id', id)
      if (upErr) throw upErr
    } else {
      // composite PK tables (weight_logs, hrt_day_logs, cycle_day_logs, medical_records, etc.)
      const { error: upErr } = await supabase
        .from(table)
        .update(encrypted)
        .eq('user_id', userId)
        .match(primaryKeyMatch(table, row))
      if (upErr) throw upErr
    }
    updated += 1
  }
  return updated
}

function primaryKeyMatch(
  table: EncryptedTable,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (table === 'medical_records' || table === 'wellness_profiles' || table === 'weight_settings' || table === 'cycle_settings') {
    return { user_id: row.user_id }
  }
  if (
    table === 'weight_logs' ||
    table === 'hrt_day_logs' ||
    table === 'cycle_day_logs'
  ) {
    return { user_id: row.user_id, log_date: row.log_date }
  }
  return { id: row.id }
}

/**
 * Encrypt all legacy plaintext PHI for this user.
 * Skips when migrated_at is set; safe to re-run if that flag is cleared.
 */
export async function migrateUserVaultData(userId: string): Promise<void> {
  const crypto = await fetchUserCrypto(userId)
  if (crypto?.migrated_at) return

  for (const table of TABLES) {
    await migrateTable(userId, table)
  }
  await markVaultMigrated(userId)
}
