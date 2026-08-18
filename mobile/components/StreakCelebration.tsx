import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { getActiveStreakBadge, bouquetTulipCount } from '../lib/streakBadges';
import { StreakCelebrationScene } from './streaks/StreakCelebrationScene';
import { TulipBadgeIcon } from './streaks/TulipBadgeIcon';

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
    },
    card: {
      borderRadius: radii.xl,
      padding: spacing.lg,
      alignItems: 'center' as const,
      borderWidth: 2,
      borderColor: colors.partialBorder,
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
      fontWeight: '900' as const,
      color: colors.text,
      textAlign: 'center' as const,
      marginBottom: spacing.sm,
    },
    body: {
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
      fontWeight: '900' as const,
      fontSize: 16,
      textAlign: 'center' as const,
    },
  };
}

export function StreakCelebration({ streakDays, onDismiss }: Props) {
  const badge = getActiveStreakBadge(streakDays);
  const tulipCount = bouquetTulipCount(badge?.minDays ?? 1);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const styles = useThemedStyles(makeCelebrationStyles);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const label = badge
    ? `Streak × ${streakDays} — ${badge.label}!`
    : `Streak × ${streakDays}!`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient
            colors={['#fef3c7', '#fde68a', '#fbcfe8', '#f9a8d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.illustration}>
              {tulipCount <= 2 ? (
                <StreakCelebrationScene dual={tulipCount >= 2} />
              ) : (
                <TulipBadgeIcon
                  earned
                  minDays={badge?.minDays ?? streakDays}
                  size={112}
                />
              )}
            </View>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.body}>
              {badge?.description ??
                'Every scheduled dose logged today. Keep it growing tomorrow.'}
            </Text>
            <Pressable style={styles.button} onPress={onDismiss}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
