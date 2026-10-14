import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { tapFeedback } from '../lib/haptics';
import { PressableScale } from './PressableScale';
import type { MedSort } from '../lib/settings';

export type SortOption = { value: MedSort; label: string; hint: string; icon: string };

function makeStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    grabber: {
      alignSelf: 'center' as const,
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.xs,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.text,
    },
    subtitle: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    option: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.md - 4,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    optionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentPurpleBg,
    },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.pendingBg,
    },
    iconBubbleActive: {
      backgroundColor: colors.accent,
    },
    icon: { fontSize: 19 },
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
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    radioActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    radioGlyph: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: colors.onAccent,
    },
    arrangeBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingVertical: 13,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    arrangeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.onAccent,
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
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Order your cards</Text>
          <Text style={styles.subtitle}>Pick how Today lists your medications.</Text>

          {options.map((option, index) => {
            const active = option.value === value;
            return (
              <Animated.View
                key={option.value}
                entering={FadeInDown.delay(60 + index * 50).springify().damping(16)}
              >
                <PressableScale
                  scaleTo={0.97}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    tapFeedback();
                    onSelect(option.value);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.iconBubble, active && styles.iconBubbleActive]}>
                    <Text style={styles.icon}>{option.icon}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionHint}>{option.hint}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <Text style={styles.radioGlyph}>✓</Text> : null}
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}

          {onReorder ? (
            <PressableScale
              scaleTo={0.96}
              style={styles.arrangeBtn}
              haptic
              onPress={onReorder}
              accessibilityRole="button"
            >
              <Text style={styles.arrangeText}>✋ Arrange my order</Text>
            </PressableScale>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
