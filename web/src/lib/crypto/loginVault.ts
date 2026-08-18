import { supabase } from '../supabase'
import { migrateUserVaultData } from './migrate'
import { isVaultUnlocked, tryRestoreVaultSession } from './session'
import {
  fetchUserCrypto,
  rewrapUnlockedVault,
  setupVault,
  unlockVaultWithPassphrase,
} from './vault'

export type EnsureVaultResult = {
  /** Present only when a new vault was created — show account backup UI. */
  recoveryMnemonic: string | null
  /** True when login password did not unlock; user must enter account backup. */
  needsAccountBackup: boolean
}

/**
 * After auth: restore device session, or setup/unlock with login password.
 */
export async function ensureVaultWithLoginPassword(
  userId: string,
  password: string,
): Promise<EnsureVaultResult> {
  const restored = await tryRestoreVaultSession(userId)
  if (restored && isVaultUnlocked()) {
    // After password reset, device may still hold the DEK while the server wrap
    // is still the old password — re-lock to the password just used to sign in.
    try {
      await unlockVaultWithPassphrase(userId, password)
    } catch {
      await rewrapUnlockedVault(userId, password)
    }
    await migrateUserVaultData(userId)
    return { recoveryMnemonic: null, needsAccountBackup: false }
  }

  const row = await fetchUserCrypto(userId)
  if (!row) {
    const { recoveryMnemonic } = await setupVault(userId, password)
    await migrateUserVaultData(userId)
    return { recoveryMnemonic, needsAccountBackup: false }
  }

  try {
    await unlockVaultWithPassphrase(userId, password)
    await migrateUserVaultData(userId)
    return { recoveryMnemonic: null, needsAccountBackup: false }
  } catch {
    return { recoveryMnemonic: null, needsAccountBackup: true }
  }
}

/** Resolve current session user id after sign-in / OTP. */
export async function currentAuthUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}
