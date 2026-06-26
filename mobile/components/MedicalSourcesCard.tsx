import { Linking, Pressable, Text, View } from 'react-native';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { MEDICAL_SOURCES } from '../lib/medicalSources';

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
    intro: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
    row: { paddingVertical: spacing.xs },
    link: { color: colors.accent, fontWeight: '800' as const, fontSize: 15 },
    desc: { color: colors.textMuted, lineHeight: 18, fontSize: 13 },
  };
}

/**
 * Visible citations for the app's medical/health content (Guideline 1.4.1).
 */
export function MedicalSourcesCard() {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sources & citations</Text>
      <Text style={styles.intro}>
        Health and medication information in Dr. Dose — including drug, interaction, safety,
        and menstrual cycle content — is compiled from the public references below. Tap a
        source to open it. This information is educational and is not a substitute for advice
        from your doctor or pharmacist.
      </Text>
      {MEDICAL_SOURCES.map((source) => (
        <Pressable
          key={source.url}
          style={styles.row}
          onPress={() => void Linking.openURL(source.url)}
          accessibilityRole="link"
        >
          <Text style={styles.link}>{source.label}</Text>
          <Text style={styles.desc}>{source.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}
