/**
 * Silent vault: login password wraps the DEK. No separate passphrase UX.
 */
export const VAULT_ENFORCEMENT_ENABLED = true

/** Minimum length for the login password used as vault KEK (matches password policy). */
export const VAULT_LOGIN_PASSWORD_MIN = 8
