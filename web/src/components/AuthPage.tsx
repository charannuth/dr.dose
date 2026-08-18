import { useState, type FormEvent } from 'react'
import { EmailOtpVerification } from './EmailOtpVerification'
import { useAuth } from '../hooks/useAuth'
import { authErrorMessage, isAuthRateLimited } from '../lib/authErrors'
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
  validatePasswordMatch,
} from '../lib/passwordPolicy'
import { EMAIL_ALREADY_IN_USE_MESSAGE } from '../lib/signUpResult'
import {
  stashPendingLoginPassword,
  stashPendingRewrapPassword,
} from '../lib/crypto/pendingVaultPassword'

type AuthMode =
  | 'signin'
  | 'signup'
  | 'signup-verify'
  | 'forgot'
  | 'forgot-verify'
  | 'forgot-reset'

export function AuthPage() {
  const {
    signIn,
    signUp,
    verifySignupOtp,
    resendSignupOtp,
    requestPasswordReset,
    verifyRecoveryOtp,
    resendRecoveryOtp,
    updatePassword,
  } = useAuth()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emailAlreadyInUse, setEmailAlreadyInUse] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  function resetMessages() {
    setError(null)
    setMessage(null)
    setEmailAlreadyInUse(false)
    setRateLimited(false)
  }

  function switchMode(next: AuthMode) {
    resetMessages()
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMode(next)
  }

  function assertNewPassword(passwordValue: string, confirmValue: string): boolean {
    const policy = validatePassword(passwordValue)
    if (!policy.ok) {
      setError(policy.message)
      return false
    }
    const match = validatePasswordMatch(passwordValue, confirmValue)
    if (!match.ok) {
      setError(match.message)
      return false
    }
    return true
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    resetMessages()
    setBusy(true)

    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email)
        switchMode('forgot-verify')
        setMessage('We emailed you an 8-digit verification code.')
        return
      }

      if (mode === 'forgot-reset') {
        if (!assertNewPassword(newPassword, confirmPassword)) return
        stashPendingRewrapPassword(newPassword)
        stashPendingLoginPassword(newPassword)
        await updatePassword(newPassword)
        setMessage('Password updated. You are signed in.')
        return
      }

      if (mode === 'signin') {
        stashPendingLoginPassword(password)
        await signIn(email, password)
        return
      }

      if (mode === 'signup') {
        if (!assertNewPassword(password, confirmPassword)) return
        const result = await signUp(email, password)
        if (result.status === 'email_already_registered') {
          setEmailAlreadyInUse(true)
          setError(EMAIL_ALREADY_IN_USE_MESSAGE)
          return
        }
        if (result.status === 'needs_verification') {
          stashPendingLoginPassword(password)
          switchMode('signup-verify')
          setMessage('We emailed you an 8-digit verification code.')
        }
        return
      }
    } catch (err) {
      setRateLimited(isAuthRateLimited(err))
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignupVerify(code: string) {
    resetMessages()
    setBusy(true)
    try {
      await verifySignupOtp(email, code)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRecoveryVerify(code: string) {
    resetMessages()
    setBusy(true)
    try {
      await verifyRecoveryOtp(email, code)
      switchMode('forgot-reset')
      setMessage('Code verified. Choose a new password.')
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'signup-verify'
      ? 'Verify your email'
      : mode === 'forgot-verify'
        ? 'Verify reset code'
        : mode === 'forgot-reset'
          ? 'Set new password'
          : 'Dr. Dose'

  const subtitle =
    mode === 'forgot'
      ? 'We will email you a verification code to reset your password.'
      : mode === 'forgot-reset'
        ? 'Enter a new password for your account.'
        : mode === 'signup'
          ? 'Create an account — we will verify your email with a one-time code.'
          : 'Sign in to manage medications and log doses.'

  const showEmailPasswordForm =
    mode === 'signin' ||
    mode === 'signup' ||
    mode === 'forgot' ||
    mode === 'forgot-reset'

  const showBottomToggle = mode !== 'forgot-verify' && mode !== 'signup-verify'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className={title === 'Dr. Dose' ? 'brand-logo-text' : undefined}>
          {title}
        </h1>

        {mode === 'signup-verify' && (
          <EmailOtpVerification
            email={email}
            description="Enter the 8-digit code from your email to finish creating your account."
            verifyLabel="Complete sign up"
            busy={busy}
            error={error}
            message={message}
            onVerify={handleSignupVerify}
            onResend={() => resendSignupOtp(email)}
            onBack={() => switchMode('signup')}
          />
        )}

        {mode === 'forgot-verify' && (
          <EmailOtpVerification
            email={email}
            description="Enter the 8-digit code from your email to continue resetting your password."
            verifyLabel="Verify code"
            busy={busy}
            error={error}
            message={message}
            onVerify={handleRecoveryVerify}
            onResend={() => resendRecoveryOtp(email)}
            onBack={() => switchMode('forgot')}
          />
        )}

        {showEmailPasswordForm && (
          <>
            <p className="auth-subtitle">{subtitle}</p>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode !== 'forgot-reset' && (
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}

              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <label>
                    Password
                    <input
                      type="password"
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      required
                      minLength={mode === 'signup' ? PASSWORD_MIN_LENGTH : 1}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  {mode === 'signup' ? (
                    <>
                      <label>
                        Confirm password
                        <input
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={PASSWORD_MIN_LENGTH}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </label>
                      <p className="auth-password-hint">{PASSWORD_REQUIREMENTS_HINT}</p>
                    </>
                  ) : null}
                </>
              )}

              {mode === 'forgot-reset' && (
                <>
                  <label>
                    New password
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </label>
                  <label>
                    Confirm password
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </label>
                  <p className="auth-password-hint">{PASSWORD_REQUIREMENTS_HINT}</p>
                </>
              )}

              {error && <p className="form-error">{error}</p>}
              {rateLimited && mode === 'signup' && (
                <p className="auth-rate-limit-hint">
                  This usually happens after several test sign-ups in a row. Check your inbox
                  and spam for an 8-digit code from a previous attempt — if you have one, you
                  do not need to sign up again.
                </p>
              )}
              {emailAlreadyInUse && mode === 'signup' && (
                <p className="auth-existing-account-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => switchMode('signin')}
                  >
                    Sign in instead
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password
                  </button>
                </p>
              )}
              {message && <p className="form-success">{message}</p>}

              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : mode === 'forgot'
                    ? 'Send verification code'
                    : mode === 'forgot-reset'
                      ? 'Update password'
                      : mode === 'signin'
                        ? 'Sign in'
                        : 'Create account'}
              </button>
            </form>
          </>
        )}

        {showBottomToggle && (
          <p className="auth-toggle">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
                {' · '}
                <button type="button" onClick={() => switchMode('signup')}>
                  Create account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            )}
            {(mode === 'forgot' || mode === 'forgot-reset') && (
              <button type="button" onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            )}
          </p>
        )}

        <p className="auth-legal-links">
          <a href="/privacy">Privacy policy</a>
          {' · '}
          <a href="/terms">Terms of use</a>
        </p>

        <p className="disclaimer">
          For personal use only. Not medical advice — always follow your
          healthcare provider&apos;s instructions.
        </p>
      </div>
    </div>
  )
}
