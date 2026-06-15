import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useWellnessMedBriefings } from '../../hooks/useWellnessMedBriefings';
import { severityLabel } from '../../lib/drugInteractions';
import type { ActiveMedicationSummary } from '../../lib/wellnessReport';
import { routes } from '../../lib/routes';

function formatStartDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function makeStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: { fontSize: 16, fontWeight: '900' as const, color: colors.text },
    hint: { color: colors.textMuted, lineHeight: 20 },
    body: { color: colors.text, lineHeight: 20 },
    link: { color: colors.accent, fontWeight: '800' as const },
    errorText: { color: colors.error, fontWeight: '700' as const },
    briefingCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
      backgroundColor: colors.bg,
    },
    medName: { fontSize: 16, fontWeight: '900' as const, color: colors.text },
    meta: { color: colors.textMuted, fontSize: 13 },
    blockTitle: { fontWeight: '800' as const, color: colors.text, marginTop: spacing.xs },
    bullet: { color: colors.text, lineHeight: 20, paddingLeft: spacing.sm },
    foot: {
      color: colors.textMuted,
      fontSize: 13,
      fontStyle: 'italic' as const,
      marginTop: spacing.xs,
    },
    strong: { fontWeight: '800' as const, color: colors.text },
  };
}

type Props = {
  medications: ActiveMedicationSummary[];
};

export function WellnessMedBriefings({ medications }: Props) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { entries, loading, error } = useWellnessMedBriefings(medications);

  if (medications.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Starting a medication</Text>
        <Text style={styles.body}>
          When you add a medication, briefing cards appear here with educational side effects
          and substance notes.{' '}
          <Text style={styles.link} onPress={() => router.push(routes.today)}>
            Add a medication
          </Text>
          .
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Medication briefings</Text>
      <Text style={styles.hint}>
        What you might notice in daily routines when on these medicines — for discussion with
        your doctor, not a diagnosis.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={{ paddingVertical: spacing.md }}>
          <ActivityIndicator />
          <Text style={styles.hint}>Loading briefings…</Text>
        </View>
      ) : null}

      {!loading &&
        entries.map(({ med, review }) => (
          <View key={med.name} style={styles.briefingCard}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.meta}>Active since {formatStartDate(med.start_date)}</Text>

            <Text style={styles.body}>
              Track sleep, energy, and appetite in your daily check-in. Many people notice
              changes in the first 1–2 weeks on a new medicine — your logs help your clinician
              see your experience.
            </Text>

            <Text style={styles.blockTitle}>Common side effects (educational)</Text>
            {review.sideEffects.map((effect) => (
              <Text key={effect} style={styles.bullet}>
                • {effect}
              </Text>
            ))}

            {review.substanceWarnings.length > 0 ? (
              <>
                <Text style={styles.blockTitle}>Alcohol, cannabis, tobacco</Text>
                {review.substanceWarnings.map((w) => (
                  <Text key={w.substance} style={styles.bullet}>
                    • <Text style={styles.strong}>{w.label}:</Text> {w.description}
                  </Text>
                ))}
              </>
            ) : null}

            {review.existingMedInteractions.length > 0 ? (
              <>
                <Text style={styles.blockTitle}>With your other medications</Text>
                {review.existingMedInteractions.map((item) => (
                  <Text key={`${item.drugA}-${item.drugB}`} style={styles.bullet}>
                    • {item.displayA} + {item.displayB} ({severityLabel(item.severity)}):{' '}
                    {item.description}
                  </Text>
                ))}
              </>
            ) : null}

            <Text style={styles.foot}>
              Not medical advice. Confirm with your pharmacist or physician.
            </Text>
          </View>
        ))}

      <Pressable onPress={() => router.push(routes.interactions)}>
        <Text style={styles.link}>Full drug safety check</Text>
      </Pressable>
    </View>
  );
}
