import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  getEarnedStreakBadges,
  getNextStreakBadge,
  STREAK_BADGES,
  type StreakBadge,
} from '../../lib/streakBadges';
import { TulipBadgeIcon } from './TulipBadgeIcon';

function makeBadgeStyles(colors: ColorPalette) {
  return {
    collection: { gap: 16, borderTopWidth: 1, borderColor: colors.border, paddingTop: 24 },
    milestone: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
    milestoneBody: { flex: 1, gap: 5 },
    milestoneTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    milestoneMeta: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 19, color: colors.textMuted },
    progress: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' as const },
    progressFill: { height: 4, backgroundColor: colors.accent },
    section: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: { fontSize: 17, fontWeight: '900' as const, color: colors.text },
    hint: { color: colors.textMuted, lineHeight: 22 },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      justifyContent: 'center' as const,
    },
    gridCatalog: {
      gap: spacing.sm,
    },
    tile: {
      alignItems: 'center' as const,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 100,
      gap: 4,
    },
    tileCatalog: {
      alignItems: 'center' as const,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      width: '100%' as const,
    },
    tileEarned: { backgroundColor: colors.surface, borderColor: colors.successBorder },
    tileLocked: { backgroundColor: colors.surface },
    tileDays: { fontWeight: '900' as const, color: colors.accent, fontSize: 13 },
    tileLabel: {
      fontWeight: '800' as const,
      color: colors.text,
      fontSize: 15,
      textAlign: 'center' as const,
    },
    tileReq: {
      fontWeight: '700' as const,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center' as const,
    },
    tileReqEarned: { color: colors.success },
    tileDesc: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center' as const,
      paddingHorizontal: spacing.sm,
      maxWidth: '100%' as const,
    },
    tilePreviewHint: {
      fontWeight: '700' as const,
      fontSize: 12,
      color: colors.accent,
      marginTop: 2,
    },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
    chipDays: { fontWeight: '800' as const, color: colors.text, fontSize: 13 },
  };
}

