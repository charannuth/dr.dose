import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PressableScale } from './PressableScale';

export type SheetAction = {
  key: string;
  label: string;
  /** Renders in the error color and is grouped last. */
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

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
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: 2,
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
      fontSize: 17,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    action: {
      paddingVertical: 14,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
    },
    actionLabel: {
      fontFamily: fonts.bodySemibold,
      fontSize: 16,
      color: colors.text,
    },
    destructive: { color: colors.error },
    disabled: { opacity: 0.5 },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    cancel: {
      marginTop: spacing.sm,
      paddingVertical: 14,
      alignItems: 'center' as const,
      borderRadius: radii.md,
      backgroundColor: colors.bg,
    },
    cancelText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.textMuted,
    },
  };
}

/** Bottom sheet of secondary actions, so cards don't carry them permanently. */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const safe = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  const renderAction = (action: SheetAction) => (
    <PressableScale
      key={action.key}
      scaleTo={0.98}
      style={styles.action}
      disabled={action.disabled}
      onPress={action.onPress}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.actionLabel,
          action.destructive && styles.destructive,
          action.disabled && styles.disabled,
        ]}
      >
        {action.label}
      </Text>
    </PressableScale>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={FadeInDown.duration(220)} style={styles.sheet}>
          <View style={styles.grabber} />
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {safe.map(renderAction)}
          {destructive.length > 0 && safe.length > 0 ? <View style={styles.divider} /> : null}
          {destructive.map(renderAction)}
          <PressableScale style={styles.cancel} scaleTo={0.98} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </PressableScale>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
