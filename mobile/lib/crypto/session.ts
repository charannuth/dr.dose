/**
 * In-memory DEK session. Cleared on sign-out / lock.
 * SecureStore caches wrapped material for biometric re-unlock on device.
 */
import * as SecureStore from 'expo-secure-store'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

let activeDek: Uint8Array | null = null
let activeUserId: string | null = null

const dekStoreKey = (userId: string) => `vault_dek_${userId}`
const pendingMnemonicKey = (userId: string) => `vault_backup_pending_${userId}`
const backupAckKey = (userId: string) => `vault_backup_acked_${userId}`

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
    await SecureStore.setItemAsync(dekStoreKey(userId), bytesToHex(dek), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  } catch {
    // SecureStore may fail on web/simulator — memory session still works
  }
}

export async function tryRestoreVaultSession(userId: string): Promise<boolean> {
  if (activeDek && activeUserId === userId) return true
  try {
    const hex = await SecureStore.getItemAsync(dekStoreKey(userId))
    if (!hex) return false
    activeUserId = userId
    activeDek = hexToBytes(hex)
    return true
  } catch {
    return false
  }
}

/** Keep account-backup words on-device until the user confirms they saved them. */
export async function persistPendingRecoveryMnemonic(
  userId: string,
  mnemonic: string,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(pendingMnemonicKey(userId), mnemonic, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  } catch {
    // ignore
  }
}

export async function loadPendingRecoveryMnemonic(userId: string): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(pendingMnemonicKey(userId))) ?? null
  } catch {
    return null
  }
}

export async function clearPendingRecoveryMnemonic(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(pendingMnemonicKey(userId))
  } catch {
    // ignore
  }
}

export async function markBackupAcknowledged(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(backupAckKey(userId), '1', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  } catch {
    // ignore
  }
}

export async function hasBackupAcknowledged(userId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(backupAckKey(userId))) === '1'
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
      await SecureStore.deleteItemAsync(dekStoreKey(uid))
    } catch {
      // ignore
    }
  }
}
