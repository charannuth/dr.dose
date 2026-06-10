import type { AuthError, AuthResponse } from '@supabase/supabase-js'

export type SignUpResult =
  | { status: 'needs_verification' }
  | { status: 'session_created' }
  | { status: 'email_already_registered' }

const ALREADY_REGISTERED_PATTERNS = [
  'already registered',
  'already been registered',
  'user already exists',
]

function isAlreadyRegisteredError(error: AuthError): boolean {
  const lower = error.message.toLowerCase()
  return ALREADY_REGISTERED_PATTERNS.some((p) => lower.includes(p))
}

/** Interpret Supabase signUp — empty identities means email is already in use. */
export function evaluateSignUpResponse(
  data: AuthResponse['data'],
  error: AuthError | null,
): SignUpResult {
  if (error) {
    if (isAlreadyRegisteredError(error)) {
      return { status: 'email_already_registered' }
    }
    throw error
  }

  const identities = data.user?.identities ?? []
  if (data.user && identities.length === 0) {
    return { status: 'email_already_registered' }
  }

  if (data.session) {
    return { status: 'session_created' }
  }

  return { status: 'needs_verification' }
}

export const EMAIL_ALREADY_IN_USE_MESSAGE =
  'This email is already in use. Sign in with your password, or use Forgot password if you need to reset it.'
