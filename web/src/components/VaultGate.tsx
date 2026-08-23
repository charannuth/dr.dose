import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useVault } from '../hooks/useVault'
import { VAULT_ENFORCEMENT_ENABLED } from '../lib/crypto/flags'

/**
 * Blocks health UI until the silent vault is unlocked.
 * Auth unlocks with login password; one-time account backup; restore after reset.
 */
export function VaultGate({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const vault = useVault()
  const [mnemonic, setMnemonic] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [backupSaved, setBackupSaved] = useState(false)

  if (!VAULT_ENFORCEMENT_ENABLED) {
    return <>{children}</>
  }

  if (vault.status === 'unlocked') {
    return (
      <>
        {children}
        {vault.migrating ? (
          <div className="vault-banner" role="status" aria-live="polite">
            Securing your health data…
          </div>
        ) : null}
        {vault.recoveryMnemonicOnce ? (
          <div className="vault-modal-backdrop" role="dialog" aria-modal="true">
            <div className="vault-modal">
              <h2>Save your account backup</h2>
              <p>
                Dr. Dose locks your health details so only you can open them. Save this
                backup in a password manager or notes app. You need it only if you forget
                your password and reset it. We cannot recover it for you.
              </p>
              <pre className="vault-mnemonic">{vault.recoveryMnemonicOnce}</pre>
              <button
                type="button"
                className="btn secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(vault.recoveryMnemonicOnce!)
                  setBackupSaved(true)
                }}
              >
                Copy backup
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!backupSaved}
                onClick={() => {
                  vault.clearRecoveryMnemonic()
                  setBackupSaved(false)
                }}
              >
                I’ve saved it — Continue
              </button>
              {!backupSaved ? (
                <p className="muted">Copy your backup once to continue.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    )
  }

  if (vault.status === 'loading' || vault.status === 'locked') {
    return (
      <div className="vault-gate">
        <p>Preparing secure storage…</p>
      </div>
    )
  }

  if (vault.status === 'needs_setup') {
    return (
      <div className="vault-gate">
        <h1>Dr. Dose</h1>
        <h2>Almost ready</h2>
        <p>
          Sign out and sign back in with your password so we can finish securing your
          health data.
        </p>
        {vault.error ? <p className="error">{vault.error}</p> : null}
        <div className="auth-existing-account-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void vault.refresh()}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const err = localError || vault.error

  async function onUnlockWithPassword(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    setBusy(true)
    try {
      await vault.unlock(loginPassword)
      setLoginPassword('')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not unlock')
    } finally {
      setBusy(false)
    }
  }

  async function onRestore(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    setBusy(true)
    try {
      await vault.recover(mnemonic.trim())
      setMnemonic('')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not restore')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="vault-gate">
      <h1>Dr. Dose</h1>
      <h2>Unlock health data</h2>
      <p>
        Enter the same password you use to sign in. Only use account backup if you reset
        your password and the login password no longer opens your data.
      </p>
      <form onSubmit={onUnlockWithPassword} className="auth-form">
        <label>
          Login password
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Unlocking…' : 'Unlock with password'}
        </button>
      </form>
      <form onSubmit={onRestore} className="auth-form">
        <label>
          Or account backup
          <textarea
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            rows={3}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>
        {err ? <p className="error">{err}</p> : null}
        <button type="submit" className="btn secondary" disabled={busy || mnemonic.trim().length < 10}>
          Restore with backup
        </button>
      </form>
      <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  )
}
