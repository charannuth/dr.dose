/**
 * Silent vault: login password wraps the DEK. No separate passphrase UX.
 */
export const VAULT_ENFORCEMENT_ENABLED = true

/** Minimum length for the login password used as vault KEK (matches password policy). */
export const VAULT_LOGIN_PASSWORD_MIN = 8

/**
 * App Review / demo account. It skips the "save your account backup" prompt so a
 * reviewer can use the app with no extra steps. Its health data is still encrypted;
 * only the recovery-backup prompt is suppressed, so a password reset on this account
 * can't restore old data (fine for a throwaway demo).
 */
const DEMO_REVIEW_EMAIL = 'testuser.drdose@gmail.com'

export function isDemoReviewAccount(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === DEMO_REVIEW_EMAIL
}
