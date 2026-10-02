import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PressableScale } from './PressableScale';
import type { MedSort } from '../lib/settings';

export type SortOption = { value: MedSort; label: string; hint: string };

function makeStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    grabber: {
      alignSelf: 'center' as const,
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    option: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    optionActive: {
      backgroundColor: colors.pendingBg,
    },
    optionText: { flex: 1, gap: 2 },
    optionLabel: {
      fontFamily: fonts.bodySemibold,
      fontSize: 16,
      color: colors.text,
    },
    optionHint: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      color: colors.textMuted,
    },
    check: {
      fontSize: 17,
      color: colors.accent,
      fontWeight: '900' as const,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    reorderLabel: {
      fontFamily: fonts.bodySemibold,
      fontSize: 16,
      color: colors.accent,
    },
  };
}

type Props = {
  visible: boolean;
  value: MedSort;
  options: SortOption[];
  onSelect: (next: MedSort) => void;
  /** Omitted when the list is too short to be worth ordering by hand. */
  onReorder?: () => void;
  onClose: () => void;
};

export function SortSheet({
  visible,
  value,
  options,
  onSelect,
  onReorder,
  onClose,
}: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={FadeInDown.duration(220)} style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Sort medications</Text>

          {options.map((option) => {
            const active = option.value === value;
            return (
              <PressableScale
                key={option.value}
                scaleTo={0.98}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => onSelect(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </PressableScale>
            );
          })}

          {onReorder ? (
            <>
              <View style={styles.divider} />
              <PressableScale
                scaleTo={0.98}
                style={styles.option}
                onPress={onReorder}
                accessibilityRole="button"
              >
                <Text style={styles.reorderLabel}>Reorder manually…</Text>
              </PressableScale>
            </>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
