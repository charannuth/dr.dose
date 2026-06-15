import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { setOnboardingDone } from '../lib/settings';
import { routes } from '../lib/routes';

type Props = {
  userId: string;
  visible: boolean;
  onDone: () => void;
  onStartTour: () => void;
  onAddMedication: () => void;
};

function makeStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center' as const,
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: { fontSize: 22, fontWeight: '900' as const, color: colors.text },
    list: { gap: spacing.sm },
    item: { color: colors.textMuted, lineHeight: 22, fontSize: 15 },
    bold: { fontWeight: '800' as const, color: colors.text },
    link: { color: colors.accent, fontWeight: '800' as const },
    actions: { gap: spacing.sm, marginTop: spacing.sm },
    ghostBtn: {
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    ghostText: { color: colors.textMuted, fontWeight: '800' as const },
    secondaryBtn: {
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryText: { color: colors.text, fontWeight: '800' as const, fontSize: 16 },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    primaryText: { color: colors.onAccent, fontWeight: '900' as const, fontSize: 16 },
  };
}

export function OnboardingModal({ userId, visible, onDone, onStartTour, onAddMedication }: Props) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  function finish() {
    void setOnboardingDone(userId);
    onDone();
  }

  function handleTour() {
    void setOnboardingDone(userId);
    onStartTour();
  }

  function handleAdd() {
    void setOnboardingDone(userId);
    onAddMedication();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Dr. Dose</Text>
          <View style={styles.list}>
            <Text style={styles.item}>
              1. Add your medications with dose times (12-hour + AM/PM).
            </Text>
            <Text style={styles.item}>
              2. On <Text style={styles.bold}>Today</Text>, mark each dose when you take it.
            </Text>
            <Text style={styles.item}>
              3. Build a streak by logging every scheduled dose each day.
            </Text>
            <Text style={styles.item}>
              4. Use <Text style={styles.link} onPress={() => router.push(routes.history)}>History</Text>{' '}
              for your calendar and daily notes;{' '}
              <Text style={styles.link} onPress={() => router.push(routes.streaks)}>Streaks</Text> for tulip
              badges.
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={finish}>
              <Text style={styles.ghostText}>Skip for now</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleTour}>
              <Text style={styles.secondaryText}>Show me around</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleAdd}>
              <Text style={styles.primaryText}>Add first medication</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
