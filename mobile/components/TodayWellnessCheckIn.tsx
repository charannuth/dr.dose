import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
import { PressableScale } from './PressableScale';
import { tapFeedback } from '../lib/haptics';
import { WellnessDailyForm } from './WellnessDailyForm';
import { useDemoTourTarget } from '../context/DemoTourTargetsContext';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing, typography, withAlpha } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';

const ENERGY_FACES = [
  { value: 1, face: '😫', label: 'Drained' },
  { value: 2, face: '😕', label: 'Low' },
  { value: 3, face: '😐', label: 'Okay' },
  { value: 4, face: '🙂', label: 'Good' },
  { value: 5, face: '😄', label: 'Great' },
] as const;

function makeTodayWellnessStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.35),
      padding: spacing.md + 2,
      gap: spacing.md - 2,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm + 4,
    },
    iconBubble: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.accentPurpleBg,
    },
    icon: { fontSize: 20 },
    headerText: { flex: 1, gap: 1 },
    h3: {
      ...typography.heading,
      fontSize: 18,
      color: colors.text,
    },
    subtitle: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13.5,
      color: colors.textMuted,
    },
    linkChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.accentPurpleBg,
    },
    linkText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.accent,
    },
    muted: {
      fontFamily: fonts.bodyRegular,
      color: colors.textMuted,
    },
    loadingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    prompt: {
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
      color: colors.text,
    },
    faces: {
      flexDirection: 'row' as const,
    },
    faceSlot: { flex: 1 },
    faceBtn: {
      alignItems: 'center' as const,
      gap: 6,
    },
    faceCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    faceCircleActive: {
      backgroundColor: colors.accentPurpleBg,
      borderColor: colors.accent,
    },
    face: { fontSize: 28 },
    faceLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11.5,
      color: colors.textMuted,
    },
    faceLabelActive: { color: colors.accent },
    banner: {
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md - 4,
    },
    bannerError: { backgroundColor: colors.errorBg },
    bannerErrorText: { fontFamily: fonts.bodySemibold, color: colors.error },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    primaryText: { fontFamily: fonts.bodyBold, color: colors.onAccent, fontSize: 15.5 },
    doneCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm + 2,
      borderRadius: radii.md,
      padding: spacing.sm + 4,
      backgroundColor: colors.successBg,
    },
    doneCheck: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.success,
    },
    doneCheckGlyph: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onAccent },
    doneText: { flex: 1, gap: 2 },
    doneTitle: { fontFamily: fonts.bodySemibold, fontSize: 14.5, color: colors.successText },
    summary: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.text },
    editBtn: {
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.successBorder,
    },
    editText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.successText },
    disclaimer: {
      fontFamily: fonts.bodyRegular,
      fontSize: 11.5,
      lineHeight: 16,
      color: colors.textMuted,
      opacity: 0.8,
    },
  };
}

export function TodayWellnessCheckIn({ onSaved }: { onSaved?: () => void } = {}) {
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
      onSaved?.();
      setExpanded(false);
      setMessage('Check-in saved. Nice work!');
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

  function startWithEnergy(energy: number) {
    tapFeedback();
    setMessage(null);
    setDraft({ ...(complete ? saved! : draft), energy_level: energy });
    setExpanded(true);
  }

  return (
    <View ref={tourRef} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <Text style={styles.icon}>🌙</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.h3}>Daily check-in</Text>
          <Text style={styles.subtitle}>Sleep, energy and symptoms for your clinician</Text>
        </View>
        <PressableScale
          style={styles.linkChip}
          scaleTo={0.97}
          onPress={() => router.push(routes.wellness)}
          accessibilityRole="link"
          accessibilityLabel="Open Wellness"
        >
          <Text style={styles.linkText}>Trends →</Text>
        </PressableScale>
      </View>

      {error ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>{error}</Text>
        </View>
      ) : null}

      {complete && !expanded ? (
        <View style={styles.doneCard}>
          <View style={styles.doneCheck}>
            <Text style={styles.doneCheckGlyph}>✓</Text>
          </View>
          <View style={styles.doneText}>
            <Text style={styles.doneTitle}>{message ?? 'Checked in for today'}</Text>
            <Text style={styles.summary} numberOfLines={2}>
              {formatWellnessLogSummary(saved!)}
            </Text>
          </View>
          <PressableScale
            style={styles.editBtn}
            scaleTo={0.97}
            onPress={() => {
              setDraft(saved!);
              setMessage(null);
              setExpanded(true);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.editText}>Edit</Text>
          </PressableScale>
        </View>
      ) : expanded ? (
        <WellnessDailyForm
          compact
          value={draft}
          onChange={setDraft}
          onSubmit={() => void handleSave()}
          busy={busy}
          submitLabel="Save check-in"
          trackedSymptoms={trackedSymptoms}
          onCancel={() => {
            setError(null);
            setExpanded(false);
          }}
        />
      ) : (
        <>
          <Text style={styles.prompt}>How's your energy today?</Text>
          <View style={styles.faces}>
            {ENERGY_FACES.map((option) => {
              const active = draft.energy_level === option.value;
              return (
                <View key={option.value} style={styles.faceSlot}>
                  <PressableScale
                    style={styles.faceBtn}
                    scaleTo={0.95}
                    onPress={() => startWithEnergy(option.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Energy ${option.label}, ${option.value} of 5`}
                  >
                    <View style={[styles.faceCircle, active && styles.faceCircleActive]}>
                      <Text style={styles.face}>{option.face}</Text>
                    </View>
                    <Text style={[styles.faceLabel, active && styles.faceLabelActive]}>
                      {option.label}
                    </Text>
                  </PressableScale>
                </View>
              );
            })}
          </View>
          <PressableScale
            style={styles.primaryBtn}
            scaleTo={0.98}
            onPress={() => setExpanded(true)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Log how today went</Text>
          </PressableScale>
        </>
      )}

      <Text style={styles.disclaimer}>
        Personal logs only, not a diagnosis. Ask your doctor or pharmacist for medical advice.
      </Text>
    </View>
  );
}
