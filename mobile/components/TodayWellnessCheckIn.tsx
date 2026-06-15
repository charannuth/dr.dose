import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useWellnessTodayLog } from '../hooks/useWellnessTodayLog';
import {
  formatWellnessLogSummary,
  isWellnessLogFilled,
  upsertWellnessLog,
} from '../lib/wellness';
import { todayLocalDate } from '../lib/dates';
import { routes } from '../lib/routes';
import { WellnessDisclaimer } from './WellnessDisclaimer';
import { WellnessDailyForm } from './WellnessDailyForm';
import { useDemoTourTarget } from '../context/DemoTourTargetsContext';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

function makeTodayWellnessStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.sm,
    },
    h3: {
      fontSize: 18,
      fontWeight: '900' as const,
      color: colors.text,
      marginBottom: 2,
    },
    muted: {
      color: colors.textMuted,
      lineHeight: 18,
    },
    linkBtn: {
      paddingVertical: 6,
      paddingHorizontal: 6,
    },
    linkText: {
      color: colors.accent,
      fontWeight: '900' as const,
    },
    loadingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    banner: {
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
    },
    bannerError: {
      backgroundColor: colors.errorBg,
      borderColor: colors.errorBorder,
    },
    bannerErrorText: { color: colors.error, fontWeight: '700' as const },
    bannerSuccess: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
    },
    bannerSuccessText: { color: colors.text, fontWeight: '700' as const },
    primaryBtn: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    primaryText: { color: colors.onAccent, fontWeight: '900' as const, fontSize: 16 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      alignItems: 'center' as const,
    },
    secondaryText: { color: colors.text, fontWeight: '800' as const },
    doneRow: {
      gap: spacing.sm,
    },
    summary: { color: colors.text, fontWeight: '700' as const },
  };
}

export function TodayWellnessCheckIn() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTodayWellnessStyles);
  const { user } = useAuth();
  const router = useRouter();
  const today = todayLocalDate();
  const {
    draft,
    setDraft,
    saved,
    setSaved,
    trackedSymptoms,
    loading,
    error,
    setError,
  } = useWellnessTodayLog(user?.id, today);

  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const tourRef = useDemoTourTarget('wellness-checkin');

  async function handleSave() {
    if (!user) return;
    if (!isWellnessLogFilled(draft)) {
      setError('Add at least one field before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await upsertWellnessLog(user.id, draft);
      setSaved({ ...draft });
      setExpanded(false);
      setMessage('Check-in saved. Share these notes with your doctor when you visit.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save check-in');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View ref={tourRef} collapsable={false} style={styles.card}>
        <Text style={styles.h3}>Daily check-in</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Loading daily check-in…</Text>
        </View>
      </View>
    );
  }

  const complete = saved != null && isWellnessLogFilled(saved);

  return (
    <View ref={tourRef} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h3}>Daily check-in</Text>
          <Text style={styles.muted}>
            Log sleep, energy, and symptoms to discuss with your clinician — best done in the evening.
          </Text>
        </View>
        <Pressable onPress={() => router.push(routes.wellness)} style={styles.linkBtn}>
          <Text style={styles.linkText}>Wellness →</Text>
        </Pressable>
      </View>

      <WellnessDisclaimer compact />

      {error ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={[styles.banner, styles.bannerSuccess]}>
          <Text style={styles.bannerSuccessText}>{message}</Text>
        </View>
      ) : null}

      {complete && !expanded ? (
        <View style={styles.doneRow}>
          <Text style={styles.summary}>{formatWellnessLogSummary(saved!)}</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setDraft(saved!);
              setExpanded(true);
            }}
          >
            <Text style={styles.secondaryText}>Edit today</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {!expanded ? (
            <Pressable style={styles.primaryBtn} onPress={() => setExpanded(true)}>
              <Text style={styles.primaryText}>{complete ? 'Edit check-in' : 'Log how today went'}</Text>
            </Pressable>
          ) : null}

          {expanded ? (
            <WellnessDailyForm
              compact
              value={draft}
              onChange={setDraft}
              onSubmit={() => void handleSave()}
              busy={busy}
              submitLabel="Save check-in"
              trackedSymptoms={trackedSymptoms}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
