/**
 * In-memory DEK session for web. Cleared on sign-out / tab close.
 * sessionStorage keeps wrapped DEK hex for the browser tab only.
 */
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

let activeDek: Uint8Array | null = null
let activeUserId: string | null = null

const dekStoreKey = (userId: string) => `drdose_vault_dek_${userId}`
const pendingMnemonicKey = (userId: string) => `drdose_vault_backup_pending_${userId}`
const backupAckKey = (userId: string) => `drdose_vault_backup_acked_${userId}`

export function isVaultUnlocked(): boolean {
  return activeDek != null && activeUserId != null
}

export function getActiveDek(): Uint8Array {
  if (!activeDek) {
    throw new Error('Vault is locked. Unlock your encryption vault to access health data.')
  }
  return activeDek
}

export function getActiveDekOrNull(): Uint8Array | null {
  return activeDek
}

export function getVaultUserId(): string | null {
  return activeUserId
}

export async function unlockVaultSession(userId: string, dek: Uint8Array): Promise<void> {
  activeUserId = userId
  activeDek = dek
  try {
    sessionStorage.setItem(dekStoreKey(userId), bytesToHex(dek))
  } catch {
    // private mode / blocked storage — memory session still works
  }
}

export async function tryRestoreVaultSession(userId: string): Promise<boolean> {
  if (activeDek && activeUserId === userId) return true
  try {
    const hex = sessionStorage.getItem(dekStoreKey(userId))
    if (!hex) return false
    activeUserId = userId
    activeDek = hexToBytes(hex)
    return true
  } catch {
    return false
  }
}

/** Keep account-backup words until the user confirms they saved them. */
export async function persistPendingRecoveryMnemonic(
  userId: string,
  mnemonic: string,
): Promise<void> {
  try {
    sessionStorage.setItem(pendingMnemonicKey(userId), mnemonic)
  } catch {
    // ignore
  }
}

export async function loadPendingRecoveryMnemonic(userId: string): Promise<string | null> {
  try {
    return sessionStorage.getItem(pendingMnemonicKey(userId))
  } catch {
    return null
  }
}

export async function clearPendingRecoveryMnemonic(userId: string): Promise<void> {
  try {
    sessionStorage.removeItem(pendingMnemonicKey(userId))
  } catch {
    // ignore
  }
}

export async function markBackupAcknowledged(userId: string): Promise<void> {
  try {
    localStorage.setItem(backupAckKey(userId), '1')
  } catch {
    // ignore
  }
}

export async function hasBackupAcknowledged(userId: string): Promise<boolean> {
  try {
    return localStorage.getItem(backupAckKey(userId)) === '1'
  } catch {
    return false
  }
}

export async function lockVaultSession(): Promise<void> {
  const uid = activeUserId
  activeDek = null
  activeUserId = null
  if (uid) {
    try {
      sessionStorage.removeItem(dekStoreKey(uid))
    } catch {
      // ignore
    }
  }
}
