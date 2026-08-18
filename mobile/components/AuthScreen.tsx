import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from './BrandLogo';
import { EmailOtpVerification } from './EmailOtpVerification';
import { useAuth } from '../hooks/useAuth';
import { authErrorMessage, isAuthRateLimited } from '../lib/authErrors';
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
  validatePasswordMatch,
} from '../lib/passwordPolicy';
import { EMAIL_ALREADY_IN_USE_MESSAGE } from '../lib/signUpResult';
import {
  stashPendingLoginPassword,
  stashPendingRewrapPassword,
} from '../lib/crypto/pendingVaultPassword';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

function makeAuthStyles(colors: ColorPalette) {
  return {
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center' as const,
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      gap: spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    error: {
      color: colors.error,
      marginTop: spacing.sm,
    },
    success: {
      color: colors.success,
      marginTop: spacing.sm,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
      marginTop: spacing.md,
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: '700' as const,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    toggleRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginTop: spacing.md,
    },
    toggleText: {
      textAlign: 'center' as const,
      color: colors.textMuted,
      fontSize: 14,
    },
    toggleDivider: {
      color: colors.textMuted,
    },
    existingAccountRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    secondaryButton: {
      flex: 1,
      minWidth: 120,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '600' as const,
      fontSize: 14,
    },
    linkText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    disclaimer: {
      marginTop: spacing.lg,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: 'center' as const,
    },
    rateLimitHint: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
    },
    passwordHint: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
  };
}

type AuthMode =
  | 'signin'
  | 'signup'
  | 'signup-verify'
  | 'forgot'
  | 'forgot-verify'
  | 'forgot-reset';

