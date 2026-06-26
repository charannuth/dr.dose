import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { evaluateSignUpResponse } from '../lib/signUpResult';
import { AuthContext, type AuthContextValue } from './auth-context';
import { avatarStoragePath, deleteAvatar, uploadAvatar } from '../lib/avatar';
import { supabase } from '../lib/supabase';

function authRedirectUrl() {
  return Linking.createURL('/');
}

/** Supabase may mutate session in place; clone so React state updates propagate. */
function sessionWithUser(session: Session | null, user: User | null): Session | null {
  if (!session || !user) return session;
  return {
    ...session,
    user: {
      ...user,
      user_metadata: { ...user.user_metadata },
    },
  };
}

function cloneSession(session: Session | null): Session | null {
  if (!session) return null;
  return sessionWithUser(session, session.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => supabase !== null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(cloneSession(data.session));
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(cloneSession(nextSession));
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.signUp({ email, password });
    return evaluateSignUpResponse(data, error);
  }, []);

  const verifySignupOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl(),
    });
    if (error) throw error;
  }, []);

  const verifyRecoveryOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
  }, []);

  const resendRecoveryOtp = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    setSession(cloneSession(data.session));
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
    // Account is gone; clear the now-invalid local session.
    await supabase.auth.signOut();
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      setSession(cloneSession(data.session));
      return;
    }
    const { data: fallback } = await supabase.auth.getSession();
    setSession(cloneSession(fallback.session));
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
      if (data.user) {
        setSession((prev) => sessionWithUser(prev, data.user));
        return;
      }
      await refreshSession();
    },
    [refreshSession],
  );

  const updateProfileAvatar = useCallback(
    async (image: Blob | ArrayBuffer) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const userId = session?.user?.id;
      if (!userId) throw new Error('You must be signed in');

      const avatarUrl = await uploadAvatar(userId, image);
      const { data, error } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          avatar_path: avatarStoragePath(userId),
        },
      });
      if (error) throw error;
      if (data.user) {
        setSession((prev) => sessionWithUser(prev, data.user));
        return;
      }
      await refreshSession();
    },
    [session?.user?.id, refreshSession],
  );

  const removeProfileAvatar = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    const userId = session?.user?.id;
    if (!userId) throw new Error('You must be signed in');

    try {
      await deleteAvatar(userId);
    } catch {
      /* file may already be gone */
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: null, avatar_path: null },
    });
    if (error) throw error;
    if (data.user) {
      setSession((prev) => sessionWithUser(prev, data.user));
      return;
    }
    await refreshSession();
  }, [session?.user?.id, refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      verifySignupOtp,
      resendSignupOtp,
      requestPasswordReset,
      verifyRecoveryOtp,
      resendRecoveryOtp,
      updatePassword,
      signOut,
      updateDisplayName,
      updateProfileAvatar,
      removeProfileAvatar,
      deleteAccount,
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      verifySignupOtp,
      resendSignupOtp,
      requestPasswordReset,
      verifyRecoveryOtp,
      resendRecoveryOtp,
      updatePassword,
      signOut,
      updateDisplayName,
      updateProfileAvatar,
      removeProfileAvatar,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
