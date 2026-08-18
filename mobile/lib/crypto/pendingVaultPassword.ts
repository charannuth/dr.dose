/**
 * Holds the login password briefly across signup OTP / password-reset
 * so the silent vault can wrap or re-wrap the DEK without a second prompt.
 */
let pendingLoginPassword: string | null = null
let pendingRewrapPassword: string | null = null

export function stashPendingLoginPassword(password: string): void {
  pendingLoginPassword = password
}

export function takePendingLoginPassword(): string | null {
  const p = pendingLoginPassword
  pendingLoginPassword = null
  return p
}

export function peekPendingLoginPassword(): string | null {
  return pendingLoginPassword
}

export function stashPendingRewrapPassword(password: string): void {
  pendingRewrapPassword = password
}

export function takePendingRewrapPassword(): string | null {
  const p = pendingRewrapPassword
  pendingRewrapPassword = null
  return p
}

export function peekPendingRewrapPassword(): string | null {
  return pendingRewrapPassword
}

export function clearPendingVaultPasswords(): void {
  pendingLoginPassword = null
  pendingRewrapPassword = null
}