export function StreakBadges({
  longestStreak,
  compact = false,
  catalog = true,
  onPreviewBadge,
}: {
  longestStreak: number;
  compact?: boolean;
  catalog?: boolean;
  /** Tap a badge to preview its streak celebration animation. */
  onPreviewBadge?: (badge: StreakBadge) => void;
}) {
  const styles = useThemedStyles(makeBadgeStyles);

  function BadgeTile({
    badge,
    earned,
    catalog: catalogTile,
  }: {
    badge: StreakBadge;
    earned: boolean;
    catalog?: boolean;
  }) {
    const dayLabel = badge.minDays === 1 ? '1 day' : `${badge.minDays} days`;
    const previewable = Boolean(onPreviewBadge);

    const body = catalogTile ? (
      <>
        <TulipBadgeIcon earned={earned} minDays={badge.minDays} size={48} />
        <Text style={styles.tileLabel}>{badge.label}</Text>
        <Text style={[styles.tileReq, earned && styles.tileReqEarned]}>
          {earned ? 'Unlocked' : `Unlock at ${dayLabel}`}
        </Text>
        <Text style={styles.tileDesc}>{badge.description}</Text>
        {previewable ? (
          <Text style={styles.tilePreviewHint}>Tap to preview celebration</Text>
        ) : null}
      </>
    ) : (
      <>
        <TulipBadgeIcon earned={earned} minDays={badge.minDays} size={44} />
        <Text style={styles.tileDays}>{badge.minDays}d</Text>
        <Text style={styles.tileLabel}>{badge.label}</Text>
        {previewable ? <Text style={styles.tilePreviewHint}>Preview</Text> : null}
      </>
    );

    const style = [
      catalogTile ? styles.tileCatalog : styles.tile,
      earned ? styles.tileEarned : styles.tileLocked,
    ];

    if (previewable) {
      return (
        <Pressable
          style={style}
          onPress={() => onPreviewBadge?.(badge)}
          accessibilityRole="button"
          accessibilityLabel={`Preview ${badge.label} celebration`}
          accessibilityHint={`Plays the ${badge.minDays}-day streak animation`}
        >
          {body}
        </Pressable>
      );
    }

    return <View style={style}>{body}</View>;
  }

  const earned = useMemo(() => getEarnedStreakBadges(longestStreak), [longestStreak]);
  const earnedIds = new Set(earned.map((b) => b.id));
  const next = useMemo(() => getNextStreakBadge(longestStreak), [longestStreak]);

  if (compact) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Tulip badges</Text>
        {earned.length === 0 ? (
          <Text style={styles.hint}>
            Complete a perfect day to earn your first tulip badge.
          </Text>
        ) : (
          <View style={styles.chipRow}>
            {earned.map((badge) =>
              onPreviewBadge ? (
                <Pressable
                  key={badge.id}
                  style={styles.chip}
                  onPress={() => onPreviewBadge(badge)}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${badge.label} celebration`}
                >
                  <TulipBadgeIcon earned minDays={badge.minDays} size={32} />
                  <Text style={styles.chipDays}>{badge.minDays}d</Text>
                </Pressable>
              ) : (
                <View
                  key={badge.id}
                  style={styles.chip}
                  accessibilityLabel={`${badge.label}, ${badge.minDays} days`}
                >
                  <TulipBadgeIcon earned minDays={badge.minDays} size={32} />
                  <Text style={styles.chipDays}>{badge.minDays}d</Text>
                </View>
              ),
            )}
          </View>
        )}
      </View>
    );
  }

  if (catalog) {
    return (
      <View style={styles.collection}>
        <Text style={styles.title}>Your milestones</Text>
        <Text style={styles.hint}>
          {earned.length} of {STREAK_BADGES.length} earned · Based on your longest streak.
          {next ? ` Next bloom at ${next.minDays} days.` : ' Your garden is complete.'}
        </Text>
        {next ? <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: next.minDays, now: Math.min(longestStreak, next.minDays) }} accessibilityLabel="Longest streak toward next milestone">
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, longestStreak / next.minDays * 100))}%` }]} />
        </View> : null}
        {onPreviewBadge ? <Text style={styles.milestoneMeta}>Tap a milestone to preview its celebration.</Text> : null}
        <View>
          {STREAK_BADGES.map((badge) => {
            const unlocked = earnedIds.has(badge.id);
            const content = <>
              <TulipBadgeIcon earned={unlocked} minDays={badge.minDays} size={badge.minDays >= 30 ? 72 : 48} />
              <View style={styles.milestoneBody}>
                <Text style={styles.milestoneTitle}>{badge.label}</Text>
                <Text style={styles.milestoneMeta}>{badge.minDays} {badge.minDays === 1 ? 'day' : 'days'} in a row · {unlocked ? 'Earned' : 'Not yet earned'}</Text>
              </View>
              {onPreviewBadge ? <Text style={styles.tilePreviewHint}>›</Text> : null}
            </>;
            return onPreviewBadge ? <Pressable key={badge.id} style={({ pressed }) => [styles.milestone, { opacity: pressed ? 0.65 : 1 }]} onPress={() => onPreviewBadge(badge)} accessibilityRole="button" accessibilityLabel={`${badge.label}, ${badge.minDays} days, ${unlocked ? 'earned' : 'not yet earned'}. Preview celebration`}>
              {content}
            </Pressable> : <View key={badge.id} style={styles.milestone}>{content}</View>;
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Streak badges</Text>
      <Text style={styles.hint}>
        Earn tulips for consecutive perfect adherence days.
        {next
          ? ` Next: ${next.label} at ${next.minDays} days${
              longestStreak > 0 ? ` (${next.minDays - longestStreak} to go)` : ''
            }.`
          : ' You have every badge!'}
        {onPreviewBadge ? ' Tap any badge to preview its celebration.' : ''}
      </Text>
      <View style={styles.grid}>
        {STREAK_BADGES.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
        ))}
      </View>
    </View>
  );
}
