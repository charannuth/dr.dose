/**
 * In-memory DEK session. Cleared on sign-out / lock.
 * SecureStore caches wrapped material for biometric re-unlock on device.
 */
import * as SecureStore from 'expo-secure-store'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

let activeDek: Uint8Array | null = null
let activeUserId: string | null = null

const dekStoreKey = (userId: string) => `vault_dek_${userId}`

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
