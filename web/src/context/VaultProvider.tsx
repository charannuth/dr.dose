import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  changeVaultPassphrase,
  fetchUserCrypto,
  lockVault,
  rewrapUnlockedVault,
  rotateRecoveryMnemonic,
  setupVault,
  unlockVaultWithPassphrase,
  unlockVaultWithRecovery,
} from '../lib/crypto/vault'
import {
  clearPendingRecoveryMnemonic,
  hasBackupAcknowledged,
  isVaultUnlocked,
  loadPendingRecoveryMnemonic,
  markBackupAcknowledged,
  persistPendingRecoveryMnemonic,
  tryRestoreVaultSession,
} from '../lib/crypto/session'
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

  const rememberBackup = useCallback(async (userId: string, mnemonic: string) => {
    setRecoveryMnemonicOnce(mnemonic)
    await persistPendingRecoveryMnemonic(userId, mnemonic)
  }, [])

  const runMigrate = useCallback(async (userId: string) => {
    setMigrating(true)
    try {
      await migrateUserVaultData(userId)
    } catch (e) {
      console.warn('[vault] migrate failed', e)
      setError(
        e instanceof Error
          ? `Unlocked, but securing some data failed: ${e.message}`
          : 'Unlocked, but securing some data failed.',
      )
    } finally {
      setMigrating(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setError(null)
    if (!user) {
      await lockVault()
      setStatus('locked')
      setRecoveryMnemonicOnce(null)
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
          await rememberBackup(user.id, result.recoveryMnemonic)
        }
        if (result.needsAccountBackup) {
          setStatus('needs_unlock')
          return
        }
        if (result.recoveryMnemonic) {
          // already remembered above
        } else if (!(await hasBackupAcknowledged(user.id))) {
          const mnemonic = await rotateRecoveryMnemonic(user.id)
          await rememberBackup(user.id, mnemonic)
        } else {
          const pendingBackup = await loadPendingRecoveryMnemonic(user.id)
          if (pendingBackup) setRecoveryMnemonicOnce(pendingBackup)
        }
        setStatus('unlocked')
        return
      }

      const restored = await tryRestoreVaultSession(user.id)
      if (restored && isVaultUnlocked()) {
        const pendingBackup = await loadPendingRecoveryMnemonic(user.id)
        if (pendingBackup) setRecoveryMnemonicOnce(pendingBackup)
        setStatus('unlocked')
        await runMigrate(user.id)
        return
      }
      const row = await fetchUserCrypto(user.id)
      setStatus(row ? 'needs_unlock' : 'needs_setup')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load secure storage')
      if (isVaultUnlocked()) {
        setStatus('unlocked')
        return
      }
      setStatus('needs_unlock')
    }
  }, [user, runMigrate, rememberBackup])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setup = useCallback(
    async (passphrase: string) => {
      if (!user) throw new Error('Sign in first')
      setError(null)
      const { recoveryMnemonic } = await setupVault(user.id, passphrase)
      await rememberBackup(user.id, recoveryMnemonic)
      await runMigrate(user.id)
      setStatus('unlocked')
    },
    [user, runMigrate, rememberBackup],
  )

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!user) throw new Error('Sign in first')
      setError(null)
      await unlockVaultWithPassphrase(user.id, passphrase)
      const pendingBackup = await loadPendingRecoveryMnemonic(user.id)
      if (pendingBackup) {
        setRecoveryMnemonicOnce(pendingBackup)
      } else if (!(await hasBackupAcknowledged(user.id))) {
        const mnemonic = await rotateRecoveryMnemonic(user.id)
        await rememberBackup(user.id, mnemonic)
      }
      await runMigrate(user.id)
      setStatus('unlocked')
    },
    [user, runMigrate, rememberBackup],
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

  const issueAccountBackup = useCallback(async () => {
    if (!user) throw new Error('Sign in first')
    const mnemonic = await rotateRecoveryMnemonic(user.id)
    await rememberBackup(user.id, mnemonic)
  }, [user, rememberBackup])

  const showAccountBackup = useCallback(
    (mnemonic: string) => {
      if (!user) {
        setRecoveryMnemonicOnce(mnemonic)
        return
      }
      void rememberBackup(user.id, mnemonic)
    },
    [user, rememberBackup],
  )

  const lock = useCallback(async () => {
    await lockVault()
    setStatus(user ? 'needs_unlock' : 'locked')
  }, [user])

  const clearRecoveryMnemonic = useCallback(() => {
    setRecoveryMnemonicOnce(null)
    if (user) {
      void clearPendingRecoveryMnemonic(user.id)
      void markBackupAcknowledged(user.id)
    }
  }, [user])

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
      issueAccountBackup,
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
      issueAccountBackup,
      showAccountBackup,
      lock,
      clearRecoveryMnemonic,
      refresh,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
