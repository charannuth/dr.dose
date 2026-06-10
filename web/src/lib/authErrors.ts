import type { AuthError } from '@supabase/supabase-js'

function asAuthError(err: unknown): AuthError | null {
  if (!err || typeof err !== 'object' || !('message' in err)) return null
  return err as AuthError
}

/** True when Supabase is throttling sign-up / email OTP (429). */
export function isAuthRateLimited(err: unknown): boolean {
  const authErr = asAuthError(err)
  if (!authErr) return false
  if (authErr.status === 429) return true
  const code = (authErr.code ?? '').toLowerCase()
  const lower = authErr.message.toLowerCase()
  return (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('email rate limit')
  )
}

export function authErrorMessage(err: unknown): string {
  const authErr = asAuthError(err)
  if (!authErr) return 'Something went wrong'

  const message = String(authErr.message)
  const lower = message.toLowerCase()
  const code = (authErr.code ?? '').toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirm your email with the verification code we sent, then sign in.'
  }
  if (lower.includes('token has expired') || lower.includes('otp_expired')) {
    return 'That code has expired. Request a new one.'
  }
  if (lower.includes('invalid') && lower.includes('token')) {
    return 'That code is incorrect. Check your email and try again.'
  }
  if (
    code === 'over_email_send_rate_limit' ||
    lower.includes('email rate limit exceeded')
  ) {
    return 'Sign-up emails are temporarily limited on this project (about 2–4 per hour). Wait up to an hour, then try again — and check spam in case a code was already sent.'
  }
  if (lower.includes('for security purposes') && lower.includes('seconds')) {
    return 'Please wait about 60 seconds before trying again with this email.'
  }
  if (isAuthRateLimited(authErr)) {
    return 'Too many sign-up attempts in a short time. Wait a few minutes and try again.'
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already registered')
  ) {
    return 'This email is already in use. Sign in with your password, or use Forgot password if you need to reset it.'
  }

  return message
}
