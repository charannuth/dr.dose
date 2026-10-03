import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { getActiveStreakBadge, bouquetTulipCount } from '../lib/streakBadges';
import { StreakCelebrationScene } from './streaks/StreakCelebrationScene';

type Props = {
  streakDays: number;
  onDismiss: () => void;
};

function makeCelebrationStyles(colors: ColorPalette) {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: spacing.lg,
    },
    cardWrap: {
      width: '100%' as const,
      maxWidth: 360,
      maxHeight: '90%' as const,
    },
    card: {
      borderRadius: radii.xl,
      padding: spacing.lg,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    illustration: {
      marginBottom: spacing.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 190,
      width: '100%' as const,
    },
    title: {
      fontSize: 22,
      fontFamily: fonts.heading,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: spacing.sm,
    },
    body: {
      fontFamily: fonts.bodyRegular,
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center' as const,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.xl,
      width: '100%' as const,
    },
    buttonText: {
      color: colors.onAccent,
      fontFamily: fonts.heading,
      fontSize: 16,
      textAlign: 'center' as const,
    },
  };
}

export function StreakCelebration({ streakDays, onDismiss }: Props) {
  const badge = getActiveStreakBadge(streakDays);
  const tulipCount = bouquetTulipCount(badge?.minDays ?? 1);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const reducedMotion = useReducedMotion();
  const styles = useThemedStyles(makeCelebrationStyles);

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [opacity, scale, reducedMotion]);

  const label = `${streakDays} ${streakDays === 1 ? 'day' : 'days'} in bloom`;

  return (
    <Modal visible transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView bounces={false} contentContainerStyle={styles.card}>
            <View style={styles.illustration}>
              <StreakCelebrationScene dual={tulipCount >= 2} minDays={badge?.minDays ?? 1} />
            </View>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.body}>
              {badge ? `${badge.label}. ` : ''}One day at a time, your consistency grows.
            </Text>
            <Pressable style={styles.button} onPress={onDismiss} accessibilityRole="button">
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
