import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { severityLabel } from '../../lib/drugInteractions';
import {
  buildMedicationSafetyReview,
  hasSafetyAlerts,
  type MedicationSafetyReview,
} from '../../lib/medicationSafetyReview';
import { useMedicalRecordAllergies } from '../../hooks/useMedicalRecordAllergies';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../lib/routes';
import { MedicalSourcesCard } from '../MedicalSourcesCard';

type Props = {
  drugName: string;
  existingMedicationNames: string[];
};

function makeSafetyPanelStyles(colors: ColorPalette) {
  return {
    panel: { gap: spacing.md },
    loading: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
    hint: { color: colors.textMuted, lineHeight: 20 },
    error: { color: colors.error, fontWeight: '700' as const },
    intro: { color: colors.text, lineHeight: 22 },
    bold: { fontWeight: '800' as const },
    link: { color: colors.accent, fontWeight: '800' as const },
    sectionTitle: { fontWeight: '900' as const, fontSize: 15, color: colors.text, marginTop: spacing.sm },
    list: { gap: spacing.sm },
    alertItem: {
      backgroundColor: colors.pendingBg,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 4,
    },
    alertTitle: { fontWeight: '800' as const, color: colors.text },
    body: { color: colors.text, lineHeight: 20 },
    bullet: { color: colors.text, lineHeight: 22 },
    disclaimer: {
      backgroundColor: colors.pendingBg,
      padding: spacing.md,
      borderRadius: radii.md,
    },
    disclaimerAlert: { backgroundColor: colors.errorBg },
    aiBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      alignItems: 'center' as const,
    },
    aiBtnText: { fontWeight: '700' as const, color: colors.text },
  };
}

export function MedicationSafetyPanel({ drugName, existingMedicationNames }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeSafetyPanelStyles);
  const { allergies, conditions } = useMedicalRecordAllergies(user?.id);
  const [review, setReview] = useState<MedicationSafetyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drugName.trim()) {
      setReview(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void buildMedicationSafetyReview(drugName, existingMedicationNames, allergies, conditions)
      .then((data) => {
        if (active) setReview(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load safety information');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [drugName, existingMedicationNames.join('\n'), allergies.join('\n'), conditions.join('\n')]);

  if (!drugName.trim()) {
    return (
      <Text style={styles.hint}>Enter a medication name earlier in the form to see safety notes.</Text>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.hint}>Checking safety information…</Text>
      </View>
    );
  }

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!review) return null;

  const alerts = hasSafetyAlerts(review);

  return (
    <View style={styles.panel}>
      <Text style={styles.intro}>
        Summary for <Text style={styles.bold}>{review.drugName}</Text>
        {review.checkedExistingCount > 0
          ? ` compared with ${review.checkedExistingCount} medication(s) on your list. `
          : '. '}
        This is not medical advice.
      </Text>

      <Text style={styles.sectionTitle}>Your medical record</Text>
      {allergies.length === 0 && conditions.length === 0 ? (
        <Text style={styles.hint}>
          No allergies or conditions on file.{' '}
          <Text style={styles.link} onPress={() => router.push(routes.medicalRecords)}>
            Add your medical record
          </Text>{' '}
          to personalize safety checks.
        </Text>
      ) : review.allergyWarnings.length === 0 && review.conditionWarnings.length === 0 ? (
        <Text style={styles.hint}>
          No matches for {review.drugName} against your listed allergies or conditions in our
          reference database.
        </Text>
      ) : (
        <View style={styles.list}>
          {review.allergyWarnings.map((item) => (
            <View key={`allergy-${item.category}`} style={styles.alertItem}>
              <Text style={styles.alertTitle}>
                Allergy: {item.allergyLabel} ({item.severity})
              </Text>
              <Text style={styles.body}>{item.description}</Text>
            </View>
          ))}
          {review.conditionWarnings.map((item) => (
            <View key={`condition-${item.conditionKey}`} style={styles.alertItem}>
              <Text style={styles.alertTitle}>
                Condition: {item.conditionLabel} ({item.severity})
              </Text>
              <Text style={styles.body}>{item.description}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Your medication list</Text>
      {review.existingMedInteractions.length === 0 ? (
        <Text style={styles.hint}>No known interactions found with your current medications.</Text>
      ) : (
        <View style={styles.list}>
          {review.existingMedInteractions.map((item) => (
            <View key={`${item.drugA}-${item.drugB}`} style={styles.alertItem}>
              <Text style={styles.alertTitle}>
                {item.displayA} + {item.displayB} ({severityLabel(item.severity)})
              </Text>
              <Text style={styles.body}>{item.description}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Pregnancy & breastfeeding</Text>
      <Text style={styles.body}>{review.pregnancy}</Text>

      <Text style={styles.sectionTitle}>Possible side effects</Text>
      {review.sideEffects.map((effect) => (
        <Text key={effect} style={styles.bullet}>
          • {effect}
        </Text>
      ))}

      <View style={[styles.disclaimer, alerts && styles.disclaimerAlert]}>
        <Text style={styles.body}>
          <Text style={styles.bold}>Important:</Text> Educational only — consult your clinician
          before changing medications.
        </Text>
      </View>

      <Pressable
        style={styles.aiBtn}
        onPress={() =>
          Alert.alert(
            'Coming soon',
            'AI medication assistant is not available on mobile yet. Discuss these results with your healthcare provider.',
          )
        }
      >
        <Text style={styles.aiBtnText}>Ask AI about this medication (coming soon)</Text>
      </Pressable>

      <MedicalSourcesCard />
    </View>
  );
}
