import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import type { SignUpResult } from '../lib/signUpResult'

export type { SignUpResult }

export type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  verifySignupOtp: (email: string, token: string) => Promise<void>
  resendSignupOtp: (email: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>
  resendRecoveryOtp: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  updateProfileAvatar: (image: Blob) => Promise<void>
  removeProfileAvatar: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
