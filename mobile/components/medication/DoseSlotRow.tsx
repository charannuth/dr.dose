import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, withAlpha } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { PressableScale } from '../PressableScale';
import { DoseBurst } from './DoseBurst';

const POP_SPRING = { damping: 9, stiffness: 260, mass: 0.6 };

function makeStyles(colors: ColorPalette) {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm + 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radii.md,
    },
    check: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2.5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkGlyph: {
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      lineHeight: 20,
      color: colors.onAccent,
    },
    textCol: { flex: 1, gap: 1 },
    time: {
      fontFamily: fonts.bodySemibold,
      fontSize: 16,
      color: colors.text,
    },
    sub: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12.5,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    takeBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
      minWidth: 92,
      justifyContent: 'center' as const,
    },
    takeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.onAccent,
    },
    ghostBtn: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
    },
    ghostText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13.5,
    },
    undoBtn: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    undoText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.textMuted,
      textDecorationLine: 'underline' as const,
    },
  };
}

type Props = {
  label: string;
  taken: boolean;
  busy: boolean;
  /** Tile accent for this medication; the check, button and confetti use it. */
  accent: string;
  /** Shown under the time once taken, e.g. a cheer. */
  takenNote: string;
  snoozeLabel?: string;
  onTake: () => void;
  onSnooze?: () => void;
  onUndo: () => void;
};

/**
 * One dose time on a medication card. The tap flips the parent's state
 * optimistically, so the row watches `taken` go false → true and celebrates
 * that transition; rows that mount already taken stay still.
 */
export function DoseSlotRow({
  label,
  taken,
  busy,
  accent,
  takenNote,
  snoozeLabel,
  onTake,
  onSnooze,
  onUndo,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const wasTaken = useRef(taken);
  const checkScale = useSharedValue(1);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (taken && !wasTaken.current && !reducedMotion) {
      setBurst((n) => n + 1);
      checkScale.value = 0.3;
      checkScale.value = withSpring(1, POP_SPRING);
      flash.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 650 }));
    }
    wasTaken.current = taken;
  }, [taken, reducedMotion, checkScale, flash]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const confetti = [accent, colors.accentAmber, colors.accentBlue, colors.accentRed, colors.success];

  return (
    <View style={styles.row}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radii.md },
          { backgroundColor: withAlpha(accent, 0.22) },
          flashStyle,
        ]}
      />
      <PressableScale
        scaleTo={0.82}
        disabled={busy || taken}
        onPress={onTake}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={taken ? `${label} taken` : `Mark ${label} dose taken`}
        accessibilityState={{ checked: taken, disabled: busy || taken }}
      >
        <Animated.View
          style={[
            styles.check,
            taken
              ? { backgroundColor: accent, borderColor: accent }
              : { borderColor: withAlpha(accent, 0.7), backgroundColor: withAlpha(accent, 0.08) },
            checkStyle,
          ]}
        >
          {taken ? <Text style={styles.checkGlyph}>✓</Text> : null}
          <DoseBurst trigger={burst} colors={confetti} />
        </Animated.View>
      </PressableScale>

      <View style={styles.textCol}>
        <Text
          style={[styles.time, taken && { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {taken ? (
          <Text style={[styles.sub, { color: accent }]} numberOfLines={1}>
            {takenNote}
          </Text>
        ) : snoozeLabel ? (
          <Text style={[styles.sub, { color: colors.accent }]} numberOfLines={1}>
            {snoozeLabel}
          </Text>
        ) : null}
      </View>

      {taken ? (
        <PressableScale
          style={styles.undoBtn}
          scaleTo={0.9}
          disabled={busy}
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={`Undo ${label} dose`}
        >
          <Text style={styles.undoText}>{busy ? '…' : 'Undo'}</Text>
        </PressableScale>
      ) : (
        <View style={styles.actions}>
          {onSnooze ? (
            <PressableScale
              style={[styles.ghostBtn, { borderColor: withAlpha(accent, 0.45) }]}
              scaleTo={0.92}
              disabled={busy}
              onPress={onSnooze}
              accessibilityRole="button"
            >
              <Text style={[styles.ghostText, { color: accent }]}>
                {snoozeLabel ? 'Edit' : 'Snooze'}
              </Text>
            </PressableScale>
          ) : null}
          <PressableScale
            style={[styles.takeBtn, { backgroundColor: accent }]}
            scaleTo={0.9}
            disabled={busy}
            onPress={onTake}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${label} dose taken`}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <Text style={styles.takeText}>Take ✓</Text>
            )}
          </PressableScale>
        </View>
      )}
    </View>
  );
}
