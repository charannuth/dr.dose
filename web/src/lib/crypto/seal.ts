import { decryptRow, decryptRows, encryptRow, type EncryptedTable } from './fields'
import { getActiveDekOrNull } from './session'

/** Encrypt a row before writing. No-ops when vault is not unlocked. */
export function sealRow<T extends Record<string, unknown>>(
  table: EncryptedTable,
  row: T,
): T {
  const dek = getActiveDekOrNull()
  if (!dek) return row
  return encryptRow(dek, table, row)
}

/** Decrypt a row after reading. No-ops when vault is not unlocked. */
export function openRow<T extends Record<string, unknown>>(
  table: EncryptedTable,
  row: T,
): T {
  const dek = getActiveDekOrNull()
  if (!dek) return row
  return decryptRow(dek, table, row)
}

export function openRows<T extends Record<string, unknown>>(
  table: EncryptedTable,
  rows: T[],
): T[] {
  const dek = getActiveDekOrNull()
  if (!dek) return rows
  return decryptRows(dek, table, rows)
}
