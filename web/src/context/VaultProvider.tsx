import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  changeVaultPassphrase,
  fetchUserCrypto,
  lockVault,
  rewrapUnlockedVault,
  setupVault,
  unlockVaultWithPassphrase,
  unlockVaultWithRecovery,
} from '../lib/crypto/vault'
import { isVaultUnlocked, tryRestoreVaultSession } from '../lib/crypto/session'
import { migrateUserVaultData } from '../lib/crypto/migrate'
import { VAULT_ENFORCEMENT_ENABLED } from '../lib/crypto/flags'
import {
  peekPendingLoginPassword,
  takePendingLoginPassword,
  takePendingRewrapPassword,
} from '../lib/crypto/pendingVaultPassword'
import { ensureVaultWithLoginPassword } from '../lib/crypto/loginVault'
import { VaultContext, type VaultContextValue, type VaultStatus } from './vault-context'

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [recoveryMnemonicOnce, setRecoveryMnemonicOnce] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)

  const runMigrate = useCallback(async (userId: string) => {
    setMigrating(true)
    try {
      await migrateUserVaultData(userId)
    } finally {
      setMigrating(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setError(null)
    if (!user) {
      await lockVault()
      setStatus('locked')
      return
    }
    if (!VAULT_ENFORCEMENT_ENABLED) {
      setStatus('unlocked')
      return
    }
    setStatus('loading')
    try {
      const pending = peekPendingLoginPassword()
      if (pending) {
        const password = takePendingLoginPassword()!
        const result = await ensureVaultWithLoginPassword(user.id, password)
        if (result.recoveryMnemonic) {
          setRecoveryMnemonicOnce(result.recoveryMnemonic)
        }
        if (result.needsAccountBackup) {
          setStatus('needs_unlock')
          return
        }
        setStatus('unlocked')
        return
      }

      const restored = await tryRestoreVaultSession(user.id)
      if (restored && isVaultUnlocked()) {
        setStatus('unlocked')
        await runMigrate(user.id)
        return
      }
      const row = await fetchUserCrypto(user.id)
      setStatus(row ? 'needs_unlock' : 'needs_setup')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load secure storage')
      setStatus('needs_unlock')
    }
  }, [user, runMigrate])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setup = useCallback(
    async (passphrase: string) => {
      if (!user) throw new Error('Sign in first')
      setError(null)
      const { recoveryMnemonic } = await setupVault(user.id, passphrase)
      setRecoveryMnemonicOnce(recoveryMnemonic)
      await runMigrate(user.id)
      setStatus('unlocked')
    },
    [user, runMigrate],
  )

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!user) throw new Error('Sign in first')
      setError(null)
      await unlockVaultWithPassphrase(user.id, passphrase)
      await runMigrate(user.id)
      setStatus('unlocked')
    },
    [user, runMigrate],
  )

  const recover = useCallback(
    async (mnemonic: string) => {
      if (!user) throw new Error('Sign in first')
      setError(null)
      await unlockVaultWithRecovery(user.id, mnemonic)
      const rewrap = takePendingRewrapPassword()
      if (rewrap) {
        await rewrapUnlockedVault(user.id, rewrap)
      }
      await runMigrate(user.id)
      setStatus('unlocked')
    },
    [user, runMigrate],
  )

  const changePassphrase = useCallback(
    async (currentPassphrase: string, newPassphrase: string) => {
      if (!user) throw new Error('Sign in first')
      await changeVaultPassphrase(user.id, currentPassphrase, newPassphrase)
    },
    [user],
  )

  const rewrapWithLoginPassword = useCallback(
    async (newPassword: string) => {
      if (!user) throw new Error('Sign in first')
      await rewrapUnlockedVault(user.id, newPassword)
    },
    [user],
  )

  const showAccountBackup = useCallback((mnemonic: string) => {
    setRecoveryMnemonicOnce(mnemonic)
  }, [])

  const lock = useCallback(async () => {
    await lockVault()
    setStatus(user ? 'needs_unlock' : 'locked')
  }, [user])

  const clearRecoveryMnemonic = useCallback(() => {
    setRecoveryMnemonicOnce(null)
  }, [])

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      error,
      migrating,
      recoveryMnemonicOnce,
      setup,
      unlock,
      recover,
      changePassphrase,
      rewrapWithLoginPassword,
      showAccountBackup,
      lock,
      clearRecoveryMnemonic,
      refresh,
      isUnlocked: status === 'unlocked',
    }),
    [
      status,
      error,
      migrating,
      recoveryMnemonicOnce,
      setup,
      unlock,
      recover,
      changePassphrase,
      rewrapWithLoginPassword,
      showAccountBackup,
      lock,
      clearRecoveryMnemonic,
      refresh,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
