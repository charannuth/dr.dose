import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { StreakStats } from '../lib/streaks';
import { routes } from '../lib/routes';
import { getActiveStreakBadge, getDisplayStreakDays } from '../lib/streakBadges';
import type { ColorPalette } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { TulipBadgeIcon } from './streaks/TulipBadgeIcon';

function makeStyles(colors: ColorPalette) {
  return {
    row: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      marginTop: 4,
      gap: 6,
    },
    text: {
      fontSize: 14,
      color: colors.textMuted,
      flexShrink: 1,
    },
    count: {
      fontWeight: '800' as const,
      color: colors.accent,
    },
    tier: {
      fontWeight: '700' as const,
      color: colors.textMuted,
    },
    link: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '800' as const,
    },
    badgeWrap: {
      marginRight: 2,
    },
    compactHint: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
  };
}

export function StreakSnippet({
  stats,
  onPreviewCelebration,
}: {
  stats: StreakStats | null;
  onPreviewCelebration?: (days?: number) => void;
}) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const pop = useRef(new Animated.Value(0.6)).current;

  const displayStreak = stats ? getDisplayStreakDays(stats) : 0;
  const activeBadge =
    stats && displayStreak > 0 ? getActiveStreakBadge(displayStreak) : null;

  useEffect(() => {
    if (!activeBadge) return;
    pop.setValue(0.6);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [activeBadge?.id, displayStreak, stats?.todayComplete, pop]);

  if (!stats?.hasMedications) return null;

  return (
    <Pressable
      onLongPress={
        __DEV__ && onPreviewCelebration
          ? () => onPreviewCelebration(displayStreak > 0 ? displayStreak : 7)
          : undefined
      }
      delayLongPress={600}
      accessibilityHint={__DEV__ ? 'Long press to preview streak celebration' : undefined}
    >
      <View style={styles.row}>
        {activeBadge ? (
          <Animated.View
            style={[styles.badgeWrap, { transform: [{ scale: pop }], opacity: pop }]}
          >
            <TulipBadgeIcon earned minDays={activeBadge.minDays} size={36} />
          </Animated.View>
        ) : null}
        <Text style={styles.text}>
          {displayStreak > 0 ? (
            <>
              <Text style={styles.count}>{displayStreak}</Text>
              {` day streak${
                stats.todayComplete ? ' — today complete' : ' — finish today to continue'
              }`}
              {activeBadge ? (
                <Text style={styles.tier}> · {activeBadge.label}</Text>
              ) : null}
            </>
          ) : stats.todayComplete ? (
            'Today complete — come back tomorrow to extend your streak'
          ) : (
            'Log every dose today to start a streak'
          )}
          .{' '}
        </Text>
        <Pressable
          onPress={() => router.push(routes.streaks)}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={styles.link}>Details</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