export function AuthScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAuthStyles);
  const {
    signIn,
    signUp,
    verifySignupOtp,
    resendSignupOtp,
    requestPasswordReset,
    verifyRecoveryOtp,
    resendRecoveryOtp,
    updatePassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailAlreadyInUse, setEmailAlreadyInUse] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  function resetMessages() {
    setError(null);
    setMessage(null);
    setEmailAlreadyInUse(false);
    setRateLimited(false);
  }

  function switchMode(next: AuthMode) {
    resetMessages();
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMode(next);
  }

  function assertNewPassword(passwordValue: string, confirmValue: string): boolean {
    const policy = validatePassword(passwordValue);
    if (!policy.ok) {
      setError(policy.message);
      return false;
    }
    const match = validatePasswordMatch(passwordValue, confirmValue);
    if (!match.ok) {
      setError(match.message);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    resetMessages();
    setBusy(true);

    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email);
        switchMode('forgot-verify');
        setMessage('We emailed you an 8-digit verification code.');
        return;
      }

      if (mode === 'forgot-reset') {
        if (!assertNewPassword(newPassword, confirmPassword)) return;
        // New password may not unlock the old vault wrap — keep rewrap + try unlock.
        stashPendingRewrapPassword(newPassword);
        stashPendingLoginPassword(newPassword);
        await updatePassword(newPassword);
        setMessage('Password updated. You are signed in.');
        return;
      }

      if (mode === 'signin') {
        stashPendingLoginPassword(password);
        await signIn(email, password);
        return;
      }

      if (mode === 'signup') {
        if (!assertNewPassword(password, confirmPassword)) return;
        const result = await signUp(email, password);
        if (result.status === 'email_already_registered') {
          setEmailAlreadyInUse(true);
          setError(EMAIL_ALREADY_IN_USE_MESSAGE);
          return;
        }
        if (result.status === 'needs_verification') {
          stashPendingLoginPassword(password);
          switchMode('signup-verify');
          setMessage('We emailed you an 8-digit verification code.');
        }
      }
    } catch (err) {
      setRateLimited(isAuthRateLimited(err));
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignupVerify(code: string) {
    resetMessages();
    setBusy(true);
    try {
      // Password already stashed at signup; VaultProvider unlocks on session.
      await verifySignupOtp(email, code);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRecoveryVerify(code: string) {
    resetMessages();
    setBusy(true);
    try {
      await verifyRecoveryOtp(email, code);
      switchMode('forgot-reset');
      setMessage('Code verified. Choose a new password.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'signup-verify'
      ? 'Verify your email'
      : mode === 'forgot-verify'
        ? 'Verify reset code'
        : mode === 'forgot-reset'
          ? 'Set new password'
          : null;

  const subtitle =
    mode === 'forgot'
      ? 'We will email you a verification code to reset your password.'
      : mode === 'forgot-reset'
        ? 'Enter a new password for your account.'
        : mode === 'signup'
          ? 'Create an account — we will verify your email with a one-time code.'
          : 'Sign in to manage medications and log doses.';

  const showEmailPasswordForm =
    mode === 'signin' ||
    mode === 'signup' ||
    mode === 'forgot' ||
    mode === 'forgot-reset';

  const showBottomToggle = mode !== 'forgot-verify' && mode !== 'signup-verify';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {title ? <Text style={styles.title}>{title}</Text> : <BrandLogo />}

            {mode === 'signup-verify' ? (
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
            ) : null}

            {mode === 'forgot-verify' ? (
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
            ) : null}

            {showEmailPasswordForm ? (
              <>
                <Text style={styles.subtitle}>{subtitle}</Text>

                {mode !== 'forgot-reset' ? (
                  <>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                ) : null}

                {mode === 'signin' || mode === 'signup' ? (
                  <>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={
                        mode === 'signup' ? 'Create a strong password' : 'Your password'
                      }
                      placeholderTextColor={colors.textMuted}
                    />
                    {mode === 'signup' ? (
                      <>
                        <Text style={styles.label}>Confirm password</Text>
                        <TextInput
                          style={styles.input}
                          secureTextEntry
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Repeat your password"
                          placeholderTextColor={colors.textMuted}
                        />
                        <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENTS_HINT}</Text>
                      </>
                    ) : null}
                  </>
                ) : null}

                {mode === 'forgot-reset' ? (
                  <>
                    <Text style={styles.label}>New password</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      autoComplete="new-password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Create a strong password"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.label}>Confirm password</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat your password"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENTS_HINT}</Text>
                  </>
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}
                {rateLimited && mode === 'signup' ? (
                  <Text style={styles.rateLimitHint}>
                    This usually happens after several test sign-ups in a row. Check your inbox and
                    spam for an 8-digit code from a previous attempt — if you have one, you do not
                    need to sign up again.
                  </Text>
                ) : null}
                {emailAlreadyInUse && mode === 'signup' ? (
                  <View style={styles.existingAccountRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => switchMode('signin')}
                    >
                      <Text style={styles.secondaryButtonText}>Sign in instead</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => switchMode('forgot')}
                    >
                      <Text style={styles.secondaryButtonText}>Forgot password</Text>
                    </Pressable>
                  </View>
                ) : null}
                {message ? <Text style={styles.success}>{message}</Text> : null}

                <Pressable
                  style={[styles.primaryButton, busy && styles.buttonDisabled]}
                  disabled={busy}
                  onPress={handleSubmit}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'forgot'
                        ? 'Send verification code'
                        : mode === 'forgot-reset'
                          ? 'Update password'
                          : mode === 'signin'
                            ? 'Sign in'
                            : 'Create account'}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : null}

            {showBottomToggle ? (
              <View style={styles.toggleRow}>
                {mode === 'signin' ? (
                  <>
                    <Pressable onPress={() => switchMode('forgot')}>
                      <Text style={styles.linkText}>Forgot password?</Text>
                    </Pressable>
                    <Text style={styles.toggleDivider}> · </Text>
                    <Pressable onPress={() => switchMode('signup')}>
                      <Text style={styles.linkText}>Create account</Text>
                    </Pressable>
                  </>
                ) : null}
                {mode === 'signup' ? (
                  <Text style={styles.toggleText}>
                    Already have an account?{' '}
                    <Text style={styles.linkText} onPress={() => switchMode('signin')}>
                      Sign in
                    </Text>
                  </Text>
                ) : null}
                {mode === 'forgot' || mode === 'forgot-reset' ? (
                  <Pressable onPress={() => switchMode('signin')}>
                    <Text style={styles.linkText}>Back to sign in</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.disclaimer}>
              For personal use only. Not medical advice — always follow your healthcare
              provider&apos;s instructions.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
