import { supabase } from '../supabase'
import { VAULT_LOGIN_PASSWORD_MIN } from './flags'
import {
  DEFAULT_KDF,
  deriveKek,
  generateDek,
  generateRecoveryMnemonic,
  generateSalt,
  isValidRecoveryMnemonic,
  KDF_NAME,
  mnemonicToRecoverySecret,
  saltFromStorage,
  saltToStorage,
  unwrapKey,
  wrapKey,
  type KdfParams,
} from './primitives'
import {
  getActiveDek,
  isVaultUnlocked,
  lockVaultSession,
  unlockVaultSession,
} from './session'

export type UserCryptoRow = {
  user_id: string
  kdf: string
  kdf_params: KdfParams
  salt: string
  wrapped_dek: string
  recovery_salt: string
  wrapped_dek_recovery: string
  migrated_at: string | null
}

export async function fetchUserCrypto(userId: string): Promise<UserCryptoRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_crypto')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as UserCryptoRow | null
}

export type VaultSetupResult = {
  recoveryMnemonic: string
}

function assertLoginPassword(passphrase: string): void {
  if (passphrase.trim().length < VAULT_LOGIN_PASSWORD_MIN) {
    throw new Error(
      `Password must be at least ${VAULT_LOGIN_PASSWORD_MIN} characters.`,
    )
  }
}

/**
 * Create vault for a new user. Passphrase is the login password (silent vault).
 * Returns recovery mnemonic — show once as "account backup".
 */
export async function setupVault(
  userId: string,
  passphrase: string,
): Promise<VaultSetupResult> {
  if (!supabase) throw new Error('Supabase is not configured')
  assertLoginPassword(passphrase)

  const existing = await fetchUserCrypto(userId)
  if (existing) throw new Error('Vault already exists for this account.')

  const dek = generateDek()
  const salt = generateSalt()
  const recoverySalt = generateSalt()
  const recoveryMnemonic = generateRecoveryMnemonic()
  const kdf = DEFAULT_KDF

  const kek = await deriveKek(passphrase, salt, kdf)
  const recoverySecret = mnemonicToRecoverySecret(recoveryMnemonic)
  const recoveryKek = await deriveKek(recoverySecret, recoverySalt, kdf)

  const wrapped_dek = wrapKey(kek, dek)
  const wrapped_dek_recovery = wrapKey(recoveryKek, dek)

  const { error } = await supabase.from('user_crypto').insert({
    user_id: userId,
    kdf: KDF_NAME,
    kdf_params: kdf,
    salt: saltToStorage(salt),
    wrapped_dek,
    recovery_salt: saltToStorage(recoverySalt),
    wrapped_dek_recovery,
  })
  if (error) throw error

  await unlockVaultSession(userId, dek)
  return { recoveryMnemonic }
}

export async function unlockVaultWithPassphrase(
  userId: string,
  passphrase: string,
): Promise<void> {
  const row = await fetchUserCrypto(userId)
  if (!row) throw new Error('No encryption vault found. Set one up first.')
  const params = (row.kdf_params as KdfParams) ?? DEFAULT_KDF
  const kek = await deriveKek(passphrase, saltFromStorage(row.salt), params)
  let dek: Uint8Array
  try {
    dek = unwrapKey(kek, row.wrapped_dek)
  } catch {
    throw new Error('Wrong password for encrypted health data.')
  }
  await unlockVaultSession(userId, dek)
}

export async function unlockVaultWithRecovery(
  userId: string,
  mnemonic: string,
): Promise<void> {
  if (!isValidRecoveryMnemonic(mnemonic)) {
    throw new Error('That account backup is not valid.')
  }
  const row = await fetchUserCrypto(userId)
  if (!row) throw new Error('No encryption vault found.')
  const params = (row.kdf_params as KdfParams) ?? DEFAULT_KDF
  const recoverySecret = mnemonicToRecoverySecret(mnemonic)
  const recoveryKek = await deriveKek(
    recoverySecret,
    saltFromStorage(row.recovery_salt),
    params,
  )
  let dek: Uint8Array
  try {
    dek = unwrapKey(recoveryKek, row.wrapped_dek_recovery)
  } catch {
    throw new Error('Account backup did not unlock your health data.')
  }
  await unlockVaultSession(userId, dek)
}

/** Re-wrap DEK under a new login password (does not re-encrypt all rows). */
export async function changeVaultPassphrase(
  userId: string,
  currentPassphrase: string,
  newPassphrase: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  assertLoginPassword(newPassphrase)
  const row = await fetchUserCrypto(userId)
  if (!row) throw new Error('No encryption vault found.')
  const params = (row.kdf_params as KdfParams) ?? DEFAULT_KDF
  const kek = await deriveKek(currentPassphrase, saltFromStorage(row.salt), params)
  let dek: Uint8Array
  try {
    dek = unwrapKey(kek, row.wrapped_dek)
  } catch {
    throw new Error('Current password is incorrect.')
  }

  const newSalt = generateSalt()
  const newKek = await deriveKek(newPassphrase, newSalt, params)
  const wrapped_dek = wrapKey(newKek, dek)

  const { error } = await supabase
    .from('user_crypto')
    .update({
      salt: saltToStorage(newSalt),
      wrapped_dek,
      kdf_params: params,
    })
    .eq('user_id', userId)
  if (error) throw error
  await unlockVaultSession(userId, dek)
}

/**
 * After unlocking via account backup (e.g. forgot-password), re-wrap DEK
 * with the new login password without needing the old one.
 */
export async function rewrapUnlockedVault(
  userId: string,
  newPassphrase: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  assertLoginPassword(newPassphrase)
  if (!isVaultUnlocked()) {
    throw new Error('Unlock your health data before updating the password lock.')
  }
  const dek = getActiveDek()
  const row = await fetchUserCrypto(userId)
  if (!row) throw new Error('No encryption vault found.')
  const params = (row.kdf_params as KdfParams) ?? DEFAULT_KDF
  const newSalt = generateSalt()
  const newKek = await deriveKek(newPassphrase, newSalt, params)
  const wrapped_dek = wrapKey(newKek, dek)

  const { error } = await supabase
    .from('user_crypto')
    .update({
      salt: saltToStorage(newSalt),
      wrapped_dek,
      kdf_params: params,
    })
    .eq('user_id', userId)
  if (error) throw error
  await unlockVaultSession(userId, dek)
}

/**
 * Issue a fresh account-backup mnemonic while the vault is unlocked.
 * Use when the user never saved the original words — old backup stops working.
 */
export async function rotateRecoveryMnemonic(userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (!isVaultUnlocked()) {
    throw new Error('Unlock your health data before creating a new account backup.')
  }
  const dek = getActiveDek()
  const row = await fetchUserCrypto(userId)
  if (!row) throw new Error('No encryption vault found.')
  const params = (row.kdf_params as KdfParams) ?? DEFAULT_KDF
  const recoveryMnemonic = generateRecoveryMnemonic()
  const recoverySalt = generateSalt()
  const recoverySecret = mnemonicToRecoverySecret(recoveryMnemonic)
  const recoveryKek = await deriveKek(recoverySecret, recoverySalt, params)
  const wrapped_dek_recovery = wrapKey(recoveryKek, dek)

  const { error } = await supabase
    .from('user_crypto')
    .update({
      recovery_salt: saltToStorage(recoverySalt),
      wrapped_dek_recovery,
    })
    .eq('user_id', userId)
  if (error) throw error
  return recoveryMnemonic
}

export async function markVaultMigrated(userId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('user_crypto')
    .update({ migrated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

export async function lockVault(): Promise<void> {
  await lockVaultSession()
}
