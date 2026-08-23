import { createContext } from 'react'

export type VaultStatus =
  | 'loading'
  | 'locked'
  | 'needs_setup'
  | 'needs_unlock'
  | 'unlocked'

export type VaultContextValue = {
  status: VaultStatus
  error: string | null
  migrating: boolean
  recoveryMnemonicOnce: string | null
  isUnlocked: boolean
  /** @deprecated Prefer ensureVaultWithLoginPassword from auth flows. */
  setup: (passphrase: string) => Promise<void>
  unlock: (passphrase: string) => Promise<void>
  recover: (mnemonic: string) => Promise<void>
  changePassphrase: (current: string, next: string) => Promise<void>
  /** After backup unlock, lock DEK to a new login password. */
  rewrapWithLoginPassword: (newPassword: string) => Promise<void>
  /** Create a fresh account backup while unlocked (invalidates the previous one). */
  issueAccountBackup: () => Promise<void>
  /** Show the one-time account backup sheet. */
  showAccountBackup: (mnemonic: string) => void
  lock: () => Promise<void>
  clearRecoveryMnemonic: () => void
  refresh: () => Promise<void>
}

export const VaultContext = createContext<VaultContextValue | null>(null)
