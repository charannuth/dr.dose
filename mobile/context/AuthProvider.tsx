import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { evaluateSignUpResponse } from '../lib/signUpResult';
import { AuthContext, type AuthContextValue } from './auth-context';
import { avatarStoragePath, deleteAvatar, uploadAvatar } from '../lib/avatar';
import { supabase } from '../lib/supabase';

function authRedirectUrl() {
  return Linking.createURL('/');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => supabase !== null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
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
      setSession(nextSession);
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
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!supabase) throw new Error('Supabase is not configured');
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
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
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
          avatar_path: avatarStoragePath(userId),
        },
      });
      if (error) throw error;
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

    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: null, avatar_path: null },
    });
    if (error) throw error;
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
