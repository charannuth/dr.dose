import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { supabase } from '../supabase'
import { getActiveDek, isVaultUnlocked, unlockVaultSession } from './session'

/**
 * Server-held recovery for the vault key, so users do not need the 12-word backup.
 * The `vault-escrow` Edge Function encrypts the key with a secret that never
 * touches the database. If the function is unavailable we fail quietly and the
 * old account-backup words remain a fallback.
 */

async function invoke<T>(body: Record<string, unknown>): Promise<T | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('vault-escrow', { body })
    if (error) return null
    return data as T
  } catch {
    return null
  }
}

/** Save the unlocked vault key to the server. Returns true when stored. */
export async function storeVaultEscrow(): Promise<boolean> {
  if (!isVaultUnlocked()) return false
  const res = await invoke<{ ok?: boolean }>({
    action: 'store',
    dek: bytesToHex(getActiveDek()),
  })
  return res?.ok === true
}

/** Unlock the vault from the server-held key. Returns true when it worked. */
export async function unlockVaultFromEscrow(userId: string): Promise<boolean> {
  const res = await invoke<{ dek?: string | null }>({ action: 'fetch' })
  if (!res?.dek || res.dek.length !== 64) return false
  await unlockVaultSession(userId, hexToBytes(res.dek))
  return true
}
